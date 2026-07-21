const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listTemplates = async (req, res) => {
  const templates = await prisma.template.findMany({
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
  await prisma.template.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Template deleted' });
};

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
