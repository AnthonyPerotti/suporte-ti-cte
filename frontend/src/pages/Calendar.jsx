import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const EVENT_TYPES = {
  maintenance: { label: 'Manutenção', color: 'var(--color-danger)' },
  training:    { label: 'Treinamento', color: 'var(--color-info)' },
  meeting:     { label: 'Reunião', color: 'var(--color-warning)' },
  other:       { label: 'Outro', color: 'var(--color-primary)' },
};

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', start_at: '', end_at: '', type: 'maintenance' });
  const [saving, setSaving] = useState(false);
  
  const toast = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const { data } = await api.get('/calendar', { params: { year, month } });
      setEvents(data);
    } catch {
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
      };
      
      if (editing) {
        await api.put(`/calendar/${editing.id}`, payload);
        toast.success('Evento atualizado');
      } else {
        await api.post('/calendar', payload);
        toast.success('Evento criado');
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este evento?')) return;
    try {
      await api.delete(`/calendar/${id}`);
      toast.success('Excluído com sucesso');
      fetchEvents();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const openGoogleLinks = async (id) => {
    try {
      const { data } = await api.get(`/calendar/${id}/links`);
      // Open in new tabs
      if (data.google_calendar_url) window.open(data.google_calendar_url, '_blank');
    } catch {
      toast.error('Erro ao gerar links');
    }
  };
  
  const openMeet = () => window.open('https://meet.google.com/new', '_blank');

  // Simple list view for the month instead of a complex grid for this MVP
  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Agenda</h1>
            <p className="page-subtitle">Programação de manutenções e eventos da TI.</p>
          </div>
          <div className="flex gap-12">
            <button className="btn btn-secondary" onClick={openMeet}>
              🎥 Iniciar Meet Rápido
            </button>
            <button className="btn btn-primary" onClick={() => { 
              setEditing(null); 
              const now = new Date();
              now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
              const isoStr = now.toISOString().slice(0,16);
              setFormData({ title: '', description: '', start_at: isoStr, end_at: isoStr, type: 'maintenance' }); 
              setShowModal(true); 
            }}>
              + Novo Evento
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="flex justify-between items-center">
            <button className="btn btn-ghost" onClick={prevMonth}>← Mês Anterior</button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </h2>
            <button className="btn btn-ghost" onClick={nextMonth}>Próximo Mês →</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : events.length === 0 ? (
          <div className="card"><div className="empty-state">Nenhum evento programado para este mês.</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {events.map(ev => (
              <div key={ev.id} className="card" style={{ borderLeft: `4px solid ${EVENT_TYPES[ev.type]?.color || EVENT_TYPES.other.color}` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-12 items-center mb-8">
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{ev.title}</h3>
                      <span className="badge" style={{ background: `${EVENT_TYPES[ev.type]?.color}20`, color: EVENT_TYPES[ev.type]?.color }}>
                        {EVENT_TYPES[ev.type]?.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                      {ev.description || 'Sem descrição.'}
                    </div>
                    <div className="flex gap-16 text-xs text-muted">
                      <div>🕒 Início: {formatDateTime(ev.start_at)}</div>
                      <div>🕒 Fim: {formatDateTime(ev.end_at)}</div>
                      <div>👤 Por: {ev.creator?.name}</div>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => openGoogleLinks(ev.id)} title="Adicionar ao Google Agenda">📅 Adicionar</button>
                    <button className="btn btn-ghost btn-icon" onClick={() => { 
                      setEditing(ev); 
                      setFormData({ 
                        title: ev.title, 
                        description: ev.description || '', 
                        start_at: new Date(new Date(ev.start_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0,16), 
                        end_at: new Date(new Date(ev.end_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0,16), 
                        type: ev.type 
                      }); 
                      setShowModal(true); 
                    }}>✏️</button>
                    <button className="btn btn-ghost btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(ev.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">{editing ? 'Editar Evento' : 'Novo Evento'}</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input type="text" className="form-input" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-textarea" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} style={{ minHeight: 80 }} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Início</label>
                    <input type="datetime-local" className="form-input" required value={formData.start_at} onChange={e => setFormData(p => ({ ...p, start_at: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fim</label>
                    <input type="datetime-local" className="form-input" required value={formData.end_at} onChange={e => setFormData(p => ({ ...p, end_at: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Calendar;
