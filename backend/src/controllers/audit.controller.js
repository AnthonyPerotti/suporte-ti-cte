const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buildWhereClause = (query) => {
  const { search, resource, action, start_date, end_date } = query;

  const where = {
    ...(resource && { resource }),
    ...(action && { action }),
    ...(search && {
      OR: [
        { user_name: { contains: search, mode: 'insensitive' } },
        { user_email: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at.gte = new Date(start_date);
    }
    if (end_date) {
      const endDateObj = new Date(end_date);
      endDateObj.setHours(23, 59, 59, 999);
      where.created_at.lte = endDateObj;
    }
  }

  return where;
};

const listAuditLogs = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = buildWhereClause(req.query);

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Erro ao listar logs de auditoria:', err);
    return res.status(500).json({ error: 'Erro ao carregar logs de auditoria' });
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const where = buildWhereClause(req.query);
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 5000, // Export cap for safety
    });

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const formatted = String(str).replace(/"/g, '""');
      return `"${formatted}"`;
    };

    const headers = ['ID', 'Data/Hora', 'Usuário', 'E-mail', 'Cargo', 'Ação', 'Recurso', 'IP', 'Detalhes'];
    const rows = logs.map((log) => [
      escapeCsv(log.id),
      escapeCsv(new Date(log.created_at).toLocaleString('pt-BR')),
      escapeCsv(log.user_name || 'Sistema'),
      escapeCsv(log.user_email || ''),
      escapeCsv(log.user_role || ''),
      escapeCsv(log.action),
      escapeCsv(log.resource),
      escapeCsv(log.ip_address || ''),
      escapeCsv(log.details || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Erro ao exportar logs de auditoria:', err);
    return res.status(500).json({ error: 'Erro ao exportar logs de auditoria' });
  }
};

module.exports = {
  listAuditLogs,
  exportAuditLogs,
};
