const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin default
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cead.ufsm.br' },
    update: {},
    create: {
      name: 'Administrador TI',
      email: 'admin@cead.ufsm.br',
      password_hash: adminPassword,
      role: 'admin',
      department: 'TI',
      force_password_change: false,
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // Technician example
  const techPassword = await bcrypt.hash('Temp@123', 12);
  const tech = await prisma.user.upsert({
    where: { email: 'tecnico@cead.ufsm.br' },
    update: {},
    create: {
      name: 'Técnico TI',
      email: 'tecnico@cead.ufsm.br',
      password_hash: techPassword,
      role: 'technician',
      department: 'TI',
      force_password_change: true,
    },
  });
  console.log(`Technician created: ${tech.email}`);

  // User example
  const userPassword = await bcrypt.hash('Temp@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'usuario@cead.ufsm.br' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'usuario@cead.ufsm.br',
      password_hash: userPassword,
      role: 'user',
      department: 'Administração',
      force_password_change: true,
    },
  });
  console.log(`User created: ${user.email}`);

  // Root categories
  const catHardware = await prisma.category.upsert({
    where: { id: 'cat-hardware' },
    update: {},
    create: { id: 'cat-hardware', name: 'Hardware', description: 'Problemas físicos com equipamentos' },
  });
  const catSoftware = await prisma.category.upsert({
    where: { id: 'cat-software' },
    update: {},
    create: { id: 'cat-software', name: 'Software', description: 'Sistemas, aplicativos e licenças' },
  });
  const catRede = await prisma.category.upsert({
    where: { id: 'cat-rede' },
    update: {},
    create: { id: 'cat-rede', name: 'Rede e Conectividade', description: 'Internet, Wi-Fi, VPN e rede local' },
  });
  const catAcesso = await prisma.category.upsert({
    where: { id: 'cat-acesso' },
    update: {},
    create: { id: 'cat-acesso', name: 'Acesso e Permissões', description: 'Senhas, contas e permissões de acesso' },
  });
  const catEmail = await prisma.category.upsert({
    where: { id: 'cat-email' },
    update: {},
    create: { id: 'cat-email', name: 'E-mail e Comunicação', description: 'Problemas com e-mail institucional' },
  });
  const catOutros = await prisma.category.upsert({
    where: { id: 'cat-outros' },
    update: {},
    create: { id: 'cat-outros', name: 'Outros', description: 'Demandas não classificadas' },
  });

  // Subcategories for Hardware
  await prisma.category.upsert({
    where: { id: 'cat-computador' },
    update: {},
    create: { id: 'cat-computador', name: 'Computador / Notebook', parent_id: catHardware.id },
  });
  await prisma.category.upsert({
    where: { id: 'cat-impressora' },
    update: {},
    create: { id: 'cat-impressora', name: 'Impressora / Scanner', parent_id: catHardware.id },
  });
  await prisma.category.upsert({
    where: { id: 'cat-periferico' },
    update: {},
    create: { id: 'cat-periferico', name: 'Periféricos (teclado, mouse, monitor)', parent_id: catHardware.id },
  });

  // Subcategories for Software
  await prisma.category.upsert({
    where: { id: 'cat-office' },
    update: {},
    create: { id: 'cat-office', name: 'Microsoft Office / 365', parent_id: catSoftware.id },
  });
  await prisma.category.upsert({
    where: { id: 'cat-sistema' },
    update: {},
    create: { id: 'cat-sistema', name: 'Sistema Operacional', parent_id: catSoftware.id },
  });

  console.log('Categories created.');

  // Default templates
  await prisma.template.upsert({
    where: { id: 'tpl-recebido' },
    update: {},
    create: {
      id: 'tpl-recebido',
      title: 'Chamado Recebido',
      content: 'Olá! Recebemos seu chamado e ele já está em nossa fila de atendimento. Em breve um técnico da equipe de TI entrará em contato. Agradecemos a compreensão.',
      created_by: admin.id,
    },
  });
  await prisma.template.upsert({
    where: { id: 'tpl-aguardando' },
    update: {},
    create: {
      id: 'tpl-aguardando',
      title: 'Aguardando Informações do Usuário',
      content: 'Olá! Para darmos continuidade ao atendimento, precisamos de algumas informações adicionais. Por favor, responda este chamado com os detalhes solicitados para que possamos prosseguir.',
      created_by: admin.id,
    },
  });
  await prisma.template.upsert({
    where: { id: 'tpl-resolvido' },
    update: {},
    create: {
      id: 'tpl-resolvido',
      title: 'Problema Resolvido',
      content: 'Olá! Informamos que o problema relatado foi resolvido. Caso o problema persista ou surja alguma nova dúvida, não hesite em abrir um novo chamado. Bom trabalho!',
      created_by: admin.id,
    },
  });

  console.log('Templates created.');
  console.log('\nSeed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:     admin@cead.ufsm.br / Admin@123');
  console.log('  Technician: tecnico@cead.ufsm.br / Temp@123 (force change)');
  console.log('  User:      usuario@cead.ufsm.br / Temp@123 (force change)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
