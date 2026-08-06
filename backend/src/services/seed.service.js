const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

const runAutoSeed = async () => {
  try {
    console.log('[AUTO-SEED] Sincronizando banco de dados...');
    
    // Ensure database schema is pushed to PostgreSQL
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    } catch (e) {
      console.warn('[AUTO-SEED] Aviso na sincronização do esquema Prisma:', e.message);
    }

    console.log('[AUTO-SEED] Verificando e criando contas padrão...');

    // 1. Root User
    const rootPassword = await bcrypt.hash('Root@123', 12);
    const rootUser = await prisma.user.upsert({
      where: { email: 'root@ufsm.br' },
      update: { role: 'root' },
      create: {
        name: 'Super Root',
        email: 'root@ufsm.br',
        password_hash: rootPassword,
        role: 'root',
        department: 'TI Central',
        force_password_change: false,
        is_active: true,
      },
    });
    console.log(`[AUTO-SEED] Conta Root pronta: ${rootUser.email}`);

    // 2. Admin User
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@cead.ufsm.br' },
      update: {},
      create: {
        name: 'Administrador TI',
        email: 'admin@cead.ufsm.br',
        password_hash: adminPassword,
        role: 'admin',
        department: 'TI',
        force_password_change: false,
        is_active: true,
      },
    });
    console.log(`[AUTO-SEED] Conta Admin pronta: ${adminUser.email}`);

    // 3. Technician User
    const techPassword = await bcrypt.hash('Temp@123', 12);
    const techUser = await prisma.user.upsert({
      where: { email: 'tecnico@cead.ufsm.br' },
      update: {},
      create: {
        name: 'Técnico TI',
        email: 'tecnico@cead.ufsm.br',
        password_hash: techPassword,
        role: 'technician',
        department: 'TI',
        force_password_change: true,
        is_active: true,
      },
    });
    console.log(`[AUTO-SEED] Conta Técnico pronta: ${techUser.email}`);

    // 4. Normal User
    const userPassword = await bcrypt.hash('Temp@123', 12);
    const normalUser = await prisma.user.upsert({
      where: { email: 'usuario@cead.ufsm.br' },
      update: {},
      create: {
        name: 'Usuário Teste',
        email: 'usuario@cead.ufsm.br',
        password_hash: userPassword,
        role: 'user',
        department: 'Administração',
        force_password_change: true,
        is_active: true,
      },
    });
    // 5. Sync Email Templates Subjects for Threading
    await prisma.emailTemplate.updateMany({
      where: {
        key: { in: ['ticket_created_user', 'ticket_created_team', 'status_update', 'comment_tech_to_user', 'comment_user_to_tech'] },
      },
      data: {
        subject: '[Chamado #{ticket_id}] {ticket_title}',
      },
    });
    console.log('[AUTO-SEED] Modelos de e-mail sincronizados para assunto único em thread.');
  } catch (err) {
    console.error('[AUTO-SEED] Erro ao executar auto-seed:', err);
  }
};

module.exports = { runAutoSeed };
