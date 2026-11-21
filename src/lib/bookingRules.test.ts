import test from 'node:test';
import assert from 'node:assert/strict';
import {
  doTimeSlotsOverlap,
  calculateBookingPricing,
  validateBookingDates,
  computeRefundAmount,
  formatCurrency,
} from './bookingRules';

test('doTimeSlotsOverlap detects overlapping and non-overlapping slots accurately', () => {
  // Exact overlap
  assert.equal(doTimeSlotsOverlap('10:00', '16:00', '10:00', '16:00'), true);
  // Partial overlap
  assert.equal(doTimeSlotsOverlap('10:00', '16:00', '14:00', '20:00'), true);
  // Contained inside
  assert.equal(doTimeSlotsOverlap('09:00', '21:00', '12:00', '15:00'), true);
  // Touching boundaries do NOT overlap
  assert.equal(doTimeSlotsOverlap('09:00', '13:00', '13:00', '18:00'), false);
  // Completely separate
  assert.equal(doTimeSlotsOverlap('08:00', '11:00', '17:00', '22:00'), false);
});

test('calculateBookingPricing computes base, extra hours, package, tax, deposit, and advance accurately', () => {
  const breakdown = calculateBookingPricing({
    basePrice: 100000,
    hourlyRate: 10000,
    startTime: '10:00',
    endTime: '18:00', // 8 hours => 2 extra hours beyond 6h
    guestCount: 250,
    hallCapacity: 400,
    packagePrice: 50000,
    paymentPlan: 'ADVANCE',
  });

  assert.equal(breakdown.durationHours, 8);
  assert.equal(breakdown.extraHoursAmount, 20000);
  assert.equal(breakdown.baseAmount, 120000);
  assert.equal(breakdown.packageAmount, 50000);
  assert.equal(breakdown.subtotal, 170000);
  assert.equal(breakdown.taxAmount, 30600); // 18% of 170000
  assert.equal(breakdown.depositAmount, 15000);
  assert.equal(breakdown.totalAmount, 215600);
  assert.equal(breakdown.amountDueNow, 64680); // 30% advance
  assert.equal(breakdown.balanceDueLater, 150920);
});

test('calculateBookingPricing rejects guest count exceeding capacity', () => {
  assert.throws(() => {
    calculateBookingPricing({
      basePrice: 80000,
      hourlyRate: 8000,
      startTime: '10:00',
      endTime: '14:00',
      guestCount: 450,
      hallCapacity: 300,
      paymentPlan: 'FULL',
    });
  }, /exceeds venue capacity/i);
});

test('validateBookingDates enforces advance rules and minimum 2h duration', () => {
  const valid = validateBookingDates({
    eventDate: '2026-12-20',
    startTime: '16:00',
    endTime: '22:00',
    todayStr: '2026-11-14',
  });
  assert.equal(valid.valid, true);

  const past = validateBookingDates({
    eventDate: '2026-11-10',
    startTime: '16:00',
    endTime: '22:00',
    todayStr: '2026-11-14',
  });
  assert.equal(past.valid, false);

  const tooShort = validateBookingDates({
    eventDate: '2026-12-20',
    startTime: '16:00',
    endTime: '17:00',
    todayStr: '2026-11-14',
  });
  assert.equal(tooShort.valid, false);
});

test('computeRefundAmount follows tiered cancellation refund policy', () => {
  const early = computeRefundAmount({
    paidAmount: 100000,
    depositAmount: 15000,
    eventDate: '2026-12-30',
    cancelDate: '2026-11-14',
  });
  assert.equal(early.refundableAmount, 90000);
  assert.equal(early.refundPercentage, 90);

  const mid = computeRefundAmount({
    paidAmount: 100000,
    depositAmount: 15000,
    eventDate: '2026-12-01',
    cancelDate: '2026-11-14',
  });
  assert.equal(mid.refundableAmount, 50000);
  assert.equal(mid.refundPercentage, 50);
});

test('formatCurrency formats INR amounts cleanly', () => {
  assert.match(formatCurrency(125000), /1,25,000/);
});
