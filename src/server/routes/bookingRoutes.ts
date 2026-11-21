import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import {
  requireAuth,
  computeHmacSignature,
  getRazorpaySecret,
  verifyWebhookSignature,
  type AuthedRequest,
} from '../auth.ts';
import {
  calculateBookingPricing,
  computeRefundAmount,
  doTimeSlotsOverlap,
  validateBookingDates,
  DEFAULT_SETTINGS,
} from '../../lib/bookingRules.ts';
import { hydrateHall } from './publicRoutes.ts';
import type { SystemSettings } from '../../types.ts';

export const bookingRouter = Router();

function loadSettings(): SystemSettings {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as Array<{
    key: string;
    value: string;
  }>;
  const s: any = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    s[r.key] = r.key === 'auto_confirm_on_payment' ? r.value === 'true' : Number(r.value);
  }
  return s as SystemSettings;
}

function hydrateBookingRow(b: any) {
  const history = db
    .prepare(
      `SELECT id, booking_id, from_status, to_status, changed_by_name, note, created_at
       FROM booking_status_history
       WHERE booking_id = ?
       ORDER BY created_at ASC`
    )
    .all(b.id);
  return { ...b, history };
}

bookingRouter.get('/bookings/my', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, h.name as hall_name, h.location as hall_location,
              (SELECT url FROM hall_images WHERE hall_id = h.id ORDER BY sort_order ASC LIMIT 1) as hall_image,
              p.name as package_name
       FROM bookings b
       INNER JOIN halls h ON h.id = b.hall_id
       LEFT JOIN packages p ON p.id = b.package_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.authUser!.id) as any[];

  return res.json({ bookings: rows.map(hydrateBookingRow) });
});

bookingRouter.post('/bookings', requireAuth, (req: AuthedRequest, res) => {
  try {
    const {
      hallId,
      packageId,
      eventType,
      eventName,
      eventDate,
      startTime,
      endTime,
      guestCount,
      specialRequirements,
      paymentPlan = 'ADVANCE',
    } = req.body ?? {};

    if (!hallId || !eventType || !eventName || !eventDate || !startTime || !endTime || !guestCount) {
      return res.status(400).json({ error: 'All required event details must be provided.' });
    }

    const settings = loadSettings();
    const dateValidation = validateBookingDates({
      eventDate: String(eventDate),
      startTime: String(startTime),
      endTime: String(endTime),
      settings,
    });
    if (!dateValidation.valid) {
      return res.status(400).json({ error: dateValidation.error });
    }

    // Immediate transactional write lock prevents race conditions / double bookings
    const createTxn = db.transaction(() => {
      const hall = db
        .prepare(`SELECT * FROM halls WHERE id = ? AND is_active = 1`)
        .get(hallId) as any;
      if (!hall) {
        throw { status: 404, message: 'Selected venue is unavailable or not found.' };
      }

      const guests = Number(guestCount);
      if (!Number.isFinite(guests) || guests < 1 || guests > hall.capacity) {
        throw {
          status: 400,
          message: `Guest count must be between 1 and ${hall.capacity} for ${hall.name}.`,
        };
      }

      // Check availability maintenance / unavailable blocks
      const blocks = db
        .prepare(`SELECT start_time, end_time, status, reason FROM availability_blocks WHERE hall_id = ? AND date = ?`)
        .all(hall.id, String(eventDate)) as Array<{
        start_time: string;
        end_time: string;
        status: string;
        reason: string;
      }>;

      for (const blk of blocks) {
        if (doTimeSlotsOverlap(String(startTime), String(endTime), blk.start_time, blk.end_time)) {
          throw {
            status: 409,
            message: `Selected time slot overlaps with scheduled ${blk.status.toLowerCase()} (${blk.reason || 'venue block'}).`,
          };
        }
      }

      // Check active bookings for overlap on the same hall + date
      const existingBookings = db
        .prepare(
          `SELECT booking_ref, start_time, end_time, booking_status
           FROM bookings
           WHERE hall_id = ? AND event_date = ? AND booking_status IN ('PENDING', 'APPROVED', 'CONFIRMED')`
        )
        .all(hall.id, String(eventDate)) as Array<{
        booking_ref: string;
        start_time: string;
        end_time: string;
        booking_status: string;
      }>;

      for (const ex of existingBookings) {
        if (doTimeSlotsOverlap(String(startTime), String(endTime), ex.start_time, ex.end_time)) {
          throw {
            status: 409,
            message: `Time slot ${startTime}–${endTime} overlaps an existing ${ex.booking_status.toLowerCase()} reservation (${ex.start_time}–${ex.end_time}) on ${eventDate}.`,
          };
        }
      }

      let pkgPrice = 0;
      let validPackageId: string | null = null;
      if (packageId) {
        const pkg = db
          .prepare(`SELECT id, price FROM packages WHERE id = ? AND is_active = 1`)
          .get(packageId) as { id: string; price: number } | undefined;
        if (pkg) {
          pkgPrice = pkg.price;
          validPackageId = pkg.id;
        }
      }

      const plan = paymentPlan === 'FULL' ? 'FULL' : 'ADVANCE';
      const pricing = calculateBookingPricing({
        basePrice: hall.base_price,
        hourlyRate: hall.hourly_rate,
        startTime: String(startTime),
        endTime: String(endTime),
        guestCount: guests,
        hallCapacity: hall.capacity,
        packagePrice: pkgPrice,
        paymentPlan: plan,
        settings,
      });

      const bookingId = crypto.randomUUID();
      const bookingRef = `VV-2026-${Math.floor(1000 + Math.random() * 9000)}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`;

      db.prepare(`
        INSERT INTO bookings (
          id, booking_ref, user_id, hall_id, package_id, event_type, event_name,
          event_date, start_time, end_time, guest_count, special_requirements,
          base_amount, package_amount, tax_amount, deposit_amount, total_amount, paid_amount,
          payment_plan, payment_status, booking_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'UNPAID', 'PENDING')
      `).run(
        bookingId,
        bookingRef,
        req.authUser!.id,
        hall.id,
        validPackageId,
        String(eventType).trim(),
        String(eventName).trim(),
        String(eventDate),
        String(startTime),
        String(endTime),
        guests,
        String(specialRequirements ?? '').trim(),
        pricing.baseAmount,
        pricing.packageAmount,
        pricing.taxAmount,
        pricing.depositAmount,
        pricing.totalAmount,
        plan
      );

      db.prepare(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, changed_by_name, note)
         VALUES (?, ?, NULL, 'PENDING', ?, ?, 'Booking request created; awaiting payment verification.')`
      ).run(crypto.randomUUID(), bookingId, req.authUser!.id, req.authUser!.name);

      // Notify admins
      const admins = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as Array<{ id: string }>;
      const notifStmt = db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'BOOKING')`
      );
      for (const adm of admins) {
        notifStmt.run(
          crypto.randomUUID(),
          adm.id,
          `New Reservation · ${bookingRef}`,
          `${req.authUser!.name} requested ${hall.name} on ${eventDate} (${startTime}–${endTime}).`
        );
      }

      const created = db
        .prepare(
          `SELECT b.*, h.name as hall_name, h.location as hall_location,
                  (SELECT url FROM hall_images WHERE hall_id = h.id ORDER BY sort_order ASC LIMIT 1) as hall_image,
                  p.name as package_name
           FROM bookings b
           INNER JOIN halls h ON h.id = b.hall_id
           LEFT JOIN packages p ON p.id = b.package_id
           WHERE b.id = ?`
        )
        .get(bookingId) as any;

      return { booking: hydrateBookingRow(created), pricing };
    });

    const result = createTxn.immediate();
    return res.status(201).json(result);
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Create booking error:', err);
    return res.status(500).json({ error: 'Unable to submit booking request.' });
  }
});

bookingRouter.post('/bookings/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body ?? {};
    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as any;

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.user_id !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You cannot cancel another member’s reservation.' });
    }
    if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(booking.booking_status)) {
      return res.status(400).json({ error: `Cannot cancel a booking in ${booking.booking_status} status.` });
    }

    const settings = loadSettings();
    const refundCalc = computeRefundAmount({
      paidAmount: booking.paid_amount,
      depositAmount: booking.deposit_amount,
      eventDate: booking.event_date,
      settings,
    });

    const txn = db.transaction(() => {
      const nextPaymentStatus =
        booking.paid_amount > 0 && refundCalc.refundableAmount > 0 ? 'REFUNDED' : booking.payment_status;

      db.prepare(
        `UPDATE bookings SET booking_status = 'CANCELLED', payment_status = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(nextPaymentStatus, booking.id);

      db.prepare(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, changed_by_name, note)
         VALUES (?, ?, ?, 'CANCELLED', ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        booking.id,
        booking.booking_status,
        req.authUser!.id,
        req.authUser!.name,
        reason ? String(reason) : `Cancelled by user. ${refundCalc.policyTier}`
      );

      if (booking.paid_amount > 0 && refundCalc.refundableAmount > 0) {
        const lastPayment = db
          .prepare(
            `SELECT id FROM payments WHERE booking_id = ? AND status = 'VERIFIED' ORDER BY created_at DESC LIMIT 1`
          )
          .get(booking.id) as { id: string } | undefined;
        if (lastPayment) {
          db.prepare(
            `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, status, processed_by)
             VALUES (?, ?, ?, ?, ?, 'PROCESSED', ?)`
          ).run(
            crypto.randomUUID(),
            lastPayment.id,
            booking.id,
            refundCalc.refundableAmount,
            refundCalc.policyTier,
            req.authUser!.id
          );
        }
      }

      db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, 'BOOKING')`
      ).run(
        crypto.randomUUID(),
        booking.user_id,
        `Reservation Cancelled · ${booking.booking_ref}`,
        `Your booking was cancelled. ${refundCalc.refundableAmount > 0 ? `Refund of ₹${refundCalc.refundableAmount.toLocaleString('en-IN')} initiated.` : 'No refundable balance applies.'}`
      );
    });

    txn.immediate();
    return res.json({ ok: true, refund: refundCalc });
  } catch (err) {
    console.error('Cancel booking error:', err);
    return res.status(500).json({ error: 'Unable to cancel reservation.' });
  }
});

// Razorpay Payment Order Creation (supports live keys if configured, or built-in test mode)
bookingRouter.post('/payments/create-order', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { bookingId, paymentType } = req.body ?? {};
    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId) as any;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.user_id !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized payment access.' });
    }

    const settings = loadSettings();
    const remaining = Math.max(0, booking.total_amount - booking.paid_amount);
    if (remaining <= 0) {
      return res.status(400).json({ error: 'This reservation is already fully paid.' });
    }

    let amountToCharge = remaining;
    let resolvedType: 'ADVANCE' | 'FULL' | 'BALANCE' = 'FULL';
    if (booking.paid_amount > 0) {
      resolvedType = 'BALANCE';
      amountToCharge = remaining;
    } else if (paymentType === 'ADVANCE' || (paymentType !== 'FULL' && booking.payment_plan === 'ADVANCE')) {
      resolvedType = 'ADVANCE';
      amountToCharge = Math.round(booking.total_amount * (settings.advance_payment_percent / 100));
    }

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    let orderId = `order_test_${crypto.randomBytes(6).toString('hex')}`;
    let mode: 'LIVE_TEST_KEY' | 'SANDBOX_TEST' = 'SANDBOX_TEST';

    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountToCharge * 100,
            currency: 'INR',
            receipt: booking.booking_ref,
          }),
        });
        if (rzpRes.ok) {
          const rzpOrder = (await rzpRes.json()) as { id: string };
          orderId = rzpOrder.id;
          mode = 'LIVE_TEST_KEY';
        }
      } catch (e) {
        console.warn('Razorpay remote order fallback to built-in test mode:', e);
      }
    }

    const paymentId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO payments (id, booking_id, user_id, gateway, razorpay_order_id, amount, payment_type, status)
       VALUES (?, ?, ?, 'RAZORPAY', ?, ?, ?, 'CREATED')`
    ).run(paymentId, booking.id, booking.user_id, orderId, amountToCharge, resolvedType);

    return res.json({
      paymentRecordId: paymentId,
      orderId,
      amount: amountToCharge,
      currency: 'INR',
      keyId: keyId || 'rzp_test_VowsAndVenuesDemo',
      mode,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Unable to initiate payment order.' });
  }
});

// Helper for sandbox test checkout modal to request a valid signed test payload from server-side test gateway simulation
bookingRouter.post('/payments/test-checkout-authorize', requireAuth, (req: AuthedRequest, res) => {
  const { orderId, method } = req.body ?? {};
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required.' });
  }
  const payment = db
    .prepare(`SELECT * FROM payments WHERE razorpay_order_id = ?`)
    .get(String(orderId)) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Payment order not found.' });
  }
  if (payment.user_id !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const razorpayPaymentId = `pay_test_${crypto.randomBytes(6).toString('hex')}`;
  const signature = computeHmacSignature(orderId, razorpayPaymentId, getRazorpaySecret());
  return res.json({
    razorpay_order_id: orderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
    method: method || 'UPI · Verified Test',
  });
});

// Server-Side HMAC-SHA256 Payment Verification (Never trusts frontend status)
bookingRouter.post('/payments/verify', requireAuth, (req: AuthedRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body ?? {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Incomplete payment verification payload.' });
    }

    const payment = db
      .prepare(`SELECT * FROM payments WHERE razorpay_order_id = ?`)
      .get(String(razorpay_order_id)) as any;
    if (!payment) {
      return res.status(404).json({ error: 'Payment order not found.' });
    }

    const expectedSig = computeHmacSignature(
      String(razorpay_order_id),
      String(razorpay_payment_id),
      getRazorpaySecret()
    );

    let sigMatches = false;
    try {
      sigMatches = crypto.timingSafeEqual(
        Buffer.from(expectedSig),
        Buffer.from(String(razorpay_signature))
      );
    } catch {
      sigMatches = false;
    }

    if (!sigMatches) {
      db.prepare(`UPDATE payments SET status = 'FAILED' WHERE id = ?`).run(payment.id);
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    const settings = loadSettings();

    const verifyTxn = db.transaction(() => {
      if (payment.status === 'VERIFIED') {
        return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(payment.booking_id);
      }

      db.prepare(
        `UPDATE payments SET status = 'VERIFIED', razorpay_payment_id = ?, razorpay_signature = ?, method = ? WHERE id = ?`
      ).run(
        String(razorpay_payment_id),
        String(razorpay_signature),
        String(method || 'Razorpay Online'),
        payment.id
      );

      const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(payment.booking_id) as any;
      const newPaid = booking.paid_amount + payment.amount;
      const newPaymentStatus = newPaid >= booking.total_amount ? 'PAID' : 'PARTIAL';

      // Auto-confirm if configured and currently PENDING/APPROVED
      let nextBookingStatus = booking.booking_status;
      if (settings.auto_confirm_on_payment && ['PENDING', 'APPROVED'].includes(booking.booking_status)) {
        nextBookingStatus = 'CONFIRMED';
      }

      db.prepare(
        `UPDATE bookings SET paid_amount = ?, payment_status = ?, booking_status = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(newPaid, newPaymentStatus, nextBookingStatus, booking.id);

      if (nextBookingStatus !== booking.booking_status) {
        db.prepare(
          `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, changed_by_name, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          crypto.randomUUID(),
          booking.id,
          booking.booking_status,
          nextBookingStatus,
          req.authUser!.id,
          'Payment Gateway Verification',
          `Verified ${payment.payment_type.toLowerCase()} payment (${razorpay_payment_id}).`
        );
      }

      db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, 'PAYMENT')`
      ).run(
        crypto.randomUUID(),
        booking.user_id,
        `Payment Verified · ${booking.booking_ref}`,
        `Received ₹${payment.amount.toLocaleString('en-IN')} via ${method || 'Razorpay'}. Status: ${nextBookingStatus}.`
      );

      const admins = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as Array<{ id: string }>;
      const admNotif = db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'PAYMENT')`
      );
      for (const adm of admins) {
        admNotif.run(
          crypto.randomUUID(),
          adm.id,
          `Payment Received · ${booking.booking_ref}`,
          `₹${payment.amount.toLocaleString('en-IN')} verified for booking ${booking.booking_ref}.`
        );
      }

      return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(booking.id);
    });

    const updatedBooking = verifyTxn.immediate();
    return res.json({ ok: true, verified: true, booking: updatedBooking });
  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({ error: 'Unable to verify payment.' });
  }
});

bookingRouter.post('/payments/webhook', (req, res) => {
  const sig = String(req.headers['x-razorpay-signature'] || '');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'vows_webhook_secret_dev';
  const rawBody = JSON.stringify(req.body ?? {});
  if (!verifyWebhookSignature(rawBody, sig, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }
  const event = req.body?.event;
  if (event === 'payment.captured') {
    const orderId = req.body?.payload?.payment?.entity?.order_id;
    const paymentId = req.body?.payload?.payment?.entity?.id;
    if (orderId && paymentId) {
      db.prepare(
        `UPDATE payments SET status = 'VERIFIED', razorpay_payment_id = ? WHERE razorpay_order_id = ? AND status = 'CREATED'`
      ).run(paymentId, orderId);
    }
  }
  return res.json({ received: true });
});

bookingRouter.get('/payments/my', requireAuth, (req: AuthedRequest, res) => {
  const payments = db
    .prepare(
      `SELECT p.*, b.booking_ref, h.name as hall_name
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN halls h ON h.id = b.hall_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(req.authUser!.id);

  const refunds = db
    .prepare(
      `SELECT r.*, b.booking_ref
       FROM refunds r
       INNER JOIN bookings b ON b.id = r.booking_id
       WHERE b.user_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(req.authUser!.id);

  return res.json({ payments, refunds });
});

bookingRouter.get('/favorites', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT h.*
       FROM halls h
       INNER JOIN favorites f ON f.hall_id = h.id
       WHERE f.user_id = ? AND h.is_active = 1
       ORDER BY f.created_at DESC`
    )
    .all(req.authUser!.id) as any[];
  return res.json({ halls: rows.map((h) => hydrateHall(h, req.authUser!.id)) });
});

bookingRouter.post('/favorites/:hallId', requireAuth, (req: AuthedRequest, res) => {
  const { hallId } = req.params;
  const exists = db
    .prepare(`SELECT 1 FROM favorites WHERE user_id = ? AND hall_id = ?`)
    .get(req.authUser!.id, hallId);

  if (exists) {
    db.prepare(`DELETE FROM favorites WHERE user_id = ? AND hall_id = ?`).run(req.authUser!.id, hallId);
    return res.json({ favorite: false });
  }
  db.prepare(`INSERT INTO favorites (user_id, hall_id) VALUES (?, ?)`).run(req.authUser!.id, hallId);
  return res.json({ favorite: true });
});

bookingRouter.post('/reviews', requireAuth, (req: AuthedRequest, res) => {
  const { hallId, bookingId, rating, title, comment, eventType } = req.body ?? {};
  const numRating = Number(rating);
  if (!hallId || !title || !comment || !Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating (1–5), title, and review comment are required.' });
  }

  let verified = 0;
  if (bookingId) {
    const completedBooking = db
      .prepare(
        `SELECT id FROM bookings WHERE id = ? AND user_id = ? AND hall_id = ? AND booking_status IN ('CONFIRMED', 'COMPLETED')`
      )
      .get(bookingId, req.authUser!.id, hallId);
    if (completedBooking) verified = 1;
  } else {
    const anyCompleted = db
      .prepare(
        `SELECT id FROM bookings WHERE user_id = ? AND hall_id = ? AND booking_status IN ('CONFIRMED', 'COMPLETED') LIMIT 1`
      )
      .get(req.authUser!.id, hallId);
    if (anyCompleted) verified = 1;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO reviews (id, hall_id, user_id, booking_id, rating, title, comment, event_type, is_verified, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    id,
    hallId,
    req.authUser!.id,
    bookingId || null,
    numRating,
    String(title).trim(),
    String(comment).trim(),
    String(eventType || 'Celebration').trim(),
    verified
  );

  // Recalculate hall rating
  const stats = db
    .prepare(`SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE hall_id = ? AND is_published = 1`)
    .get(hallId) as { avg_rating: number; cnt: number };
  db.prepare(`UPDATE halls SET rating = ?, review_count = ? WHERE id = ?`).run(
    Math.round((stats.avg_rating || 4.8) * 10) / 10,
    stats.cnt,
    hallId
  );

  return res.status(201).json({ ok: true, id, verified: Boolean(verified) });
});

bookingRouter.get('/notifications', requireAuth, (req: AuthedRequest, res) => {
  const notifications = db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40`)
    .all(req.authUser!.id)
    .map((n: any) => ({ ...n, is_read: Boolean(n.is_read) }));
  return res.json({ notifications });
});

bookingRouter.patch('/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(
    req.params.id,
    req.authUser!.id
  );
  return res.json({ ok: true });
});

bookingRouter.post('/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.authUser!.id);
  return res.json({ ok: true });
});
