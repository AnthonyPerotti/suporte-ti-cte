import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const NewTicket = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const suggestTimer = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const subcategories = selectedCategory?.children || [];

  const handleTitleChange = (value) => {
    setTitle(value);
    clearTimeout(suggestTimer.current);
    if (value.length >= 4) {
      suggestTimer.current = setTimeout(async () => {
        try {
          const { data } = await api.get('/knowledge/suggest', { params: { q: value } });
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        } catch {}
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).slice(0, 5 - files.length);
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Título e descrição são obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);

      if (subcategoryId) formData.append('category_id', subcategoryId);
      else if (categoryId) formData.append('category_id', categoryId);
      files.forEach(f => formData.append('attachments', f));

      const { data } = await api.post('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Chamado aberto com sucesso!');
      navigate(`/tickets/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao abrir chamado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
            ← Voltar
          </button>
          <h1 className="page-title">Abrir Novo Chamado</h1>
          <p className="page-subtitle">Descreva o problema com o máximo de detalhes possível.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Main form */}
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Detalhes do Chamado</div>

              {/* Title with suggestions */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="title">Título do chamado *</label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  placeholder="Descreva brevemente o problema..."
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
                {showSuggestions && (
                  <div className="suggest-dropdown">
                    <div style={{ padding: '8px 14px 4px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Artigos relacionados
                    </div>
                    {suggestions.map(s => (
                      <div
                        key={s.id}
                        className="suggest-item"
                        onClick={() => navigate(`/knowledge/${s.id}`)}
                      >
                        <div className="suggest-item-title">📄 {s.title}</div>
                        <div className="suggest-item-meta">Consulte este artigo antes de abrir o chamado</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Descrição completa *</label>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginBottom: 8, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <strong>Aviso:</strong> Por favor, informe em qual <strong>Sala e/ou Prédio</strong> o equipamento se encontra ou onde o técnico deve ir para lhe atender.
                </div>
                <textarea
                  id="description"
                  className="form-textarea"
                  placeholder="Explique o problema detalhadamente e informe sua SALA/LOCALIZAÇÃO."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ minHeight: 160 }}
                  required
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Anexos <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>(opcional, máx. 5 arquivos)</span></div>

              <div
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 8px', color: 'var(--color-text-muted)' }} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <p>Arraste arquivos aqui ou clique para selecionar</p>
                <p style={{ fontSize: '0.75rem', marginTop: 4 }}>JPEG, PNG, GIF, WebP ou PDF — máx. 10MB cada</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
              />

              {files.length > 0 && (
                <div className="upload-files" style={{ marginTop: 12 }}>
                  {files.map((f, i) => (
                    <div key={i} className="upload-file-item">
                      <span>📎</span>
                      <span className="truncate" style={{ maxWidth: 140 }}>{f.name}</span>
                      <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 700 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Enviando...' : 'Abrir Chamado'}
            </button>
          </form>

          {/* Sidebar options */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Classificação</div>



              <div className="form-group">
                <label className="form-label" htmlFor="cat">Categoria</label>
                <select id="cat" className="form-select" value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategoryId(''); }}>
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="subcat">Subcategoria</label>
                  <select id="subcat" className="form-select" value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="card" style={{ background: 'var(--color-primary-light)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Dicas para um bom chamado:</div>
                <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-text-muted)' }}>
                  <li>Descreva os passos para reproduzir o problema</li>
                  <li>Inclua prints ou fotos da tela se possível</li>
                  <li>Informe o equipamento e sistema operacional</li>
                  <li>Mencione quando o problema começou</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewTicket;
