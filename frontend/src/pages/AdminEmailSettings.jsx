import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const AdminEmailSettings = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('server'); // 'server' | 'templates'
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // SMTP state
  const [config, setConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    from_email: '',
    from_name: 'Suporte TI CTE',
  });

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentBody, setCurrentBody] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [confRes, tplRes] = await Promise.all([
        api.get('/email-config'),
        api.get('/email-config/templates'),
      ]);

      if (confRes.data) {
        setConfig({
          smtp_host: confRes.data.smtp_host || '',
          smtp_port: confRes.data.smtp_port || 587,
          smtp_secure: Boolean(confRes.data.smtp_secure),
          smtp_user: confRes.data.smtp_user || '',
          smtp_pass: confRes.data.smtp_pass || '',
          from_email: confRes.data.from_email || '',
          from_name: confRes.data.from_name || 'Suporte TI CTE',
        });
      }

      if (tplRes.data && tplRes.data.length > 0) {
        setTemplates(tplRes.data);
        const first = tplRes.data[0];
        setSelectedTemplateKey(first.key);
        setCurrentSubject(first.subject);
        setCurrentBody(first.body);
      }
    } catch (err) {
      toast.error('Erro ao carregar configurações de e-mail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.put('/email-config', config);
      toast.success('Configurações do servidor de e-mail salvas!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
      toast.error('Preencha o host, usuário e senha SMTP antes de testar');
      return;
    }

    setTesting(true);
    try {
      const { data } = await api.post('/email-config/test', config);
      toast.success(data.message || 'Conexão SMTP estabelecida com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao conectar no servidor SMTP');
    } finally {
      setTesting(false);
    }
  };

  const handleSelectTemplateKey = (key) => {
    setSelectedTemplateKey(key);
    const found = templates.find((t) => t.key === key);
    if (found) {
      setCurrentSubject(found.subject);
      setCurrentBody(found.body);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplateKey) return;
    setSavingTemplate(true);
    try {
      await api.put(`/email-config/templates/${selectedTemplateKey}`, {
        subject: currentSubject,
        body: currentBody,
      });

      setTemplates((prev) =>
        prev.map((t) =>
          t.key === selectedTemplateKey ? { ...t, subject: currentSubject, body: currentBody } : t
        )
      );

      toast.success('Modelo de e-mail atualizado!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar modelo de e-mail');
    } finally {
      setSavingTemplate(false);
    }
  };

  const activeTemplate = templates.find((t) => t.key === selectedTemplateKey);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Configurações de E-mail</h1>
            <p className="page-subtitle">
              Configure a conta de envio de e-mails do sistema e especifique as pré-definições das mensagens.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            className={`btn ${activeTab === 'server' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('server')}
          >
            ✉️ Conta e Servidor SMTP
          </button>
          <button
            className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('templates')}
          >
            📝 Pré-definições de E-mail (Templates)
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : activeTab === 'server' ? (
          /* Server Config Tab */
          <div className="card" style={{ maxWidth: 720 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>
              Dados do Servidor SMTP
            </div>
            <form onSubmit={handleSaveConfig}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Servidor SMTP (Host)</label>
                  <input
                    type="text"
                    name="smtp_host"
                    className="form-input"
                    placeholder="ex: smtp.gmail.com ou smtp.office365.com"
                    value={config.smtp_host}
                    onChange={handleConfigChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Porta</label>
                  <input
                    type="number"
                    name="smtp_port"
                    className="form-input"
                    placeholder="587"
                    value={config.smtp_port}
                    onChange={handleConfigChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="smtp_secure"
                    checked={config.smtp_secure}
                    onChange={handleConfigChange}
                  />
                  <span>Requer SSL/TLS Direto (Geralmente para porta 465)</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">E-mail / Usuário da Conta</label>
                  <input
                    type="email"
                    name="smtp_user"
                    className="form-input"
                    placeholder="ex: suporte-ti@seu-dominio.com"
                    value={config.smtp_user}
                    onChange={handleConfigChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha / App Password</label>
                  <input
                    type="password"
                    name="smtp_pass"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={config.smtp_pass}
                    onChange={handleConfigChange}
                    required
                  />
                </div>
              </div>

              <div className="divider" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">E-mail do Remetente (From Email)</label>
                  <input
                    type="email"
                    name="from_email"
                    className="form-input"
                    placeholder="Opcional. Padrão: e-mail da conta"
                    value={config.from_email}
                    onChange={handleConfigChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome Exibido do Remetente</label>
                  <input
                    type="text"
                    name="from_name"
                    className="form-input"
                    placeholder="ex: Suporte TI CTE"
                    value={config.from_name}
                    onChange={handleConfigChange}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTestConnection}
                  disabled={testing || savingConfig}
                >
                  {testing ? <span className="spinner" /> : '🔌'} Testar Conexão
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingConfig || testing}>
                  {savingConfig ? <span className="spinner" /> : '💾'} Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Templates Tab */
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
            {/* List of Templates */}
            <div className="card" style={{ padding: 12 }}>
              <div className="card-title" style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                Modelos de E-mail
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {templates.map((tpl) => (
                  <button
                    key={tpl.key}
                    className={`btn btn-sm ${selectedTemplateKey === tpl.key ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ textAlign: 'left', justifyContent: 'flex-start', height: 'auto', padding: '10px 12px' }}
                    onClick={() => handleSelectTemplateKey(tpl.key)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{tpl.name}</div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, fontFamily: 'monospace' }}>{tpl.key}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor Form */}
            <div className="card">
              {activeTemplate ? (
                <form onSubmit={handleSaveTemplate}>
                  <div className="card-title" style={{ marginBottom: 16 }}>
                    Editar: {activeTemplate.name}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assunto do E-mail</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Corpo do E-mail (HTML)</label>
                    <textarea
                      className="form-textarea"
                      rows={12}
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      value={currentBody}
                      onChange={(e) => setCurrentBody(e.target.value)}
                      required
                    />
                  </div>

                  <div
                    style={{
                      background: 'var(--color-surface-2)',
                      padding: 12,
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: 16,
                    }}
                  >
                    <strong>Variáveis disponíveis para uso neste modelo:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontFamily: 'monospace' }}>
                      <span>{'{ticket_id}'}</span>
                      <span>{'{ticket_title}'}</span>
                      <span>{'{ticket_description}'}</span>
                      <span>{'{ticket_priority}'}</span>
                      <span>{'{user_name}'}</span>
                      <span>{'{user_email}'}</span>
                      <span>{'{status}'}</span>
                      <span>{'{tech_name}'}</span>
                      <span>{'{author_name}'}</span>
                      <span>{'{comment_content}'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingTemplate}>
                      {savingTemplate ? <span className="spinner" /> : '💾'} Salvar Modelo
                    </button>
                  </div>
                </form>
              ) : (
                <div className="empty-state">Selecione um modelo à esquerda para editar.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminEmailSettings;
