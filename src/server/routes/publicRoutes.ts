import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import { attachOptionalUser, type AuthedRequest } from '../auth.ts';
import { DEFAULT_SETTINGS } from '../../lib/bookingRules.ts';

export const publicRouter = Router();

export function hydrateHall(hall: any, userId?: string) {
  const images = db
    .prepare(`SELECT id, hall_id, url, caption, sort_order FROM hall_images WHERE hall_id = ? ORDER BY sort_order ASC`)
    .all(hall.id);
  const amenities = db
    .prepare(
      `SELECT a.id, a.name, a.icon_key
       FROM amenities a
       INNER JOIN hall_amenities ha ON ha.amenity_id = a.id
       WHERE ha.hall_id = ?
       ORDER BY a.name ASC`
    )
    .all(hall.id);
  const fav = userId
    ? Boolean(
        db
          .prepare(`SELECT 1 FROM favorites WHERE user_id = ? AND hall_id = ?`)
          .get(userId, hall.id)
      )
    : false;

  return {
    ...hall,
    ac_available: Boolean(hall.ac_available),
    kitchen_available: Boolean(hall.kitchen_available),
    featured: Boolean(hall.featured),
    is_active: Boolean(hall.is_active),
    images,
    amenities,
    is_favorite: fav,
  };
}

publicRouter.get('/halls', attachOptionalUser, (req: AuthedRequest, res) => {
  try {
    const { location, category, minCapacity, maxBudget, eventDate, sort, amenity, q } = req.query;
    const rows = db
      .prepare(`SELECT * FROM halls WHERE is_active = 1 ORDER BY featured DESC, rating DESC`)
      .all() as any[];

    let halls = rows.map((h) => hydrateHall(h, req.authUser?.id));

    if (location && String(location).trim()) {
      const loc = String(location).trim().toLowerCase();
      halls = halls.filter(
        (h) => h.location.toLowerCase().includes(loc) || h.address.toLowerCase().includes(loc)
      );
    }
    if (category && String(category).trim() && category !== 'All') {
      const cat = String(category).trim().toLowerCase();
      halls = halls.filter((h) => h.category.toLowerCase() === cat);
    }
    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      halls = halls.filter(
        (h) =>
          h.name.toLowerCase().includes(term) ||
          h.location.toLowerCase().includes(term) ||
          h.category.toLowerCase().includes(term) ||
          h.description.toLowerCase().includes(term)
      );
    }
    if (minCapacity && Number(minCapacity) > 0) {
      halls = halls.filter((h) => h.capacity >= Number(minCapacity));
    }
    if (maxBudget && Number(maxBudget) > 0) {
      halls = halls.filter((h) => h.base_price <= Number(maxBudget));
    }
    if (amenity && String(amenity).trim()) {
      const amTerm = String(amenity).trim().toLowerCase();
      halls = halls.filter((h) =>
        h.amenities.some((a: any) => a.name.toLowerCase().includes(amTerm) || a.id === amenity)
      );
    }
    if (eventDate && /^\d{4}-\d{2}-\d{2}$/.test(String(eventDate))) {
      const dateStr = String(eventDate);
      halls = halls.filter((h) => {
        const fullBlock = db
          .prepare(
            `SELECT 1 FROM availability_blocks
             WHERE hall_id = ? AND date = ? AND start_time <= '09:00' AND end_time >= '22:00' LIMIT 1`
          )
          .get(h.id, dateStr);
        if (fullBlock) return false;
        const confirmedAllDay = db
          .prepare(
            `SELECT 1 FROM bookings
             WHERE hall_id = ? AND event_date = ? AND booking_status IN ('CONFIRMED', 'APPROVED')
             AND start_time <= '10:00' AND end_time >= '21:00' LIMIT 1`
          )
          .get(h.id, dateStr);
        return !confirmedAllDay;
      });
    }

    if (sort === 'price_asc') {
      halls.sort((a, b) => a.base_price - b.base_price);
    } else if (sort === 'price_desc') {
      halls.sort((a, b) => b.base_price - a.base_price);
    } else if (sort === 'rating') {
      halls.sort((a, b) => b.rating - a.rating);
    }

    return res.json({ halls });
  } catch (err) {
    console.error('List halls error:', err);
    return res.status(500).json({ error: 'Unable to load venues.' });
  }
});

publicRouter.get('/halls/:id', attachOptionalUser, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const hall = db
    .prepare(`SELECT * FROM halls WHERE (id = ? OR slug = ?) AND is_active = 1`)
    .get(id, id) as any;

  if (!hall) {
    return res.status(404).json({ error: 'Venue not found.' });
  }

  const reviews = db
    .prepare(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.hall_id = ? AND r.is_published = 1
       ORDER BY r.created_at DESC`
    )
    .all(hall.id)
    .map((r: any) => ({
      ...r,
      is_verified: Boolean(r.is_verified),
      is_published: Boolean(r.is_published),
    }));

  return res.json({
    hall: hydrateHall(hall, req.authUser?.id),
    reviews,
  });
});

publicRouter.get('/halls/:id/availability', (req, res) => {
  const { id } = req.params;
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));

  const bookings = db
    .prepare(
      `SELECT event_date as date, start_time, end_time, booking_status as status
       FROM bookings
       WHERE hall_id = ? AND event_date LIKE ? AND booking_status IN ('PENDING', 'APPROVED', 'CONFIRMED')
       ORDER BY event_date ASC, start_time ASC`
    )
    .all(id, `${month}%`) as Array<{
    date: string;
    start_time: string;
    end_time: string;
    status: string;
  }>;

  const blocks = db
    .prepare(
      `SELECT id, date, start_time, end_time, status, reason
       FROM availability_blocks
       WHERE hall_id = ? AND date LIKE ?
       ORDER BY date ASC, start_time ASC`
    )
    .all(id, `${month}%`) as Array<{
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    reason: string;
  }>;

  return res.json({ month, bookings, blocks });
});

publicRouter.get('/packages', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC`).all() as any[];
  const packages = rows.map((p) => ({
    ...p,
    features: JSON.parse(p.features_json || '[]'),
    is_active: Boolean(p.is_active),
  }));
  return res.json({ packages });
});

publicRouter.get('/gallery', (_req, res) => {
  const items = db.prepare(`SELECT * FROM gallery_items ORDER BY sort_order ASC`).all();
  return res.json({ items });
});

publicRouter.get('/reviews', (_req, res) => {
  const reviews = db
    .prepare(
      `SELECT r.*, u.name as user_name, h.name as hall_name
       FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       INNER JOIN halls h ON h.id = r.hall_id
       WHERE r.is_published = 1 AND r.is_verified = 1
       ORDER BY r.created_at DESC LIMIT 12`
    )
    .all()
    .map((r: any) => ({
      ...r,
      is_verified: Boolean(r.is_verified),
      is_published: Boolean(r.is_published),
    }));
  return res.json({ reviews });
});

publicRouter.get('/amenities', (_req, res) => {
  const amenities = db.prepare(`SELECT * FROM amenities ORDER BY name ASC`).all();
  return res.json({ amenities });
});

publicRouter.get('/settings/public', (_req, res) => {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as Array<{
    key: string;
    value: string;
  }>;
  const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key === 'auto_confirm_on_payment') {
      settings[row.key] = row.value === 'true';
    } else {
      settings[row.key] = Number(row.value);
    }
  }
  return res.json({ settings });
});

publicRouter.post('/contact', (req, res) => {
  const { name, email, phone, eventType, message } = req.body ?? {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO contact_inquiries (id, name, email, phone, event_type, message)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, String(name).trim(), String(email).trim(), String(phone ?? '').trim(), String(eventType ?? '').trim(), String(message).trim());

  const admins = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as Array<{ id: string }>;
  const insertNotif = db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'SYSTEM')`
  );
  for (const adm of admins) {
    insertNotif.run(
      crypto.randomUUID(),
      adm.id,
      'New Concierge Inquiry',
      `${String(name).trim()} inquired regarding ${eventType || 'an upcoming event'}.`
    );
  }

  return res.status(201).json({ ok: true, id, message: 'Thank you. Our venue concierge will respond within 4 business hours.' });
});
