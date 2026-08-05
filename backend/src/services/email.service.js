const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let cachedTransporter = null;
let lastConfigHash = null;

const getConfig = async () => {
  try {
    const dbConfig = await prisma.emailConfig.findUnique({ where: { id: 'default' } });
    if (dbConfig && dbConfig.smtp_host && dbConfig.smtp_user && dbConfig.smtp_pass) {
      return {
        host: dbConfig.smtp_host,
        port: dbConfig.smtp_port || 587,
        secure: Boolean(dbConfig.smtp_secure),
        user: dbConfig.smtp_user,
        pass: dbConfig.smtp_pass,
        fromEmail: dbConfig.from_email || dbConfig.smtp_user,
        fromName: dbConfig.from_name || 'Suporte TI CTE',
      };
    }
  } catch (err) {
    console.error('Erro ao buscar configuração de e-mail no banco:', err.message);
  }

  // Fallback to environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromEmail: process.env.SMTP_USER,
      fromName: 'Suporte TI CTE',
    };
  }

  return null;
};

const getTransporter = async () => {
  const config = await getConfig();
  if (!config) return null;

  const currentHash = `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass}`;
  if (cachedTransporter && lastConfigHash === currentHash) {
    return { transporter: cachedTransporter, config };
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  lastConfigHash = currentHash;
  return { transporter: cachedTransporter, config };
};

const clearTransporterCache = () => {
  cachedTransporter = null;
  lastConfigHash = null;
};

const testSmtpConnection = async (customConfig) => {
  const transporter = nodemailer.createTransport({
    host: customConfig.smtp_host,
    port: parseInt(customConfig.smtp_port || 587),
    secure: Boolean(customConfig.smtp_secure),
    auth: {
      user: customConfig.smtp_user,
      pass: customConfig.smtp_pass,
    },
  });

  await transporter.verify();
  return true;
};

const getTemplate = async (key, defaultSubject, defaultBody) => {
  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { key } });
    if (tpl) {
      return { subject: tpl.subject, body: tpl.body };
    }
  } catch (err) {
    console.error(`Erro ao buscar template '${key}' no banco:`, err.message);
  }
  return { subject: defaultSubject, body: defaultBody };
};

const renderTemplate = (str, data) => {
  if (!str) return '';
  let result = str;
  Object.keys(data).forEach((key) => {
    const val = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  });
  return result;
};

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const headerStyle = `
  background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
  padding: 24px 32px;
`;

const bodyStyle = `
  padding: 32px;
  background: #f8fafc;
  color: #334155;
  line-height: 1.6;
`;

const footerStyle = `
  padding: 16px 32px;
  background: #e2e8f0;
  text-align: center;
  color: #64748b;
  font-size: 12px;
`;

const buildEmailWrapper = (content) => `
<div style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">Suporte TI CTE</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">Sistema de Chamados Técnicos</p>
  </div>
  <div style="${bodyStyle}">
    ${content}
  </div>
  <div style="${footerStyle}">
    <p style="margin:0 0 4px;">Este é um e-mail automático do sistema de chamados.</p>
    <p style="margin:0;">Suporte TI — CEAD/UFSM</p>
  </div>
</div>
`;

// Helper for email threading
const getThreadHeaders = (ticketId) => {
  const rootMessageId = `<ticket-${ticketId}@suporte-ti-cte>`;
  return {
    'In-Reply-To': rootMessageId,
    'References': rootMessageId,
  };
};

const sendTicketCreatedToUser = async ({ ticket, user }) => {
  const transportObj = await getTransporter();
  if (!transportObj) return;
  const { transporter, config } = transportObj;

  const ticketIdShort = ticket.id.slice(0, 8).toUpperCase();
  const defaultSubject = `[Chamado #${ticketIdShort}] ${ticket.title}`;
  const defaultBody = `
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Chamado Registrado</h2>
    <p>Olá, <strong>{user_name}</strong>!</p>
    <p>Seu chamado foi registrado com sucesso em nosso sistema como backup. Seguem os detalhes do seu registro:</p>
    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Número do Chamado:</strong> #{ticket_id}</p>
      <p style="margin:0 0 8px;"><strong>Título:</strong> {ticket_title}</p>
      <p style="margin:0 0 8px;"><strong>Prioridade:</strong> {ticket_priority}</p>
      <p style="margin:0;"><strong>Descrição:</strong></p>
      <div style="background:#f1f5f9;padding:12px;border-radius:6px;margin-top:6px;white-space:pre-wrap;">{ticket_description}</div>
    </div>
    <p>Guarde este e-mail para seu acompanhamento e acompanhe as atualizações no sistema.</p>
  `;

  const template = await getTemplate('ticket_created_user', defaultSubject, defaultBody);
  const data = {
    user_name: user.name,
    ticket_id: ticketIdShort,
    ticket_title: ticket.title,
    ticket_priority: ticket.priority,
    ticket_description: ticket.description,
  };

  const subject = renderTemplate(template.subject, data);
  const html = buildEmailWrapper(renderTemplate(template.body, data));

  const fromAddress = `"${config.fromName}" <${config.fromEmail}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: user.email,
    subject,
    html,
    headers: getThreadHeaders(ticket.id),
  });
};

const sendTicketCreatedToTeam = async ({ ticket, user, teamEmails }) => {
  if (!teamEmails || !teamEmails.length) return;
  const transportObj = await getTransporter();
  if (!transportObj) return;
  const { transporter, config } = transportObj;

  const ticketIdShort = ticket.id.slice(0, 8).toUpperCase();
  const defaultSubject = `[Chamado #${ticketIdShort}] ${ticket.title}`;
  const defaultBody = `
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Novo Chamado Recebido</h2>
    <p>Um novo chamado foi aberto e está aguardando atendimento da equipe.</p>
    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Número:</strong> #{ticket_id}</p>
      <p style="margin:0 0 8px;"><strong>Solicitante:</strong> {user_name} ({user_email})</p>
      <p style="margin:0 0 8px;"><strong>Título:</strong> {ticket_title}</p>
      <p style="margin:0 0 8px;"><strong>Prioridade:</strong> {ticket_priority}</p>
      <p style="margin:0;"><strong>Descrição:</strong></p>
      <div style="background:#f1f5f9;padding:12px;border-radius:6px;margin-top:6px;white-space:pre-wrap;">{ticket_description}</div>
    </div>
    <p>Acesse o sistema para atribuir e dar suporte.</p>
  `;

  const template = await getTemplate('ticket_created_team', defaultSubject, defaultBody);
  const data = {
    user_name: user.name,
    user_email: user.email,
    ticket_id: ticketIdShort,
    ticket_title: ticket.title,
    ticket_priority: ticket.priority,
    ticket_description: ticket.description,
  };

  const subject = renderTemplate(template.subject, data);
  const html = buildEmailWrapper(renderTemplate(template.body, data));
  const fromAddress = `"${config.fromName}" <${config.fromEmail}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: teamEmails.join(', '),
    subject,
    html,
    headers: getThreadHeaders(ticket.id),
  });
};

const sendStatusUpdate = async ({ ticket, user, technician, newStatus }) => {
  const transportObj = await getTransporter();
  if (!transportObj) return;
  const { transporter, config } = transportObj;

  const statusLabels = {
    open: 'Aberto',
    in_progress: 'Em Atendimento',
    waiting_user: 'Aguardando Usuário',
    resolved: 'Resolvido',
    closed: 'Encerrado',
  };

  const ticketIdShort = ticket.id.slice(0, 8).toUpperCase();
  const statusName = statusLabels[newStatus] || newStatus;

  const defaultSubject = `[Chamado #${ticketIdShort}] ${ticket.title}`;
  const defaultBody = `
    <h2 style="color:#1e3a5f;margin:0 0 16px;">Atualização de Status do Chamado</h2>
    <p>Olá, <strong>{user_name}</strong>!</p>
    <p>O status do seu chamado <strong>#{ticket_id}</strong> foi alterado.</p>
    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Chamado:</strong> #{ticket_id} — {ticket_title}</p>
      <p style="margin:0 0 8px;"><strong>Novo Status:</strong> <span style="display:inline-block;padding:4px 8px;background:#2563eb;color:#fff;border-radius:4px;font-weight:600;">{status}</span></p>
      <p style="margin:0;"><strong>Técnico Responsável:</strong> {tech_name}</p>
    </div>
    <p>Acesse o sistema para acompanhar os detalhes.</p>
  `;

  const template = await getTemplate('status_update', defaultSubject, defaultBody);
  const data = {
    user_name: user.name,
    ticket_id: ticketIdShort,
    ticket_title: ticket.title,
    status: statusName,
    tech_name: technician ? technician.name : 'Não atribuído',
  };

  const subject = renderTemplate(template.subject, data);
  const html = buildEmailWrapper(renderTemplate(template.body, data));
  const fromAddress = `"${config.fromName}" <${config.fromEmail}>`;

  const recipients = [user.email];
  if (technician && technician.email && technician.email !== user.email) {
    recipients.push(technician.email);
  }

  await transporter.sendMail({
    from: fromAddress,
    to: recipients.join(', '),
    subject,
    html,
    headers: getThreadHeaders(ticket.id),
  });
};

const sendNewComment = async ({ ticket, user, technician, commentAuthor, commentContent }) => {
  const transportObj = await getTransporter();
  if (!transportObj) return;
  const { transporter, config } = transportObj;

  const ticketIdShort = ticket.id.slice(0, 8).toUpperCase();
  const fromAddress = `"${config.fromName}" <${config.fromEmail}>`;

  const isAuthorStaff = ['admin', 'technician'].includes(commentAuthor.role);

  if (isAuthorStaff) {
    // Staff/Tech commented -> notify the ticket owner (User)
    const defaultSubject = `[Chamado #${ticketIdShort}] ${ticket.title}`;
    const defaultBody = `
      <h2 style="color:#1e3a5f;margin:0 0 16px;">Nova Resposta da Equipe de TI</h2>
      <p>Olá, <strong>{user_name}</strong>!</p>
      <p><strong>{author_name}</strong> adicionou uma resposta ao seu chamado <strong>#{ticket_id}</strong>:</p>
      <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:#1e3a5f;">Mensagem:</p>
        <div style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px;border-left:4px solid #2563eb;">{comment_content}</div>
      </div>
      <p>Acesse o sistema para responder.</p>
    `;

    const template = await getTemplate('comment_tech_to_user', defaultSubject, defaultBody);
    const data = {
      user_name: user.name,
      author_name: commentAuthor.name,
      ticket_id: ticketIdShort,
      ticket_title: ticket.title,
      comment_content: commentContent || '',
    };

    const subject = renderTemplate(template.subject, data);
    const html = buildEmailWrapper(renderTemplate(template.body, data));

    await transporter.sendMail({
      from: fromAddress,
      to: user.email,
      subject,
      html,
      headers: getThreadHeaders(ticket.id),
    });
  } else {
    // Common user commented -> notify the assigned technician (if assigned)
    if (!technician || !technician.email) return;

    const defaultSubject = `[Chamado #${ticketIdShort}] ${ticket.title}`;
    const defaultBody = `
      <h2 style="color:#1e3a5f;margin:0 0 16px;">Nova Resposta do Usuário</h2>
      <p>Olá, <strong>{tech_name}</strong>!</p>
      <p>O usuário <strong>{user_name}</strong> atualizou/respondeu o chamado <strong>#{ticket_id}</strong>:</p>
      <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:#1e3a5f;">Mensagem do Usuário:</p>
        <div style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px;border-left:4px solid #16a34a;">{comment_content}</div>
      </div>
      <p>Acesse o sistema para verificar e dar andamento ao atendimento.</p>
    `;

    const template = await getTemplate('comment_user_to_tech', defaultSubject, defaultBody);
    const data = {
      tech_name: technician.name,
      user_name: user.name,
      ticket_id: ticketIdShort,
      ticket_title: ticket.title,
      comment_content: commentContent || '',
    };

    const subject = renderTemplate(template.subject, data);
    const html = buildEmailWrapper(renderTemplate(template.body, data));

    await transporter.sendMail({
      from: fromAddress,
      to: technician.email,
      subject,
      html,
      headers: getThreadHeaders(ticket.id),
    });
  }
};

const sendSampleTemplateEmail = async ({ targetEmail, rawSubject, rawBody }) => {
  const transportObj = await getTransporter();
  if (!transportObj) {
    throw new Error('Servidor de e-mail não configurado ou inativo');
  }
  const { transporter, config } = transportObj;

  const sampleData = {
    user_name: 'Usuário de Teste',
    user_email: targetEmail,
    ticket_id: 'TST12345',
    ticket_title: 'Chamado de Teste do Sistema',
    ticket_description: 'Esta é uma mensagem de teste enviada pelo painel administrativo para validar o modelo de e-mail.',
    ticket_priority: 'Alta',
    status: 'Em Atendimento',
    tech_name: 'Técnico de Suporte',
    author_name: 'Administrador do Sistema',
    comment_content: 'Este é um comentário de exemplo utilizado no teste de envio do modelo de e-mail.',
  };

  const subject = renderTemplate(rawSubject || '[Teste] Modelo de E-mail', sampleData);
  const html = buildEmailWrapper(renderTemplate(rawBody || '<p>Teste de envio de e-mail</p>', sampleData));
  const fromAddress = `"${config.fromName}" <${config.fromEmail}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: targetEmail,
    subject: `[TESTE] ${subject}`,
    html,
  });
};

module.exports = {
  sendTicketCreatedToUser,
  sendTicketCreatedToTeam,
  sendStatusUpdate,
  sendNewComment,
  testSmtpConnection,
  sendSampleTemplateEmail,
  clearTransporterCache,
};
