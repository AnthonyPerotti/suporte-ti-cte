import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ACTION_LABELS = {
  LOGIN: 'Login no Sistema',
  LOGIN_FAILED: 'Falha no Login',
  LOGOUT: 'Logout do Sistema',
  TICKET_CREATE: 'Chamado Criado',
  CREATE_TICKET: 'Chamado Criado',
  TICKET_UPDATE_STATUS: 'Status de Chamado Alterado',
  TICKET_ARCHIVE: 'Chamado Arquivado',
  TICKET_UNARCHIVE: 'Chamado Desarquivado',
  TICKET_DELETE: 'Chamado Excluído (Root)',
  USER_CREATE: 'Usuário Criado',
  USER_UPDATE: 'Usuário Atualizado',
  USER_PASSWORD_RESET: 'Senha Resetada',
  EMAIL_TEMPLATE_UPDATE: 'Modelo de E-mail Editado',
  EMAIL_TEMPLATE_TEST_SEND: 'Teste de Envio de E-mail',
};

const RESOURCE_LABELS = {
  auth: 'Autenticação',
  tickets: 'Chamados',
  users: 'Usuários',
  categories: 'Categorias',
  templates: 'Respostas Rápidas',
  email_config: 'Config. E-mail',
  system: 'Sistema',
};

const ROLE_BADGE_COLORS = {
  root: '#ef4444',
  admin: '#2563eb',
  technician: '#059669',
  user: '#6b7280',
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const AdminAuditLogs = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Modal details state
  const [selectedDetails, setSelectedDetails] = useState(null);

  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(search && { search }),
        ...(resource && { resource }),
        ...(action && { action }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };

      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, resource, action, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setResource('');
    setAction('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(resource && { resource }),
        ...(action && { action }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });

      const response = await api.get(`/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Relatório de logs exportado em CSV com sucesso!');
    } catch {
      toast.error('Erro ao exportar relatório de logs');
    } finally {
      setExporting(false);
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Logs do Sistema e Auditoria</h1>
            <p className="page-subtitle">
              Histórico completo de ações, alterações e eventos registrados no sistema.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleExportCsv} disabled={exporting || loading}>
            {exporting ? <span className="spinner" /> : '📥'} Exportar CSV
          </button>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <form onSubmit={handleSearchSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Pesquisar</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Usuário, ação, IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Recurso</label>
                <select
                  className="form-select"
                  value={resource}
                  onChange={(e) => { setResource(e.target.value); setPage(1); }}
                >
                  <option value="">Todos os recursos</option>
                  <option value="auth">Autenticação</option>
                  <option value="tickets">Chamados</option>
                  <option value="users">Usuários</option>
                  <option value="categories">Categorias</option>
                  <option value="templates">Respostas Rápidas</option>
                  <option value="email_config">Config. E-mail</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Ação</label>
                <select
                  className="form-select"
                  value={action}
                  onChange={(e) => { setAction(e.target.value); setPage(1); }}
                >
                  <option value="">Todas as ações</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="TICKET_CREATE">TICKET_CREATE</option>
                  <option value="TICKET_UPDATE_STATUS">TICKET_UPDATE_STATUS</option>
                  <option value="TICKET_DELETE">TICKET_DELETE</option>
                  <option value="USER_CREATE">USER_CREATE</option>
                  <option value="USER_UPDATE">USER_UPDATE</option>
                  <option value="EMAIL_TEMPLATE_UPDATE">EMAIL_TEMPLATE_UPDATE</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>De (Data Inicial)</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Até (Data Final)</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetFilters}>
                Limpar Filtros
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                🔍 Filtrar
              </button>
            </div>
          </form>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="card">
            <div className="empty-state">Nenhum log de auditoria encontrado com os filtros atuais.</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>Recurso</th>
                    <th>IP</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    let formattedDetails = log.details;
                    try {
                      if (log.details && log.details.startsWith('{')) {
                        const parsed = JSON.parse(log.details);
                        formattedDetails = Object.entries(parsed)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' | ');
                      }
                    } catch {
                      // Keep raw
                    }

                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_name || 'Sistema'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                              {log.user_email}
                              {log.user_role && (
                                <span
                                  className="badge"
                                  style={{
                                    background: ROLE_BADGE_COLORS[log.user_role] || '#6b7280',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    fontSize: '0.65rem',
                                    borderRadius: 4,
                                  }}
                                >
                                  {log.user_role}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              color: log.action.includes('DELETE') ? 'var(--color-danger)' : 'var(--color-primary)',
                            }}
                          >
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-normal" style={{ fontSize: '0.75rem' }}>
                            {RESOURCE_LABELS[log.resource] || log.resource}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {log.ip_address || '—'}
                        </td>
                        <td>
                          {log.details ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              onClick={() => setSelectedDetails(log.details)}
                            >
                              🔍 Ver Detalhes
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="pagination">
                <button className="pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ←
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0 12px' }}>
                  Página {page} de {pages} (Total: {total} logs)
                </span>
                <button className="pagination-btn" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                  →
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal Details */}
        {selectedDetails && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
          >
            <div className="card" style={{ maxWidth: 600, width: '100%' }}>
              <div className="card-title" style={{ marginBottom: 12 }}>
                Detalhes do Registro de Auditoria
              </div>
              <pre
                style={{
                  background: 'var(--color-bg)',
                  padding: 16,
                  borderRadius: 6,
                  overflowX: 'auto',
                  fontSize: '0.85rem',
                  maxHeight: 350,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedDetails), null, 2);
                  } catch {
                    return selectedDetails;
                  }
                })()}
              </pre>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setSelectedDetails(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAuditLogs;
