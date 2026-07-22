const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listEvents = async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const y = parseInt(year || now.getFullYear());
  const m = parseInt(month || now.getMonth() + 1);

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);

  const events = await prisma.calendarEvent.findMany({
    where: { start_at: { gte: start, lte: end } },
    include: { creator: { select: { name: true } } },
    orderBy: { start_at: 'asc' },
  });

  return res.json(events);
};

const createEvent = async (req, res) => {
  const { title, description, start_at, end_at, type = 'maintenance' } = req.body;
  if (!title || !start_at || !end_at) return res.status(400).json({ error: 'Title, start_at and end_at are required' });

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      description,
      start_at: new Date(start_at),
      end_at: new Date(end_at),
      type,
      created_by: req.user.id,
    },
    include: { creator: { select: { name: true } } },
  });

  return res.status(201).json(event);
};

const updateEvent = async (req, res) => {
  const { title, description, start_at, end_at, type } = req.body;
  const event = await prisma.calendarEvent.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(start_at !== undefined && { start_at: new Date(start_at) }),
      ...(end_at !== undefined && { end_at: new Date(end_at) }),
      ...(type !== undefined && { type }),
    },
    include: { creator: { select: { name: true } } },
  });
  return res.json(event);
};

const deleteEvent = async (req, res) => {
  const event = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (req.user.role === 'technician' && event.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Technicians can only delete their own events' });
  }

  await prisma.calendarEvent.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Event deleted' });
};

const getGoogleCalendarUrl = (event) => {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace('.000', '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(event.start_at)}/${fmt(event.end_at)}`,
    details: event.description || '',
    location: 'CTE - Coordenadoria de Tecnologia Educacional, Av. Roraima, 1000 - Edif 14 - Camobi, Santa Maria - RS, 97105-900, Brasil',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const getEventLinks = async (req, res) => {
  const event = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  return res.json({
    google_calendar_url: getGoogleCalendarUrl(event),
    meet_url: 'https://meet.google.com/new',
  });
};

module.exports = { listEvents, createEvent, updateEvent, deleteEvent, getEventLinks };
