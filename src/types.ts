export type UserRole = 'USER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentPlan = 'ADVANCE' | 'FULL';

export const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Reception',
  'Birthday Celebration',
  'Family Gathering',
  'Corporate Meeting',
  'Cultural Programme',
  'Religious Function',
  'Seminar',
  'Anniversary Celebration',
  'Private Party',
] as const;

export const HALL_CATEGORIES = [
  'Grand Banquet Halls',
  'Wedding Venues',
  'Community Spaces',
  'Conference Halls',
  'Outdoor Celebration Spaces',
  'Intimate Event Spaces',
] as const;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  email_verified: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface HallImage {
  id: string;
  hall_id: string;
  url: string;
  caption: string;
  sort_order: number;
}

export interface Amenity {
  id: string;
  name: string;
  icon_key: string;
}

export interface Hall {
  id: string;
  slug: string;
  name: string;
  category: string;
  location: string;
  address: string;
  capacity: number;
  base_price: number;
  hourly_rate: number;
  description: string;
  seating_arrangements: string;
  parking_info: string;
  ac_available: boolean;
  kitchen_available: boolean;
  rating: number;
  review_count: number;
  featured: boolean;
  is_active: boolean;
  images: HallImage[];
  amenities: Amenity[];
  is_favorite?: boolean;
  created_at: string;
}

export interface PackageItem {
  id: string;
  name: string;
  tier: string;
  subtitle: string;
  price: number;
  description: string;
  features: string[];
  is_active: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  url: string;
  aspect: string;
  sort_order: number;
}

export interface BookingStatusHistoryItem {
  id: string;
  booking_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string;
  note: string;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_ref: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  hall_id: string;
  hall_name?: string;
  hall_location?: string;
  hall_image?: string;
  package_id: string | null;
  package_name?: string | null;
  event_type: string;
  event_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  special_requirements: string;
  base_amount: number;
  package_amount: number;
  tax_amount: number;
  deposit_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_plan: PaymentPlan;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  history?: BookingStatusHistoryItem[];
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  booking_ref?: string;
  hall_name?: string;
  user_id: string;
  user_name?: string;
  gateway: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  payment_type: 'ADVANCE' | 'FULL' | 'BALANCE';
  status: 'CREATED' | 'VERIFIED' | 'FAILED';
  method: string;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  payment_id: string;
  booking_id: string;
  booking_ref?: string;
  amount: number;
  reason: string;
  status: string;
  processed_by_name?: string;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  hall_id: string;
  hall_name?: string;
  user_id: string;
  user_name: string;
  booking_id: string | null;
  rating: number;
  title: string;
  comment: string;
  event_type: string;
  is_verified: boolean;
  is_published: boolean;
  created_at: string;
}

export interface AvailabilityBlock {
  id: string;
  hall_id: string;
  hall_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'MAINTENANCE' | 'UNAVAILABLE';
  reason: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'BOOKING' | 'PAYMENT' | 'SYSTEM' | 'ALERT';
  is_read: boolean;
  created_at: string;
}

export interface SystemSettings {
  min_advance_days: number;
  max_advance_days: number;
  advance_payment_percent: number;
  tax_rate_percent: number;
  security_deposit_amount: number;
  full_refund_days: number;
  partial_refund_days: number;
  partial_refund_percent: number;
  auto_confirm_on_payment: boolean;
}
