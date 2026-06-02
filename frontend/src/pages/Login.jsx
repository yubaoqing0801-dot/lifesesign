import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 360, background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>人生设计系统</h1>
          <p style={{ color: 'var(--sub)', fontSize: 14, marginTop: 4 }}>
            {isRegister ? '创建你的成长空间' : '欢迎回来'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="输入用户名" autoFocus required />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isRegister ? '至少4位密码' : '输入密码'} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}>
            {loading ? '处理中…' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--sub)' }}>
          {isRegister ? '已有账号？' : '没有账号？'}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500, marginLeft: 4 }}
            onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? '去登录' : '去注册'}
          </span>
        </div>
      </div>
    </div>
  );
}