const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lifedesign-secret-change-in-production';

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'lifedesign.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ---- Auth Middleware ----
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ---- Auth Routes ----
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: '用户名长度2-30个字符' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  const token = jwt.sign({ userId: r.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id: r.lastInsertRowid, username } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ id: req.userId, username: req.username });
});

// ---- Dashboard ----
app.get('/api/dashboard', authMiddleware, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const uid = req.userId;
  const goalCount = db.prepare('SELECT COUNT(*) as count FROM goals WHERE user_id = ?').get(uid).count;
  const goalCompleted = db.prepare('SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND status = ?').get(uid, '已完成').count;
  const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ?').get(uid).count;

  const habitTodayDone = db.prepare(
    'SELECT COUNT(*) as count FROM habit_logs hl JOIN habits h ON hl.habit_id = h.id WHERE h.user_id = ? AND hl.date = ? AND hl.completed = 1'
  ).get(uid, today).count;

  const journals = db.prepare('SELECT date FROM journals WHERE user_id = ? ORDER BY date DESC').all(uid);
  let streak = 0;
  let checkDate = new Date(today);
  for (const j of journals) {
    if (j.date === checkDate.toISOString().slice(0, 10)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else if (j.date < checkDate.toISOString().slice(0, 10)) break;
  }

  const latestMood = journals.length > 0
    ? db.prepare('SELECT mood FROM journals WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(uid).mood : null;
  const latestWheel = db.prepare('SELECT date FROM life_wheels WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(uid);

  res.json({
    goal_count: goalCount, goal_completed: goalCompleted,
    habit_count: habitCount, habit_today_done: habitTodayDone,
    journal_streak: streak, latest_mood: latestMood,
    latest_wheel_date: latestWheel ? latestWheel.date : null,
  });
});

// ---- Goals ----
app.get('/api/goals', authMiddleware, (req, res) => {
  const { category, status } = req.query;
  let sql = 'SELECT * FROM goals WHERE user_id = ?';
  const params = [req.userId];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/goals', authMiddleware, (req, res) => {
  const { title, description, category, target_date } = req.body;
  const r = db.prepare('INSERT INTO goals (user_id, title, description, category, target_date) VALUES (?,?,?,?,?)').run(req.userId, title, description || '', category || '其他', target_date || null);
  res.status(201).json(db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(r.lastInsertRowid, req.userId));
});

app.put('/api/goals/:id', authMiddleware, (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: '目标不存在' });
  const fields = ['title','description','category','status','progress','target_date'];
  const sets = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(f + ' = ?'); vals.push(req.body[f]); } });
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    db.prepare('UPDATE goals SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?').run(...vals, req.params.id, req.userId);
  }
  res.json(db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId));
});

app.delete('/api/goals/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});


// ---- Milestones (Goal Subtasks) ----
app.get('/api/goals/:id/milestones', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM milestones WHERE goal_id = ? ORDER BY sort_order, id').all(req.params.id));
});

app.post('/api/goals/:id/milestones', authMiddleware, (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: '里程碑名称不能为空' });
  const maxSort = db.prepare('SELECT MAX(sort_order) as m FROM milestones WHERE goal_id = ?').get(req.params.id);
  const r = db.prepare('INSERT INTO milestones (goal_id, title, sort_order) VALUES (?,?,?)').run(req.params.id, title.trim(), (maxSort.m || 0) + 1);
  res.status(201).json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(r.lastInsertRowid));
});

app.put('/api/goals/:id/milestones/:mid', authMiddleware, (req, res) => {
  const { title, completed, sort_order } = req.body;
  const sets = []; const vals = [];
  if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
  if (completed !== undefined) { sets.push('completed = ?'); vals.push(completed ? 1 : 0); }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(sort_order); }
  if (sets.length) {
    db.prepare('UPDATE milestones SET ' + sets.join(', ') + ' WHERE id = ? AND goal_id = ?').run(...vals, req.params.mid, req.params.id);
  }
  res.json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.mid));
});

app.delete('/api/goals/:id/milestones/:mid', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM milestones WHERE id = ? AND goal_id = ?').run(req.params.mid, req.params.id);
  res.json({ ok: true });
});
// ---- Habits ----
app.get('/api/habits', authMiddleware, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const result = habits.map(h => {
    const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(h.id, today);
    const logs = db.prepare('SELECT date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY date DESC').all(h.id);
    let streak = 0; let checkDate = new Date(today);
    for (const l of logs) {
      if (l.date === checkDate.toISOString().slice(0,10)) { streak++; checkDate.setDate(checkDate.getDate()-1); }
      else if (l.date < checkDate.toISOString().slice(0,10)) break;
    }
    return { ...h, today_done: log ? !!log.completed : false, streak };
  });
  res.json(result);
});

app.post('/api/habits', authMiddleware, (req, res) => {
  const { name, description, category, color } = req.body;
  const r = db.prepare('INSERT INTO habits (user_id, name, description, category, color) VALUES (?,?,?,?,?)').run(req.userId, name, description || '', category || '日常', color || '#6366f1');
  res.status(201).json(db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(r.lastInsertRowid, req.userId));
});

app.put('/api/habits/:id', authMiddleware, (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!habit) return res.status(404).json({ error: '习惯不存在' });
  const fields = ['name','description','category','color']; const sets = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(f + ' = ?'); vals.push(req.body[f]); } });
  if (sets.length) db.prepare('UPDATE habits SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?').run(...vals, req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId));
});

app.post('/api/habits/:id/toggle', authMiddleware, (req, res) => {
  const { date } = req.body;
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!habit) return res.status(404).json({ error: '习惯不存在' });
  const existing = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(req.params.id, date);
  if (existing) {
    db.prepare('UPDATE habit_logs SET completed = ? WHERE id = ?').run(existing.completed ? 0 : 1, existing.id);
    res.json({ ok: true, completed: !existing.completed });
  } else {
    db.prepare('INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)').run(req.params.id, date);
    res.json({ ok: true, completed: true });
  }
});

app.delete('/api/habits/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// ---- Journal ----
app.get('/api/journals', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 365);
  res.json(db.prepare('SELECT * FROM journals WHERE user_id = ? ORDER BY date DESC LIMIT ?').all(req.userId, limit));
});

app.get('/api/journals/:date', authMiddleware, (req, res) => {
  const j = db.prepare('SELECT * FROM journals WHERE user_id = ? AND date = ?').get(req.userId, req.params.date);
  if (!j) return res.status(404).json({ error: '该日期没有日记' });
  res.json(j);
});

app.post('/api/journals', authMiddleware, (req, res) => {
  const { date, content, mood, grateful, learned } = req.body;
  if (db.prepare('SELECT id FROM journals WHERE user_id = ? AND date = ?').get(req.userId, date)) {
    return res.status(400).json({ error: '该日期已有日记' });
  }
  db.prepare('INSERT INTO journals (user_id, date, content, mood, grateful, learned) VALUES (?,?,?,?,?,?)').run(req.userId, date, content || '', mood || 3, grateful || '', learned || '');
  res.status(201).json(db.prepare('SELECT * FROM journals WHERE user_id = ? AND date = ?').get(req.userId, date));
});

app.put('/api/journals/:date', authMiddleware, (req, res) => {
  const j = db.prepare('SELECT * FROM journals WHERE user_id = ? AND date = ?').get(req.userId, req.params.date);
  if (!j) return res.status(404).json({ error: '日记不存在' });
  const fields = ['content','mood','grateful','learned']; const sets = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(f + ' = ?'); vals.push(req.body[f]); } });
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    db.prepare('UPDATE journals SET ' + sets.join(', ') + ' WHERE user_id = ? AND date = ?').run(...vals, req.userId, req.params.date);
  }
  res.json(db.prepare('SELECT * FROM journals WHERE user_id = ? AND date = ?').get(req.userId, req.params.date));
});

app.delete('/api/journals/:date', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM journals WHERE user_id = ? AND date = ?').run(req.userId, req.params.date);
  res.json({ ok: true });
});

// ---- LifeWheel ----
app.get('/api/lifewheel', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 12, 100);
  res.json(db.prepare('SELECT * FROM life_wheels WHERE user_id = ? ORDER BY date DESC LIMIT ?').all(req.userId, limit));
});

app.post('/api/lifewheel', authMiddleware, (req, res) => {
  const { date, career, finance, health, relationships, growth, environment, recreation, spirituality, notes } = req.body;
  db.prepare('INSERT INTO life_wheels (user_id, date, career, finance, health, relationships, growth, environment, recreation, spirituality, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(req.userId, date, career||5, finance||5, health||5, relationships||5, growth||5, environment||5, recreation||5, spirituality||5, notes||'');
  res.status(201).json(db.prepare('SELECT * FROM life_wheels WHERE id = last_insert_rowid() AND user_id = ?').get(req.userId));
});

app.delete('/api/lifewheel/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM life_wheels WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});


// ---- Reviews ----
app.get('/api/reviews', authMiddleware, (req, res) => {
  const { type, limit } = req.query;
  let sql = 'SELECT * FROM reviews WHERE user_id = ?';
  const params = [req.userId];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY date DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/reviews/:type/:date', authMiddleware, (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE user_id = ? AND type = ? AND date = ?').get(req.userId, req.params.type, req.params.date);
  if (!r) return res.status(404).json({ error: '回顾不存在' });
  res.json(r);
});

app.post('/api/reviews', authMiddleware, (req, res) => {
  const { date, type, wins, challenges, insights, focus, goal_progress, habit_notes, mood_analysis, next_steps } = req.body;
  const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND date = ? AND type = ?').get(req.userId, date, type);
  if (existing) return res.status(400).json({ error: '该日期已有同类型回顾' });
  db.prepare('INSERT INTO reviews (user_id, date, type, wins, challenges, insights, focus, goal_progress, habit_notes, mood_analysis, next_steps) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(req.userId, date, type, wins||'', challenges||'', insights||'', focus||'', goal_progress||'', habit_notes||'', mood_analysis||'', next_steps||'');
  res.status(201).json(db.prepare('SELECT * FROM reviews WHERE user_id = ? AND type = ? AND date = ?').get(req.userId, type, date));
});

app.put('/api/reviews/:id', authMiddleware, (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!r) return res.status(404).json({ error: '回顾不存在' });
  const fields = ['wins','challenges','insights','focus','goal_progress','habit_notes','mood_analysis','next_steps'];
  const sets = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(f + ' = ?'); vals.push(req.body[f]); } });
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    db.prepare('UPDATE reviews SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?').run(...vals, req.params.id, req.userId);
  }
  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id));
});

app.delete('/api/reviews/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// ---- Settings ----
app.get('/api/settings', authMiddleware, (req, res) => {
  let s = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.userId);
  if (!s) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(req.userId);
    s = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.userId);
  }
  res.json(s);
});

app.put('/api/settings', authMiddleware, (req, res) => {
  const fields = ['habit_reminder','habit_reminder_time','journal_reminder','journal_reminder_time','theme'];
  const sets = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(f + ' = ?'); vals.push(req.body[f]); } });
  if (sets.length) {
    db.prepare('UPDATE user_settings SET ' + sets.join(', ') + ' WHERE user_id = ?').run(...vals, req.userId);
  }
  res.json(db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.userId));
});
// ---- Export & Trends ----
app.get('/api/export', authMiddleware, (req, res) => {
  const uid = req.userId;
  const data = {
    exported_at: new Date().toISOString(),
    goals: db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(uid),
    habits: db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC').all(uid),
    habit_logs: db.prepare('SELECT hl.* FROM habit_logs hl JOIN habits h ON hl.habit_id = h.id WHERE h.user_id = ? ORDER BY hl.date DESC, hl.habit_id').all(uid),
    journals: db.prepare('SELECT * FROM journals WHERE user_id = ? ORDER BY date DESC').all(uid),
    life_wheels: db.prepare('SELECT * FROM life_wheels WHERE user_id = ? ORDER BY date DESC').all(uid),
  };
  res.setHeader('Content-Disposition', 'attachment; filename=lifedesign-export-' + new Date().toISOString().slice(0,10) + '.json');
  res.json(data);
});

app.get('/api/trends/mood', authMiddleware, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  res.json(db.prepare('SELECT date, mood FROM journals WHERE user_id = ? ORDER BY date ASC LIMIT ?').all(req.userId, days));
});

app.get('/api/trends/habits-weekly', authMiddleware, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const habits = db.prepare('SELECT id, name, color FROM habits WHERE user_id = ?').all(req.userId);
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const habitStatus = habits.map(h => {
      const log = db.prepare('SELECT completed FROM habit_logs WHERE habit_id = ? AND date = ?').get(h.id, dateStr);
      return { id: h.id, name: h.name, color: h.color, done: log ? !!log.completed : false };
    });
    const doneCount = habitStatus.filter(h => h.done).length;
    result.push({ date: dateStr, weekday: ['日','一','二','三','四','五','六'][d.getDay()], habits: habitStatus, rate: habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0 });
  }
  res.json(result);
});

app.get('/api/trends/goals', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, title, category, progress, status, start_date, target_date FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId));
});

app.get('/api/trends/lifewheel-compare', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM life_wheels WHERE user_id = ? ORDER BY date DESC LIMIT 2').all(req.userId));
});


// ---- Enhanced Analytics ----
app.get('/api/analytics/weekly-summary', authMiddleware, (req, res) => {
  const uid = req.userId;
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const habits = db.prepare('SELECT id, name, color FROM habits WHERE user_id = ?').all(uid);
  const dailyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const mood = db.prepare('SELECT mood FROM journals WHERE user_id = ? AND date = ?').get(uid, ds);
    const doneHabits = db.prepare('SELECT COUNT(*) as c FROM habit_logs hl JOIN habits h ON hl.habit_id = h.id WHERE h.user_id = ? AND hl.date = ? AND hl.completed = 1').get(uid, ds).c;
    const totalHabits = habits.length;
    dailyData.push({ date: ds, weekday: ['日','一','二','三','四','五','六'][d.getDay()], mood: mood ? mood.mood : null, habits_done: doneHabits, habits_total: totalHabits });
  }
  const totalDone = dailyData.reduce((s, d) => s + d.habits_done, 0);
  const totalPossible = dailyData.reduce((s, d) => s + d.habits_total, 0);
  const journalsWritten = dailyData.filter(d => d.mood !== null).length;
  const avgMood = dailyData.filter(d => d.mood).reduce((s,d,i,arr) => s + d.mood / arr.length, 0);

  res.json({ daily_data: dailyData, summary: { habits_completion_rate: totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0, journals_written: journalsWritten, avg_mood: avgMood ? Math.round(avgMood * 10) / 10 : null } });
});

app.get('/api/analytics/habit-heatmap', authMiddleware, (req, res) => {
  const uid = req.userId;
  const days = parseInt(req.query.days) || 90;
  const today = new Date();
  const habits = db.prepare('SELECT id, name, color FROM habits WHERE user_id = ?').all(uid);
  const result = { habits, days: [] };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dayEntry = { date: ds, weekday: d.getDay(), completions: {} };
    for (const h of habits) {
      const log = db.prepare('SELECT completed FROM habit_logs WHERE habit_id = ? AND date = ?').get(h.id, ds);
      dayEntry.completions[h.id] = log ? !!log.completed : false;
    }
    result.days.push(dayEntry);
  }
  res.json(result);
});

app.get('/api/analytics/goal-distribution', authMiddleware, (req, res) => {
  const uid = req.userId;
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY category').all(uid);
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY status').all(uid);
  const progressAvg = db.prepare('SELECT AVG(progress) as avg FROM goals WHERE user_id = ?').get(uid).avg || 0;
  res.json({ by_category: byCategory, by_status: byStatus, avg_progress: Math.round(progressAvg) });
});

app.get('/api/analytics/mood-monthly', authMiddleware, (req, res) => {
  const uid = req.userId;
  const months = parseInt(req.query.months) || 6;
  const rows = db.prepare("SELECT strftime('%Y-%m', date) as month, AVG(mood) as avg_mood, COUNT(*) as days FROM journals WHERE user_id = ? GROUP BY month ORDER BY month DESC LIMIT ?").all(uid, months);
  res.json(rows.map(r => ({ ...r, avg_mood: Math.round(r.avg_mood * 10) / 10 })));
});

// Serve static frontend in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}
app.listen(PORT, () => console.log('人生设计系统 API 运行在 http://localhost:' + PORT));