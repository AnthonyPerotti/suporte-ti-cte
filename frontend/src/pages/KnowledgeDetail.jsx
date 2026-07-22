import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const KnowledgeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const isStaff = ['admin', 'technician'].includes(user?.role);
  const isAdminRoute = location.pathname.includes('/admin/');
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);
  
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    tags: '',
    published: true,
  });

  const [article, setArticle] = useState(null);

  useEffect(() => {
    if (isStaff && isAdminRoute) {
      api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
    }
  }, []);

  const load = async () => {
    try {
      const { data } = await api.get(`/knowledge/${id}`);
      setArticle(data);
      setFormData({
        title: data.title,
        content: data.content,
        category_id: data.category_id || '',
        tags: data.tags?.join(', ') || '',
        published: data.published,
      });
    } catch {
      toast.error('Artigo não encontrado');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNew) load();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStaff) return;
    setSaving(true);
    
    const payload = {
      title: formData.title,
      content: formData.content,
      category_id: formData.category_id || null,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      published: formData.published,
    };

    try {
      if (isNew) {
        const { data } = await api.post('/knowledge', payload);
        toast.success('Artigo criado com sucesso');
        setIsEditing(false);
        navigate(`/admin/knowledge/${data.id}`);
      } else {
        await api.put(`/knowledge/${id}`, payload);
        toast.success('Artigo atualizado');
        setIsEditing(false);
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar artigo');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const { data } = await api.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${data.url}`;
      
      const isImage = file.type.startsWith('image/');
      const markdown = isImage ? `\n![${file.name}](${url})\n` : `\n[${file.name}](${url})\n`;
      
      setFormData(p => ({ ...p, content: p.content + markdown }));
      toast.success('Mídia anexada');
    } catch {
      toast.error('Erro ao fazer upload da mídia');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Deseja realmente excluir (arquivar) este artigo?')) return;
    try {
      await api.delete(`/knowledge/${id}`);
      toast.success('Artigo excluído e arquivado');
      navigate('/admin/knowledge');
    } catch {
      toast.error('Erro ao excluir artigo');
    }
  };

  const handleRestore = async () => {
    if (!confirm('Deseja restaurar este artigo?')) return;
    try {
      await api.put(`/knowledge/${id}`, { is_archived: false });
      toast.success('Artigo restaurado');
      load();
    } catch {
      toast.error('Erro ao restaurar artigo');
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner spinner-lg" /></main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Voltar</button>
        
        {isEditing ? (
          <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 800 }}>
            <div className="card-title">{isNew ? 'Novo Artigo' : 'Editar Artigo'}</div>
            
            <div className="form-group">
              <label className="form-label">Título</label>
              <input type="text" className="form-input" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Conteúdo (Suporta texto simples e links Markdown)
                <label style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                  📎 Anexar Imagem/Arquivo
                  <input type="file" onChange={handleMediaUpload} style={{ display: 'none' }} />
                </label>
              </label>
              <textarea className="form-textarea" required style={{ minHeight: 400, fontFamily: 'monospace', fontSize: '0.9rem' }} value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} />
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={formData.category_id} onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Nenhuma</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (separadas por vírgula)</label>
                <input type="text" className="form-input" placeholder="impressora, papel, atolamento" value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} />
              </div>
            </div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <input type="checkbox" id="pub" checked={formData.published} onChange={e => setFormData(p => ({ ...p, published: e.target.checked }))} style={{ width: 18, height: 18 }} />
              <label htmlFor="pub" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Publicado (visível para usuários)</label>
            </div>
            
            <div className="divider" />
            
            <div className="flex justify-between items-center">
              {!isNew ? <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancelar</button> : <div />}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Artigo'}
              </button>
            </div>
          </form>
        ) : (
          <div className="card" style={{ maxWidth: 800 }}>
            {isStaff && isAdminRoute && (
              <div className="flex justify-between items-start mb-24 pb-16" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex gap-8 items-center">
                  <span className="badge badge-normal">Modo Admin</span>
                  {article?.is_archived && <span className="badge badge-danger">Arquivado</span>}
                  {!article?.published && !article?.is_archived && <span className="badge badge-warning">Rascunho não publicado</span>}
                </div>
                <div className="flex gap-8">
                  {article?.is_archived ? (
                    user?.role === 'admin' && <button className="btn btn-secondary btn-sm" onClick={handleRestore}>Restaurar</button>
                  ) : (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>Editar Artigo</button>
                      <button className="btn btn-danger btn-sm" onClick={handleArchive}>Excluir</button>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: '2.5rem' }}>📄</div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{article?.title}</h1>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Atualizado em {new Date(article?.updated_at).toLocaleDateString('pt-BR')} por {article?.author?.name}
                </div>
              </div>
            </div>
            
            <div style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
              {article?.content}
            </div>
            
            <div className="divider" />
            
            <div className="flex justify-between items-center text-sm text-muted">
              <div>Categoria: {article?.category?.name || 'Nenhuma'}</div>
              {article?.tags?.length > 0 && (
                <div className="flex gap-8">
                  {article.tags.map(t => <span key={t} style={{ background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 4 }}>#{t}</span>)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KnowledgeDetail;
