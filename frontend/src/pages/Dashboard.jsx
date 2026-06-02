import { useState, useEffect } from 'react';
import { api } from '../api';

const moodEmojis = ['', '😫', '😟', '😐', '😊', '🤩'];

function MoodChart({ data }) {
  if (!data || data.length < 2) return null;
  const w = 600, h = 120, pad = 30;
  const maxMood = 5, minMood = 1;
  const stepX = (w - pad * 2) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((d.mood - minMood) / (maxMood - minMood)) * (h - pad * 2);
    return { x, y, mood: d.mood, date: d.date };
  });

  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');

  // Grid lines
  const gridLines = [1, 2, 3, 4, 5].map(m => {
    const y = h - pad - ((m - minMood) / (maxMood - minMood)) * (h - pad * 2);
    return <line key={'g'+m} x1={pad} y1={y} x2={w-pad} y2={y} stroke="#e5e5e7" strokeWidth="1" strokeDasharray="4,4" />;
  });

  return (
    <svg width="100%" viewBox={'0 0 ' + w + ' ' + h} style={{ maxWidth: 600 }}>
      {gridLines}
      <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="#d1d5db" strokeWidth="1" />
      <line x1={pad} y1={pad} x2={pad} y2={h-pad} stroke="#d1d5db" strokeWidth="1" />
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1">
          <title>{p.date}: {moodEmojis[p.mood]}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { load(); loadTrends(); }, []);
  const load = async () => {
    try { setData(await api.dashboard()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadTrends = async () => {
    try { setMoodData(await api.trends.mood(30)); } catch (e) { console.error(e); }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const json = await api.exportData();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = '人生设计-数据导出-' + today + '.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('导出失败: ' + e.message); } finally { setExporting(false); }
  };

  if (loading) return <div className="loading">加载中…</div>;
  if (!data) return <div className="empty"><p>加载失败</p><button className="btn btn-primary" onClick={load}>重试</button></div>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>📊 今日概览</h1>
          <span style={{ color: 'var(--sub)', fontSize: 14 }}>{today}</span>
        </div>
        <button className="btn btn-outline" onClick={doExport} disabled={exporting}>
          {exporting ? '导出中…' : '📥 导出全部数据'}
        </button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="num">{data.goal_count}</div>
          <div className="label">🏆 进行中的目标</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: 'var(--success)' }}>{data.goal_completed}</div>
          <div className="label">✅ 已完成目标</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.habit_today_done}/{data.habit_count}</div>
          <div className="label">🔥 今日习惯打卡</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: 'var(--accent2)' }}>{data.journal_streak}</div>
          <div className="label">📝 日记连续天数</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.latest_mood ? moodEmojis[data.latest_mood] : '—'}</div>
          <div className="label">{data.latest_mood ? '今日心情' : '还未记录'}</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ fontSize: 20 }}>{data.latest_wheel_date || '—'}</div>
          <div className="label">🔄 最近生命之轮评估</div>
        </div>
      </div>

      {/* Mood Trend */}
      {moodData && moodData.length >= 2 && (
        <div className="card">
          <h2>📈 心情趋势 <small>最近 30 天</small></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--sub)' }}>低</span>
            {['😫','😟','😐','😊','🤩'].map((e, i) => <span key={i} style={{ fontSize: 14, opacity: 0.6 }}>{e}</span>)}
            <span style={{ fontSize: 12, color: 'var(--sub)' }}>高</span>
          </div>
          <MoodChart data={moodData} />
        </div>
      )}

      <div className="card">
        <h2>💡 今日小提示</h2>
        <p style={{ color: 'var(--sub)', lineHeight: 1.8 }}>
          {data.habit_today_done === 0 && '新的一天，从完成第一个习惯开始吧！'}
          {data.habit_today_done > 0 && data.habit_today_done < data.habit_count && '不错！还有 ' + (data.habit_count - data.habit_today_done) + ' 个习惯等着你完成~'}
          {data.habit_today_done > 0 && data.habit_today_done === data.habit_count && '太棒了！今天的习惯全部完成了！🎉'}
          {data.habit_count === 0 && '还没有设置习惯？去习惯页面添加你的每日习惯吧~'}
          {!data.latest_wheel_date && ' 还没有做过生命之轮评估？去评估一下你的生活平衡度吧！'}
        </p>
      </div>
    </div>
  );
}