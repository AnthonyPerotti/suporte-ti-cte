import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { RoleBadge } from '../components/Badges';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const getInitials = (name) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', temp_password: '', role: 'user', department: '' });
  const [saving, setSaving] = useState(false);
  
  const toast = useToast();
  const limit = 15;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { page, limit, search } });
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          name: formData.name,
          department: formData.department,
          role: formData.role,
        });
        toast.success('Usuário atualizado');
      } else {
        await api.post('/users', formData);
        toast.success('Usuário criado');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (userToReset) => {
    if (userToReset.role === 'root' && currentUser?.role !== 'root') {
      toast.error('Apenas o usuário Root pode resetar a própria senha.');
      return;
    }

    const temp = prompt('Digite a nova senha temporária (mínimo 4 caracteres):');
    if (!temp) return;
    try {
      await api.post(`/users/${userToReset.id}/reset-password`, { temp_password: temp });
      toast.success('Senha resetada com sucesso');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao resetar senha');
    }
  };

  const toggleStatus = async (userToToggle) => {
    if (userToToggle.role === 'root') {
      toast.error('A conta Root não pode ser desativada.');
      return;
    }

    if (userToToggle.id === currentUser?.id) {
      toast.error('Você não pode desativar a sua própria conta.');
      return;
    }

    if (!confirm(`Deseja ${userToToggle.is_active ? 'desativar' : 'ativar'} o usuário ${userToToggle.name}?`)) return;
    try {
      await api.put(`/users/${userToToggle.id}`, { is_active: !userToToggle.is_active });
      toast.success('Status alterado');
      fetchUsers();
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const isSelf = editingUser && editingUser.id === currentUser?.id;
  const isEditingRoot = editingUser && (editingUser.role === 'root' || editingUser.email === 'root@ufsm.br');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Usuários</h1>
            <p className="page-subtitle">Gerenciamento de contas de acesso ao sistema.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', temp_password: '', role: 'user', department: '' }); setShowModal(true); }}>
            + Novo Usuário
          </button>
        </div>

        <div className="filter-row">
          <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar por nome ou e-mail..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Role</th>
                  <th>Departamento</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm">{getInitials(u.name)}</div>
                        <div style={{ fontWeight: 500 }}>
                          {u.name}
                          {u.id === currentUser?.id && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--color-primary)' }}>(Você)</span>}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td>{u.department || '—'}</td>
                    <td>
                      {u.is_active ? <span className="badge badge-resolved">Ativo</span> : <span className="badge badge-closed">Inativo</span>}
                      {u.force_password_change && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Pendente Senha</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => { setEditingUser(u); setFormData({ ...u }); setShowModal(true); }} title="Editar">✏️</button>
                      <button className="btn btn-ghost btn-icon" onClick={() => resetPassword(u)} title="Resetar Senha" disabled={u.role === 'root' && currentUser?.role !== 'root'}>🔑</button>
                      <button className="btn btn-ghost btn-icon" onClick={() => toggleStatus(u)} title={u.is_active ? 'Desativar' : 'Ativar'} disabled={u.role === 'root' || u.id === currentUser?.id}>
                        {u.is_active ? '🚫' : '✅'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                {!editingUser && (
                  <>
                    <div className="form-group">
                      <label className="form-label">E-mail Institucional</label>
                      <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="@ufsm.br ou @cead.ufsm.br" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Senha Temporária</label>
                      <input type="text" className="form-input" required value={formData.temp_password} onChange={e => setFormData(p => ({ ...p, temp_password: e.target.value }))} />
                      <div className="form-hint">O usuário será forçado a trocar no primeiro acesso.</div>
                    </div>
                  </>
                )}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nível de Acesso</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      disabled={isSelf || (isEditingRoot && currentUser?.role !== 'root')}
                      onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                    >
                      <option value="user">Usuário Comum</option>
                      <option value="technician">Técnico TI</option>
                      <option value="admin">Administrador</option>
                      {(currentUser?.role === 'root' || formData.role === 'root') && (
                        <option value="root">Super Root</option>
                      )}
                    </select>
                    {isSelf && (
                      <div className="form-hint" style={{ color: 'var(--color-warning)' }}>
                        Você não pode alterar seu próprio nível de acesso.
                      </div>
                    )}
                    {isEditingRoot && !isSelf && (
                      <div className="form-hint" style={{ color: 'var(--color-warning)' }}>
                        O nível de acesso da conta Root não pode ser modificado.
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <input type="text" className="form-input" value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} />
                  </div>
                </div>
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

export default AdminUsers;
