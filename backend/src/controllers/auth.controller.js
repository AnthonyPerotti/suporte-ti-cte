const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const ALLOWED_DOMAINS = ['ufsm.br', 'cead.ufsm.br'];

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const domain = email.split('@')[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: 'Email domain not allowed. Use your institutional email.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  // Persist refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: refreshToken, user_id: user.id, expires_at: expiresAt },
  });

  return res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    force_password_change: user.force_password_change,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      force_password_change: user.force_password_change,
    },
  });
};

const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const stored = await prisma.refreshToken.findUnique({ where: { token: refresh_token } });

    if (!stored || stored.expires_at < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refresh_token } });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.sub);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, user_id: payload.sub, expires_at: expiresAt },
    });

    return res.json({ access_token: accessToken, refresh_token: newRefreshToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    await prisma.refreshToken.deleteMany({ where: { token: refresh_token } });
  }
  return res.json({ message: 'Logged out successfully' });
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(new_password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: hash, force_password_change: false },
  });

  return res.json({ message: 'Password changed successfully' });
};

const getMe = async (req, res) => {
  return res.json(req.user);
};

module.exports = { login, refresh, logout, changePassword, getMe };
