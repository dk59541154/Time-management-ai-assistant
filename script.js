// server.js — REST API for the Last-Minute app
// Routes match what the frontend (last-minute-app.html) calls.

const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());            // allow the frontend (different origin/file) to call this API
app.use(express.json());    // parse JSON bodies

const PORT = process.env.PORT || 4000;

// ---------- helpers ----------
function taskRowToJson(row) {
  return {
    id: row.id,
    title: row.title,
    deadline: row.deadline,
    importance: row.importance,
    completed: !!row.completed,
  };
}
function habitRowToJson(row) {
  return {
    id: row.id,
    name: row.name,
    history: JSON.parse(row.history),
  };
}

// ============ TASKS ============

// GET /api/tasks — list every task
app.get('/api/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY deadline ASC').all();
  res.json(rows.map(taskRowToJson));
});

// POST /api/tasks — create a task
// body: { title, deadline (ISO string), importance (1-3) }
app.post('/api/tasks', (req, res) => {
  const { title, deadline, importance } = req.body;
  if (!title || !deadline) {
    return res.status(400).json({ error: 'title and deadline are required' });
  }
  const imp = Number(importance) || 2;
  const info = db
    .prepare('INSERT INTO tasks (title, deadline, importance, completed) VALUES (?, ?, ?, 0)')
    .run(title, deadline, imp);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(taskRowToJson(row));
});

// PATCH /api/tasks/:id — update title/deadline/importance/completed (partial)
app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'task not found' });

  const updated = {
    title: req.body.title ?? existing.title,
    deadline: req.body.deadline ?? existing.deadline,
    importance: req.body.importance ?? existing.importance,
    completed:
      req.body.completed === undefined ? existing.completed : req.body.completed ? 1 : 0,
  };

  db.prepare(
    'UPDATE tasks SET title = ?, deadline = ?, importance = ?, completed = ? WHERE id = ?'
  ).run(updated.title, updated.deadline, updated.importance, updated.completed, id);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(taskRowToJson(row));
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'task not found' });
  res.status(204).end();
});

// ============ HABITS ============

// GET /api/habits
app.get('/api/habits', (req, res) => {
  const rows = db.prepare('SELECT * FROM habits ORDER BY id ASC').all();
  res.json(rows.map(habitRowToJson));
});

// POST /api/habits — create a habit
app.post('/api/habits', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db
    .prepare('INSERT INTO habits (name, history) VALUES (?, ?)')
    .run(name, JSON.stringify([]));
  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(habitRowToJson(row));
});

// PATCH /api/habits/:id/toggle — flip one day's value in the history array
// body: { dayIndex }
app.patch('/api/habits/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const dayIndex = Number(req.body.dayIndex);
  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'habit not found' });

  const history = JSON.parse(row.history);
  while (history.length <= dayIndex) history.push(0); // grow array if needed
  history[dayIndex] = history[dayIndex] ? 0 : 1;

  db.prepare('UPDATE habits SET history = ? WHERE id = ?').run(JSON.stringify(history), id);
  const updated = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
  res.json(habitRowToJson(updated));
});

// DELETE /api/habits/:id
app.delete('/api/habits/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'habit not found' });
  res.status(204).end();
});

// ---------- health check ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Last-Minute backend running on http://localhost:${PORT}`);
});
