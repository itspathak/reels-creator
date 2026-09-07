const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const pool = require('../db');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const validateRegister = (body) => {
  const { name, email, password, confirmPassword } = body;

  if (!name || !email || !password) {
    return 'Please provide name, email and password';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please provide a valid email address';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (confirmPassword && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

const register = async (req, res, next) => {
  try {
    const error = validateRegister(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const { name, email, password } = req.body;

    const existing = await User.findByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    await pool.execute(
      'INSERT INTO subscriptions (user_id, plan, status, reels_limit, reels_used) VALUES (?, ?, ?, ?, ?)',
      [userId, 'free', 'active', 5, 0]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token: generateToken(userId),
        user: { id: userId, name: name.trim(), email: email.toLowerCase().trim() },
      },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: generateToken(user.id),
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [sub] = await pool.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'User fetched successfully',
      data: {
        user,
        subscription: sub[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };