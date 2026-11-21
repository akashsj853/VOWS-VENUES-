import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, type AuthedRequest } from '../auth.ts';
import { hydrateHall } from './publicRoutes.ts';
import { DEFAULT_SETTINGS, doTimeSlotsOverlap } from '../../lib/bookingRules.ts';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

function logAudit(adminId: string, action: string, entityType: string, entityId: string, details: string) {
  db.prepare(
    `INSERT INTO admin_audit_logs (id, admin_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), adminId, action, entityType, entityId, details);
}

adminRouter.get('/overview', (_req, res) => {
  const totalHalls = (db.prepare(`SELECT COUNT(*) as c FROM halls`).get() as any).c;
  const activeHalls = (db.prepare(`SELECT COUNT(*) as c FROM halls WHERE is_active = 1`).get() as any).c;
  const totalUsers = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'USER'`).get() as any).c;
  const totalBookings = (db.prepare(`SELECT COUNT(*) as c FROM bookings`).get() as any).c;
  const pendingBookings = (
    db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE booking_status = 'PENDING'`).get() as any
  ).c;
  const confirmedBookings = (
    db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE booking_status IN ('CONFIRMED', 'APPROVED')`).get() as any
  ).c;
  const cancelledBookings = (
    db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE booking_status IN ('CANCELLED', 'REJECTED')`).get() as any
  ).c;

  const totalRevenue =
    (
      db
        .prepare(`SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE status = 'VERIFIED'`)
        .get() as any
    ).s -
    (db.prepare(`SELECT COALESCE(SUM(amount), 0) as s FROM refunds WHERE status = 'PROCESSED'`).get() as any).s;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE status = 'VERIFIED' AND created_at LIKE ?`
      )
      .get(`${currentMonth}%`) as any
  ).s;

  const upcomingEvents = db
    .prepare(
      `SELECT b.*, h.name as hall_name, u.name as user_name
       FROM bookings b
       INNER JOIN halls h ON h.id = b.hall_id
       INNER JOIN users u ON u.id = b.user_id
       WHERE b.event_date >= date('now') AND b.booking_status IN ('PENDING', 'APPROVED', 'CONFIRMED')
       ORDER BY b.event_date ASC LIMIT 8`
    )
    .all();

  const statusDistribution = db
    .prepare(`SELECT booking_status as name, COUNT(*) as value FROM bookings GROUP BY booking_status`)
    .all();

  const hallOccupancy = db
    .prepare(
      `SELECT h.name as hall, COUNT(b.id) as bookings, COALESCE(SUM(b.paid_amount), 0) as revenue
       FROM halls h
       LEFT JOIN bookings b ON b.hall_id = h.id AND b.booking_status IN ('CONFIRMED', 'COMPLETED', 'APPROVED')
       GROUP BY h.id
       ORDER BY revenue DESC`
    )
    .all();

  // Monthly revenue & bookings series (last 6 months + current)
  const monthlySeries = db
    .prepare(
      `SELECT substr(event_date, 1, 7) as month,
              COUNT(*) as bookings,
              COALESCE(SUM(CASE WHEN booking_status IN ('CONFIRMED', 'COMPLETED', 'APPROVED') THEN paid_amount ELSE 0 END), 0) as revenue
       FROM bookings
       GROUP BY substr(event_date, 1, 7)
       ORDER BY month ASC`
    )
    .all();

  const recentBookings = db
    .prepare(
      `SELECT b.id, b.booking_ref, b.event_name, b.booking_status, b.created_at, u.name as user_name, h.name as hall_name
       FROM bookings b
       INNER JOIN users u ON u.id = b.user_id
       INNER JOIN halls h ON h.id = b.hall_id
       ORDER BY b.created_at DESC LIMIT 6`
    )
    .all();

  const recentPayments = db
    .prepare(
      `SELECT p.id, p.amount, p.method, p.status, p.created_at, b.booking_ref, u.name as user_name
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT 6`
    )
    .all();

  return res.json({
    kpis: {
      totalHalls,
      activeHalls,
      totalUsers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue,
      monthlyRevenue,
    },
    upcomingEvents,
    statusDistribution,
    hallOccupancy,
    monthlySeries,
    recentBookings,
    recentPayments,
  });
});

// Halls CRUD
adminRouter.get('/halls', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM halls ORDER BY created_at DESC`).all() as any[];
  return res.json({ halls: rows.map((h) => hydrateHall(h)) });
});

adminRouter.post('/halls', (req: AuthedRequest, res) => {
  try {
    const {
      name,
      category,
      location,
      address,
      capacity,
      base_price,
      hourly_rate,
      description,
      seating_arrangements,
      parking_info,
      ac_available,
      kitchen_available,
      featured,
      imageUrls,
      amenityIds,
    } = req.body ?? {};

    if (!name || !category || !location || !address || !capacity || base_price === undefined) {
      return res.status(400).json({ error: 'Name, category, location, address, capacity, and price are required.' });
    }

    const id = crypto.randomUUID();
    const slug = `${String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${crypto.randomBytes(2).toString('hex')}`;

    const txn = db.transaction(() => {
      db.prepare(`
        INSERT INTO halls (
          id, slug, name, category, location, address, capacity, base_price, hourly_rate,
          description, seating_arrangements, parking_info, ac_available, kitchen_available, featured, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        id,
        slug,
        String(name).trim(),
        String(category).trim(),
        String(location).trim(),
        String(address).trim(),
        Number(capacity),
        Number(base_price),
        Number(hourly_rate || 6000),
        String(description || 'Architectural luxury community event venue.').trim(),
        String(seating_arrangements || 'Banquet Rounds, Theatre Style').trim(),
        String(parking_info || 'On-site valet parking available').trim(),
        ac_available ? 1 : 0,
        kitchen_available ? 1 : 0,
        featured ? 1 : 0
      );

      const imgs: string[] =
        Array.isArray(imageUrls) && imageUrls.length > 0
          ? imageUrls
          : ['/src/assets/images/hall_imperial_chandelier_1794682457202.jpg'];

      const insImg = db.prepare(
        `INSERT INTO hall_images (id, hall_id, url, caption, sort_order) VALUES (?, ?, ?, ?, ?)`
      );
      imgs.forEach((url, idx) => {
        insImg.run(crypto.randomUUID(), id, String(url), `${name} View ${idx + 1}`, idx);
      });

      if (Array.isArray(amenityIds)) {
        const insAm = db.prepare(`INSERT OR IGNORE INTO hall_amenities (hall_id, amenity_id) VALUES (?, ?)`);
        for (const amId of amenityIds) {
          insAm.run(id, String(amId));
        }
      }

      logAudit(req.authUser!.id, 'CREATE_HALL', 'HALL', id, `Created venue "${name}"`);
    });

    txn.immediate();
    const hall = db.prepare(`SELECT * FROM halls WHERE id = ?`).get(id);
    return res.status(201).json({ hall: hydrateHall(hall) });
  } catch (err) {
    console.error('Create hall error:', err);
    return res.status(500).json({ error: 'Unable to create venue.' });
  }
});

adminRouter.patch('/halls/:id', (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM halls WHERE id = ?`).get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Venue not found.' });
    }

    const body = req.body ?? {};
    const txn = db.transaction(() => {
      db.prepare(`
        UPDATE halls SET
          name = COALESCE(?, name),
          category = COALESCE(?, category),
          location = COALESCE(?, location),
          address = COALESCE(?, address),
          capacity = COALESCE(?, capacity),
          base_price = COALESCE(?, base_price),
          hourly_rate = COALESCE(?, hourly_rate),
          description = COALESCE(?, description),
          seating_arrangements = COALESCE(?, seating_arrangements),
          parking_info = COALESCE(?, parking_info),
          ac_available = COALESCE(?, ac_available),
          kitchen_available = COALESCE(?, kitchen_available),
          featured = COALESCE(?, featured),
          is_active = COALESCE(?, is_active)
        WHERE id = ?
      `).run(
        body.name ?? null,
        body.category ?? null,
        body.location ?? null,
        body.address ?? null,
        body.capacity !== undefined ? Number(body.capacity) : null,
        body.base_price !== undefined ? Number(body.base_price) : null,
        body.hourly_rate !== undefined ? Number(body.hourly_rate) : null,
        body.description ?? null,
        body.seating_arrangements ?? null,
        body.parking_info ?? null,
        body.ac_available !== undefined ? (body.ac_available ? 1 : 0) : null,
        body.kitchen_available !== undefined ? (body.kitchen_available ? 1 : 0) : null,
        body.featured !== undefined ? (body.featured ? 1 : 0) : null,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
        id
      );

      if (Array.isArray(body.amenityIds)) {
        db.prepare(`DELETE FROM hall_amenities WHERE hall_id = ?`).run(id);
        const insAm = db.prepare(`INSERT OR IGNORE INTO hall_amenities (hall_id, amenity_id) VALUES (?, ?)`);
        for (const amId of body.amenityIds) {
          insAm.run(id, String(amId));
        }
      }

      if (Array.isArray(body.imageUrls) && body.imageUrls.length > 0) {
        db.prepare(`DELETE FROM hall_images WHERE hall_id = ?`).run(id);
        const insImg = db.prepare(
          `INSERT INTO hall_images (id, hall_id, url, caption, sort_order) VALUES (?, ?, ?, ?, ?)`
        );
        body.imageUrls.forEach((url: string, idx: number) => {
          insImg.run(crypto.randomUUID(), id, String(url), `${body.name || existing.name} View ${idx + 1}`, idx);
        });
      }

      logAudit(req.authUser!.id, 'UPDATE_HALL', 'HALL', id, `Updated venue "${body.name || existing.name}"`);
    });

    txn.immediate();
    const updated = db.prepare(`SELECT * FROM halls WHERE id = ?`).get(id);
    return res.json({ hall: hydrateHall(updated) });
  } catch (err) {
    console.error('Update hall error:', err);
    return res.status(500).json({ error: 'Unable to update venue.' });
  }
});

adminRouter.delete('/halls/:id', (req: AuthedRequest, res) => {
  const { id } = req.params;
  const activeBookings = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM bookings WHERE hall_id = ? AND booking_status IN ('PENDING', 'APPROVED', 'CONFIRMED')`
      )
      .get(id) as any
  ).c;

  if (activeBookings > 0) {
    // Archive safely instead of hard delete when active bookings exist
    db.prepare(`UPDATE halls SET is_active = 0 WHERE id = ?`).run(id);
    logAudit(req.authUser!.id, 'ARCHIVE_HALL', 'HALL', id, 'Archived venue due to existing active bookings.');
    return res.json({ ok: true, archived: true });
  }

  db.prepare(`DELETE FROM halls WHERE id = ?`).run(id);
  logAudit(req.authUser!.id, 'DELETE_HALL', 'HALL', id, 'Deleted venue permanently.');
  return res.json({ ok: true, deleted: true });
});

// Booking Management
adminRouter.get('/bookings', (req, res) => {
  const { status, date, q } = req.query;
  let rows = db
    .prepare(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              h.name as hall_name, h.location as hall_location, p.name as package_name
       FROM bookings b
       INNER JOIN users u ON u.id = b.user_id
       INNER JOIN halls h ON h.id = b.hall_id
       LEFT JOIN packages p ON p.id = b.package_id
       ORDER BY b.created_at DESC`
    )
    .all() as any[];

  if (status && status !== 'ALL') {
    rows = rows.filter((r) => r.booking_status === status);
  }
  if (date) {
    rows = rows.filter((r) => r.event_date === date);
  }
  if (q && String(q).trim()) {
    const term = String(q).trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.booking_ref.toLowerCase().includes(term) ||
        r.event_name.toLowerCase().includes(term) ||
        r.user_name.toLowerCase().includes(term) ||
        r.hall_name.toLowerCase().includes(term)
    );
  }

  const withHistory = rows.map((b) => ({
    ...b,
    history: db
      .prepare(`SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY created_at ASC`)
      .all(b.id),
  }));

  return res.json({ bookings: withHistory });
});

adminRouter.patch('/bookings/:id/status', (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body ?? {};
    const valid = ['PENDING', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    const txn = db.transaction(() => {
      const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as any;
      if (!booking) {
        throw { status: 404, message: 'Booking not found.' };
      }

      // If approving/confirming, verify no other confirmed/approved overlap exists
      if (['APPROVED', 'CONFIRMED'].includes(status)) {
        const others = db
          .prepare(
            `SELECT booking_ref, start_time, end_time FROM bookings
             WHERE hall_id = ? AND event_date = ? AND id != ? AND booking_status IN ('APPROVED', 'CONFIRMED')`
          )
          .all(booking.hall_id, booking.event_date, booking.id) as any[];
        for (const o of others) {
          if (doTimeSlotsOverlap(booking.start_time, booking.end_time, o.start_time, o.end_time)) {
            throw {
              status: 409,
              message: `Cannot confirm: overlaps with confirmed booking ${o.booking_ref} (${o.start_time}–${o.end_time}).`,
            };
          }
        }
      }

      db.prepare(
        `UPDATE bookings SET booking_status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = datetime('now') WHERE id = ?`
      ).run(status, adminNotes !== undefined ? String(adminNotes) : null, id);

      db.prepare(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, changed_by_name, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        id,
        booking.booking_status,
        status,
        req.authUser!.id,
        req.authUser!.name,
        adminNotes ? String(adminNotes) : `Status updated to ${status} by administrator.`
      );

      db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, 'BOOKING')`
      ).run(
        crypto.randomUUID(),
        booking.user_id,
        `Reservation ${status} · ${booking.booking_ref}`,
        `Your reservation for ${booking.event_name} on ${booking.event_date} has been marked ${status}.`
      );

      logAudit(req.authUser!.id, 'UPDATE_BOOKING_STATUS', 'BOOKING', id, `${booking.booking_status} -> ${status}`);
      return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id);
    });

    const updated = txn.immediate();
    return res.json({ booking: updated });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    console.error('Admin status update error:', err);
    return res.status(500).json({ error: 'Unable to update booking status.' });
  }
});

// Availability Management
adminRouter.get('/availability', (req, res) => {
  const hallId = req.query.hallId ? String(req.query.hallId) : null;
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));

  const bookings = db
    .prepare(
      `SELECT b.id, b.booking_ref, b.hall_id, h.name as hall_name, b.event_name, b.event_date as date,
              b.start_time, b.end_time, b.booking_status as status
       FROM bookings b
       INNER JOIN halls h ON h.id = b.hall_id
       WHERE b.event_date LIKE ? AND b.booking_status IN ('PENDING', 'APPROVED', 'CONFIRMED')
       ${hallId ? 'AND b.hall_id = ?' : ''}
       ORDER BY b.event_date ASC`
    )
    .all(...(hallId ? [`${month}%`, hallId] : [`${month}%`]));

  const blocks = db
    .prepare(
      `SELECT ab.*, h.name as hall_name
       FROM availability_blocks ab
       INNER JOIN halls h ON h.id = ab.hall_id
       WHERE ab.date LIKE ? ${hallId ? 'AND ab.hall_id = ?' : ''}
       ORDER BY ab.date ASC`
    )
    .all(...(hallId ? [`${month}%`, hallId] : [`${month}%`]));

  return res.json({ month, bookings, blocks });
});

adminRouter.post('/availability/blocks', (req: AuthedRequest, res) => {
  const { hallId, date, startTime, endTime, status, reason } = req.body ?? {};
  if (!hallId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Hall, date, start time, and end time are required.' });
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO availability_blocks (id, hall_id, date, start_time, end_time, status, reason, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    hallId,
    date,
    startTime,
    endTime,
    status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'MAINTENANCE',
    String(reason || 'Scheduled maintenance'),
    req.authUser!.id
  );
  logAudit(req.authUser!.id, 'CREATE_BLOCK', 'AVAILABILITY', id, `Blocked ${date} (${startTime}-${endTime})`);
  return res.status(201).json({ ok: true, id });
});

adminRouter.delete('/availability/blocks/:id', (req: AuthedRequest, res) => {
  db.prepare(`DELETE FROM availability_blocks WHERE id = ?`).run(req.params.id);
  logAudit(req.authUser!.id, 'DELETE_BLOCK', 'AVAILABILITY', req.params.id, 'Removed availability block.');
  return res.json({ ok: true });
});

// User Management
adminRouter.get('/users', (_req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.email_verified, u.created_at,
              COUNT(b.id) as booking_count,
              COALESCE(SUM(b.paid_amount), 0) as total_spent
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all()
    .map((u: any) => ({ ...u, email_verified: Boolean(u.email_verified) }));

  return res.json({ users });
});

adminRouter.patch('/users/:id/status', (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body ?? {};
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  if (id === req.authUser!.id) {
    return res.status(400).json({ error: 'You cannot suspend your own administrator account.' });
  }
  db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, id);
  logAudit(req.authUser!.id, 'UPDATE_USER_STATUS', 'USER', id, `Set status to ${status}`);
  return res.json({ ok: true });
});

// Payments & Refunds
adminRouter.get('/payments', (_req, res) => {
  const payments = db
    .prepare(
      `SELECT p.*, b.booking_ref, h.name as hall_name, u.name as user_name
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN halls h ON h.id = b.hall_id
       INNER JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    )
    .all();

  const refunds = db
    .prepare(
      `SELECT r.*, b.booking_ref, u.name as processed_by_name
       FROM refunds r
       INNER JOIN bookings b ON b.id = r.booking_id
       LEFT JOIN users u ON u.id = r.processed_by
       ORDER BY r.created_at DESC`
    )
    .all();

  return res.json({ payments, refunds });
});

adminRouter.post('/refunds', (req: AuthedRequest, res) => {
  const { paymentId, amount, reason } = req.body ?? {};
  const payment = db.prepare(`SELECT * FROM payments WHERE id = ? AND status = 'VERIFIED'`).get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Verified payment record not found.' });
  }
  const refundAmt = Number(amount);
  if (!Number.isFinite(refundAmt) || refundAmt <= 0 || refundAmt > payment.amount) {
    return res.status(400).json({ error: `Refund amount must be between ₹1 and ₹${payment.amount}.` });
  }

  const refundId = crypto.randomUUID();
  const txn = db.transaction(() => {
    db.prepare(
      `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, status, processed_by)
       VALUES (?, ?, ?, ?, ?, 'PROCESSED', ?)`
    ).run(refundId, payment.id, payment.booking_id, refundAmt, String(reason || 'Admin-approved refund'), req.authUser!.id);

    db.prepare(`UPDATE bookings SET payment_status = 'REFUNDED', updated_at = datetime('now') WHERE id = ?`).run(
      payment.booking_id
    );
    db.prepare(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, 'Refund Processed', ?, 'PAYMENT')`
    ).run(
      crypto.randomUUID(),
      payment.user_id,
      `A refund of ₹${refundAmt.toLocaleString('en-IN')} has been processed for your reservation.`
    );
    logAudit(req.authUser!.id, 'PROCESS_REFUND', 'PAYMENT', payment.id, `Refunded ₹${refundAmt}`);
  });

  txn.immediate();
  return res.status(201).json({ ok: true, id: refundId });
});

// Packages CRUD
adminRouter.get('/packages', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM packages ORDER BY price ASC`).all() as any[];
  return res.json({
    packages: rows.map((p) => ({
      ...p,
      features: JSON.parse(p.features_json || '[]'),
      is_active: Boolean(p.is_active),
    })),
  });
});

adminRouter.patch('/packages/:id', (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { name, tier, subtitle, price, description, features, is_active } = req.body ?? {};
  db.prepare(`
    UPDATE packages SET
      name = COALESCE(?, name),
      tier = COALESCE(?, tier),
      subtitle = COALESCE(?, subtitle),
      price = COALESCE(?, price),
      description = COALESCE(?, description),
      features_json = COALESCE(?, features_json),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name ?? null,
    tier ?? null,
    subtitle ?? null,
    price !== undefined ? Number(price) : null,
    description ?? null,
    Array.isArray(features) ? JSON.stringify(features) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );
  logAudit(req.authUser!.id, 'UPDATE_PACKAGE', 'PACKAGE', id, `Updated package ${name || id}`);
  return res.json({ ok: true });
});

// Gallery Management
adminRouter.post('/gallery', (req: AuthedRequest, res) => {
  const { title, category, url, aspect } = req.body ?? {};
  if (!title || !category || !url) {
    return res.status(400).json({ error: 'Title, category, and image URL are required.' });
  }
  const id = crypto.randomUUID();
  const maxOrder = (db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM gallery_items`).get() as any).m;
  db.prepare(`INSERT INTO gallery_items (id, title, category, url, aspect, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(
    id,
    String(title).trim(),
    String(category).trim(),
    String(url).trim(),
    String(aspect || '4:3'),
    maxOrder + 1
  );
  logAudit(req.authUser!.id, 'ADD_GALLERY_ITEM', 'GALLERY', id, `Added "${title}"`);
  return res.status(201).json({ ok: true, id });
});

adminRouter.delete('/gallery/:id', (req: AuthedRequest, res) => {
  db.prepare(`DELETE FROM gallery_items WHERE id = ?`).run(req.params.id);
  logAudit(req.authUser!.id, 'DELETE_GALLERY_ITEM', 'GALLERY', req.params.id, 'Removed gallery photo');
  return res.json({ ok: true });
});

// Reviews Moderation
adminRouter.get('/reviews', (_req, res) => {
  const reviews = db
    .prepare(
      `SELECT r.*, u.name as user_name, h.name as hall_name
       FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       INNER JOIN halls h ON h.id = r.hall_id
       ORDER BY r.created_at DESC`
    )
    .all()
    .map((r: any) => ({
      ...r,
      is_verified: Boolean(r.is_verified),
      is_published: Boolean(r.is_published),
    }));
  return res.json({ reviews });
});

adminRouter.patch('/reviews/:id', (req: AuthedRequest, res) => {
  const { is_published } = req.body ?? {};
  db.prepare(`UPDATE reviews SET is_published = ? WHERE id = ?`).run(is_published ? 1 : 0, req.params.id);
  logAudit(req.authUser!.id, 'MODERATE_REVIEW', 'REVIEW', req.params.id, `Published=${Boolean(is_published)}`);
  return res.json({ ok: true });
});

// Contact Inquiries
adminRouter.get('/inquiries', (_req, res) => {
  const inquiries = db.prepare(`SELECT * FROM contact_inquiries ORDER BY created_at DESC`).all();
  return res.json({ inquiries });
});

adminRouter.patch('/inquiries/:id', (req, res) => {
  const { status } = req.body ?? {};
  db.prepare(`UPDATE contact_inquiries SET status = ? WHERE id = ?`).run(String(status || 'RESOLVED'), req.params.id);
  return res.json({ ok: true });
});

// System Settings
adminRouter.get('/settings', (_req, res) => {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as Array<{
    key: string;
    value: string;
  }>;
  const settings: any = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    settings[r.key] = r.key === 'auto_confirm_on_payment' ? r.value === 'true' : Number(r.value);
  }
  return res.json({ settings });
});

adminRouter.patch('/settings', (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const upsert = db.prepare(
    `INSERT INTO system_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (body[key] !== undefined) {
      upsert.run(key, String(body[key]));
    }
  }
  logAudit(req.authUser!.id, 'UPDATE_SETTINGS', 'SYSTEM', 'global', 'Updated booking & policy settings');
  return res.json({ ok: true });
});

// Audit Logs & Broadcast Notifications
adminRouter.get('/audit-logs', (_req, res) => {
  const logs = db
    .prepare(
      `SELECT l.*, u.name as admin_name
       FROM admin_audit_logs l
       INNER JOIN users u ON u.id = l.admin_id
       ORDER BY l.created_at DESC LIMIT 80`
    )
    .all();
  return res.json({ logs });
});

adminRouter.post('/notifications/broadcast', (req: AuthedRequest, res) => {
  const { title, message, targetUserId } = req.body ?? {};
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }
  const ins = db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'SYSTEM')`
  );
  if (targetUserId && targetUserId !== 'ALL') {
    ins.run(crypto.randomUUID(), targetUserId, String(title), String(message));
  } else {
    const users = db.prepare(`SELECT id FROM users WHERE role = 'USER'`).all() as Array<{ id: string }>;
    for (const u of users) {
      ins.run(crypto.randomUUID(), u.id, String(title), String(message));
    }
  }
  logAudit(req.authUser!.id, 'BROADCAST_NOTIFICATION', 'NOTIFICATION', targetUserId || 'ALL', String(title));
  return res.status(201).json({ ok: true });
});
