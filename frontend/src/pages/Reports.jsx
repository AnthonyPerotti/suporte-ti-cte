import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [technicians, setTechnicians] = useState([]);
  const [technicianId, setTechnicianId] = useState('');
  
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const [purgePassword, setPurgePassword] = useState('');
  const [purging, setPurging] = useState(false);
  
  const toast = useToast();
  const { user } = useAuth();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { from, to, ...(technicianId && { technician_id: technicianId }) };
      const res = await api.get('/reports', { params });
      setData(res.data);
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/users/technicians').then(res => setTechnicians(res.data)).catch(() => {});
    fetchReports();
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams({ from, to });
    const url = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/api/reports/export?${params.toString()}`;
    const token = localStorage.getItem('access_token');
    
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-tickets-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Erro ao exportar CSV'));
  };

  const handlePurge = async () => {
    if (purgeConfirmation !== 'EXCLUIR DADOS') {
      toast.error('Digite a confirmação exatamente como solicitado');
      return;
    }
    if (!purgePassword) {
      toast.error('A senha é obrigatória');
      return;
    }
    
    if (!window.confirm('TEM CERTEZA ABSOLUTA? Esta ação NÃO PODE SER DESFEITA!')) return;

    setPurging(true);
    try {
      const res = await api.post('/reports/purge', { from, to, password: purgePassword });
      toast.success(`Sucesso! ${res.data.count} chamados foram apagados definitivamente.`);
      setShowPurgeModal(false);
      setPurgeConfirmation('');
      setPurgePassword('');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao purgar dados. Senha incorreta?');
    } finally {
      setPurging(false);
    }
  };

  const STATUS_COLORS = { open: 'var(--color-info)', in_progress: 'var(--color-warning)', waiting_user: '#a78bfa', resolved: 'var(--color-success)', closed: '#6b7280' };
  const STATUS_LABELS = { open: 'Aberto', in_progress: 'Em Atend.', waiting_user: 'Aguardando', resolved: 'Resolvido', closed: 'Fechado' };
  const PRIORITY_COLORS = { urgent: 'var(--color-urgent)', high: 'var(--color-high)', normal: 'var(--color-info)', low: 'var(--color-low)' };
  const PRIORITY_LABELS = { urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baixa' };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center flex-wrap gap-16">
          <div>
            <h1 className="page-title">Relatórios</h1>
            <p className="page-subtitle">Métricas e estatísticas de atendimento.</p>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={handleExport}>📥 Exportar CSV</button>
            {user?.role === 'admin' && (
              <button className="btn btn-danger" onClick={() => setShowPurgeModal(true)}>🗑️ Purgar Dados</button>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="flex gap-16 items-end flex-wrap">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Data Inicial</label>
              <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Data Final</label>
              <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">Técnico</label>
              <select className="form-select" value={technicianId} onChange={e => setTechnicianId(e.target.value)}>
                <option value="">Todos</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={fetchReports} disabled={loading}>Filtrar</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total de Chamados</div>
                <div className="stat-value">{data?.total || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Tempo Médio de Resolução</div>
                <div className="stat-value" style={{ color: 'var(--color-info)' }}>
                  {data?.avg_resolution_hours ? `${data.avg_resolution_hours.toFixed(1)}h` : 'N/A'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avaliação Média</div>
                <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                  {data?.avg_rating ? `${data.avg_rating.toFixed(1)} ★` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-title">Por Status</div>
                {data?.by_status?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90}>
                        {data.by_status.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] || '#ccc'} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val, name) => [val, STATUS_LABELS[name] || name]} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                      <Legend formatter={val => STATUS_LABELS[val] || val} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state">Sem dados</div>}
              </div>

              <div className="card">
                <div className="card-title">Por Prioridade</div>
                {data?.by_priority?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.by_priority} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={90}>
                        {data.by_priority.map((s, i) => <Cell key={i} fill={PRIORITY_COLORS[s.priority] || '#ccc'} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val, name) => [val, PRIORITY_LABELS[name] || name]} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                      <Legend formatter={val => PRIORITY_LABELS[val] || val} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state">Sem dados</div>}
              </div>
            </div>
          </>
        )}
      </main>

      {showPurgeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>⚠️ ÁREA DE PERIGO - PURGAR DADOS</h2>
            <p style={{ marginBottom: 16 }}>
              Você está prestes a <strong>EXCLUIR PERMANENTEMENTE</strong> todos os chamados no banco de dados criados entre <strong>{from}</strong> e <strong>{to}</strong>.
            </p>
            <p style={{ marginBottom: 16, color: 'var(--color-danger)' }}>
              <strong>AVISO: ESTA AÇÃO É IRREVERSÍVEL! OS DADOS NÃO PODERÃO SER RECUPERADOS.</strong>
            </p>

            <div className="form-group">
              <label className="form-label">Para confirmar, digite <strong>EXCLUIR DADOS</strong> abaixo:</label>
              <input 
                type="text" 
                className="form-input" 
                value={purgeConfirmation} 
                onChange={e => setPurgeConfirmation(e.target.value)} 
                placeholder="EXCLUIR DADOS"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sua senha de administrador:</label>
              <input 
                type="password" 
                className="form-input" 
                value={purgePassword} 
                onChange={e => setPurgePassword(e.target.value)} 
                placeholder="********"
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPurgeModal(false)} disabled={purging}>Cancelar</button>
              <button 
                className="btn btn-danger" 
                onClick={handlePurge} 
                disabled={purging || purgeConfirmation !== 'EXCLUIR DADOS' || !purgePassword}
              >
                {purging ? 'Excluindo...' : 'Confirmar Exclusão Definitiva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
