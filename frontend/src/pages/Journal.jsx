import { useState, useEffect } from 'react';
import { api } from '../api';

const moodEmojis = ['😫', '😟', '😐', '😊', '🤩'];
const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

function fmtDate(d) { return d.toISOString().slice(0, 10); }
function today() { return new Date(); }

export default function Journal() {
  const [journals, setJournals] = useState([]);
  const [currentDate, setCurrentDate] = useState(fmtDate(today()));
  const [journal, setJournal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('write');

  useEffect(() => { api.journals.list(60).then(setJournals).catch(console.error); }, []);

  useEffect(() => {
    const d = new Date(currentDate);
    api.journals.get(currentDate).then(setJournal).catch(() => setJournal(null));
  }, [currentDate]);

  const changeDate = (delta) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(fmtDate(d));
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        date: currentDate,
        content: journal?.content || '',
        mood: journal?.mood || 3,
        grateful: journal?.grateful || '',
        learned: journal?.learned || '',
      };
      if (journal?.id) { await api.journals.update(currentDate, data); }
      else { await api.journals.create(data); }
      const updated = await api.journals.get(currentDate);
      setJournal(updated);
      api.journals.list(60).then(setJournals);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const selectJournal = (j) => { setCurrentDate(j.date); setJournal(j); setTab('write'); };

  const d = new Date(currentDate);
  const isToday = fmtDate(d) === fmtDate(today());

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📝 每日反思</h1>
      <p style={{ color: 'var(--sub)', marginBottom: 20 }}>记录生活，看见成长</p>

      <div className="tabs">
        <div className={'tab' + (tab === 'write' ? ' active' : '')} onClick={() => setTab('write')}>✍️ 写日记</div>
        <div className={'tab' + (tab === 'history' ? ' active' : '')} onClick={() => setTab('history')}>📚 历史记录</div>
      </div>

      {tab === 'write' && (
        <div>
          <div className="journal-date-nav">
            <button onClick={() => changeDate(-1)}>◀</button>
            <span>{currentDate}  星期{weekdayNames[d.getDay()]}{isToday ? ' (今天)' : ''}</span>
            <button onClick={() => changeDate(1)} disabled={isToday}>▶</button>
            <button className="btn btn-sm btn-outline" onClick={() => { setCurrentDate(fmtDate(today())); }} style={{ marginLeft: 8 }}>回到今天</button>
          </div>

          <div className="card">
            <div className="form-group">
              <label>今日心情</label>
              <div className="mood-emojis">
                {moodEmojis.map((emoji, i) => (
                  <span key={i} className={'mood-emoji' + (journal?.mood === i + 1 ? ' selected' : '')}
                    onClick={() => setJournal(j => j ? { ...j, mood: i + 1 } : { mood: i + 1 })}>{emoji}</span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>🙏 今天感恩的事</label>
              <textarea value={journal?.grateful || ''} onChange={e => setJournal(j => j ? { ...j, grateful: e.target.value } : { grateful: e.target.value })} placeholder="写下今天让你感恩的人或事…" />
            </div>
            <div className="form-group">
              <label>💡 今天学到的东西</label>
              <textarea value={journal?.learned || ''} onChange={e => setJournal(j => j ? { ...j, learned: e.target.value } : { learned: e.target.value })} placeholder="今天学到了什么新东西？" />
            </div>
            <div className="form-group">
              <label>📖 自由记录</label>
              <textarea value={journal?.content || ''} onChange={e => setJournal(j => j ? { ...j, content: e.target.value } : { content: e.target.value })} placeholder="记录今天的想法、感受、经历…" rows={8} />
            </div>

            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '💾 保存日记'}</button>
            {journal?.id && (
              <button className="btn btn-danger" style={{ marginLeft: 10 }}
                onClick={async () => { if (confirm('确定删除这天的日记？')) { await api.journals.delete(currentDate); setJournal(null); api.journals.list(60).then(setJournals); } }}>删除</button>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card" style={{ padding: 0 }}>
          {journals.length === 0 ? <div className="empty"><p>还没有日记记录</p></div> :
            journals.map(j => (
              <div key={j.date} className="journal-list-item" onClick={() => selectJournal(j)}>
                <div>
                  <span style={{ fontWeight: 600 }}>{j.date}</span>
                  <span style={{ marginLeft: 12, fontSize: 14, color: 'var(--sub)' }}>{(j.content || '').slice(0, 40)}{j.content?.length > 40 ? '…' : ''}</span>
                </div>
                <span style={{ fontSize: 20 }}>{moodEmojis[j.mood - 1]}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}