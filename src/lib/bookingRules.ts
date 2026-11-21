import type { PaymentPlan, SystemSettings } from '../types';

export const DEFAULT_SETTINGS: SystemSettings = {
  min_advance_days: 1,
  max_advance_days: 365,
  advance_payment_percent: 30,
  tax_rate_percent: 18,
  security_deposit_amount: 15000,
  full_refund_days: 30,
  partial_refund_days: 14,
  partial_refund_percent: 50,
  auto_confirm_on_payment: true,
};

export function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Time out of range: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * Half-open interval overlap check: [startA, endA) overlaps [startB, endB)
 * iff startA < endB && startB < endA.
 * Adjacent slots like 09:00-13:00 and 13:00-17:00 do NOT overlap.
 */
export function doTimeSlotsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);
  if (eA <= sA || eB <= sB) {
    throw new Error('End time must be strictly after start time.');
  }
  return sA < eB && sB < eA;
}

export function calculateDurationHours(startTime: string, endTime: string): number {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (e <= s) {
    throw new Error('End time must be after start time.');
  }
  return Math.round(((e - s) / 60) * 100) / 100;
}

export interface PricingInput {
  basePrice: number;
  hourlyRate: number;
  startTime: string;
  endTime: string;
  guestCount: number;
  hallCapacity: number;
  packagePrice?: number;
  paymentPlan: PaymentPlan;
  settings?: Partial<SystemSettings>;
}

export interface PricingBreakdown {
  durationHours: number;
  baseAmount: number;
  extraHoursAmount: number;
  packageAmount: number;
  subtotal: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  amountDueNow: number;
  balanceDueLater: number;
}

export function calculateBookingPricing(input: PricingInput): PricingBreakdown {
  const cfg = { ...DEFAULT_SETTINGS, ...input.settings };

  if (input.guestCount <= 0) {
    throw new Error('Guest count must be at least 1.');
  }
  if (input.guestCount > input.hallCapacity) {
    throw new Error(`Guest count (${input.guestCount}) exceeds venue capacity (${input.hallCapacity}).`);
  }

  const durationHours = calculateDurationHours(input.startTime, input.endTime);
  const includedHours = 6;
  const extraHours = Math.max(0, durationHours - includedHours);
  const baseAmount = Math.round(input.basePrice);
  const extraHoursAmount = Math.round(extraHours * input.hourlyRate);
  const packageAmount = Math.round(input.packagePrice ?? 0);

  const taxableSubtotal = baseAmount + extraHoursAmount + packageAmount;
  const taxAmount = Math.round(taxableSubtotal * (cfg.tax_rate_percent / 100));
  const depositAmount = Math.round(cfg.security_deposit_amount);
  const totalAmount = taxableSubtotal + taxAmount + depositAmount;

  const amountDueNow =
    input.paymentPlan === 'FULL'
      ? totalAmount
      : Math.round(totalAmount * (cfg.advance_payment_percent / 100));

  const balanceDueLater = Math.max(0, totalAmount - amountDueNow);

  return {
    durationHours,
    baseAmount: baseAmount + extraHoursAmount,
    extraHoursAmount,
    packageAmount,
    subtotal: taxableSubtotal,
    taxAmount,
    depositAmount,
    totalAmount,
    amountDueNow,
    balanceDueLater,
  };
}

export function validateBookingDates(params: {
  eventDate: string;
  startTime: string;
  endTime: string;
  todayStr?: string;
  settings?: Partial<SystemSettings>;
}): { valid: boolean; error?: string } {
  const cfg = { ...DEFAULT_SETTINGS, ...params.settings };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.eventDate)) {
    return { valid: false, error: 'Event date must be in YYYY-MM-DD format.' };
  }

  const today = params.todayStr ?? new Date().toISOString().slice(0, 10);
  const eventMs = Date.parse(`${params.eventDate}T00:00:00Z`);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(eventMs)) {
    return { valid: false, error: 'Invalid event date.' };
  }

  const diffDays = Math.round((eventMs - todayMs) / (1000 * 60 * 60 * 24));
  if (diffDays < cfg.min_advance_days) {
    return {
      valid: false,
      error: `Bookings must be made at least ${cfg.min_advance_days} day(s) in advance.`,
    };
  }
  if (diffDays > cfg.max_advance_days) {
    return {
      valid: false,
      error: `Bookings cannot be scheduled more than ${cfg.max_advance_days} days in advance.`,
    };
  }

  try {
    const startMin = parseTimeToMinutes(params.startTime);
    const endMin = parseTimeToMinutes(params.endTime);
    if (endMin <= startMin) {
      return { valid: false, error: 'End time must be after start time.' };
    }
    if (endMin - startMin < 120) {
      return { valid: false, error: 'Minimum reservation duration is 2 hours.' };
    }
  } catch (err: any) {
    return { valid: false, error: err?.message ?? 'Invalid time range.' };
  }

  return { valid: true };
}

export function computeRefundAmount(params: {
  paidAmount: number;
  depositAmount: number;
  eventDate: string;
  cancelDate?: string;
  settings?: Partial<SystemSettings>;
}): { refundableAmount: number; refundPercentage: number; policyTier: string } {
  const cfg = { ...DEFAULT_SETTINGS, ...params.settings };
  if (params.paidAmount <= 0) {
    return { refundableAmount: 0, refundPercentage: 0, policyTier: 'No payment made' };
  }

  const cancelDate = params.cancelDate ?? new Date().toISOString().slice(0, 10);
  const eventMs = Date.parse(`${params.eventDate}T00:00:00Z`);
  const cancelMs = Date.parse(`${cancelDate}T00:00:00Z`);
  const daysNotice = Math.round((eventMs - cancelMs) / (1000 * 60 * 60 * 24));

  if (daysNotice >= cfg.full_refund_days) {
    const refundableAmount = Math.round(params.paidAmount * 0.9);
    return {
      refundableAmount,
      refundPercentage: 90,
      policyTier: `Early cancellation (${daysNotice}+ days notice: 90% refund)`,
    };
  }

  if (daysNotice >= cfg.partial_refund_days) {
    const pct = cfg.partial_refund_percent;
    const refundableAmount = Math.round(params.paidAmount * (pct / 100));
    return {
      refundableAmount,
      refundPercentage: pct,
      policyTier: `Standard cancellation (${daysNotice} days notice: ${pct}% refund)`,
    };
  }

  const depositPortion = Math.min(params.paidAmount, Math.round(params.depositAmount * 0.5));
  return {
    refundableAmount: depositPortion,
    refundPercentage: Math.round((depositPortion / params.paidAmount) * 100),
    policyTier: 'Late cancellation (<14 days notice: partial security deposit return only)',
  };
}

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
