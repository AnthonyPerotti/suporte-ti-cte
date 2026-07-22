const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listTemplates = async (req, res) => {
  const { archived } = req.query;
  const isAdmin = req.user?.role === 'admin';
  const showArchived = archived === 'true' && isAdmin;

  const templates = await prisma.template.findMany({
    where: { is_archived: showArchived },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { title: 'asc' },
  });
  return res.json(templates);
};

const createTemplate = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  const template = await prisma.template.create({
    data: { title, content, created_by: req.user.id },
    include: { author: { select: { id: true, name: true } } },
  });
  return res.status(201).json(template);
};

const updateTemplate = async (req, res) => {
  const { title, content } = req.body;
  const template = await prisma.template.update({
    where: { id: req.params.id },
    data: { title, content },
    include: { author: { select: { id: true, name: true } } },
  });
  return res.json(template);
};

const deleteTemplate = async (req, res) => {
  await prisma.template.update({ where: { id: req.params.id }, data: { is_archived: true } });
  return res.json({ message: 'Template archived' });
};

const restoreTemplate = async (req, res) => {
  await prisma.template.update({ where: { id: req.params.id }, data: { is_archived: false } });
  return res.json({ message: 'Template restored' });
};

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate, restoreTemplate };
