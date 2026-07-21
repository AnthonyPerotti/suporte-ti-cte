import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', parent_id: '' });
  const [saving, setSaving] = useState(false);
  
  const toast = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, formData);
        toast.success('Categoria atualizada');
      } else {
        await api.post('/categories', formData);
        toast.success('Categoria criada');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, isSub = false) => {
    if (!confirm(`Excluir esta ${isSub ? 'subcategoria' : 'categoria'}?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Excluída com sucesso');
      fetchCategories();
    } catch {
      toast.error('Erro ao excluir (pode haver chamados vinculados)');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Categorias</h1>
            <p className="page-subtitle">Organização e classificação dos chamados.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', description: '', parent_id: '' }); setShowModal(true); }}>
            + Nova Categoria
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {categories.map(c => (
              <div key={c.id} className="card" style={{ padding: '20px 24px' }}>
                <div className="flex justify-between items-center mb-16">
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{c.description || 'Sem descrição'}</div>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(c); setFormData({ name: c.name, description: c.description || '', parent_id: '' }); setShowModal(true); }}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Excluir</button>
                  </div>
                </div>

                <div style={{ paddingLeft: 32, borderLeft: '2px solid var(--color-border-muted)' }}>
                  <div className="flex items-center justify-between mb-8">
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subcategorias</div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => { setEditing(null); setFormData({ name: '', description: '', parent_id: c.id }); setShowModal(true); }}>
                      + Adicionar Subcategoria
                    </button>
                  </div>
                  
                  {c.children?.length > 0 ? (
                    <div className="flex flex-col gap-8">
                      {c.children.map(sub => (
                        <div key={sub.id} className="flex justify-between items-center" style={{ background: 'var(--color-surface-2)', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: '0.875rem' }}>{sub.name}</div>
                          <div className="flex gap-8">
                            <button className="btn btn-ghost btn-icon" onClick={() => { setEditing(sub); setFormData({ name: sub.name, description: sub.description || '', parent_id: c.id }); setShowModal(true); }}>✏️</button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(sub.id, true)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nenhuma subcategoria</div>
                  )}
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
                  <h3 className="modal-title">{editing ? 'Editar' : 'Nova'} {formData.parent_id ? 'Subcategoria' : 'Categoria'}</h3>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <input type="text" className="form-input" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                </div>
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Categoria Pai</label>
                    <select className="form-select" value={formData.parent_id} onChange={e => setFormData(p => ({ ...p, parent_id: e.target.value }))}>
                      <option value="">Nenhuma (Categoria Principal)</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
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

export default AdminCategories;
