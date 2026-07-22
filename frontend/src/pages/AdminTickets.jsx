import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StatusBadge, PriorityBadge, SlaBadge } from '../components/Badges';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Atendimento' },
  { value: 'waiting_user', label: 'Aguardando Usuário' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Encerrado' },
];

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const getInitials = (name) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();
  const limit = 15;

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...(status && { status }), ...(search && { search }), ...(assigneeId && { assignee_id: assigneeId }), archived: showArchived };
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/users/technicians').then(({ data }) => setTechnicians(data)).catch(() => {});
  }, []);

  useEffect(() => { fetchTickets(); }, [page, status, search, assigneeId, showArchived]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Fila de Chamados</h1>
            <p className="page-subtitle">Gerencie todos os atendimentos do sistema.</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchTickets} disabled={loading}>
            ↻ Recarregar
          </button>
        </div>

        <div className="filter-row">
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar por título ou descrição..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={assigneeId} onChange={e => { setAssigneeId(e.target.value); setPage(1); }}>
            <option value="">Qualquer técnico</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button 
            className={`btn btn-sm ${showArchived ? 'btn-danger' : 'btn-ghost'}`} 
            onClick={() => { setShowArchived(!showArchived); setPage(1); }}
          >
            {showArchived ? 'Ocultar Arquivados' : 'Mostrar Arquivados'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : tickets.length === 0 ? (
          <div className="card"><div className="empty-state">Nenhum chamado encontrado com os filtros atuais.</div></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Solicitante</th>
                    <th>Técnico</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th>Aberto em</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/admin/tickets/${t.id}`)}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>#{t.id.slice(0, 8).toUpperCase()}</td>
                      <td style={{ maxWidth: 220 }}>
                        <div className="truncate" style={{ fontWeight: 500 }}>{t.title}</div>
                        {t.category && <div className="text-xs text-muted">{t.category.name}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar avatar-sm">{getInitials(t.user?.name)}</div>
                          <div className="truncate" style={{ maxWidth: 120 }}>{t.user?.name}</div>
                        </div>
                      </td>
                      <td>
                        {t.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="avatar avatar-sm" style={{ background: 'var(--color-primary)', width: 20, height: 20, fontSize: '0.6rem' }}>{getInitials(t.assignee.name)}</div>
                            <span className="text-sm truncate" style={{ maxWidth: 100 }}>{t.assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><SlaBadge sla_status={t.sla_status} /></td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="pagination">
                <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0 12px' }}>Página {page} de {pages}</span>
                <button className="pagination-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminTickets;
