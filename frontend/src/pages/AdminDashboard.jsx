import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StatusBadge, PriorityBadge, SlaBadge } from '../components/Badges';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const getInitials = (name) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

const StatCard = ({ label, value, color, icon }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}20` }}>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
    </div>
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ color }}>{value}</div>
  </div>
);

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: dash }, { data: tickets }, { data: report }] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/tickets', { params: { limit: 10, status: 'open' } }),
          api.get('/reports'),
        ]);
        setDashboard(dash);
        setRecentTickets(tickets.tickets);
        setReportData(report);
      } catch {
        toast.error('Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-lg" />
        </main>
      </div>
    );
  }

  const chartData = reportData?.by_category?.slice(0, 8).map(c => ({
    name: c.category_name?.substring(0, 12) || 'N/A',
    count: c.count,
  })) || [];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do atendimento — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard label="Abertos Hoje"     value={dashboard?.open_today}    color="var(--color-info)"    icon="📬" />
          <StatCard label="Total em Aberto"  value={dashboard?.total_open}    color="var(--color-primary)" icon="📋" />
          <StatCard label="Em Atendimento"   value={dashboard?.in_progress}   color="var(--color-warning)" icon="🔧" />
          <StatCard label="Aguardando"       value={dashboard?.waiting_user}  color="#a78bfa"              icon="⏳" />
          <StatCard label="Prazo Crítico 48h+" value={dashboard?.sla_critical} color="var(--color-danger)"  icon="🔴" />
          <StatCard label="Prazo Atenção 24h+" value={dashboard?.sla_warning}  color="var(--color-warning)" icon="🟡" />
        </div>

        {/* Chart + recent tickets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="card">
            <div className="card-title">Chamados por Categoria (este mês)</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b949e' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} />
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e6edf3' }}
                    itemStyle={{ color: '#8b949e' }}
                  />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${210 + i * 15}, 70%, ${55 + i * 2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Resumo do Mês</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reportData?.by_status?.map(s => {
                const labels = { open: 'Abertos', in_progress: 'Em Atendimento', waiting_user: 'Aguardando', resolved: 'Resolvidos', closed: 'Encerrados' };
                const colors = { open: 'var(--color-info)', in_progress: 'var(--color-warning)', waiting_user: '#a78bfa', resolved: 'var(--color-success)', closed: '#6b7280' };
                return (
                  <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[s.status] || 'var(--color-primary)' }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{labels[s.status] || s.status}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{s.count}</span>
                  </div>
                );
              })}
              {reportData?.avg_rating && (
                <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border-muted)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Avaliação Média</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: s <= Math.round(reportData.avg_rating) ? 'var(--color-warning)' : 'var(--color-border)', fontSize: '1.1rem' }}>★</span>
                    ))}
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginLeft: 6 }}>
                      {reportData.avg_rating?.toFixed(1)} ({reportData.rating_count} avaliações)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent open tickets */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>Chamados Recentes em Aberto</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/tickets')}>Ver todos →</button>
          </div>

          {recentTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
              Nenhum chamado em aberto. Ótimo trabalho!
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Solicitante</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Prazo</th>
                    <th>Aberto em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/admin/tickets/${t.id}`)}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>#{t.id.slice(0,8).toUpperCase()}</td>
                      <td><div className="truncate" style={{ maxWidth: 200, fontWeight: 500 }}>{t.title}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar avatar-sm">{getInitials(t.user?.name)}</div>
                          <span style={{ fontSize: '0.875rem' }}>{t.user?.name}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><SlaBadge sla_status={t.sla_status} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
