const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getReports = async (req, res) => {
  const { from, to, technician_id, category_id } = req.query;

  const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = to ? new Date(to) : new Date();

  const where = {
    created_at: { gte: startDate, lte: endDate },
    ...(technician_id && { assignee_id: technician_id }),
    ...(category_id && { category_id }),
  };

  const [total, byStatus, byPriority, byCategory, avgRating, closedTickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({ by: ['status'], where, _count: { id: true } }),
    prisma.ticket.groupBy({ by: ['priority'], where, _count: { id: true } }),
    prisma.ticket.groupBy({ by: ['category_id'], where, _count: { id: true } }),
    prisma.ticket.aggregate({ where: { ...where, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.ticket.findMany({
      where: { ...where, status: { in: ['resolved', 'closed'] }, closed_at: { not: null } },
      select: { created_at: true, closed_at: true },
    }),
  ]);

  // Average resolution time in hours
  const resolutionTimes = closedTickets
    .filter(t => t.closed_at)
    .map(t => (new Date(t.closed_at) - new Date(t.created_at)) / (1000 * 60 * 60));
  const avgResolutionHours = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : null;

  // Fetch category names
  const categoryIds = byCategory.map(c => c.category_id).filter(Boolean);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  return res.json({
    period: { from: startDate, to: endDate },
    total,
    by_status: byStatus.map(s => ({ status: s.status, count: s._count.id })),
    by_priority: byPriority.map(p => ({ priority: p.priority, count: p._count.id })),
    by_category: byCategory.map(c => ({
      category_id: c.category_id,
      category_name: c.category_id ? categoryMap[c.category_id] || 'Unknown' : 'Uncategorized',
      count: c._count.id,
    })),
    avg_rating: avgRating._avg.rating,
    rating_count: avgRating._count.rating,
    avg_resolution_hours: avgResolutionHours,
  });
};

const exportCsv = async (req, res) => {
  const { from, to } = req.query;
  const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = to ? new Date(to) : new Date();

  const tickets = await prisma.ticket.findMany({
    where: { created_at: { gte: startDate, lte: endDate } },
    include: {
      user: { select: { name: true, email: true } },
      assignee: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const headers = ['ID', 'Título', 'Status', 'Prioridade', 'Categoria', 'Solicitante', 'Técnico', 'Avaliação', 'Criado em', 'Fechado em'];
  const rows = tickets.map(t => [
    t.id.slice(0, 8).toUpperCase(),
    `"${t.title.replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    t.category?.name || 'N/A',
    t.user.name,
    t.assignee?.name || 'N/A',
    t.rating || 'N/A',
    new Date(t.created_at).toLocaleDateString('pt-BR'),
    t.closed_at ? new Date(t.closed_at).toLocaleDateString('pt-BR') : 'N/A',
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-tickets-${Date.now()}.csv"`);
  return res.send(bom + csv);
};

const getDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isStaff = ['admin', 'technician'].includes(req.user.role);
  const assigneeFilter = req.user.role === 'technician' ? { assignee_id: req.user.id } : {};

  const [openToday, totalOpen, inProgress, waitingUser, criticalSla, warningSla] = await Promise.all([
    prisma.ticket.count({ where: { created_at: { gte: today, lt: tomorrow }, ...assigneeFilter } }),
    prisma.ticket.count({ where: { status: 'open', ...assigneeFilter } }),
    prisma.ticket.count({ where: { status: 'in_progress', ...assigneeFilter } }),
    prisma.ticket.count({ where: { status: 'waiting_user', ...assigneeFilter } }),
    prisma.ticket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        updated_at: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        ...assigneeFilter,
      },
    }),
    prisma.ticket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        updated_at: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
        ...assigneeFilter,
      },
    }),
  ]);

  // Last 30 days by day
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTickets = await prisma.ticket.findMany({
    where: { created_at: { gte: thirtyDaysAgo }, ...assigneeFilter },
    select: { created_at: true, status: true },
  });

  return res.json({
    open_today: openToday,
    total_open: totalOpen,
    in_progress: inProgress,
    waiting_user: waitingUser,
    sla_critical: criticalSla,
    sla_warning: warningSla,
    recent_count: recentTickets.length,
  });
};

module.exports = { getReports, exportCsv, getDashboard };
