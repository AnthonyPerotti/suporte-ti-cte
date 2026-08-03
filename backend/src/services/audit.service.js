const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const logAudit = async ({ req, user, action, resource, details }) => {
  try {
    const actor = user || (req && req.user) || null;
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '')
      : null;

    let detailsString = null;
    if (details !== undefined && details !== null) {
      if (typeof details === 'object') {
        detailsString = JSON.stringify(details);
      } else {
        detailsString = String(details);
      }
    }

    await prisma.auditLog.create({
      data: {
        user_id: actor ? actor.id : null,
        user_name: actor ? actor.name : 'Sistema',
        user_email: actor ? actor.email : null,
        user_role: actor ? actor.role : null,
        action: String(action || 'UNKNOWN'),
        resource: String(resource || 'system'),
        details: detailsString,
        ip_address: ipAddress ? String(ipAddress).split(',')[0].trim() : null,
      },
    });
  } catch (err) {
    console.error('Erro ao registrar log de auditoria:', err.message);
  }
};

module.exports = {
  logAudit,
};
