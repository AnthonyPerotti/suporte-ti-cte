import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const ForcePasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso!');
      const isStaff = ['admin', 'technician'].includes(user?.role);
      navigate(isStaff ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar a senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="card card-lg">
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
            padding: '16px 20px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.9rem' }}>
                Primeiro acesso detectado
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Você precisa definir uma senha pessoal para continuar.
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>
            Defina sua nova senha
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
            Olá, <strong>{user?.name?.split(' ')[0]}</strong>. Por segurança, substitua a senha temporária fornecida pelo administrador.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="current">Senha temporária atual</label>
              <input
                id="current"
                type="password"
                className="form-input"
                placeholder="Senha fornecida pelo admin"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label" htmlFor="new-pass">Nova senha</label>
              <input
                id="new-pass"
                type="password"
                className="form-input"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <div className="form-hint">Use letras, números e caracteres especiais para maior segurança.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-pass">Confirmar nova senha</label>
              <input
                id="confirm-pass"
                type="password"
                className="form-input"
                placeholder="Repita a nova senha"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              {confirm && newPassword !== confirm && (
                <div className="form-error">As senhas não coincidem</div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || (confirm && newPassword !== confirm)}
              style={{ marginTop: 8 }}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Salvando...' : 'Definir nova senha e continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
