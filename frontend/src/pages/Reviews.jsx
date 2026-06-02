import { useState, useEffect } from 'react';
import { api } from '../api';

const weekdayNames = ['日','一','二','三','四','五','六'];

function fmtDate(d) { return d.toISOString().slice(0, 10); }

export default function Reviews() {
  const [type, setType] = useState('weekly');
  const [reviews, setReviews] = useState([]);
  const [current, setCurrent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewReview, setViewReview] = useState(null);

  const today = fmtDate(new Date());
  const [form, setForm] = useState({
    date: today,
    type: 'weekly',
    wins: '', challenges: '', insights: '', focus: '',
    goal_progress: '', habit_notes: '', mood_analysis: '', next_steps: '',
  });

  useEffect(() => { load(); }, [type]);

  const load = async () => {
    try { setReviews(await api.reviews.list(type, 20)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setCurrent(null);
    setForm({
      date: today, type,
      wins: '', challenges: '', insights: '', focus: '',
      goal_progress: '', habit_notes: '', mood_analysis: '', next_steps: '',
    });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setCurrent(r);
    setForm({
      date: r.date, type: r.type,
      wins: r.wins, challenges: r.challenges, insights: r.insights, focus: r.focus,
      goal_progress: r.goal_progress, habit_notes: r.habit_notes,
      mood_analysis: r.mood_analysis, next_steps: r.next_steps,
    });
    setShowForm(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      if (current) {
        await api.reviews.update(current.id, form);
      } else {
        await api.reviews.create(form);
      }
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const deleteReview = async (id) => {
    if (confirm('确认删除？')) { await api.reviews.delete(id); load(); }
  };

  if (loading) return <div className="loading">加载中…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📋 定期回顾</h1>
      <p style={{ color: 'var(--sub)', marginBottom: 20 }}>结构化复盘，持续成长</p>

      <div className="tabs">
        <div className={'tab' + (type === 'weekly' ? ' active' : '')} onClick={() => setType('weekly')}>📅 周回顾</div>
        <div className={'tab' + (type === 'monthly' ? ' active' : '')} onClick={() => setType('monthly')}>📊 月回顾</div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={openCreate}>+ 新建{type === 'weekly' ? '周' : '月'}回顾</button>
      </div>

      {viewReview && (
        <div className="modal-overlay" onClick={() => setViewReview(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>{viewReview.date} {viewReview.type === 'weekly' ? '周回顾' : '月回顾'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Section label="🎉 本周亮点" text={viewReview.wins} />
              <Section label="⚡ 遇到的挑战" text={viewReview.challenges} />
              <Section label="💡 收获与洞察" text={viewReview.insights} />
              <Section label="🎯 下周重点" text={viewReview.focus} />
              {viewReview.goal_progress && <Section label="📈 目标进展" text={viewReview.goal_progress} />}
              {viewReview.habit_notes && <Section label="🔥 习惯回顾" text={viewReview.habit_notes} />}
              {viewReview.mood_analysis && <Section label="😊 情绪分析" text={viewReview.mood_analysis} />}
              {viewReview.next_steps && <Section label="👣 下一步行动" text={viewReview.next_steps} />}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setViewReview(null)}>关闭</button>
              <button className="btn btn-primary" onClick={() => { setViewReview(null); openEdit(viewReview); }}>编辑</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>{current ? '编辑回顾' : '新建' + (type === 'weekly' ? '周' : '月') + '回顾'}</h2>
            <div className="form-group">
              <label>日期</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>🎉 亮点 / 成就</label>
              <textarea value={form.wins} onChange={e => setForm({ ...form, wins: e.target.value })} placeholder="这周/月做成了什么？有哪些值得庆祝的事？" rows={3} />
            </div>
            <div className="form-group">
              <label>⚡ 挑战 / 困难</label>
              <textarea value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} placeholder="遇到了什么阻碍？有什么没做好的？" rows={3} />
            </div>
            <div className="form-group">
              <label>💡 收获 / 洞察</label>
              <textarea value={form.insights} onChange={e => setForm({ ...form, insights: e.target.value })} placeholder="学到了什么？有什么新的认识？" rows={3} />
            </div>
            <div className="form-group">
              <label>🎯 下{type === 'weekly' ? '周' : '月'}重点</label>
              <textarea value={form.focus} onChange={e => setForm({ ...form, focus: e.target.value })} placeholder="接下来重点要做什么？" rows={2} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="empty"><p>还没有{type === 'weekly' ? '周' : '月'}回顾</p><button className="btn btn-primary" onClick={openCreate}>创建第一篇</button></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {reviews.map(r => {
            const d = new Date(r.date);
            const preview = (r.wins || r.insights || '').slice(0, 60);
            return (
              <div key={r.id} className="journal-list-item" onClick={() => setViewReview(r)}>
                <div>
                  <span style={{ fontWeight: 600 }}>{r.date}  星期{weekdayNames[d.getDay()]}</span>
                  <span style={{ marginLeft: 12, fontSize: 14, color: 'var(--sub)' }}>{preview}{preview.length >= 60 ? '…' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); openEdit(r); }}>编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteReview(r.id); }}>删除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({ label, text }) {
  if (!text) return null;
  return (
    <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</div>
    </div>
  );
}
