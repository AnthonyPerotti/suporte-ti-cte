const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listCategories = async (req, res) => {
  const { archived } = req.query;
  const isAdmin = req.user?.role === 'admin';
  const showArchived = archived === 'true' && isAdmin;

  const categories = await prisma.category.findMany({
    where: { parent_id: null, is_archived: showArchived },
    include: { children: { where: { is_archived: showArchived } } },
    orderBy: { name: 'asc' },
  });
  return res.json(categories);
};

const createCategory = async (req, res) => {
  const { name, description, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const category = await prisma.category.create({ data: { name, description, parent_id: parent_id || null } });
  return res.status(201).json(category);
};

const updateCategory = async (req, res) => {
  const { name, description } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, description },
  });
  return res.json(category);
};

const deleteCategory = async (req, res) => {
  await prisma.category.update({ where: { id: req.params.id }, data: { is_archived: true } });
  return res.json({ message: 'Category archived' });
};

const restoreCategory = async (req, res) => {
  await prisma.category.update({ where: { id: req.params.id }, data: { is_archived: false } });
  return res.json({ message: 'Category restored' });
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, restoreCategory };
