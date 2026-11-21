import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vows_venues.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('USER', 'ADMIN')) DEFAULT 'USER',
      status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS halls (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      address TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      base_price INTEGER NOT NULL CHECK (base_price >= 0),
      hourly_rate INTEGER NOT NULL DEFAULT 5000,
      description TEXT NOT NULL,
      seating_arrangements TEXT NOT NULL,
      parking_info TEXT NOT NULL,
      ac_available INTEGER NOT NULL DEFAULT 1,
      kitchen_available INTEGER NOT NULL DEFAULT 1,
      rating REAL NOT NULL DEFAULT 4.8,
      review_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hall_images (
      id TEXT PRIMARY KEY,
      hall_id TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS amenities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon_key TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hall_amenities (
      hall_id TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
      amenity_id TEXT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
      PRIMARY KEY (hall_id, amenity_id)
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      description TEXT NOT NULL,
      features_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      url TEXT NOT NULL,
      aspect TEXT NOT NULL DEFAULT '4:3',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS availability_blocks (
      id TEXT PRIMARY KEY,
      hall_id TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('MAINTENANCE', 'UNAVAILABLE')) DEFAULT 'MAINTENANCE',
      reason TEXT NOT NULL DEFAULT '',
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_ref TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hall_id TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
      package_id TEXT REFERENCES packages(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      guest_count INTEGER NOT NULL CHECK (guest_count > 0),
      special_requirements TEXT NOT NULL DEFAULT '',
      base_amount INTEGER NOT NULL,
      package_amount INTEGER NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL,
      deposit_amount INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      payment_plan TEXT NOT NULL CHECK (payment_plan IN ('ADVANCE', 'FULL')) DEFAULT 'ADVANCE',
      payment_status TEXT NOT NULL CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')) DEFAULT 'UNPAID',
      booking_status TEXT NOT NULL CHECK (booking_status IN ('PENDING', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED')) DEFAULT 'PENDING',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS booking_status_history (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by TEXT REFERENCES users(id),
      changed_by_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gateway TEXT NOT NULL DEFAULT 'RAZORPAY',
      razorpay_order_id TEXT NOT NULL UNIQUE,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount INTEGER NOT NULL CHECK (amount > 0),
      payment_type TEXT NOT NULL CHECK (payment_type IN ('ADVANCE', 'FULL', 'BALANCE')) DEFAULT 'ADVANCE',
      status TEXT NOT NULL CHECK (status IN ('CREATED', 'VERIFIED', 'FAILED')) DEFAULT 'CREATED',
      method TEXT NOT NULL DEFAULT 'UPI / Card',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL CHECK (amount >= 0),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSED',
      processed_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      hall_id TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'Wedding',
      is_verified INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hall_id TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, hall_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('BOOKING', 'PAYMENT', 'SYSTEM', 'ALERT')) DEFAULT 'SYSTEM',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_hall_date ON bookings(hall_id, event_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_hall_date ON availability_blocks(hall_id, date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);
}
