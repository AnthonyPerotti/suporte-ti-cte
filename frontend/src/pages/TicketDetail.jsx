import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StatusBadge, PriorityBadge, SlaBadge } from '../components/Badges';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';
import RichTextEditor from '../components/RichTextEditor';
import { getUploadUrl } from '../utils/url';

const EVENT_LABELS = {
  created: 'Chamado aberto',
  status_change: 'Status alterado',
  assignment: 'Chamado atribuído',
  comment_added: 'Resposta adicionada',
  rating_added: 'Chamado avaliado',
  attachment_added: 'Anexo adicionado',
};

const formatDate = (d) => {
  try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
};

const parseMetadata = (meta) => {
  if (!meta) return {};
  if (typeof meta === 'object') return meta;
  try { return JSON.parse(meta); } catch { return {}; }
};

const STATUS_TRANSITIONS = {
  open: ['in_progress', 'closed'],
  in_progress: ['waiting_user', 'resolved', 'closed'],
  waiting_user: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: ['in_progress'],
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
  const [attachments, setAttachments] = useState([]);
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const isStaff = ['admin', 'technician', 'root'].includes(user?.role);

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
      api.get('/templates').then(({ data }) => setTemplates(Array.isArray(data) ? data : [])).catch(() => setTemplates([]));
      api.get('/users/technicians').then(({ data }) => setTechnicians(Array.isArray(data) ? data : [])).catch(() => setTechnicians([]));
    }
  }, [id]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachments(prev => {
      const existing = new Set((prev || []).map(f => `${f.name}-${f.size}`));
      const newUnique = files.filter(f => !existing.has(`${f.name}-${f.size}`));
      return [...(prev || []), ...newUnique];
    });
    e.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setAttachments(prev => (prev || []).filter((_, i) => i !== index));
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() && (!attachments || attachments.length === 0)) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', comment.trim() || 'Anexo enviado');
      formData.append('is_internal', isInternal);
      Array.from(attachments || []).forEach(file => {
        formData.append('attachments', file);
      });

      await api.post(`/tickets/${id}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setComment('');
      setAttachments([]);
      
      await load();
      toast.success('Resposta enviada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJitsiMeet = () => {
    const roomName = `SuporteTI-${id}-${Math.random().toString(36).substring(2, 8)}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    setComment(prev => prev ? `${prev}\n\nAcesse a sala de reunião: ${jitsiUrl}` : `Acesse a sala de reunião: ${jitsiUrl}`);
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
      const payload = { assignee_id: assigneeId };
      // Se não havia técnico e agora tem, e o status é 'open', passa para 'in_progress' automaticamente
      if (!ticket.assignee_id && assigneeId && ticket.status === 'open') {
        payload.status = 'in_progress';
      }
      await api.put(`/tickets/${id}`, payload);
      await load();
      toast.success('Técnico atribuído');
    } catch {
      toast.error('Erro ao atribuir técnico');
    }
  };

  const updateTicketData = async (data) => {
    try {
      await api.put(`/tickets/${id}`, data);
      await load();
      toast.success('Chamado atualizado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar');
    }
  };

  const submitRating = async () => {
    if (!rating) return;
    try {
      await api.post(`/tickets/${id}/rate`, { rating, comment: ratingComment });
      setRatingSubmitted(true);
      await load();
      toast.success('Avaliação enviada!');
    } catch {
      toast.error('Erro ao avaliar chamado');
    }
  };

  const archiveTicket = async () => {
    if (!window.confirm('Arquivar este chamado? Ele sairá da lista principal.')) return;
    try {
      await api.patch(`/tickets/${id}/archive`);

      // Post internal note for history
      await api.post(`/tickets/${id}/comments`, { content: 'Chamado arquivado pelo administrador.', is_internal: true });

      toast.success('Chamado arquivado');
      navigate('/');
    } catch { toast.error('Erro ao arquivar'); }
  };

  const unarchiveTicket = async () => {
    if (!window.confirm('Desarquivar este chamado? Ele voltará para a lista principal.')) return;
    try {
      await api.patch(`/tickets/${id}/unarchive`);

      // Post internal note for history
      await api.post(`/tickets/${id}/comments`, { content: 'Chamado desarquivado pelo administrador.', is_internal: true });

      toast.success('Chamado desarquivado');
      await load();
    } catch { toast.error('Erro ao desarquivar'); }
  };

  const deleteTicket = async () => {
    if (!window.confirm('EXCLUIR PERMANENTEMENTE este chamado? Isso NÃO pode ser desfeito!')) return;
    try {
      await api.delete(`/tickets/${id}`);
      toast.success('Chamado excluído');
      navigate('/');
    } catch { toast.error('Erro ao excluir'); }
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

  if (!ticket) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="card"><div className="empty-state">Chamado não encontrado ou você não tem permissão para acessá-lo.</div></div>
        </main>
      </div>
    );
  }

  const canRate = !isStaff && ['resolved', 'closed'].includes(ticket.status) && !ratingSubmitted;

  const canEdit = !isStaff || ['admin', 'root'].includes(user?.role) || (user?.id && ticket.assignee_id === user.id);
  const isUnassignedTech = isStaff && user?.role === 'technician' && !ticket.assignee_id;
  const isAssignedToOther = isStaff && user?.role === 'technician' && Boolean(ticket.assignee_id && ticket.assignee_id !== user?.id);

  let nextStatuses = (isStaff && canEdit) ? (STATUS_TRANSITIONS[ticket.status] || []) : [];
  if (ticket.status === 'closed' && !['admin', 'root'].includes(user?.role)) {
    nextStatuses = [];
  }

  const timelineItems = [
    ...(ticket.events || []).map(e => ({ ...e, _itemType: 'event' })),
    ...(ticket.comments || []).map(c => ({ ...c, _itemType: 'comment' }))
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Voltar</button>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Recarregar</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Left: ticket details + timeline */}
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {ticket.is_archived && <span className="badge badge-normal" style={{ background: '#6b7280' }}>Arquivado</span>}
                <StatusBadge status={ticket.status} />
                {isStaff && <PriorityBadge priority={ticket.priority} />}
                <SlaBadge sla_status={ticket.sla_status} />
                {ticket.due_date && (
                  <span className="badge badge-normal" style={{ background: 'var(--color-surface-2)' }}>
                    Prazo: {formatDate(ticket.due_date).substring(0, 10)}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>{ticket.title}</h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>#{ticket.id ? ticket.id.slice(0, 8).toUpperCase() : ''}</span>
                <span>Aberto em {formatDate(ticket.created_at)}</span>
                {ticket.category && <span>Categoria: {ticket.category.name}</span>}
              </div>

              <div className="divider" />
              {typeof ticket.description === 'string' && ticket.description.includes('<') ? (
                <div
                  style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text)' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description) }}
                />
              ) : (
                <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
                  {ticket.description || '—'}
                </div>
              )}

              {ticket.attachments?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anexos</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ticket.attachments.map(a => {
                      const url = getUploadUrl(a.path);
                      const isImage = a.filename && typeof a.filename === 'string' ? a.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i) : false;
                      return (
                        <a key={a.id} href={url} target="_blank" rel="noreferrer" className="upload-file-item" style={{ textDecoration: 'none', padding: isImage ? 0 : undefined, overflow: 'hidden' }}>
                          {isImage ? <img src={url} alt={a.filename || 'anexo'} style={{ width: 100, height: 100, objectFit: 'cover' }} /> : `📎 ${a.filename || 'anexo'}`}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Histórico</div>
              <div className="timeline">
                {timelineItems.map(item => {
                  if (item._itemType === 'event') {
                    const ev = item;
                    const meta = parseMetadata(ev.metadata);
                    const assignedUserName = ev.type === 'assignment' && meta?.assignee_id
                      ? (meta.assignee_id === ticket.assignee?.id ? ticket.assignee?.name : (Array.isArray(technicians) ? technicians.find(t => t.id === meta.assignee_id)?.name : null) || 'Técnico')
                      : null;

                    return (
                      <div key={`ev-${ev.id}`} className="timeline-item">
                        <div className="timeline-dot" style={{ fontSize: '0.9rem' }}>
                          {ev.type === 'created' ? '✦' : ev.type === 'status_change' ? '◉' : ev.type === 'assignment' ? '◎' : ev.type === 'comment_added' ? '💬' : ev.type === 'rating_added' ? '★' : '•'}
                        </div>
                        <div className="timeline-body">
                          <div className="timeline-meta">
                            {ev.actor?.name || 'Sistema'} — {formatDate(ev.created_at)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            {EVENT_LABELS[ev.type] || ev.type}
                            {ev.type === 'status_change' && meta && (
                              <span>: {STATUS_LABELS[meta.old || meta.from] || meta.old || meta.from} → {STATUS_LABELS[meta.new || meta.to] || meta.new || meta.to}</span>
                            )}
                            {ev.type === 'assignment' && assignedUserName && (
                              <span> para {assignedUserName}</span>
                            )}
                            {ev.type === 'rating_added' && (meta?.rating || ticket.rating) && (
                              <div style={{ marginTop: 4, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 4, color: 'var(--color-warning)', display: 'inline-block' }}>
                                ★ {meta?.rating || ticket.rating} / 5
                                {ticket.rating_comment && <span style={{ marginLeft: 8, fontStyle: 'italic', color: 'var(--color-text-muted)' }}>"{ticket.rating_comment}"</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const c = item;
                    return (
                      <div key={`com-${c.id}`} className="timeline-item">
                        <div className="timeline-dot" style={{ background: c.is_internal ? 'rgba(245,158,11,0.1)' : undefined, padding: 0, overflow: 'hidden' }}>
                          <div className="avatar avatar-sm" style={{ background: c.author?.role === 'user' ? '#6b7280' : 'var(--color-primary)', width: '100%', height: '100%' }}>
                            {c.author?.avatar_url ? (
                              <img src={getUploadUrl(c.author.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(c.author?.name || 'Sistema')
                            )}
                          </div>
                        </div>
                        <div className="timeline-body">
                          <div className="timeline-meta">
                            <strong>{c.author?.name || 'Sistema'}</strong> — {formatDate(c.created_at)}
                            {c.is_internal && <span style={{ marginLeft: 8, color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.72rem' }}>NOTA INTERNA</span>}
                          </div>
                          <div className={`timeline-content${c.is_internal ? ' timeline-internal' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                            {typeof c.content === 'string' && c.content.includes('<') ? (
                              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.content) }} />
                            ) : (
                              c.content || (c.attachments?.length > 0 ? 'Anexo enviado' : '—')
                            )}
                            {c.attachments?.length > 0 && (
                              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {c.attachments.map(a => {
                                  const url = getUploadUrl(a.path);
                                  const isImage = a.filename && typeof a.filename === 'string' ? a.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i) : false;
                                  return (
                                    <a
                                      key={a.id}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: isImage ? 0 : '8px 14px',
                                        background: 'var(--color-bg)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        textDecoration: 'none',
                                        color: 'var(--color-primary)',
                                        fontWeight: 500,
                                        fontSize: '0.85rem',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {isImage ? (
                                        <img src={url} alt={a.filename || 'anexo'} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                                      ) : (
                                        <>
                                          <span style={{ fontSize: '1.1rem' }}>📎</span>
                                          <span>{a.filename || 'anexo'}</span>
                                        </>
                                      )}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* Reply box */}
            {ticket.status !== 'closed' && (
              <div className="card">
                <div className="card-title">
                  {isStaff ? 'Responder / Nota interna' : 'Responder'}
                </div>
                {!canEdit && isStaff ? (
                  <div className="empty-state" style={{ padding: 24, margin: 0 }}>
                    {isUnassignedTech ? 'Você precisa assumir este chamado para responder.' : 'Este chamado está atribuído a outro técnico.'}
                  </div>
                ) : (
                  <form onSubmit={submitComment}>
                    {isStaff && Array.isArray(templates) && templates.length > 0 && (
                      <div className="form-group">
                        <label className="form-label">Resposta rápida</label>
                        <select className="form-select" onChange={e => { if (e.target.value) setComment(e.target.value); }}>
                          <option value="">Selecionar template...</option>
                          {templates.map(t => <option key={t.id} value={t.content}>{t.title}</option>)}
                        </select>
                      </div>
                    )}

                    {isStaff && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleJitsiMeet} style={{ marginBottom: 12 }}>
                        🎥 Gerar Link Jitsi Meet
                      </button>
                    )}

                    <div className="form-group">
                      <textarea
                        className="form-textarea"
                        rows={4}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder={isInternal ? 'Nota interna (visível apenas para a equipe de TI)...' : 'Digite sua resposta...'}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label
                        htmlFor="comment-attachments"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          padding: '6px 4px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          userSelect: 'none',
                          transition: 'opacity 0.2s',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        ANEXAR ARQUIVOS
                        <input
                          id="comment-attachments"
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {attachments && attachments.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {attachments.map((file, idx) => (
                            <div
                              key={`${file.name}-${idx}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 6,
                                fontSize: '0.82rem',
                                color: 'var(--color-text)',
                              }}
                            >
                              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>📎</span>
                              <span className="truncate" style={{ maxWidth: 220, fontWeight: 500 }}>{file.name}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                              <button
                                type="button"
                                onClick={() => removeSelectedFile(idx)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--color-danger)',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  padding: '0 2px',
                                  marginLeft: 4,
                                  lineHeight: 1,
                                }}
                                title="Remover este arquivo"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isStaff && (
                      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          id="is_internal"
                          checked={isInternal}
                          onChange={e => setIsInternal(e.target.checked)}
                        />
                        <label htmlFor="is_internal" style={{ fontSize: '0.875rem', cursor: 'pointer', color: 'var(--color-warning)', fontWeight: 600 }}>
                          Nota interna (visível apenas para a equipe de TI)
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || (!comment.trim() && (!attachments || attachments.length === 0))}
                    >
                      {submitting ? 'Enviando...' : 'Enviar Resposta'}
                    </button>
                  </form>
                )}
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
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={`star${s <= rating ? ' filled' : ''}`} onClick={() => setRating(s)}>★</span>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Comentário (opcional)</label>
                  <textarea
                    className="form-textarea"
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    placeholder="Conte-nos como foi a sua experiência..."
                  />
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
                <div className="avatar avatar-md" style={{ overflow: 'hidden' }}>
                  {ticket.user?.avatar_url ? (
                    <img src={getUploadUrl(ticket.user.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(ticket.user?.name)
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.user?.name || 'Solicitante'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{ticket.user?.email || '—'}</div>
                </div>
              </div>
            </div>

            {/* Assignee */}
            {isStaff && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">Técnico Responsável</div>
                {ticket.assignee ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="avatar avatar-md" style={{ background: 'var(--color-primary)', overflow: 'hidden' }}>
                      {ticket.assignee.avatar_url ? (
                        <img src={getUploadUrl(ticket.assignee.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getInitials(ticket.assignee.name)
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.assignee.name || 'Técnico'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{ticket.assignee.email || '—'}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>Não atribuído</p>
                )}

                {['admin', 'root'].includes(user?.role) ? (
                  <select className="form-select" value={ticket.assignee_id || ''} onChange={e => assignTech(e.target.value || null)}>
                    <option value="">Sem atribuição</option>
                    {Array.isArray(technicians) && technicians.map(t => (
                      <option key={t.id} value={t.id} disabled={t.is_absent}>
                        {t.name} {t.is_absent ? `🏖️ (Ausente${t.absence_until ? ' até ' + formatDate(t.absence_until).substring(0, 10) : ''})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  !ticket.assignee_id ? (
                    <button className="btn btn-primary btn-sm btn-full" onClick={() => assignTech(user?.id)}>Aceitar Chamado</button>
                  ) : user?.id && ticket.assignee_id === user.id ? (
                    <select className="form-select" value={ticket.assignee_id || ''} onChange={e => assignTech(e.target.value || null)}>
                      <option value={user?.id}>{user?.name}</option>
                      {Array.isArray(technicians) && technicians.filter(t => t.id !== user?.id).map(t => (
                        <option key={t.id} value={t.id} disabled={t.is_absent}>
                          Tramitar para: {t.name} {t.is_absent ? `🏖️ (Ausente${t.absence_until ? ' até ' + formatDate(t.absence_until).substring(0, 10) : ''})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : null
                )}
              </div>
            )}

            {/* Status actions */}
            {isStaff && (
              ticket.status === 'closed' && !['admin', 'root'].includes(user?.role) ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-title">Alterar Status</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Este chamado está encerrado. Apenas administradores podem reabri-lo.
                  </p>
                </div>
              ) : nextStatuses.length > 0 ? (
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
              ) : null
            )}

            {/* Properties */}
            {isStaff && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">Propriedades</div>
                <div className="form-group">
                  <label className="form-label">Prioridade</label>
                  <select className="form-select" value={ticket.priority} onChange={e => updateTicketData({ priority: e.target.value })}>
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data Limite (Due Date)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={ticket.due_date ? ticket.due_date.split('T')[0] : ''}
                    onChange={e => updateTicketData({ due_date: e.target.value || null })}
                  />
                </div>
              </div>
            )}

            {/* Admin / Root Actions */}
            {['admin', 'root'].includes(user?.role) && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-danger)', background: 'rgba(239,68,68,0.02)' }}>
                <div className="card-title" style={{ color: 'var(--color-danger)' }}>Ações Avançadas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ticket.is_archived ? (
                    <button className="btn btn-secondary btn-sm btn-full" onClick={unarchiveTicket} style={{ background: 'var(--color-bg)' }}>
                      Desarquivar Chamado
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm btn-full" onClick={archiveTicket} style={{ background: 'var(--color-bg)' }}>
                      Arquivar Chamado
                    </button>
                  )}
                  {user?.role === 'root' && (
                    <button className="btn btn-secondary btn-sm btn-full" onClick={deleteTicket} style={{ background: 'var(--color-danger)', color: 'white', border: 'none' }}>
                      🗑️ Excluir Permanentemente (Root)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rating display */}
            {ticket.rating && (
              <div className="card">
                <div className="card-title">Avaliação do Usuário</div>
                <div className="star-rating" style={{ marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(s => (
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
