import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setSettings(await api.settings.get()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) { alert('你的浏览器不支持通知功能'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { setMsg('通知权限已开启'); } else { setMsg('通知权限被拒绝'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const save = async () => {
    setSaving(true);
    try {
      setSettings(await api.settings.update(settings));
      setMsg('设置已保存');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const testNotification = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      alert('请先开启通知权限');
      return;
    }
    new Notification('人生设计系统', { body: '这是一条测试提醒，你的习惯在等着你！', icon: '/favicon.svg' });
  };

  if (loading) return <div className="loading">加载中…</div>;
  if (!settings) return <div className="empty"><p>加载失败</p><button className="btn btn-primary" onClick={load}>重试</button></div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>⚙️ 偏好设置</h1>
      <p style={{ color: 'var(--sub)', marginBottom: 20 }}>管理提醒通知和应用偏好</p>

      {msg && (
        <div style={{ background: '#d1fae5', color: '#059669', padding: '10px 16px', borderRadius: 8, fontSize: 14, marginBottom: 16, fontWeight: 500 }}>{msg}</div>
      )}

      <div className="card">
        <h2>🔔 提醒通知</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>🔥 习惯打卡提醒</div>
            <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 2 }}>每天定时提醒你完成习惯打卡</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="time" value={settings.habit_reminder_time}
              onChange={e => setSettings({ ...settings, habit_reminder_time: e.target.value })}
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14 }} />
            <input type="checkbox" checked={!!settings.habit_reminder}
              onChange={e => setSettings({ ...settings, habit_reminder: e.target.checked ? 1 : 0 })}
              style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>📝 日记提醒</div>
            <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 2 }}>每天定时提醒你写日记</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="time" value={settings.journal_reminder_time}
              onChange={e => setSettings({ ...settings, journal_reminder_time: e.target.value })}
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14 }} />
            <input type="checkbox" checked={!!settings.journal_reminder}
              onChange={e => setSettings({ ...settings, journal_reminder: e.target.checked ? 1 : 0 })}
              style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-outline" onClick={requestPermission}>🔓 开启浏览器通知</button>
          <button className="btn btn-outline" onClick={testNotification}>📬 发送测试通知</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 8 }}>
          当前浏览器通知状态：{('Notification' in window) ? (Notification.permission === 'granted' ? '✅ 已开启' : Notification.permission === 'denied' ? '❌ 已拒绝' : '⏳ 未设置') : '🚫 不支持'}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '💾 保存设置'}
        </button>
      </div>
    </div>
  );
}
