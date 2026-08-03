const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../services/email.service');

const DEFAULT_TEMPLATES = [
  {
    key: 'ticket_created_user',
    name: 'Confirmação / Backup de Abertura de Chamado (Usuário)',
    subject: '[Chamado #{ticket_id}] {ticket_title}',
    body: `<h2 style="color:#1e3a5f;margin:0 0 16px;">Chamado Registrado (Backup)</h2>
<p>Olá, <strong>{user_name}</strong>!</p>
<p>Seu chamado foi registrado com sucesso em nosso sistema como backup. Seguem os detalhes do seu registro:</p>
<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 8px;"><strong>Número do Chamado:</strong> #{ticket_id}</p>
  <p style="margin:0 0 8px;"><strong>Título:</strong> {ticket_title}</p>
  <p style="margin:0 0 8px;"><strong>Prioridade:</strong> {ticket_priority}</p>
  <p style="margin:0;"><strong>Descrição:</strong></p>
  <div style="background:#f1f5f9;padding:12px;border-radius:6px;margin-top:6px;white-space:pre-wrap;">{ticket_description}</div>
</div>
<p>Guarde este e-mail para seu acompanhamento e acompanhe as atualizações no sistema.</p>`,
  },
  {
    key: 'ticket_created_team',
    name: 'Notificação de Novo Chamado (Equipe TI)',
    subject: '[Novo Chamado] #{ticket_id} - {ticket_title}',
    body: `<h2 style="color:#1e3a5f;margin:0 0 16px;">Novo Chamado Recebido</h2>
<p>Um novo chamado foi aberto e está aguardando atendimento da equipe.</p>
<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 8px;"><strong>Número:</strong> #{ticket_id}</p>
  <p style="margin:0 0 8px;"><strong>Solicitante:</strong> {user_name} ({user_email})</p>
  <p style="margin:0 0 8px;"><strong>Título:</strong> {ticket_title}</p>
  <p style="margin:0 0 8px;"><strong>Prioridade:</strong> {ticket_priority}</p>
  <p style="margin:0;"><strong>Descrição:</strong></p>
  <div style="background:#f1f5f9;padding:12px;border-radius:6px;margin-top:6px;white-space:pre-wrap;">{ticket_description}</div>
</div>
<p>Acesse o sistema para atribuir e dar suporte.</p>`,
  },
  {
    key: 'status_update',
    name: 'Atualização de Status do Chamado',
    subject: '[Chamado #{ticket_id}] Status alterado para {status}',
    body: `<h2 style="color:#1e3a5f;margin:0 0 16px;">Atualização de Status do Chamado</h2>
<p>Olá, <strong>{user_name}</strong>!</p>
<p>O status do seu chamado <strong>#{ticket_id}</strong> foi alterado.</p>
<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 8px;"><strong>Chamado:</strong> #{ticket_id} — {ticket_title}</p>
  <p style="margin:0 0 8px;"><strong>Novo Status:</strong> <span style="display:inline-block;padding:4px 8px;background:#2563eb;color:#fff;border-radius:4px;font-weight:600;">{status}</span></p>
  <p style="margin:0;"><strong>Técnico Responsável:</strong> {tech_name}</p>
</div>
<p>Acesse o sistema para acompanhar os detalhes.</p>`,
  },
  {
    key: 'comment_tech_to_user',
    name: 'Nova Resposta da Equipe de TI para o Usuário',
    subject: '[Chamado #{ticket_id}] Nova mensagem da Equipe de TI',
    body: `<h2 style="color:#1e3a5f;margin:0 0 16px;">Nova Resposta da Equipe de TI</h2>
<p>Olá, <strong>{user_name}</strong>!</p>
<p><strong>{author_name}</strong> adicionou uma resposta ao seu chamado <strong>#{ticket_id}</strong>:</p>
<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 8px;font-weight:600;color:#1e3a5f;">Mensagem:</p>
  <div style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px;border-left:4px solid #2563eb;">{comment_content}</div>
</div>
<p>Acesse o sistema para responder.</p>`,
  },
  {
    key: 'comment_user_to_tech',
    name: 'Nova Resposta do Usuário para o Técnico Responsável',
    subject: '[Chamado #{ticket_id}] Nova mensagem do usuário {user_name}',
    body: `<h2 style="color:#1e3a5f;margin:0 0 16px;">Nova Resposta do Usuário</h2>
<p>Olá, <strong>{tech_name}</strong>!</p>
<p>O usuário <strong>{user_name}</strong> atualizou/respondeu o chamado <strong>#{ticket_id}</strong>:</p>
<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 8px;font-weight:600;color:#1e3a5f;">Mensagem do Usuário:</p>
  <div style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px;border-left:4px solid #16a34a;">{comment_content}</div>
</div>
<p>Acesse o sistema para verificar e dar andamento ao atendimento.</p>`,
  },
];

const getEmailConfig = async (req, res) => {
  try {
    let config = await prisma.emailConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = {
        id: 'default',
        smtp_host: process.env.SMTP_HOST || '',
        smtp_port: parseInt(process.env.SMTP_PORT || '587'),
        smtp_secure: process.env.SMTP_SECURE === 'true',
        smtp_user: process.env.SMTP_USER || '',
        smtp_pass: process.env.SMTP_PASS || '',
        from_email: process.env.SMTP_USER || '',
        from_name: 'Suporte TI CTE',
      };
    }
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao carregar configurações de e-mail' });
  }
};

const updateEmailConfig = async (req, res) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_email, from_name } = req.body;

  try {
    const config = await prisma.emailConfig.upsert({
      where: { id: 'default' },
      update: {
        smtp_host: smtp_host || null,
        smtp_port: parseInt(smtp_port || 587),
        smtp_secure: Boolean(smtp_secure),
        smtp_user: smtp_user || null,
        smtp_pass: smtp_pass || null,
        from_email: from_email || null,
        from_name: from_name || 'Suporte TI CTE',
      },
      create: {
        id: 'default',
        smtp_host: smtp_host || null,
        smtp_port: parseInt(smtp_port || 587),
        smtp_secure: Boolean(smtp_secure),
        smtp_user: smtp_user || null,
        smtp_pass: smtp_pass || null,
        from_email: from_email || null,
        from_name: from_name || 'Suporte TI CTE',
      },
    });

    emailService.clearTransporterCache();
    return res.json(config);
  } catch (err) {
    console.error('Erro ao atualizar configurações de e-mail:', err);
    return res.status(500).json({ error: 'Erro ao salvar configurações de e-mail' });
  }
};

const testEmailConfig = async (req, res) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass } = req.body;

  if (!smtp_host || !smtp_user || !smtp_pass) {
    return res.status(400).json({ error: 'Host, usuário e senha SMTP são obrigatórios para o teste' });
  }

  try {
    await emailService.testSmtpConnection({
      smtp_host,
      smtp_port: parseInt(smtp_port || 587),
      smtp_secure: Boolean(smtp_secure),
      smtp_user,
      smtp_pass,
    });

    return res.json({ message: 'Conexão SMTP estabelecida com sucesso!' });
  } catch (err) {
    console.error('Erro ao testar SMTP:', err.message);
    return res.status(400).json({ error: `Falha na conexão SMTP: ${err.message}` });
  }
};

const getEmailTemplates = async (req, res) => {
  try {
    const existing = await prisma.emailTemplate.findMany();
    const map = new Map(existing.map((t) => [t.key, t]));

    const result = DEFAULT_TEMPLATES.map((def) => {
      const found = map.get(def.key);
      if (found) {
        return { ...def, id: found.id, subject: found.subject, body: found.body };
      }
      return def;
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao carregar pré-definições de e-mail' });
  }
};

const updateEmailTemplate = async (req, res) => {
  const { key } = req.params;
  const { subject, body } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: 'Assunto e corpo do e-mail são obrigatórios' });
  }

  const def = DEFAULT_TEMPLATES.find((t) => t.key === key);
  const name = def ? def.name : key;

  try {
    const tpl = await prisma.emailTemplate.upsert({
      where: { key },
      update: { subject, body, name },
      create: { key, name, subject, body },
    });

    return res.json(tpl);
  } catch (err) {
    console.error('Erro ao atualizar modelo de e-mail:', err);
    return res.status(500).json({ error: 'Erro ao salvar modelo de e-mail' });
  }
};

module.exports = {
  getEmailConfig,
  updateEmailConfig,
  testEmailConfig,
  getEmailTemplates,
  updateEmailTemplate,
};
