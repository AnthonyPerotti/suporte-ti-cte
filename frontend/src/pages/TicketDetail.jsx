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
  closed:       ['in_progress'],
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
    if (!comment.trim() && attachments.length === 0) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', comment || 'Anexo enviado');
      formData.append('is_internal', isInternal);
      Array.from(attachments).forEach(file => {
        formData.append('attachments', file);
      });

      await api.post(`/tickets/${id}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setComment('');
      setAttachments([]);
      
      // If we are sending a normal response (not internal), and the ticket is in waiting_user, we can auto-switch to in_progress if user replies, 
      // but let's just reload for now
      await load();
      toast.success('Resposta enviada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJitsiMeet = () => {
    const roomName = `SuporteTI-${id}-${Math.random().toString(36).substring(2,8)}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    setComment(prev => `${prev}\n\nAcesse a sala de reunião: ${jitsiUrl}`);
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
      toast.success('Chamado arquivado');
      navigate('/');
    } catch { toast.error('Erro ao arquivar'); }
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

  const canRate = !isStaff && ['resolved', 'closed'].includes(ticket.status) && !ratingSubmitted;
  const nextStatuses = isStaff ? (STATUS_TRANSITIONS[ticket.status] || []) : [];

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
                <StatusBadge status={ticket.status} />
                {isStaff && <PriorityBadge priority={ticket.priority} />}
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
                {timelineItems.map(item => {
                  if (item._itemType === 'event') {
                    const ev = item;
                    const assignedUserName = ev.type === 'assignment' && ev.metadata?.assignee_id 
                      ? (technicians.find(t => t.id === ev.metadata.assignee_id)?.name || 'Técnico') 
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
                            {ev.type === 'status_change' && ev.metadata && (
                              <span>: {STATUS_LABELS[ev.metadata.from]} → {STATUS_LABELS[ev.metadata.to]}</span>
                            )}
                            {ev.type === 'assignment' && assignedUserName && (
                              <span> para {assignedUserName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const c = item;
                    return (
                      <div key={`com-${c.id}`} className="timeline-item">
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
                            {c.attachments?.length > 0 && (
                              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {c.attachments.map(a => (
                                  <a
                                    key={a.id}
                                    href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/uploads/${a.path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="upload-file-item"
                                    style={{ textDecoration: 'none', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                                  >
                                    📎 {a.filename}
                                  </a>
                                ))}
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

                    {isStaff && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleJitsiMeet} style={{ marginBottom: 12 }}>
                        🎥 Gerar Link Jitsi Meet
                      </button>
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

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: '1.2rem' }}>📎</span> Anexar arquivos
                      <input 
                        type="file" 
                        multiple 
                        onChange={e => setAttachments(e.target.files)} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    {attachments.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                        {attachments.length} arquivo(s) selecionado(s)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    {isStaff && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                        Nota interna (invisível para o usuário)
                      </label>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={submitting || (!comment.trim() && attachments.length === 0)} style={{ marginLeft: 'auto' }}>
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

            {/* Admin Actions */}
            {user?.role === 'admin' && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-danger)', background: 'rgba(239,68,68,0.02)' }}>
                <div className="card-title" style={{ color: 'var(--color-danger)' }}>Admin</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={archiveTicket}>Arquivar Chamado</button>
                  <button className="btn btn-danger btn-sm" onClick={deleteTicket}>🗑️ Excluir Definitivamente</button>
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
