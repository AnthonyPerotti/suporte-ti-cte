const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const startAutoCloseCron = () => {
  // Check every 10 minutes
  setInterval(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find tickets that are 'resolved' and haven't been updated in 24 hours
      const ticketsToClose = await prisma.ticket.findMany({
        where: {
          status: 'resolved',
          updated_at: { lt: twentyFourHoursAgo },
        },
      });

      if (ticketsToClose.length === 0) return;

      // Find system admin (Suporte TI)
      let systemAdmin = await prisma.user.findFirst({
        where: { name: 'Suporte TI', role: 'admin' }
      });
      if (!systemAdmin) {
        systemAdmin = await prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { created_at: 'asc' } });
      }

      for (const ticket of ticketsToClose) {
        // Update to closed
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'closed', closed_at: new Date() },
        });

        // Log history event
        if (systemAdmin) {
          await prisma.ticketEvent.create({
            data: {
              ticket_id: ticket.id,
              actor_id: systemAdmin.id,
              type: 'status_change',
              metadata: { old: 'resolved', new: 'closed' },
            },
          });
        }
      }
      console.log(`[CRON] Automatically closed ${ticketsToClose.length} resolved tickets.`);
    } catch (err) {
      console.error('[CRON] Error auto-closing tickets:', err);
    }
  }, 10 * 60 * 1000); // Every 10 minutes
};

module.exports = { startAutoCloseCron };
