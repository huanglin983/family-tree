/**
 * 认证路由
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }
  const row = getDb()
    .prepare('SELECT id, username, password_hash FROM admins WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  req.session.adminId = row.id;
  req.session.username = row.username;
  res.json({ id: row.id, username: row.username });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: '退出失败' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', (req, res) => {
  if (!req.session?.adminId) {
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    id: req.session.adminId,
    username: req.session.username,
  });
});
