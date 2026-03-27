require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ======================================
// PostgreSQL 接続設定
// ======================================

// NODE_ENV=production のとき → Render → SSL 必須
// NODE_ENV=development のとき → ローカル → SSL 無効
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }   // Render: SSL 必須
    : false                           // Local: SSL なし
});

// ======================================
// 初期テーブル作成
// ======================================
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        text TEXT,
        description TEXT,
        priority TEXT,
        dueDate TEXT,
        category TEXT,
        completed BOOLEAN DEFAULT false,
        createdAt TIMESTAMPTZ,
        updatedAt TIMESTAMPTZ
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        name TEXT PRIMARY KEY
      );
    `);

    console.log("DB initialized");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
}

initDB();

// ======================================
// タスク API
// ======================================

// 全タスク取得
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM tasks ORDER BY createdAt DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// タスク追加
app.post('/tasks', async (req, res) => {
  const { text, description, priority, dueDate, category } = req.body;
  const createdAt = new Date().toISOString();

  try {
    const result = await pool.query(
      `INSERT INTO tasks(text, description, priority, dueDate, category, completed, createdAt, updatedAt)
       VALUES($1,$2,$3,$4,$5,false,$6,NULL)
       RETURNING *`,
      [text, description, priority, dueDate, category, createdAt]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// タスク更新
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { text, description, priority, dueDate, category, completed } = req.body;
  const updatedAt = new Date().toISOString();

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET text=$1, description=$2, priority=$3, dueDate=$4, category=$5, completed=$6, updatedAt=$7
       WHERE id=$8
       RETURNING *`,
      [text, description, priority, dueDate, category, completed, updatedAt, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// タスク削除
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// カテゴリ API
// ======================================

// 全カテゴリ取得
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM categories;');
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// カテゴリ追加
app.post('/categories', async (req, res) => {
  const { name } = req.body;

  try {
    await pool.query(
      `INSERT INTO categories(name) VALUES($1)
       ON CONFLICT (name) DO NOTHING`,
      [name]
    );

    res.json({ name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// カテゴリ削除
app.delete('/categories/:name', async (req, res) => {
  const { name } = req.params;

  try {
    await pool.query(`DELETE FROM categories WHERE name=$1`, [name]);
    await pool.query(`UPDATE tasks SET category='その他' WHERE category=$1`, [name]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// サーバ起動
// ======================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? "production" : "development"}`);
});
