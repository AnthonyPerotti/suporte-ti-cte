import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getUploadUrl } from '../utils/url';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isStaff = ['admin', 'technician', 'root'].includes(user?.role);
  const [isAbsent, setIsAbsent] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceUntil, setAbsenceUntil] = useState('');
  const [updatingAbsence, setUpdatingAbsence] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setIsAbsent(Boolean(user.is_absent));
      setAbsenceReason(user.absence_reason || '');
      setAbsenceUntil(user.absence_until ? user.absence_until.split('T')[0] : '');
      if (user.avatar_url) {
        setAvatarPreview(getUploadUrl(user.avatar_url));
      }
    }
  }, [user]);

  const handleAbsenceSubmit = async (e) => {
    e.preventDefault();
    setUpdatingAbsence(true);
    try {
      const { data } = await api.patch(`/users/${user.id}/absence`, {
        is_absent: isAbsent,
        absence_reason: absenceReason,
        absence_until: absenceUntil || null,
      });
      setUser(data);
      toast.success('Status de férias/ausência atualizado com sucesso');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar ausência');
    } finally {
      setUpdatingAbsence(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      if (password) formData.append('password', password);
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (!avatarPreview && user?.avatar_url) {
        // If preview is null but user had an avatar, it means they removed it
        formData.append('avatar_url', '');
      }

      const { data } = await api.put(`/users/${user.id}`, formData);
      setUser(data);
      toast.success('Perfil atualizado com sucesso');
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Meu Perfil</h1>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>Voltar</button>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar" 
                      style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }} 
                    />
                  ) : (
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700 }}>
                      {getInitials(name || user?.name)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    title="Alterar foto"
                  >
                    ✎
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/jpeg, image/png, image/webp" 
                  style={{ display: 'none' }} 
                />
                
                {avatarPreview && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={handleRemoveAvatar}>
                    Remover Foto
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="name">Nome completo</label>
                <input 
                  id="name"
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">E-mail institucional</label>
                <input 
                  id="email"
                  type="email" 
                  className="form-input" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Nova Senha (opcional)</label>
                <input 
                  id="password"
                  type="password" 
                  className="form-input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Deixe em branco para manter a atual"
                  minLength={4}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {isStaff && (
            <div className="card" style={{ marginTop: 24, border: '1px solid var(--color-warning)', background: 'var(--color-surface)' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warning)' }}>
                🏖️ Status de Férias / Ausência
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Enquanto ausente, o sistema impede a atribuição ou tramitação de chamados para você.
              </p>

              <form onSubmit={handleAbsenceSubmit}>
                <div className="form-group flex items-center gap-12" style={{ marginBottom: 16 }}>
                  <input
                    type="checkbox"
                    id="isAbsentCheck"
                    checked={isAbsent}
                    onChange={e => setIsAbsent(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="isAbsentCheck" style={{ fontWeight: 600, cursor: 'pointer' }}>
                    {isAbsent ? 'Estou Ausente / Em Férias 🏖️' : 'Estou Disponível (Ativo) ✅'}
                  </label>
                </div>

                {isAbsent && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="absReason">Motivo da Ausência</label>
                      <input
                        id="absReason"
                        type="text"
                        className="form-input"
                        placeholder="Ex: Férias Regulamentares"
                        value={absenceReason}
                        onChange={e => setAbsenceReason(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="absUntil">Data de Término (Desativação Automática)</label>
                      <input
                        id="absUntil"
                        type="date"
                        className="form-input"
                        value={absenceUntil}
                        onChange={e => setAbsenceUntil(e.target.value)}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>
                        Opcional: o sistema reativará você automaticamente após esta data.
                      </span>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-secondary btn-sm" disabled={updatingAbsence}>
                  {updatingAbsence ? 'Salvando...' : 'Salvar Status de Ausência'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
