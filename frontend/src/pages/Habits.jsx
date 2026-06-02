import { useState, useEffect } from 'react';
import { api } from '../api';

const habitColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
const categories = ['日常', '健康', '学习', '工作', '社交', '其他'];

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '日常', color: '#6366f1' });
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('today');

  useEffect(() => { load(); loadWeekly(); }, []);

  const load = async () => {
    try { setHabits(await api.habits.list()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadWeekly = async () => {
    try { setWeeklyData(await api.trends.habitsWeekly(7)); } catch (e) { console.error(e); }
  };

  const toggle = async (habit) => {
    const today = new Date().toISOString().slice(0, 10);
    await api.habits.toggle(habit.id, today);
    load(); loadWeekly();
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', category: '日常', color: '#6366f1' }); setShowModal(true); };
  const openEdit = (h) => { setEditing(h); setForm({ name: h.name, description: h.description, category: h.category, color: h.color }); setShowModal(true); };

  const submit = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) { await api.habits.update(editing.id, form); }
      else { await api.habits.create(form); }
      setShowModal(false);
      load(); loadWeekly();
    } catch (e) { alert(e.message); }
  };

  const deleteHabit = async (id) => { if (confirm('确定删除这个习惯？')) { await api.habits.delete(id); load(); loadWeekly(); } };

  if (loading) return <div className="loading">加载中…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🔥 习惯追踪</h1>
      <p style={{ color: 'var(--sub)', marginBottom: 20 }}>坚持每天的小习惯，成就更好的自己</p>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={openCreate}>+ 添加习惯</button>
      </div>

      <div className="tabs">
        <div className={'tab' + (tab === 'today' ? ' active' : '')} onClick={() => setTab('today')}>🎯 今日打卡</div>
        <div className={'tab' + (tab === 'weekly' ? ' active' : '')} onClick={() => setTab('weekly')}>📅 最近 7 天</div>
      </div>

      {tab === 'today' && (
        habits.length === 0 ? (
          <div className="empty"><p>还没有习惯</p><button className="btn btn-primary" onClick={openCreate}>添加第一个习惯</button></div>
        ) : (
          <div className="habit-grid">
            {habits.map(h => (
              <div key={h.id} className={'habit-card' + (h.today_done ? ' done' : '')} onClick={() => toggle(h)}>
                <div className="habit-dot" style={{ background: h.color }}>{h.today_done ? '✓' : h.name[0]}</div>
                <h3>{h.name}</h3>
                <div className="streak">🔥 连续 {h.streak} 天 · {h.category}</div>
                <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); openEdit(h); }}>编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteHabit(h.id); }}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'weekly' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h2>📅 最近 7 天完成情况</h2>
          {weeklyData.length === 0 ? (
            <div className="empty" style={{ padding: 30 }}><p>还没有数据</p></div>
          ) : (
            <div>
              {/* Completion rate bar */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500, marginRight: 8 }}>每日完成率：</span>
                {weeklyData.map((d, i) => (
                  <div key={i} style={{
                    flex: 1, minWidth: 60, textAlign: 'center', padding: '8px 4px',
                    background: d.rate >= 80 ? '#d1fae5' : d.rate >= 50 ? '#fef3c7' : '#fee2e2',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--sub)' }}>{d.date.slice(5)} 周{d.weekday}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: d.rate >= 80 ? '#059669' : d.rate >= 50 ? '#d97706' : '#dc2626' }}>{d.rate}%</div>
                    <div style={{ fontSize: 10, color: 'var(--sub)' }}>{d.habits.filter(h => h.done).length}/{d.habits.length}</div>
                  </div>
                ))}
              </div>

              {/* Grid: habits x days */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', color: 'var(--sub)', fontWeight: 500 }}>习惯</th>
                    {weeklyData.map((d, i) => (
                      <th key={i} style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '2px solid var(--border)', color: 'var(--sub)', fontWeight: 500, fontSize: 12 }}>
                        {d.date.slice(5)}<br />周{d.weekday}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '2px solid var(--border)', color: 'var(--sub)', fontWeight: 500, fontSize: 12 }}>完成率</th>
                  </tr>
                </thead>
                <tbody>
                  {(weeklyData[weeklyData.length - 1]?.habits || []).map((h, hi) => {
                    const total = weeklyData.filter(d => d.habits[hi]?.done).length;
                    const pct = Math.round((total / weeklyData.length) * 100);
                    return (
                      <tr key={hi}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: h.color, marginRight: 8 }} />
                          {h.name}
                        </td>
                        {weeklyData.map((d, di) => (
                          <td key={di} style={{ textAlign: 'center', padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                            {d.habits[hi]?.done ? (
                              <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span>
                            ) : (
                              <span style={{ color: 'var(--border)', fontSize: 16 }}>—</span>
                            )}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', padding: '10px 4px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? '编辑习惯' : '添加习惯'}</h2>
            <div className="form-group">
              <label>习惯名称 *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例如：冥想10分钟" />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>分类</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>颜色</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {habitColors.map(c => (
                    <div key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid var(--text)' : '3px solid transparent' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={submit}>{editing ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}