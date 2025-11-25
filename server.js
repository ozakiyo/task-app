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

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY
  )`);
});

// =========================
// タスク API
// =========================

// 全タスク取得
app.get('/tasks', (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY createdAt DESC", [], (err, rows) => {
    if(err) return res.status(500).json({error: err.message});
    // completed を boolean に変換
    rows.forEach(r => r.completed = !!r.completed);
    res.json(rows);
  });
});

// タスク追加
app.post('/tasks', (req, res) => {
  const { text, description, priority, dueDate, category } = req.body;
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO tasks(text,description,priority,dueDate,category,completed,createdAt,updatedAt)
     VALUES(?,?,?,?,?,?,?,?)`,
    [text, description, priority, dueDate, category, 0, createdAt, null],
    function(err){
      if(err) return res.status(500).json({error: err.message});
      res.json({id: this.lastID, text, description, priority, dueDate, category, completed: false, createdAt, updatedAt: null});
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
      if(err) return res.status(500).json({error: err.message});
      res.json({id, text, description, priority, dueDate, category, completed, updatedAt});
    }
  );
});

// タスク削除
app.delete('/tasks/:id',(req,res)=>{
  const { id } = req.params;
  db.run(`DELETE FROM tasks WHERE id=?`, [id], function(err){
    if(err) return res.status(500).json({error: err.message});
    res.sendStatus(204);
  });
});

// =========================
// カテゴリ API
// =========================

// 全カテゴリ取得
app.get('/categories', (req,res)=>{
  db.all("SELECT name FROM categories", [], (err, rows)=>{
    if(err) return res.status(500).json({error: err.message});
    res.json(rows.map(r=>r.name));
  });
});

// カテゴリ追加
app.post('/categories', (req,res)=>{
  const { name } = req.body;
  db.run(`INSERT OR IGNORE INTO categories(name) VALUES(?)`, [name], function(err){
    if(err) return res.status(500).json({error: err.message});
    res.json({name});
  });
});

// カテゴリ削除
app.delete('/categories/:name', (req,res)=>{
  const { name } = req.params;
  db.run(`DELETE FROM categories WHERE name=?`, [name], function(err){
    if(err) return res.status(500).json({error: err.message});
    // タスクに該当カテゴリがあれば "その他" に振替
    db.run(`UPDATE tasks SET category='その他' WHERE category=?`, [name], function(err2){
      if(err2) return res.status(500).json({error: err2.message});
      res.sendStatus(204);
    });
  });
});

// =========================
// サーバ起動
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));



