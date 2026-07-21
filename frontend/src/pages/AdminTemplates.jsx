import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const AdminTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  
  const toast = useToast();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch {
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/templates/${editing.id}`, formData);
        toast.success('Template atualizado');
      } else {
        await api.post('/templates', formData);
        toast.success('Template criado');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Excluído com sucesso');
      fetchTemplates();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Respostas Rápidas</h1>
            <p className="page-subtitle">Templates de texto para agilizar as respostas aos chamados.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', content: '' }); setShowModal(true); }}>
            + Novo Template
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : templates.length === 0 ? (
          <div className="card"><div className="empty-state">Nenhum template cadastrado.</div></div>
        ) : (
          <div className="grid-2">
            {templates.map(t => (
              <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="flex justify-between items-start mb-16">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>{t.title}</h3>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-icon" onClick={() => { setEditing(t); setFormData({ title: t.title, content: t.content }); setShowModal(true); }}>✏️</button>
                    <button className="btn btn-ghost btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(t.id)}>✕</button>
                  </div>
                </div>
                <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap', background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  {t.content}
                </div>
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                  Criado por {t.author?.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{editing ? 'Editar Template' : 'Novo Template'}</h3>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input type="text" className="form-input" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Saudações Iniciais" />
                </div>
                <div className="form-group">
                  <label className="form-label">Conteúdo</label>
                  <textarea className="form-textarea" required value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} style={{ minHeight: 150 }} placeholder="Digite a resposta padrão..." />
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

export default AdminTemplates;
