import crypto from 'node:crypto';
import { db } from './db.ts';
import { hashPassword, computeHmacSignature } from './auth.ts';
import { DEFAULT_SETTINGS } from '../lib/bookingRules.ts';

const IMG_HERO = '/src/assets/images/hero_grand_ballroom_1794682456794.jpg';
const IMG_IMPERIAL = '/src/assets/images/hall_imperial_chandelier_1794682457202.jpg';
const IMG_COURTYARD = '/src/assets/images/hall_heritage_courtyard_1794682458461.jpg';
const IMG_SALON = '/src/assets/images/hall_intimate_salon_1794682457355.jpg';
const IMG_SUMMIT = '/src/assets/images/hall_executive_summit_1794682458563.jpg';
const IMG_STORY = '/src/assets/images/story_editorial_venue_1794682459185.jpg';
const IMG_STAGE = '/src/assets/images/gallery_stage_floral_1794682459051.jpg';
const IMG_DINING = '/src/assets/images/gallery_dining_table_1794682459273.jpg';

function uid(): string {
  return crypto.randomUUID();
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function seedDatabase() {
  // Always ensure system settings defaults exist
  const upsertSetting = db.prepare(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`
  );
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    upsertSetting.run(k, String(v));
  }

  // Ensure initial administrator exists via server-side seed process
  const existingAdmin = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`).get() as
    | { id: string }
    | undefined;

  const adminId = existingAdmin?.id ?? uid();
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@1234';
    db.prepare(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status, email_verified)
       VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', 1)`
    ).run(
      adminId,
      'Arjun Malhotra',
      'admin@vowsandvenues.com',
      '+91 98201 44001',
      hashPassword(adminPassword)
    );
  }

  // Skip content seeding if halls already exist
  const hallCount = (db.prepare(`SELECT COUNT(*) as count FROM halls`).get() as { count: number })
    .count;
  if (hallCount > 0) {
    return;
  }

  // Seed Demo Registered Members
  const user1Id = uid();
  const user2Id = uid();
  const user3Id = uid();

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, phone, password_hash, role, status, email_verified, created_at)
     VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', 1, datetime('now', ?))`
  );
  insertUser.run(
    user1Id,
    'Priya Sharma',
    'priya.sharma@example.com',
    '+91 98112 77310',
    hashPassword('User@1234'),
    '-90 days'
  );
  insertUser.run(
    user2Id,
    'Rohan Deshmukh',
    'rohan.deshmukh@example.com',
    '+91 98450 21890',
    hashPassword('User@1234'),
    '-65 days'
  );
  insertUser.run(
    user3Id,
    'Meera Nair',
    'meera.nair@example.com',
    '+91 97401 66420',
    hashPassword('User@1234'),
    '-30 days'
  );

  // Seed Amenities
  const amenitySeed = [
    ['am-ac', 'Central Climate Control', 'wind'],
    ['am-parking', 'Valet & Underground Parking', 'car'],
    ['am-kitchen', 'Commercial Catering Kitchen', 'utensils'],
    ['am-stage', 'Customizable Grand Stage', 'sparkles'],
    ['am-audio', 'Concert-Grade Acoustics & AV', 'volume'],
    ['am-bridal', 'Private Bridal & VIP Suites', 'crown'],
    ['am-wifi', 'High-Density Fiber Wi-Fi', 'wifi'],
    ['am-power', '100% Acoustic DG Backup', 'zap'],
    ['am-wheelchair', 'Barrier-Free Accessibility', 'accessibility'],
    ['am-decor', 'Bespoke Floral & Lighting Rig', 'lamp'],
  ];
  const insertAmenity = db.prepare(
    `INSERT OR IGNORE INTO amenities (id, name, icon_key) VALUES (?, ?, ?)`
  );
  for (const [id, name, icon] of amenitySeed) {
    insertAmenity.run(id, name, icon);
  }

  // Seed 6 Luxury Community Halls covering all categories
  const hallsData = [
    {
      id: uid(),
      slug: 'imperial-crown-ballroom',
      name: 'The Imperial Crown Ballroom',
      category: 'Grand Banquet Halls',
      location: 'South Mumbai',
      address: '14 Heritage Marine Promenade, Ballard Estate, Mumbai 400001',
      capacity: 650,
      base_price: 165000,
      hourly_rate: 14000,
      description:
        'An architectural masterpiece featuring hand-blown Bohemian crystal chandeliers, double-height dark walnut paneling, and mezzanine galleries designed for grand weddings, cultural galas, and civic receptions.',
      seating_arrangements: 'Banquet Rounds (550), Theatre Style (650), Floating Reception (800)',
      parking_info: 'Complimentary valet for 180 vehicles with dedicated VIP drop-off portico',
      ac_available: 1,
      kitchen_available: 1,
      rating: 4.9,
      review_count: 2,
      featured: 1,
      images: [
        [IMG_HERO, 'Main Chandelier Ballroom', 0],
        [IMG_IMPERIAL, 'Evening Banquet Setting', 1],
        [IMG_STAGE, 'Grand Floral Ceremony Stage', 2],
        [IMG_DINING, 'Curated Place Settings', 3],
      ],
      amenities: ['am-ac', 'am-parking', 'am-kitchen', 'am-stage', 'am-audio', 'am-bridal', 'am-power', 'am-decor'],
    },
    {
      id: uid(),
      slug: 'saffron-sandstone-courtyard',
      name: 'The Saffron Courtyard & Colonnade',
      category: 'Outdoor Celebration Spaces',
      location: 'Jaipur Heritage Quarter',
      address: '28 Palace Garden Road, Civil Lines, Jaipur 302006',
      capacity: 420,
      base_price: 125000,
      hourly_rate: 11000,
      description:
        'Carved golden sandstone colonnades frame a starlit open-air courtyard draped in warm brass lanterns. Ideal for twilight engagements, sangeet evenings, anniversary dinners, and cultural performances.',
      seating_arrangements: 'Long Imperial Tables (340), Courtyard Cluster Seating (420)',
      parking_info: 'Private paved estate lot for 140 vehicles with security stewards',
      ac_available: 1,
      kitchen_available: 1,
      rating: 4.9,
      review_count: 1,
      featured: 1,
      images: [
        [IMG_COURTYARD, 'Twilight Sandstone Colonnade', 0],
        [IMG_DINING, 'Lantern-Lit Imperial Dining', 1],
        [IMG_STORY, 'Adjacent Conservatory Foyer', 2],
      ],
      amenities: ['am-parking', 'am-kitchen', 'am-stage', 'am-audio', 'am-bridal', 'am-power', 'am-decor', 'am-wheelchair'],
    },
    {
      id: uid(),
      slug: 'velvet-hearth-salon',
      name: 'The Velvet Hearth Salon',
      category: 'Intimate Event Spaces',
      location: 'Bengaluru Indiranagar',
      address: '92 Banyan Boulevard, Indiranagar, Bengaluru 560038',
      capacity: 90,
      base_price: 55000,
      hourly_rate: 6500,
      description:
        'Warm mahogany walls, alabaster sconces, a carved marble hearth, and a single dazzling crystal chandelier set an unforgettable mood for milestone birthdays, family reunions, and private rehearsal dinners.',
      seating_arrangements: 'Single Imperial Table (48), Intimate Rounds (90)',
      parking_info: 'Dedicated basement parking for 45 vehicles with elevator access',
      ac_available: 1,
      kitchen_available: 1,
      rating: 4.8,
      review_count: 1,
      featured: 1,
      images: [
        [IMG_SALON, 'Private Candlelit Dining Salon', 0],
        [IMG_DINING, 'Bespoke Tableware Detail', 1],
        [IMG_STORY, 'Conservatory Cocktail Lounge', 2],
      ],
      amenities: ['am-ac', 'am-parking', 'am-kitchen', 'am-wifi', 'am-power', 'am-wheelchair'],
    },
    {
      id: uid(),
      slug: 'meridian-executive-auditorium',
      name: 'Meridian Executive Auditorium',
      category: 'Conference Halls',
      location: 'New Delhi Connaught Place',
      address: '5 Meridian House, Kasturba Gandhi Marg, New Delhi 110001',
      capacity: 300,
      base_price: 88000,
      hourly_rate: 9500,
      description:
        'Sculpted walnut acoustic slats, ergonomic leather tiered seating, concert-grade projection, and breakout lounges tailored for leadership summits, seminars, town halls, and keynote symposiums.',
      seating_arrangements: 'Tiered Auditorium (300), Executive Workshop Pods (160)',
      parking_info: 'Multi-level smart parking for 220 cars + metro skywalk access',
      ac_available: 1,
      kitchen_available: 1,
      rating: 4.8,
      review_count: 1,
      featured: 1,
      images: [
        [IMG_SUMMIT, 'Walnut Acoustic Auditorium', 0],
        [IMG_STORY, 'Grand Reception Atrium', 1],
      ],
      amenities: ['am-ac', 'am-parking', 'am-audio', 'am-wifi', 'am-power', 'am-wheelchair'],
    },
    {
      id: uid(),
      slug: 'solarium-botanical-pavilion',
      name: 'The Solarium Botanical Pavilion',
      category: 'Wedding Venues',
      location: 'South Mumbai',
      address: '41 Malabar Crescent, Walkeshwar, Mumbai 400006',
      capacity: 320,
      base_price: 138000,
      hourly_rate: 12000,
      description:
        'Soaring bronze-framed glass arches bathed in golden-hour warmth over travertine marble floors. Crafted for daytime wedding vows, religious ceremonies, and refined afternoon receptions.',
      seating_arrangements: 'Ceremony Aisle (300), Banquet Rounds (260), Cocktail (320)',
      parking_info: 'Valet service for 110 vehicles on-site',
      ac_available: 1,
      kitchen_available: 1,
      rating: 4.9,
      review_count: 0,
      featured: 0,
      images: [
        [IMG_STORY, 'Sunlit Glass Conservatory', 0],
        [IMG_STAGE, 'Mandap & Floral Altar Setup', 1],
        [IMG_IMPERIAL, 'Evening Reception Ballroom', 2],
      ],
      amenities: ['am-ac', 'am-parking', 'am-kitchen', 'am-stage', 'am-bridal', 'am-decor', 'am-wheelchair'],
    },
    {
      id: uid(),
      slug: 'crestview-civic-commons',
      name: 'Crestview Community Commons',
      category: 'Community Spaces',
      location: 'Pune Koregaon Park',
      address: '18 Riverbend Lane, Koregaon Park, Pune 411001',
      capacity: 260,
      base_price: 68000,
      hourly_rate: 7000,
      description:
        'A warm, welcoming civic and cultural hall designed for community festivals, charitable galas, family milestone celebrations, and neighborhood cultural programmes with flexible staging.',
      seating_arrangements: 'Community Banquet (220), Cultural Theatre (260)',
      parking_info: 'Surface lot for 90 vehicles and coach bay',
      ac_available: 1,
      kitchen_available: 1,
      rating: 4.7,
      review_count: 0,
      featured: 0,
      images: [
        [IMG_IMPERIAL, 'Main Cultural Hall', 0],
        [IMG_STAGE, 'Performance Stage Setup', 1],
      ],
      amenities: ['am-ac', 'am-parking', 'am-kitchen', 'am-stage', 'am-audio', 'am-wifi', 'am-wheelchair'],
    },
  ];

  const insertHall = db.prepare(`
    INSERT INTO halls (
      id, slug, name, category, location, address, capacity, base_price, hourly_rate,
      description, seating_arrangements, parking_info, ac_available, kitchen_available,
      rating, review_count, featured, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const insertHallImage = db.prepare(
    `INSERT INTO hall_images (id, hall_id, url, caption, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  const insertHallAmenity = db.prepare(
    `INSERT INTO hall_amenities (hall_id, amenity_id) VALUES (?, ?)`
  );

  for (const h of hallsData) {
    insertHall.run(
      h.id,
      h.slug,
      h.name,
      h.category,
      h.location,
      h.address,
      h.capacity,
      h.base_price,
      h.hourly_rate,
      h.description,
      h.seating_arrangements,
      h.parking_info,
      h.ac_available,
      h.kitchen_available,
      h.rating,
      h.review_count,
      h.featured
    );
    for (const [url, caption, order] of h.images) {
      insertHallImage.run(uid(), h.id, url as string, caption as string, order as number);
    }
    for (const amId of h.amenities) {
      insertHallAmenity.run(h.id, amId);
    }
  }

  // Seed Celebration Packages
  const pkgEssentialId = uid();
  const pkgPremiumId = uid();
  const pkgGrandId = uid();

  const insertPkg = db.prepare(
    `INSERT INTO packages (id, name, tier, subtitle, price, description, features_json, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  );
  insertPkg.run(
    pkgEssentialId,
    'Essential Celebration',
    'Tier 01',
    'Ideal for intimate gatherings, seminars & community programmes',
    25000,
    'Foundational venue hospitality with curated seating, ambient architectural lighting, and dedicated floor stewardship.',
    JSON.stringify([
      '6-hour exclusive hall access + 1-hour setup buffer',
      'Standard banquet or theatre seating with cream linens',
      'Dedicated venue coordinator & house lighting technician',
      'Acoustic sound system with dual wireless microphones',
      'Complimentary valet & guest arrival reception desk',
    ])
  );
  insertPkg.run(
    pkgPremiumId,
    'Premium Celebration',
    'Tier 02',
    'Crafted for milestone receptions, engagements & executive galas',
    58000,
    'Elevated floral stage styling, warm brass table settings, bridal greenroom suite, and full audio-visual production.',
    JSON.stringify([
      '8-hour extended hall access + 2-hour decor preparation',
      'Bespoke floral centerpiece & warm candlelit table styling',
      'Private VIP & Bridal dressing lounge with refreshments',
      'Full concert-grade PA, ambient uplighting & stage wash',
      'Commercial kitchen access for preferred culinary partners',
    ])
  );
  insertPkg.run(
    pkgGrandId,
    'Grand Celebration',
    'Tier 03',
    'Complete royal concierge for multi-ceremony weddings & signature events',
    115000,
    'White-glove architectural transformation, custom floral mandap or stage arch, champagne-gold tableware, and end-to-end hospitality concierge.',
    JSON.stringify([
      'Full-day 12-hour exclusive venue buyout with rehearsal access',
      'Architectural floral stage arch, gold flatware & crystal glassware',
      'Dual VIP preparation suites & dedicated concierge team',
      'Live streaming camera rig, concert lighting & acoustic engineer',
      'Priority security, valet fleet & complimentary post-event storage',
    ])
  );

  // Seed Masonry Gallery
  const gallerySeed = [
    ['Gilded Chandelier Ballroom', 'Banquet Interiors', IMG_HERO, '16:9', 1],
    ['Ivory & Champagne Ceremony Arch', 'Stage Decorations', IMG_STAGE, '3:4', 2],
    ['Candlelit Brass Table Setting', 'Dining Arrangements', IMG_DINING, '4:3', 3],
    ['Twilight Sandstone Colonnade', 'Outdoor Spaces', IMG_COURTYARD, '4:3', 4],
    ['Coffered Mahogany Reception', 'Chandeliers', IMG_IMPERIAL, '4:3', 5],
    ['Glass Conservatory Arrival', 'Wedding Decorations', IMG_STORY, '4:3', 6],
    ['Mahogany Fireside Dinner', 'Community Celebrations', IMG_SALON, '4:3', 7],
    ['Executive Keynote Forum', 'Community Celebrations', IMG_SUMMIT, '4:3', 8],
  ];
  const insertGallery = db.prepare(
    `INSERT INTO gallery_items (id, title, category, url, aspect, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const [title, cat, url, aspect, order] of gallerySeed) {
    insertGallery.run(uid(), title as string, cat as string, url as string, aspect as string, order as number);
  }

  // Seed Historical + Upcoming Bookings, Payments, History, Reviews, Notifications
  const hall0 = hallsData[0];
  const hall1 = hallsData[1];
  const hall2 = hallsData[2];
  const hall3 = hallsData[3];

  const b1Id = uid(); // Completed booking (for verified review & past revenue)
  const b2Id = uid(); // Confirmed upcoming booking
  const b3Id = uid(); // Pending booking (ready for Admin approval!)
  const b4Id = uid(); // Completed booking #2
  const b5Id = uid(); // Cancelled booking (for analytics)

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      id, booking_ref, user_id, hall_id, package_id, event_type, event_name,
      event_date, start_time, end_time, guest_count, special_requirements,
      base_amount, package_amount, tax_amount, deposit_amount, total_amount, paid_amount,
      payment_plan, payment_status, booking_status, admin_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  // b1: Priya Sharma completed wedding reception last month
  insertBooking.run(
    b1Id,
    'VV-2026-1041',
    user1Id,
    hall0.id,
    pkgGrandId,
    'Reception',
    'Sharma & Kapoor Royal Reception',
    addDaysIso(-22),
    '18:00',
    '23:30',
    480,
    'Live classical santoor stage setup and Jain catering counter.',
    165000,
    115000,
    50400,
    15000,
    345400,
    345400,
    'FULL',
    'PAID',
    'COMPLETED',
    'Full settlement received. Security deposit reconciled.',
    '-45 days',
    '-21 days'
  );

  // b2: Priya Sharma upcoming anniversary celebration (Confirmed + Advance Paid)
  insertBooking.run(
    b2Id,
    'VV-2026-1088',
    user1Id,
    hall2.id,
    pkgEssentialId,
    'Anniversary Celebration',
    'Golden Jubilee Family Dinner',
    addDaysIso(18),
    '19:00',
    '23:00',
    64,
    'Warm ivory floral runner along imperial table.',
    55000,
    25000,
    14400,
    15000,
    109400,
    32820,
    'ADVANCE',
    'PARTIAL',
    'CONFIRMED',
    'Advance verified via Razorpay. Assigned senior floor host.',
    '-10 days',
    '-9 days'
  );

  // b3: Rohan Deshmukh pending wedding request (Ready for Admin Approval)
  insertBooking.run(
    b3Id,
    'VV-2026-1094',
    user2Id,
    hall1.id,
    pkgPremiumId,
    'Engagement',
    'Deshmukh Courtyard Sangeet',
    addDaysIso(25),
    '17:00',
    '23:00',
    310,
    'Acoustic sound check at 3:00 PM; outdoor brass lantern lighting.',
    125000,
    58000,
    32940,
    15000,
    230940,
    69282,
    'ADVANCE',
    'PARTIAL',
    'PENDING',
    'Awaiting final event schedule review by concierge.',
    '-3 days',
    '-3 days'
  );

  // b4: Meera Nair completed corporate summit
  insertBooking.run(
    b4Id,
    'VV-2026-1029',
    user3Id,
    hall3.id,
    pkgEssentialId,
    'Seminar',
    'South Asia Architecture Forum',
    addDaysIso(-48),
    '09:00',
    '17:00',
    240,
    'Dual 4K projector feed and executive lunch foyer.',
    107000,
    25000,
    23760,
    15000,
    170760,
    170760,
    'FULL',
    'PAID',
    'COMPLETED',
    'Corporate invoice settled via Razorpay NetBanking.',
    '-70 days',
    '-47 days'
  );

  // b5: Rohan cancelled booking
  insertBooking.run(
    b5Id,
    'VV-2026-1052',
    user2Id,
    hall0.id,
    pkgPremiumId,
    'Corporate Meeting',
    'Q3 Annual Gala',
    addDaysIso(-12),
    '18:00',
    '22:00',
    350,
    'Rescheduled due to travel.',
    165000,
    58000,
    40140,
    15000,
    278140,
    83442,
    'ADVANCE',
    'REFUNDED',
    'CANCELLED',
    'Cancelled 35 days prior; 90% refund processed.',
    '-50 days',
    '-40 days'
  );

  // Seed Payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (
      id, booking_id, user_id, gateway, razorpay_order_id, razorpay_payment_id,
      razorpay_signature, amount, payment_type, status, method, created_at
    ) VALUES (?, ?, ?, 'RAZORPAY', ?, ?, ?, ?, ?, 'VERIFIED', ?, datetime('now', ?))
  `);

  const p1Id = uid();
  const p2Id = uid();
  const p3Id = uid();
  const p4Id = uid();
  const p5Id = uid();

  insertPayment.run(
    p1Id,
    b1Id,
    user1Id,
    'order_VV20261041',
    'pay_VV99481021',
    computeHmacSignature('order_VV20261041', 'pay_VV99481021'),
    345400,
    'FULL',
    'Card · Visa **** 4821',
    '-45 days'
  );
  insertPayment.run(
    p2Id,
    b2Id,
    user1Id,
    'order_VV20261088',
    'pay_VV99482311',
    computeHmacSignature('order_VV20261088', 'pay_VV99482311'),
    32820,
    'ADVANCE',
    'UPI · priya@okicici',
    '-10 days'
  );
  insertPayment.run(
    p3Id,
    b3Id,
    user2Id,
    'order_VV20261094',
    'pay_VV99483502',
    computeHmacSignature('order_VV20261094', 'pay_VV99483502'),
    69282,
    'ADVANCE',
    'NetBanking · HDFC',
    '-3 days'
  );
  insertPayment.run(
    p4Id,
    b4Id,
    user3Id,
    'order_VV20261029',
    'pay_VV99480018',
    computeHmacSignature('order_VV20261029', 'pay_VV99480018'),
    170760,
    'FULL',
    'Corporate Card **** 9012',
    '-69 days'
  );
  insertPayment.run(
    p5Id,
    b5Id,
    user2Id,
    'order_VV20261052',
    'pay_VV99481440',
    computeHmacSignature('order_VV20261052', 'pay_VV99481440'),
    83442,
    'ADVANCE',
    'UPI · rohan@oksbi',
    '-50 days'
  );

  // Seed Refund for b5
  db.prepare(
    `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, status, processed_by, created_at)
     VALUES (?, ?, ?, ?, ?, 'PROCESSED', ?, datetime('now', '-40 days'))`
  ).run(uid(), p5Id, b5Id, 75098, 'Early cancellation (>30 days notice, 90% policy)', adminId);

  // Seed Booking Status History
  const insertHistory = db.prepare(`
    INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, changed_by_name, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);
  insertHistory.run(uid(), b1Id, null, 'PENDING', user1Id, 'Priya Sharma', 'Reservation submitted online.', '-45 days');
  insertHistory.run(uid(), b1Id, 'PENDING', 'CONFIRMED', adminId, 'Arjun Malhotra', 'Full Razorpay payment verified.', '-44 days');
  insertHistory.run(uid(), b1Id, 'CONFIRMED', 'COMPLETED', adminId, 'Arjun Malhotra', 'Event concluded seamlessly.', '-21 days');
  insertHistory.run(uid(), b2Id, null, 'PENDING', user1Id, 'Priya Sharma', 'Reservation submitted with 30% advance.', '-10 days');
  insertHistory.run(uid(), b2Id, 'PENDING', 'CONFIRMED', adminId, 'Arjun Malhotra', 'Advance verified and salon locked.', '-9 days');
  insertHistory.run(uid(), b3Id, null, 'PENDING', user2Id, 'Rohan Deshmukh', 'Submitted courtyard sangeet reservation.', '-3 days');

  // Seed Availability Maintenance Block
  db.prepare(
    `INSERT INTO availability_blocks (id, hall_id, date, start_time, end_time, status, reason, created_by)
     VALUES (?, ?, ?, '08:00', '23:00', 'MAINTENANCE', 'Annual Crystal Chandelier Restoration & Polishing', ?)`
  ).run(uid(), hall0.id, addDaysIso(12), adminId);

  // Seed Verified Reviews from Completed Bookings
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, hall_id, user_id, booking_id, rating, title, comment, event_type, is_verified, is_published, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now', ?))
  `);
  insertReview.run(
    uid(),
    hall0.id,
    user1Id,
    b1Id,
    5,
    'An unforgettable candlelit reception under the chandeliers',
    'Every detail from valet arrival to the floral stage lighting felt effortlessly orchestrated. All 480 guests commented on the warmth of the walnut ballroom and the acoustics.',
    'Reception',
    '-19 days'
  );
  insertReview.run(
    uid(),
    hall3.id,
    user3Id,
    b4Id,
    5,
    'Flawless acoustics and executive hospitality',
    'We hosted 240 architects and speakers for an all-day symposium. The projection clarity, acoustic slat walls, and catering turnaround were on par with five-star convention centers.',
    'Seminar',
    '-45 days'
  );
  insertReview.run(
    uid(),
    hall1.id,
    user2Id,
    null,
    5,
    'Magical twilight ambience beneath the sandstone arches',
    'The brass lanterns coming alive at dusk turned our family celebration into cinema. Transparent pricing and zero hidden charges.',
    'Engagement',
    '-28 days'
  );
  insertReview.run(
    uid(),
    hall2.id,
    user1Id,
    null,
    5,
    'Intimate, warm, and deeply personal',
    'For a 60-person family gathering, Velvet Hearth Salon felt like welcoming loved ones into a private heritage manor.',
    'Family Gathering',
    '-35 days'
  );

  // Seed Favorites & Notifications
  db.prepare(`INSERT INTO favorites (user_id, hall_id) VALUES (?, ?)`).run(user1Id, hall0.id);
  db.prepare(`INSERT INTO favorites (user_id, hall_id) VALUES (?, ?)`).run(user1Id, hall1.id);

  const insertNotif = db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, 0)`
  );
  insertNotif.run(
    uid(),
    user1Id,
    'Reservation Confirmed · VV-2026-1088',
    'Your Golden Jubilee Family Dinner at The Velvet Hearth Salon is confirmed. Advance payment verified.',
    'BOOKING'
  );
  insertNotif.run(
    uid(),
    adminId,
    'Pending Approval · VV-2026-1094',
    'Rohan Deshmukh requested The Saffron Courtyard & Colonnade for an Engagement Sangeet.',
    'ALERT'
  );

  // Seed Admin Audit Log
  db.prepare(
    `INSERT INTO admin_audit_logs (id, admin_id, action, entity_type, entity_id, details)
     VALUES (?, ?, 'VERIFY_PAYMENT', 'BOOKING', ?, 'Initial verified booking records seeded.')`
  ).run(uid(), adminId, b2Id);
}
