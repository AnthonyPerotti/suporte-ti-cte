const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listArticles = async (req, res) => {
  const { search, category_id, published } = req.query;
  const isStaff = ['admin', 'technician'].includes(req.user.role);

  const isAdmin = req.user.role === 'admin';

  const where = {
    // Non-staff only see published articles
    ...(!isStaff && { published: true }),
    ...(!isAdmin && { is_archived: false }), // only admins can see archived articles
    ...(published !== undefined && isStaff && { published: published === 'true' }),
    ...(category_id && { category_id }),
  };

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    select: { id: true, title: true, tags: true, published: true, is_archived: true, created_at: true, author: { select: { name: true } }, category: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
  });

  return res.json(articles);
};

const getArticle = async (req, res) => {
  const isStaff = ['admin', 'technician'].includes(req.user.role);
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: req.params.id },
    include: { author: { select: { name: true } }, category: { select: { name: true } } },
  });
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  const isAdmin = req.user.role === 'admin';
  if (article.is_archived && !isAdmin) return res.status(404).json({ error: 'Article not found' });
  if (!isStaff && !article.published) return res.status(404).json({ error: 'Article not found' });
  return res.json(article);
};

const suggestArticles = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) return res.json([]);

  // Full-text search using PostgreSQL tsvector
  const results = await prisma.$queryRaw`
    SELECT id, title, tags
    FROM knowledge_articles
    WHERE published = true AND is_archived = false
      AND (
        to_tsvector('portuguese', title || ' ' || content) @@ plainto_tsquery('portuguese', ${q})
        OR title ILIKE ${`%${q}%`}
      )
    ORDER BY ts_rank(to_tsvector('portuguese', title || ' ' || content), plainto_tsquery('portuguese', ${q})) DESC
    LIMIT 5
  `;

  return res.json(results);
};

const createArticle = async (req, res) => {
  const { title, content, tags = [], category_id, published = false } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  const article = await prisma.knowledgeArticle.create({
    data: { title, content, tags, category_id: category_id || null, published: Boolean(published), author_id: req.user.id },
    include: { author: { select: { name: true } } },
  });

  return res.status(201).json(article);
};

const updateArticle = async (req, res) => {
  const { title, content, tags, category_id, published } = req.body;

  const article = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && { tags }),
      ...(category_id !== undefined && { category_id }),
      ...(published !== undefined && { published: Boolean(published) }),
      ...(req.body.is_archived !== undefined && req.user.role === 'admin' && { is_archived: Boolean(req.body.is_archived) }),
    },
    include: { author: { select: { name: true } } },
  });

  return res.json(article);
};

const deleteArticle = async (req, res) => {
  await prisma.knowledgeArticle.update({ where: { id: req.params.id }, data: { is_archived: true } });
  return res.json({ message: 'Article archived' });
};

module.exports = { listArticles, getArticle, suggestArticles, createArticle, updateArticle, deleteArticle };
