const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB 初期化
const db = new sqlite3.Database('./db.sqlite');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    description TEXT,
    priority TEXT,
    dueDate TEXT,
    category TEXT,
    completed INTEGER,
    createdAt TEXT,
    updatedAt TEXT
  )`);
});

// タスク一覧取得
app.get('/tasks', (req,res)=>{
  db.all("SELECT * FROM tasks ORDER BY createdAt DESC", [], (err, rows)=>{
    res.json(rows);
  });
});

// タスク追加
app.post('/tasks', (req,res)=>{
  const { text, description, priority, dueDate, category } = req.body;
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO tasks(text,description,priority,dueDate,category,completed,createdAt,updatedAt)
     VALUES(?,?,?,?,?,?,0,?)`,
    [text, description, priority, dueDate, category, null],
    function(err){
      if(err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, text, description, priority, dueDate, category, completed: 0, createdAt, updatedAt: null });
    }
  );
});

// タスク更新
app.put('/tasks/:id', (req,res)=>{
  const { id } = req.params;
  const { text, description, priority, dueDate, category, completed } = req.body;
  const updatedAt = new Date().toISOString();
  db.run(
    `UPDATE tasks SET text=?,description=?,priority=?,dueDate=?,category=?,completed=?,updatedAt=? WHERE id=?`,
    [text, description, priority, dueDate, category, completed?1:0, updatedAt, id],
    function(err){
      if(err) return res.status(500).json({ error: err.message });
      res.json({ id, text, description, priority, dueDate, category, completed, updatedAt });
    }
  );
});

// タスク削除
app.delete('/tasks/:id', (req,res)=>{
  const { id } = req.params;
  db.run(`DELETE FROM tasks WHERE id=?`, [id], function(err){
    if(err) return res.status(500).json({ error: err.message });
    res.sendStatus(204);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));

