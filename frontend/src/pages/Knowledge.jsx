import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR');

const Knowledge = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  
  const isStaff = ['admin', 'technician'].includes(user?.role);
  const isAdminRoute = location.pathname.includes('/admin/');

  const fetchArticles = async () => {
    setLoading(true);
    try {
      // If user is searching, use the suggest endpoint for full-text search
      if (search.length >= 3) {
        const { data } = await api.get('/knowledge/suggest', { params: { q: search } });
        setArticles(data);
      } else {
        const { data } = await api.get('/knowledge');
        setArticles(data);
      }
    } catch {
      toast.error('Erro ao carregar base de conhecimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchArticles();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Base de Conhecimento</h1>
            <p className="page-subtitle">Guias, tutoriais e soluções para problemas comuns.</p>
          </div>
          {isStaff && isAdminRoute && (
            <button className="btn btn-primary" onClick={() => navigate('/admin/knowledge/new')}>
              + Novo Artigo
            </button>
          )}
        </div>

        <div className="filter-row">
          <div className="search-bar" style={{ width: '100%', maxWidth: 600 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="form-input"
              style={{ padding: '14px 14px 14px 42px', fontSize: '1rem' }}
              placeholder="Pesquisar por erro, sistema, equipamento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : articles.length === 0 ? (
          <div className="card"><div className="empty-state">Nenhum artigo encontrado.</div></div>
        ) : (
          <div className="grid-2">
            {articles.map(a => (
              <div
                key={a.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
                onClick={() => navigate(isAdminRoute ? `/admin/knowledge/${a.id}` : `/knowledge/${a.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ fontSize: '2rem', flexShrink: 0, opacity: 0.8 }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.title}
                    </h3>
                    <div className="flex gap-8 items-center flex-wrap" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {a.category && <span className="badge badge-normal">{a.category.name}</span>}
                      {isStaff && isAdminRoute && a.is_archived && <span className="badge badge-danger">Arquivado</span>}
                      {isStaff && isAdminRoute && !a.published && !a.is_archived && <span className="badge badge-warning">Rascunho</span>}
                      {a.created_at && <span>{formatDate(a.created_at)}</span>}
                    </div>
                    {a.tags && a.tags.length > 0 && (
                      <div className="flex gap-8 flex-wrap mt-8">
                        {a.tags.map(t => <span key={t} style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 4 }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Knowledge;
