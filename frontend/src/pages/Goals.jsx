import { useState, useEffect } from 'react';
import { api } from '../api';

const categories = ['事业', '健康', '关系', '成长', '财务', '其他'];
const statusMap = { '进行中': 'badge-blue', '已完成': 'badge-green', '已放弃': 'badge-red' };

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({});
  const [form, setForm] = useState({ title: '', description: '', category: '其他', target_date: '' });
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.status) params.status = filter.status;
      setGoals(await api.goals.list(params));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ title: '', description: '', category: '其他', target_date: '' }); setShowModal(true); };
  const openEdit = (g) => { setEditing(g); setForm({ title: g.title, description: g.description, category: g.category, target_date: g.target_date || '' }); setShowModal(true); };

  const submit = async () => {
    if (!form.title.trim()) return;
    try {
      const payload = { ...form, target_date: form.target_date || null };
      if (editing) { await api.goals.update(editing.id, payload); }
      else { await api.goals.create(payload); }
      setShowModal(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const updateProgress = async (goal, delta) => {
    const next = Math.max(0, Math.min(100, goal.progress + delta));
    await api.goals.update(goal.id, { progress: next, status: next >= 100 ? '已完成' : goal.status });
    load();
  };

  const deleteGoal = async (id) => { if (confirm('确定删除？')) { await api.goals.delete(id); load(); } };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🎯 目标管理</h1>
      <p style={{ color: 'var(--sub)', marginBottom: 20 }}>设定并追踪你的人生目标</p>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={openCreate}>+ 新建目标</button>
        {categories.map(c => (
          <button key={c} className={'btn btn-sm ' + (filter.category === c ? 'btn-primary' : 'btn-outline')}
            onClick={() => setFilter(f => f.category === c ? {} : { ...f, category: c })}>{c}</button>
        ))}
        {['进行中', '已完成', '已放弃'].map(s => (
          <button key={s} className={'btn btn-sm ' + (filter.status === s ? 'btn-primary' : 'btn-outline')}
            onClick={() => setFilter(f => f.status === s ? {} : { ...f, status: s })}>{s}</button>
        ))}
      </div>

      {loading ? <div className="loading">加载中…</div> : goals.length === 0 ? (
        <div className="empty"><p>还没有目标</p><button className="btn btn-primary" onClick={openCreate}>创建第一个目标</button></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {goals.map(g => (
            <div key={g.id} className="goal-item">
              <div className="goal-progress">
                <div style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{g.progress}%</div>
                <div className="goal-progress-bar"><div className="goal-progress-fill" style={{ width: g.progress + '%' }} /></div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => updateProgress(g, -10)} style={{ padding: '2px 8px', fontSize: 12 }}>−</button>
                  <button className="btn btn-sm btn-outline" onClick={() => updateProgress(g, 10)} style={{ padding: '2px 8px', fontSize: 12 }}>+</button>
                </div>
              </div>
              <div className="goal-info">
                <h3>{g.title}</h3>
                {g.description && <p>{g.description}</p>}
                <div className="goal-meta" style={{ marginTop: 6 }}>
                  <span className={'badge ' + statusMap[g.status]}>{g.status}</span>
                  <span className="badge badge-blue">{g.category}</span>
                  {g.target_date && <span className="badge badge-gray">目标日: {g.target_date}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(g)}>编辑</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteGoal(g.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? '编辑目标' : '新建目标'}</h2>
            <div className="form-group">
              <label>目标名称 *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：每天跑步30分钟" />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="具体描述这个目标…" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>分类</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>目标日期</label>
                <input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={submit}>{editing ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}