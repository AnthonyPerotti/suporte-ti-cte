import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StatusBadge, PriorityBadge, SlaBadge } from '../components/Badges';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const EVENT_LABELS = {
  created:         'Chamado aberto',
  status_change:   'Status alterado',
  assignment:      'Chamado atribuído',
  comment_added:   'Resposta adicionada',
  rating_added:    'Chamado avaliado',
  attachment_added:'Anexo adicionado',
};

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const getInitials = (name) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

const STATUS_TRANSITIONS = {
  open:         ['in_progress', 'closed'],
  in_progress:  ['waiting_user', 'resolved', 'closed'],
  waiting_user: ['in_progress', 'resolved', 'closed'],
  resolved:     ['closed', 'in_progress'],
  closed:       [],
};

const STATUS_LABELS = { open: 'Aberto', in_progress: 'Em Atendimento', waiting_user: 'Aguardando Usuário', resolved: 'Resolvido', closed: 'Encerrado' };

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const isStaff = ['admin', 'technician'].includes(user?.role);

  const load = async () => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data);
      if (data.rating) setRatingSubmitted(true);
    } catch {
      toast.error('Chamado não encontrado');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (isStaff) {
      api.get('/templates').then(({ data }) => setTemplates(data)).catch(() => {});
      api.get('/users/technicians').then(({ data }) => setTechnicians(data)).catch(() => {});
    }
  }, [id]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tickets/${id}/comments`, { content: comment, is_internal: isInternal });
      setComment('');
      await load();
      toast.success('Resposta enviada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await api.put(`/tickets/${id}`, { status });
      await load();
      toast.success('Status atualizado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar status');
    }
  };

  const assignTech = async (assigneeId) => {
    try {
      await api.put(`/tickets/${id}`, { assignee_id: assigneeId });
      await load();
      toast.success('Técnico atribuído');
    } catch {
      toast.error('Erro ao atribuir técnico');
    }
  };

  const submitRating = async () => {
    if (!rating) return;
    try {
      await api.post(`/tickets/${id}/rate`, { rating });
      setRatingSubmitted(true);
      await load();
      toast.success('Avaliação enviada!');
    } catch {
      toast.error('Erro ao avaliar chamado');
    }
  };

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

  const canRate = !isStaff && ['resolved', 'closed'].includes(ticket.status) && !ratingSubmitted;
  const nextStatuses = isStaff ? (STATUS_TRANSITIONS[ticket.status] || []) : [];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Voltar</button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Left: ticket details + timeline */}
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <SlaBadge sla_status={ticket.sla_status} />
              </div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>{ticket.title}</h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>#{ticket.id.slice(0, 8).toUpperCase()}</span>
                <span>Aberto em {formatDate(ticket.created_at)}</span>
                {ticket.category && <span>Categoria: {ticket.category.name}</span>}
              </div>

              <div className="divider" />
              <div style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>
                {ticket.description}
              </div>

              {ticket.attachments?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anexos</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ticket.attachments.map(a => (
                      <a
                        key={a.id}
                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/uploads/${a.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="upload-file-item"
                        style={{ textDecoration: 'none' }}
                      >
                        📎 {a.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Histórico</div>
              <div className="timeline">
                {ticket.events?.map(ev => (
                  <div key={ev.id} className="timeline-item">
                    <div className="timeline-dot" style={{ fontSize: '0.9rem' }}>
                      {ev.type === 'created' ? '✦' : ev.type === 'status_change' ? '◉' : ev.type === 'assignment' ? '◎' : ev.type === 'comment_added' ? '💬' : ev.type === 'rating_added' ? '★' : '•'}
                    </div>
                    <div className="timeline-body">
                      <div className="timeline-meta">
                        {ev.actor?.name || 'Sistema'} — {formatDate(ev.created_at)}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        {EVENT_LABELS[ev.type] || ev.type}
                        {ev.type === 'status_change' && ev.metadata && (
                          <span>: {STATUS_LABELS[ev.metadata.from]} → {STATUS_LABELS[ev.metadata.to]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {ticket.comments?.map(c => (
                  <div key={c.id} className="timeline-item">
                    <div className="timeline-dot" style={{ background: c.is_internal ? 'rgba(245,158,11,0.1)' : undefined }}>
                      <div className="avatar avatar-sm" style={{ background: c.author.role === 'user' ? '#6b7280' : 'var(--color-primary)' }}>
                        {getInitials(c.author.name)}
                      </div>
                    </div>
                    <div className="timeline-body">
                      <div className="timeline-meta">
                        <strong>{c.author.name}</strong> — {formatDate(c.created_at)}
                        {c.is_internal && <span style={{ marginLeft: 8, color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.72rem' }}>NOTA INTERNA</span>}
                      </div>
                      <div className={`timeline-content${c.is_internal ? ' timeline-internal' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply box */}
            {ticket.status !== 'closed' && (
              <div className="card">
                <div className="card-title">
                  {isStaff ? 'Responder / Nota interna' : 'Responder'}
                </div>
                <form onSubmit={submitComment}>
                  {isStaff && templates.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Resposta rápida</label>
                      <select className="form-select" onChange={e => { if (e.target.value) setComment(e.target.value); }}>
                        <option value="">Selecionar template...</option>
                        {templates.map(t => <option key={t.id} value={t.content}>{t.title}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <textarea
                      className="form-textarea"
                      placeholder={isInternal ? 'Nota interna (visível apenas para a equipe de TI)...' : 'Digite sua resposta...'}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      style={{ minHeight: 100, borderColor: isInternal ? 'var(--color-warning)' : undefined }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isStaff && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                        Nota interna (invisível para o usuário)
                      </label>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={submitting || !comment.trim()} style={{ marginLeft: 'auto' }}>
                      {submitting ? <span className="spinner" /> : null}
                      Enviar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Rating */}
            {canRate && (
              <div className="card" style={{ marginTop: 16, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                <div className="card-title">Avaliar atendimento</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                  Seu chamado foi resolvido! Como você avalia o atendimento recebido?
                </p>
                <div className="star-rating" style={{ marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`star${s <= rating ? ' filled' : ''}`} onClick={() => setRating(s)}>★</span>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={submitRating} disabled={!rating}>
                  Enviar avaliação
                </button>
              </div>
            )}
          </div>

          {/* Right: actions sidebar */}
          <div>
            {/* Requestor */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Solicitante</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar avatar-md">{getInitials(ticket.user?.name)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.user?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{ticket.user?.email}</div>
                </div>
              </div>
            </div>

            {/* Assignee */}
            {isStaff && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">Técnico Responsável</div>
                {ticket.assignee ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="avatar avatar-md" style={{ background: 'var(--color-primary)' }}>{getInitials(ticket.assignee.name)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.assignee.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{ticket.assignee.email}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>Não atribuído</p>
                )}
                <select className="form-select" value={ticket.assignee_id || ''} onChange={e => assignTech(e.target.value || null)}>
                  <option value="">Sem atribuição</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {/* Status actions */}
            {isStaff && nextStatuses.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">Alterar Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nextStatuses.map(s => (
                    <button key={s} className="btn btn-secondary btn-sm" onClick={() => updateStatus(s)}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rating display */}
            {ticket.rating && (
              <div className="card">
                <div className="card-title">Avaliação do Usuário</div>
                <div className="star-rating" style={{ marginBottom: 8 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`star${s <= ticket.rating ? ' filled' : ''}`} style={{ cursor: 'default', fontSize: '1.2rem' }}>★</span>
                  ))}
                </div>
                {ticket.rating_comment && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>"{ticket.rating_comment}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketDetail;
