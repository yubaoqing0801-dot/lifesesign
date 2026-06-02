import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <span className="nav-brand">🎯 人生设计</span>
        <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>仪表盘</NavLink>
        <NavLink to="/goals" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>目标</NavLink>
        <NavLink to="/habits" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>习惯</NavLink>
        <NavLink to="/journal" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>日记</NavLink>
        <NavLink to="/reviews" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>回顾</NavLink>
        <NavLink to="/lifewheel" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>生命之轮</NavLink>

        <NavLink to="/settings" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} style={{ marginLeft: 'auto' }}>⚙️</NavLink>
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: 'var(--bg)' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
              {user?.username?.[0]?.toUpperCase() || '?'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{user?.username || '用户'}</span>
            <span style={{ fontSize: 10, color: 'var(--sub)' }}>▼</span>
          </div>
          {showMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
              <div style={{ position: 'absolute', top: 44, right: 0, background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: 8, zIndex: 100, minWidth: 140 }}>
                <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--sub)', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  已登录: <strong style={{ color: 'var(--text)' }}>{user?.username}</strong>
                </div>
                <div onClick={() => { onLogout(); setShowMenu(false); }}
                  style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 6, color: 'var(--danger)' }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}>
                  🚪 退出登录
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}