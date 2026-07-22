import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const getInitials = (name) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

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

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.avatar_url) {
        setAvatarPreview(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/uploads/${user.avatar_url}`);
      }
    }
  }, [user]);

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
        </div>
      </main>
    </div>
  );
};

export default Profile;
