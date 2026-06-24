// db.js — SQLite database setup using better-sqlite3
// Creates last-minute.db on first run and seeds it with starter data.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'last-minute.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    deadline TEXT NOT NULL,      -- ISO 8601 string
    importance INTEGER NOT NULL DEFAULT 2,  -- 1 low, 2 medium, 3 high
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    history TEXT NOT NULL DEFAULT '[]'   -- JSON array of 0/1, one per day
  );
`);

// Seed only if empty, so restarts don't duplicate data
const taskCount = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
if (taskCount === 0) {
  const insertTask = db.prepare(
    'INSERT INTO tasks (title, deadline, importance, completed) VALUES (?, ?, ?, 0)'
  );
  const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
  insertTask.run('Finish hackathon problem statement review', inHours(2), 3);
  insertTask.run('Pay electricity bill', inHours(20), 2);
  insertTask.run('Reply to internship interview email', inHours(5), 3);
}

const habitCount = db.prepare('SELECT COUNT(*) AS n FROM habits').get().n;
if (habitCount === 0) {
  const insertHabit = db.prepare('INSERT INTO habits (name, history) VALUES (?, ?)');
  insertHabit.run('Review tasks every morning', JSON.stringify([1, 1, 0, 1, 1, 0, 1]));
  insertHabit.run('No new tasks after 9pm', JSON.stringify([1, 0, 1, 1, 0, 0, 1]));
  insertHabit.run('Inbox zero', JSON.stringify([0, 1, 1, 0, 1, 1, 1]));
}

module.exports = db;
