import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import {
  AUTH_COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signAuthToken,
  requireAuth,
  attachOptionalUser,
  type AuthedRequest,
} from '../auth.ts';

export const authRouter = Router();

function setSessionCookie(res: any, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

authRouter.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Security: Always force 'USER' role on self-registration regardless of request body
    const id = crypto.randomUUID();
    const verificationToken = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password);

    db.prepare(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status, email_verified, verification_token)
       VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', 0, ?)`
    ).run(id, name.trim(), normalizedEmail, (phone ?? '').trim(), passwordHash, verificationToken);

    db.prepare(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, 'Welcome to Vows & Venues', 'Your account is active. Please verify your email address in My Profile to receive verified booking updates.', 'SYSTEM')`
    ).run(crypto.randomUUID(), id);

    // Notify admins of new member registration
    const admins = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as Array<{ id: string }>;
    const notifStmt = db.prepare(
      `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'SYSTEM')`
    );
    for (const adm of admins) {
      notifStmt.run(
        crypto.randomUUID(),
        adm.id,
        'New Member Registered',
        `${name.trim()} (${normalizedEmail}) joined Vows & Venues.`
      );
    }

    const user = db
      .prepare(
        `SELECT id, name, email, phone, role, status, email_verified, avatar_url, created_at
         FROM users WHERE id = ?`
      )
      .get(id) as any;

    const token = signAuthToken({ sub: user.id, role: 'USER', email: user.email });
    setSessionCookie(res, token);

    return res.status(201).json({
      user: { ...user, email_verified: Boolean(user.email_verified) },
      token,
      verificationToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Unable to complete registration.' });
  }
});

authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db
      .prepare(
        `SELECT id, name, email, phone, password_hash, role, status, email_verified, avatar_url, created_at
         FROM users WHERE email = ?`
      )
      .get(normalizedEmail) as any;

    if (!user || !verifyPassword(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = signAuthToken({ sub: user.id, role: user.role, email: user.email });
    setSessionCookie(res, token);

    const { password_hash: _ph, ...safeUser } = user;
    return res.json({
      user: { ...safeUser, email_verified: Boolean(safeUser.email_verified) },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unable to sign in.' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
});

authRouter.get('/me', attachOptionalUser, (req: AuthedRequest, res) => {
  return res.json({ user: req.authUser ?? null });
});

authRouter.patch('/profile', requireAuth, (req: AuthedRequest, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body ?? {};
    const userId = req.authUser!.id;

    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      const row = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(userId) as {
        password_hash: string;
      };
      if (!verifyPassword(String(currentPassword), row.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
        hashPassword(String(newPassword)),
        userId
      );
    }

    db.prepare(`UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?`).run(
      name ? name.trim() : null,
      phone !== undefined ? String(phone).trim() : null,
      userId
    );

    const updated = db
      .prepare(
        `SELECT id, name, email, phone, role, status, email_verified, avatar_url, created_at
         FROM users WHERE id = ?`
      )
      .get(userId) as any;

    return res.json({ user: { ...updated, email_verified: Boolean(updated.email_verified) } });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Unable to update profile.' });
  }
});

authRouter.post('/verify-email', (req, res) => {
  const { token, email } = req.body ?? {};
  if (!token && !email) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }
  const user = token
    ? (db.prepare(`SELECT id FROM users WHERE verification_token = ?`).get(token) as { id: string } | undefined)
    : (db.prepare(`SELECT id FROM users WHERE email = ?`).get(String(email).toLowerCase()) as
        | { id: string }
        | undefined);

  if (!user) {
    return res.status(404).json({ error: 'Invalid or expired verification token.' });
  }
  db.prepare(`UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?`).run(user.id);
  return res.json({ ok: true, message: 'Email verified successfully.' });
});

authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: 'Please provide your registered email.' });
  }
  const user = db
    .prepare(`SELECT id, email FROM users WHERE email = ?`)
    .get(String(email).trim().toLowerCase()) as { id: string; email: string } | undefined;

  if (!user) {
    return res.json({
      ok: true,
      message: 'If an account matches this email, a reset code has been generated.',
    });
  }

  const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`).run(
    resetToken,
    expires,
    user.id
  );

  return res.json({
    ok: true,
    message: 'Password reset code generated.',
    resetTokenPreview: resetToken,
  });
});

authRouter.post('/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body ?? {};
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const user = db
    .prepare(`SELECT id, reset_token, reset_expires FROM users WHERE email = ?`)
    .get(String(email).trim().toLowerCase()) as
    | { id: string; reset_token: string | null; reset_expires: string | null }
    | undefined;

  if (!user || !user.reset_token || user.reset_token !== String(token).trim().toUpperCase()) {
    return res.status(400).json({ error: 'Invalid reset code.' });
  }
  if (user.reset_expires && Date.parse(user.reset_expires) < Date.now()) {
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }

  db.prepare(
    `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`
  ).run(hashPassword(String(newPassword)), user.id);

  return res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
});
