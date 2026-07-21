const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const emailEnabled = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
`;

const headerStyle = `
  background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
  padding: 32px 40px;
  border-radius: 12px 12px 0 0;
`;

const bodyStyle = `
  padding: 32px 40px;
  background: #f8fafc;
`;

const footerStyle = `
  padding: 20px 40px;
  background: #e2e8f0;
  border-radius: 0 0 12px 12px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
`;

const buildEmailWrapper = (content) => `
<div style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Suporte TI CTE</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Sistema de Chamados Técnicos</p>
  </div>
  <div style="${bodyStyle}">
    ${content}
  </div>
  <div style="${footerStyle}">
    <p>Este é um e-mail automático. Por favor, não responda diretamente a esta mensagem.</p>
    <p>Suporte TI — CEAD/UFSM</p>
  </div>
</div>
`;

const sendTicketCreatedToUser = async ({ ticket, user }) => {
  if (!emailEnabled()) return;
  const html = buildEmailWrapper(`
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Chamado Aberto com Sucesso</h2>
    <p>Olá, <strong>${user.name}</strong>!</p>
    <p>Seu chamado foi registrado no sistema e em breve nossa equipe entrará em contato.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Número do Chamado:</strong> #${ticket.id.slice(0, 8).toUpperCase()}</p>
      <p style="margin:0 0 8px;"><strong>Título:</strong> ${ticket.title}</p>
      <p style="margin:0 0 8px;"><strong>Prioridade:</strong> ${ticket.priority}</p>
      <p style="margin:0;"><strong>Status:</strong> Aberto</p>
    </div>
    <p>Acompanhe seu chamado acessando o sistema.</p>
  `);

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: `[Suporte TI] Chamado #${ticket.id.slice(0, 8).toUpperCase()} aberto`,
    html,
  });
};

const sendTicketCreatedToTeam = async ({ ticket, user, teamEmails }) => {
  if (!emailEnabled() || !teamEmails.length) return;
  const html = buildEmailWrapper(`
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Novo Chamado Recebido</h2>
    <p>Um novo chamado foi aberto e está aguardando atendimento.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Número:</strong> #${ticket.id.slice(0, 8).toUpperCase()}</p>
      <p style="margin:0 0 8px;"><strong>Solicitante:</strong> ${user.name} (${user.email})</p>
      <p style="margin:0 0 8px;"><strong>Título:</strong> ${ticket.title}</p>
      <p style="margin:0 0 8px;"><strong>Prioridade:</strong> ${ticket.priority}</p>
      <p style="margin:0;"><strong>Descrição:</strong> ${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? '...' : ''}</p>
    </div>
    <p>Acesse o sistema para atribuir e iniciar o atendimento.</p>
  `);

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: teamEmails.join(', '),
    subject: `[Suporte TI] Novo chamado: ${ticket.title}`,
    html,
  });
};

const sendStatusUpdate = async ({ ticket, user, technician, newStatus }) => {
  if (!emailEnabled()) return;

  const statusLabels = {
    open: 'Aberto',
    in_progress: 'Em Atendimento',
    waiting_user: 'Aguardando Usuário',
    resolved: 'Resolvido',
    closed: 'Encerrado',
  };

  const html = buildEmailWrapper(`
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Atualização do Chamado</h2>
    <p>O status do seu chamado foi atualizado.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Chamado:</strong> #${ticket.id.slice(0, 8).toUpperCase()} — ${ticket.title}</p>
      <p style="margin:0 0 8px;"><strong>Novo Status:</strong> ${statusLabels[newStatus] || newStatus}</p>
      ${technician ? `<p style="margin:0;"><strong>Técnico Responsável:</strong> ${technician.name}</p>` : ''}
    </div>
    <p>Acesse o sistema para acompanhar os detalhes.</p>
  `);

  const recipients = [user.email];
  if (technician && technician.email !== user.email) recipients.push(technician.email);

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(', '),
    subject: `[Suporte TI] Chamado #${ticket.id.slice(0, 8).toUpperCase()} — ${statusLabels[newStatus] || newStatus}`,
    html,
  });
};

const sendNewComment = async ({ ticket, user, technician, commentAuthor }) => {
  if (!emailEnabled()) return;

  const html = buildEmailWrapper(`
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Nova Resposta no Chamado</h2>
    <p><strong>${commentAuthor.name}</strong> adicionou uma resposta ao chamado.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0;"><strong>Chamado:</strong> #${ticket.id.slice(0, 8).toUpperCase()} — ${ticket.title}</p>
    </div>
    <p>Acesse o sistema para visualizar e responder.</p>
  `);

  const recipients = [user.email];
  if (technician && technician.email !== user.email) recipients.push(technician.email);

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(', '),
    subject: `[Suporte TI] Nova resposta — Chamado #${ticket.id.slice(0, 8).toUpperCase()}`,
    html,
  });
};

module.exports = {
  sendTicketCreatedToUser,
  sendTicketCreatedToTeam,
  sendStatusUpdate,
  sendNewComment,
};
