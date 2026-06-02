import { useState, useEffect } from 'react';
import { api } from '../api';

const dimensions = [
  { key: 'career', label: '💼 事业' },
  { key: 'finance', label: '💰 财务' },
  { key: 'health', label: '💪 健康' },
  { key: 'relationships', label: '👥 人际关系' },
  { key: 'growth', label: '📚 个人成长' },
  { key: 'environment', label: '🏠 生活环境' },
  { key: 'recreation', label: '🎮 娱乐休闲' },
  { key: 'spirituality', label: '✨ 精神意义' },
];

function RadarSVG({ values, prevValues }) {
  const cx = 150, cy = 150, r = 120;
  const n = dimensions.length;
  const angle = -Math.PI / 2;

  const getPoint = (val, i) => {
    const a = angle + i * (2 * Math.PI / n);
    const dist = (val / 10) * r;
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a) };
  };

  const dataPoints = dimensions.map((d, i) => getPoint(values[d.key] || 5, i));
  const polygon = dataPoints.map(p => p.x + ',' + p.y).join(' ');

  let prevPolygon = null;
  if (prevValues) {
    const prevPoints = dimensions.map((d, i) => getPoint(prevValues[d.key] || 5, i));
    prevPolygon = prevPoints.map(p => p.x + ',' + p.y).join(' ');
  }

  const grids = [0.25, 0.5, 0.75, 1].map(scale => {
    const pts = dimensions.map((_, i) => {
      const a = angle + i * (2 * Math.PI / n);
      return (cx + r * scale * Math.cos(a)) + ',' + (cy + r * scale * Math.sin(a));
    });
    return <polygon key={scale} points={pts.join(' ')} fill="none" stroke="#e5e5e7" strokeWidth="1" />;
  });

  const axes = dimensions.map((_, i) => {
    const a = angle + i * (2 * Math.PI / n);
    return <line key={'a'+i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e5e5e7" strokeWidth="1" />;
  });

  const labels = dimensions.map((d, i) => {
    const a = angle + i * (2 * Math.PI / n);
    const lx = cx + (r + 28) * Math.cos(a);
    const ly = cy + (r + 28) * Math.sin(a);
    return <text key={'l'+i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#6e6e73">{d.label}</text>;
  });

  return (
    <svg width="300" height="300" viewBox="0 0 300 300">
      {grids}
      {axes}
      {prevPolygon && <polygon points={prevPolygon} fill="rgba(99,102,241,0.15)" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="4,3" />}
      <polygon points={polygon} fill="rgba(99,102,241,0.3)" stroke="#6366f1" strokeWidth="2" />
      {dataPoints.map((p, i) => <circle key={'dp'+i} cx={p.x} cy={p.y} r="4" fill="#6366f1" />)}
      {labels}
    </svg>
  );
}

export default function LifeWheel() {
  const [wheels, setWheels] = useState([]);
  const [compare, setCompare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({ career: 5, finance: 5, health: 5, relationships: 5, growth: 5, environment: 5, recreation: 5, spirituality: 5, notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); loadCompare(); }, []);

  const load = async () => {
    try { setWheels(await api.lifewheel.list(12)); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadCompare = async () => {
    try {
      const data = await api.trends.lifewheelCompare();
      if (data.length >= 2) setCompare({ latest: data[0], previous: data[1] });
      else if (data.length === 1) setCompare({ latest: data[0], previous: null });
    } catch (e) { console.error(e); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.lifewheel.create({ ...values, date: today });
      load();
      loadCompare();
      alert('评估已保存！');
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const deleteWheel = async (id) => { if (confirm('确定删除？')) { await api.lifewheel.delete(id); load(); loadCompare(); } };

  if (loading) return <div className="loading">加载中…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🔄 生命之轮</h1>
      <p style={{ color: 'var(--sub)', marginBottom: 20 }}>评估你人生各个维度的平衡度，找到需要关注的领域</p>

      <div className="wheel-container">
        <div className="wheel-svg">
          <RadarSVG values={values} prevValues={compare?.previous} />
          {compare?.previous && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--sub)', marginTop: 4 }}>
              <span style={{ display: 'inline-block', width: 20, height: 2, background: '#6366f1', verticalAlign: 'middle', marginRight: 4 }} />
              当前
              <span style={{ display: 'inline-block', width: 20, height: 1, borderTop: '2px dashed #a5b4fc', verticalAlign: 'middle', margin: '0 4px 0 12px' }} />
              上次 ({compare.previous.date})
            </div>
          )}
        </div>
        <div className="wheel-form">
          <div className="card" style={{ marginBottom: 12 }}>
            {dimensions.map(d => (
              <div key={d.key} className="slider-group">
                <label>{d.label}</label>
                <input type="range" min="1" max="10" value={values[d.key]}
                  onChange={e => setValues({ ...values, [d.key]: parseInt(e.target.value) })} />
                <span className="val">{values[d.key]}</span>
              </div>
            ))}
          </div>
          <div className="form-group">
            <textarea value={values.notes} onChange={e => setValues({ ...values, notes: e.target.value })} placeholder="评估备注（可选）…" />
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '💾 保存评估'}</button>
        </div>
      </div>

      {/* Comparison summary */}
      {compare?.previous && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>📊 与上次对比 ({compare.previous.date})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {dimensions.map(d => {
              const cur = compare.latest[d.key];
              const prev = compare.previous[d.key];
              const diff = cur - prev;
              const icon = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
              const color = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--sub)';
              return (
                <div key={d.key} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--sub)' }}>{d.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{cur} <span style={{ fontSize: 13, color }}>{icon} {diff > 0 ? '+' : ''}{diff}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {wheels.length > 0 && (
        <div className="wheel-history">
          <div className="card">
            <h2>📊 历史评估记录</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {wheels.map(w => {
                const avg = Math.round((w.career + w.finance + w.health + w.relationships + w.growth + w.environment + w.recreation + w.spirituality) / 8 * 10) / 10;
                return (
                  <div key={w.id} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{w.date}</div>
                    <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 20 }}>{avg}<span style={{ fontSize: 12, fontWeight: 400 }}>/10</span></div>
                    <button className="btn btn-sm btn-danger" style={{ marginTop: 6 }} onClick={() => deleteWheel(w.id)}>删除</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}