CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '其他',
  status TEXT DEFAULT '进行中',
  progress INTEGER DEFAULT 0,
  start_date TEXT DEFAULT (date('now')),
  target_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '日常',
  color TEXT DEFAULT '#6366f1',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  date TEXT DEFAULT (date('now')),
  completed INTEGER DEFAULT 0,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  content TEXT DEFAULT '',
  mood INTEGER DEFAULT 3,
  grateful TEXT DEFAULT '',
  learned TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS life_wheels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  career INTEGER DEFAULT 5,
  finance INTEGER DEFAULT 5,
  health INTEGER DEFAULT 5,
  relationships INTEGER DEFAULT 5,
  growth INTEGER DEFAULT 5,
  environment INTEGER DEFAULT 5,
  recreation INTEGER DEFAULT 5,
  spirituality INTEGER DEFAULT 5,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('weekly','monthly')),
  wins TEXT DEFAULT '',
  challenges TEXT DEFAULT '',
  insights TEXT DEFAULT '',
  focus TEXT DEFAULT '',
  goal_progress TEXT DEFAULT '',
  habit_notes TEXT DEFAULT '',
  mood_analysis TEXT DEFAULT '',
  next_steps TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  habit_reminder INTEGER DEFAULT 0,
  habit_reminder_time TEXT DEFAULT '08:00',
  journal_reminder INTEGER DEFAULT 0,
  journal_reminder_time TEXT DEFAULT '21:00',
  theme TEXT DEFAULT 'light',
  FOREIGN KEY (user_id) REFERENCES users(id)
);
