const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ALLOWED_DOMAINS = ['ufsm.br', 'cead.ufsm.br'];

const listUsers = async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(role && { role }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, department: true, avatar_url: true, is_active: true, created_at: true, force_password_change: true },
      orderBy: { created_at: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
};

const getUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, role: true, department: true, avatar_url: true, is_active: true, created_at: true, force_password_change: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
};

const createUser = async (req, res) => {
  const { name, email, role = 'user', department, temp_password } = req.body;

  if (!name || !email || !temp_password) {
    return res.status(400).json({ error: 'Name, email and temp_password are required' });
  }

  const domain = email.split('@')[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: 'Email domain not allowed. Use @ufsm.br or @cead.ufsm.br' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const hash = await bcrypt.hash(temp_password, 12);
  const user = await prisma.user.create({
    data: { name, email, password_hash: hash, role, department, force_password_change: true },
    select: { id: true, name: true, email: true, role: true, department: true, is_active: true, created_at: true, force_password_change: true },
  });

  return res.status(201).json(user);
};

const updateUser = async (req, res) => {
  const { name, department, role, is_active, email, password } = req.body;

  // Non-admins can only update their own profile (limited fields)
  if (req.user.role !== 'admin' && req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  const data = {};
  if (name !== undefined) data.name = name;
  if (department !== undefined) data.department = department;

  if (email && email !== currentUser.email) {
    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return res.status(400).json({ error: 'Email domain not allowed. Use @ufsm.br or @cead.ufsm.br' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    data.email = email;
  }

  if (password) {
    if (password.length < 4) return res.status(400).json({ error: 'Password too short' });
    data.password_hash = await bcrypt.hash(password, 12);
  }

  if (req.file) {
    data.avatar_url = req.file.filename;
    // Delete old avatar
    if (currentUser.avatar_url && currentUser.avatar_url.startsWith('upload_')) {
      const fs = require('fs');
      const path = require('path');
      const oldPath = path.join(process.cwd(), 'uploads', currentUser.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  } else if (req.body.avatar_url === '') {
    data.avatar_url = null; // Removed avatar
    if (currentUser.avatar_url && currentUser.avatar_url.startsWith('upload_')) {
      const fs = require('fs');
      const path = require('path');
      const oldPath = path.join(process.cwd(), 'uploads', currentUser.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }

  // Only admins can change role and is_active
  if (req.user.role === 'admin') {
    if (role !== undefined) data.role = role;
    if (is_active !== undefined) data.is_active = is_active;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, department: true, avatar_url: true, is_active: true, created_at: true },
  });

  return res.json(user);
};

const resetPassword = async (req, res) => {
  const { temp_password } = req.body;
  if (!temp_password || temp_password.length < 4) {
    return res.status(400).json({ error: 'Temporary password must be at least 4 characters' });
  }

  const hash = await bcrypt.hash(temp_password, 12);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { password_hash: hash, force_password_change: true },
  });

  return res.json({ message: 'Password reset. User will be prompted to change on next login.' });
};

const getTechnicians = async (req, res) => {
  const techs = await prisma.user.findMany({
    where: { role: { in: ['technician', 'admin'] }, is_active: true },
    select: { id: true, name: true, email: true, role: true, avatar_url: true },
    orderBy: { name: 'asc' },
  });
  return res.json(techs);
};

module.exports = { listUsers, getUser, createUser, updateUser, resetPassword, getTechnicians };
