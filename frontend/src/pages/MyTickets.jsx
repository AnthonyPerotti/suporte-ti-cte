import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StatusBadge, PriorityBadge, SlaBadge } from '../components/Badges';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Atendimento' },
  { value: 'waiting_user', label: 'Aguardando Usuário' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Encerrado' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas as prioridades' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Baixa' },
];

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const limit = 15;

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...(status && { status }), ...(priority && { priority }), ...(search && { search }) };
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [page, status, priority, search]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Meus Chamados</h1>
            <p className="page-subtitle">Olá, {user?.name?.split(' ')[0]}. Acompanhe seus atendimentos.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/new-ticket')}>
            + Abrir Chamado
          </button>
        </div>

        {/* Filters */}
        <div className="filter-row">
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar chamados..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Nenhum chamado encontrado</div>
              <div className="empty-state-subtitle">
                {search || status || priority ? 'Tente ajustar os filtros.' : 'Você ainda não abriu nenhum chamado.'}
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/new-ticket')}>
                Abrir primeiro chamado
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>SLA</th>
                    <th>Aberto em</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        #{t.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div className="truncate" style={{ fontWeight: 500 }}>{t.title}</div>
                        {t.category && <div className="text-xs text-muted">{t.category.name}</div>}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><SlaBadge sla_status={t.sla_status} /></td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(t.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="pagination">
                <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`pagination-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pagination-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyTickets;
