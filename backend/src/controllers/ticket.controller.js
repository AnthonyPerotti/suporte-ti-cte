const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const emailService = require('../services/email.service');

const prisma = new PrismaClient();

const SLA_WARN_HOURS = 24;
const SLA_CRIT_HOURS = 48;

const getSlaStatus = (updatedAt) => {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours >= SLA_CRIT_HOURS) return 'critical';
  if (diffHours >= SLA_WARN_HOURS) return 'warning';
  return 'ok';
};

const ticketSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  created_at: true,
  updated_at: true,
  closed_at: true,
  rating: true,
  user: { select: { id: true, name: true, email: true, avatar_url: true } },
  assignee: { select: { id: true, name: true, email: true, avatar_url: true } },
  category: { select: { id: true, name: true, parent_id: true } },
  attachments: true,
};

const listTickets = async (req, res) => {
  const { status, priority, category_id, assignee_id, search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const isStaff = ['admin', 'technician'].includes(req.user.role);

  const where = {
    // Regular users only see their own tickets
    ...(!isStaff && { user_id: req.user.id }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(category_id && { category_id }),
    ...(assignee_id && { assignee_id }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: ticketSelect,
      orderBy: { updated_at: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.ticket.count({ where }),
  ]);

  const withSla = tickets.map(t => ({
    ...t,
    sla_status: t.status !== 'closed' && t.status !== 'resolved' ? getSlaStatus(t.updated_at) : 'ok',
  }));

  return res.json({ tickets: withSla, total, page: parseInt(page), limit: parseInt(limit) });
};

const getTicket = async (req, res) => {
  const isStaff = ['admin', 'technician'].includes(req.user.role);

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      ...ticketSelect,
      comments: {
        where: isStaff ? {} : { is_internal: false },
        include: { author: { select: { id: true, name: true, avatar_url: true, role: true } } },
        orderBy: { created_at: 'asc' },
      },
      events: {
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { created_at: 'asc' },
      },
      user: { select: { id: true, name: true, email: true, avatar_url: true } },
      assignee: { select: { id: true, name: true, email: true, avatar_url: true } },
      category: { select: { id: true, name: true, parent_id: true } },
      attachments: true,
    },
  });

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Non-staff can only see their own tickets
  if (!isStaff && ticket.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.json({
    ...ticket,
    sla_status: ticket.status !== 'closed' && ticket.status !== 'resolved' ? getSlaStatus(ticket.updated_at) : 'ok',
  });
};

const createTicket = async (req, res) => {
  const { title, description, category_id, priority = 'normal' } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority,
      category_id: category_id || null,
      user_id: req.user.id,
    },
  });

  // Save attachments
  if (req.files && req.files.length > 0) {
    const attachmentData = req.files.map(file => ({
      ticket_id: ticket.id,
      filename: file.originalname,
      path: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    }));
    await prisma.ticketAttachment.createMany({ data: attachmentData });
  }

  // Create initial event
  await prisma.ticketEvent.create({
    data: {
      ticket_id: ticket.id,
      actor_id: req.user.id,
      type: 'created',
      metadata: { title, priority },
    },
  });

  // Fire emails (non-blocking)
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true } });
  const teamMembers = await prisma.user.findMany({
    where: { role: { in: ['admin', 'technician'] }, is_active: true },
    select: { email: true },
  });
  const teamEmails = teamMembers.map(m => m.email);

  emailService.sendTicketCreatedToUser({ ticket, user }).catch(console.error);
  emailService.sendTicketCreatedToTeam({ ticket, user, teamEmails }).catch(console.error);

  return res.status(201).json(ticket);
};

const updateTicket = async (req, res) => {
  const isStaff = ['admin', 'technician'].includes(req.user.role);
  const { status, priority, assignee_id, category_id } = req.body;

  if (!isStaff) return res.status(403).json({ error: 'Forbidden' });

  const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: 'Ticket not found' });

  const data = {};
  const events = [];

  if (status && status !== current.status) {
    data.status = status;
    if (status === 'closed' || status === 'resolved') data.closed_at = new Date();
    events.push({ type: 'status_change', metadata: { from: current.status, to: status } });
  }

  if (priority && priority !== current.priority) {
    data.priority = priority;
  }

  if (assignee_id !== undefined && assignee_id !== current.assignee_id) {
    data.assignee_id = assignee_id;
    events.push({ type: 'assignment', metadata: { assignee_id } });
  }

  if (category_id !== undefined) data.category_id = category_id;

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Persist events
  for (const ev of events) {
    await prisma.ticketEvent.create({
      data: { ticket_id: ticket.id, actor_id: req.user.id, ...ev },
    });
  }

  // Send status update email (non-blocking)
  if (status && status !== current.status) {
    emailService.sendStatusUpdate({
      ticket,
      user: ticket.user,
      technician: ticket.assignee,
      newStatus: status,
    }).catch(console.error);
  }

  return res.json(ticket);
};

const addComment = async (req, res) => {
  const { content, is_internal = false } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const isStaff = ['admin', 'technician'].includes(req.user.role);
  if (is_internal && !isStaff) return res.status(403).json({ error: 'Internal comments are staff-only' });

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
    },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (!isStaff && ticket.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticket_id: ticket.id,
      author_id: req.user.id,
      content,
      is_internal: Boolean(is_internal),
    },
    include: { author: { select: { id: true, name: true, avatar_url: true, role: true } } },
  });

  await prisma.ticketEvent.create({
    data: {
      ticket_id: ticket.id,
      actor_id: req.user.id,
      type: 'comment_added',
      metadata: { is_internal: Boolean(is_internal) },
    },
  });

  // Send notification email (non-blocking, only for public comments)
  if (!is_internal) {
    emailService.sendNewComment({
      ticket,
      user: ticket.user,
      technician: ticket.assignee,
      commentAuthor: req.user,
    }).catch(console.error);
  }

  return res.status(201).json(comment);
};

const rateTicket = async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!['resolved', 'closed'].includes(ticket.status)) {
    return res.status(400).json({ error: 'Can only rate resolved or closed tickets' });
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { rating: parseInt(rating), rating_comment: comment || null },
  });

  await prisma.ticketEvent.create({
    data: {
      ticket_id: ticket.id,
      actor_id: req.user.id,
      type: 'rating_added',
      metadata: { rating: parseInt(rating) },
    },
  });

  return res.json(updated);
};

module.exports = { listTickets, getTicket, createTicket, updateTicket, addComment, rateTicket };
