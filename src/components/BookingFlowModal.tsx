import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  Lock,
  ShieldCheck,
  Smartphone,
  Building,
} from 'lucide-react';
import type { Booking, Hall, PackageItem, PaymentPlan, SystemSettings } from '../types';
import { EVENT_TYPES } from '../types';
import {
  calculateBookingPricing,
  formatCurrency,
  formatTime12h,
  DEFAULT_SETTINGS,
} from '../lib/bookingRules';
import { apiFetch } from '../lib/api';
import { downloadBookingReceiptPdf } from '../lib/pdfReceipt';
import { useAuth } from '../context/AuthContext';
import { ModalShell, GoldButton, StatusLabel } from './ui/LuxuryPrimitives';
import { BookingCalendar } from './BookingCalendar';

const TIME_SLOTS = [
  { label: 'Morning Ceremony (09:00 AM – 03:00 PM)', start: '09:00', end: '15:00' },
  { label: 'Evening Reception (05:00 PM – 11:00 PM)', start: '17:00', end: '23:00' },
  { label: 'Full-Day Buyout (09:00 AM – 11:00 PM)', start: '09:00', end: '23:00' },
];

export function BookingFlowModal({
  halls,
  packages,
  settings = DEFAULT_SETTINGS,
  initialHallId,
  initialPackageId,
  initialDate,
  onClose,
  onOpenAuth,
  onBookingComplete,
}: {
  halls: Hall[];
  packages: PackageItem[];
  settings?: SystemSettings;
  initialHallId?: string;
  initialPackageId?: string;
  initialDate?: string;
  onClose: () => void;
  onOpenAuth: () => void;
  onBookingComplete: (booking: Booking) => void;
}) {
  const { user } = useAuth();
  const defaultDate = useMemo(() => {
    if (initialDate) return initialDate;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 14);
    return d.toISOString().slice(0, 10);
  }, [initialDate]);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [hallId, setHallId] = useState(initialHallId || halls[0]?.id || '');
  const [eventType, setEventType] = useState<string>('Wedding');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestCount, setGuestCount] = useState(120);
  const [packageId, setPackageId] = useState<string>(initialPackageId || '');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('ADVANCE');

  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [orderInfo, setOrderInfo] = useState<{
    orderId: string;
    amount: number;
    keyId: string;
    mode: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI · Google Pay / PhonePe');
  const [verifiedPayment, setVerifiedPayment] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedHall = halls.find((h) => h.id === hallId) || halls[0];
  const selectedPackage = packages.find((p) => p.id === packageId) || null;

  const pricing = useMemo(() => {
    if (!selectedHall) return null;
    try {
      return calculateBookingPricing({
        basePrice: selectedHall.base_price,
        hourlyRate: selectedHall.hourly_rate,
        startTime,
        endTime,
        guestCount: Math.min(Math.max(1, guestCount), selectedHall.capacity),
        hallCapacity: selectedHall.capacity,
        packagePrice: selectedPackage?.price || 0,
        paymentPlan,
        settings,
      });
    } catch {
      return null;
    }
  }, [selectedHall, startTime, endTime, guestCount, selectedPackage, paymentPlan, settings]);

  const handleSubmitBooking = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await apiFetch<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          hallId: selectedHall.id,
          packageId: packageId || null,
          eventType,
          eventName: eventName.trim(),
          eventDate,
          startTime,
          endTime,
          guestCount: Number(guestCount),
          specialRequirements,
          paymentPlan,
        }),
      });
      setCreatedBooking(res.booking);

      const order = await apiFetch<{
        orderId: string;
        amount: number;
        keyId: string;
        mode: string;
      }>('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: res.booking.id,
          paymentType: paymentPlan,
        }),
      });
      setOrderInfo(order);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Unable to lock booking slot.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteRazorpayPayment = async () => {
    if (!orderInfo || !createdBooking) return;
    setError('');
    setBusy(true);
    try {
      // Request server-signed test-mode authorization & verify HMAC signature on server
      const authPayload = await apiFetch<{
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        method: string;
      }>('/api/payments/test-checkout-authorize', {
        method: 'POST',
        body: JSON.stringify({ orderId: orderInfo.orderId, method: paymentMethod }),
      });

      const verifyRes = await apiFetch<{ ok: boolean; booking: Booking }>('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          ...authPayload,
          method: paymentMethod,
        }),
      });

      const hydratedBooking: Booking = {
        ...createdBooking,
        ...verifyRes.booking,
        hall_name: selectedHall.name,
        hall_location: selectedHall.location,
        user_name: user?.name,
        user_email: user?.email,
      };
      setCreatedBooking(hydratedBooking);
      setVerifiedPayment({
        gateway: 'RAZORPAY',
        razorpay_order_id: authPayload.razorpay_order_id,
        razorpay_payment_id: authPayload.razorpay_payment_id,
        amount: orderInfo.amount,
        status: 'VERIFIED',
        method: paymentMethod,
      });
      onBookingComplete(hydratedBooking);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Payment verification failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!selectedHall) return null;

  return (
    <ModalShell
      title="Reserve Your Celebration Date"
      subtitle={`Step ${step} of 5 · ${
        step === 1
          ? 'Venue & Occasion'
          : step === 2
            ? 'Date & Time Slot'
            : step === 3
              ? 'Guests, Package & Breakdown'
              : step === 4
                ? 'Razorpay Checkout & Verification'
                : 'Confirmed Reservation'
      }`}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      {/* Progress Bar */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {['Venue', 'Date & Slot', 'Details', 'Payment', 'Confirmed'].map((label, idx) => {
          const sNum = idx + 1;
          const active = step >= sNum;
          return (
            <div key={label} className="space-y-1.5">
              <div
                className={`h-1 rounded-xs ${active ? 'bg-[#D6B65B]' : 'bg-white/12'}`}
              />
              <span
                className={`block text-[10px] uppercase tracking-wider truncate ${
                  active ? 'text-[#E8CB72]' : 'text-[#B9AA99]/60'
                }`}
              >
                {sNum}. {label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/45 rounded-sm text-xs text-rose-200"
        >
          {error}
        </div>
      )}

      {/* Step 1: Choose Hall & Event Category & Event Title */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label htmlFor="bk-hall" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
              Select Community Hall
            </label>
            <select
              id="bk-hall"
              value={hallId}
              onChange={(e) => {
                setHallId(e.target.value);
                const nextH = halls.find((h) => h.id === e.target.value);
                if (nextH && guestCount > nextH.capacity) {
                  setGuestCount(nextH.capacity);
                }
              }}
              className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
            >
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.location} (Up to {h.capacity} guests · {formatCurrency(h.base_price)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bk-event-type" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Event Category
              </label>
              <select
                id="bk-event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
              >
                {EVENT_TYPES.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bk-event-name" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Celebration / Event Title
              </label>
              <input
                id="bk-event-name"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Mehta Family Golden Jubilee"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <GoldButton
              onClick={() => {
                if (!eventName.trim()) {
                  setError('Please enter a title for your event.');
                  return;
                }
                setError('');
                setStep(2);
              }}
            >
              Continue to Date &amp; Time Slot
            </GoldButton>
          </div>
        </div>
      )}

      {/* Step 2: Date & Available Time Slot */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <BookingCalendar
              hallId={selectedHall.id}
              selectedDate={eventDate}
              onSelectDate={(d) => setEventDate(d)}
            />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label htmlFor="bk-date-input" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Selected Date
              </label>
              <input
                id="bk-date-input"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-sm font-mono-num text-[#F6EBD8]"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs uppercase tracking-wider text-[#B9AA99]">
                Quick Slot Presets
              </span>
              {TIME_SLOTS.map((slot) => {
                const active = startTime === slot.start && endTime === slot.end;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => {
                      setStartTime(slot.start);
                      setEndTime(slot.end);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs rounded-sm border cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#D6B65B]/15 border-[#D6B65B] text-[#E8CB72]'
                        : 'bg-[#100B08] border-white/12 text-[#F6EBD8] hover:border-white/30'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bk-start" className="block text-[11px] uppercase text-[#B9AA99] mb-1">
                  Start Time
                </label>
                <input
                  id="bk-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num text-[#F6EBD8]"
                />
              </div>
              <div>
                <label htmlFor="bk-end" className="block text-[11px] uppercase text-[#B9AA99] mb-1">
                  End Time
                </label>
                <input
                  id="bk-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num text-[#F6EBD8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <GoldButton variant="outline" onClick={() => setStep(1)}>
                Back
              </GoldButton>
              <GoldButton onClick={() => setStep(3)}>Continue to Details</GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Guest Count, Package, Special Requirements & Price Breakdown */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-guests" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                  Expected Guest Count (Max {selectedHall.capacity})
                </label>
                <input
                  id="bk-guests"
                  type="number"
                  min={1}
                  max={selectedHall.capacity}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm font-mono-num text-[#F6EBD8]"
                />
              </div>
              <div>
                <label htmlFor="bk-pkg" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                  Celebration Package (Optional)
                </label>
                <select
                  id="bk-pkg"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
                >
                  <option value="">Venue Charter Only (No Add-on)</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (+{formatCurrency(p.price)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bk-req" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Special Requirements &amp; Seating Notes
              </label>
              <textarea
                id="bk-req"
                rows={3}
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="Stage layout, dietary catering staging, AV setup, or cultural ceremony notes..."
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
              />
            </div>

            <div>
              <span className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-2">
                Payment Option
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentPlan('ADVANCE')}
                  className={`p-3.5 rounded-sm border text-left cursor-pointer ${
                    paymentPlan === 'ADVANCE'
                      ? 'bg-[#D6B65B]/15 border-[#D6B65B]'
                      : 'bg-[#100B08] border-white/12'
                  }`}
                >
                  <span className="block text-xs font-semibold text-[#FFFFFF]">
                    {settings.advance_payment_percent}% Advance Lock
                  </span>
                  <span className="text-[11px] text-[#B9AA99]">
                    Lock your date now and pay remaining balance before event.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPlan('FULL')}
                  className={`p-3.5 rounded-sm border text-left cursor-pointer ${
                    paymentPlan === 'FULL'
                      ? 'bg-[#D6B65B]/15 border-[#D6B65B]'
                      : 'bg-[#100B08] border-white/12'
                  }`}
                >
                  <span className="block text-xs font-semibold text-[#FFFFFF]">
                    100% Full Settlement
                  </span>
                  <span className="text-[11px] text-[#B9AA99]">
                    Complete payment upfront for instant confirmation.
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Price Breakdown Card */}
          <div className="lg:col-span-5 bg-[#21150F] border border-[#D6B65B]/30 rounded-sm p-5 space-y-4">
            <h4 className="font-display text-lg text-[#FFFFFF]">Price Breakdown</h4>
            {pricing ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-[#B9AA99]">
                  <span>Venue Charter ({pricing.durationHours} hrs)</span>
                  <span className="font-mono-num text-[#F6EBD8]">
                    {formatCurrency(pricing.baseAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[#B9AA99]">
                  <span>Celebration Package</span>
                  <span className="font-mono-num text-[#F6EBD8]">
                    {formatCurrency(pricing.packageAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[#B9AA99]">
                  <span>GST &amp; Hospitality Tax ({settings.tax_rate_percent}%)</span>
                  <span className="font-mono-num text-[#F6EBD8]">
                    {formatCurrency(pricing.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[#B9AA99]">
                  <span>Refundable Security Deposit</span>
                  <span className="font-mono-num text-[#F6EBD8]">
                    {formatCurrency(pricing.depositAmount)}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/12 flex justify-between text-sm font-semibold text-[#FFFFFF]">
                  <span>Total Reservation Value</span>
                  <span className="font-mono-num text-[#E8CB72]">
                    {formatCurrency(pricing.totalAmount)}
                  </span>
                </div>
                <div className="p-3 bg-[#100B08] border border-[#D6B65B]/30 rounded-sm flex justify-between items-center">
                  <span className="text-[#E8CB72] font-medium">
                    Due Now ({paymentPlan === 'FULL' ? '100%' : `${settings.advance_payment_percent}%`})
                  </span>
                  <span className="font-mono-num text-base text-[#FFFFFF] font-semibold">
                    {formatCurrency(pricing.amountDueNow)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-300">
                Please verify guest count (1–{selectedHall.capacity}) and valid time window.
              </p>
            )}

            {!user && (
              <p className="text-xs text-[#E8CB72]">
                Sign in or create an account in the next step to submit &amp; pay.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <GoldButton variant="outline" onClick={() => setStep(2)}>
                Back
              </GoldButton>
              <GoldButton onClick={handleSubmitBooking} disabled={busy || !pricing}>
                {busy
                  ? 'Locking Slot...'
                  : user
                    ? 'Submit & Proceed to Pay'
                    : 'Sign In to Reserve'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Razorpay Checkout & Server HMAC Verification */}
      {step === 4 && createdBooking && orderInfo && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-5 bg-[#21150F] border border-[#D6B65B]/35 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.16em] text-[#D6B65B]">
                Razorpay Secure Test Checkout
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                <Lock className="w-3 h-3" /> HMAC-SHA256 Verified
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <p className="font-display text-lg text-[#FFFFFF]">{createdBooking.event_name}</p>
                <p className="text-xs text-[#B9AA99] font-mono-num">
                  Ref: {createdBooking.booking_ref} · Order: {orderInfo.orderId}
                </p>
              </div>
              <span className="font-mono-num text-2xl text-[#E8CB72] font-semibold">
                {formatCurrency(orderInfo.amount)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-xs uppercase tracking-wider text-[#B9AA99]">
              Select Payment Method
            </span>
            {[
              { label: 'UPI · Google Pay / PhonePe', icon: Smartphone },
              { label: 'Card · Visa / Mastercard / RuPay', icon: CreditCard },
              { label: 'NetBanking · Corporate & Retail', icon: Building },
            ].map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.label;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setPaymentMethod(m.label)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-sm border text-sm cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#D6B65B]/15 border-[#D6B65B] text-[#FFFFFF]'
                      : 'bg-[#100B08] border-white/12 text-[#B9AA99] hover:text-[#F6EBD8]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#D6B65B]" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <GoldButton variant="outline" onClick={onClose}>
              Pay Later (Keep Pending)
            </GoldButton>
            <GoldButton size="lg" onClick={handleCompleteRazorpayPayment} disabled={busy}>
              <ShieldCheck className="w-4 h-4" />
              <span>{busy ? 'Verifying Signature...' : `Pay ${formatCurrency(orderInfo.amount)}`}</span>
            </GoldButton>
          </div>
        </div>
      )}

      {/* Step 5: Confirmation & Official PDF Receipt */}
      {step === 5 && createdBooking && (
        <div className="max-w-xl mx-auto text-center space-y-6 py-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-[#D6B65B]">
              Reservation Confirmed
            </span>
            <h4 className="font-display text-2xl sm:text-3xl text-[#FFFFFF] mt-2">
              {createdBooking.event_name}
            </h4>
            <p className="text-sm text-[#B9AA99] mt-2 font-mono-num">
              Booking Ref: {createdBooking.booking_ref} · {createdBooking.event_date} (
              {formatTime12h(createdBooking.start_time)} – {formatTime12h(createdBooking.end_time)})
            </p>
          </div>

          <div className="p-5 bg-[#21150F] border border-white/14 rounded-sm text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#B9AA99]">Venue</span>
              <span className="text-[#FFFFFF]">{selectedHall.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B9AA99]">Booking Status</span>
              <StatusLabel status={createdBooking.booking_status} />
            </div>
            <div className="flex justify-between">
              <span className="text-[#B9AA99]">Payment Status</span>
              <StatusLabel status={createdBooking.payment_status} />
            </div>
            <div className="flex justify-between">
              <span className="text-[#B9AA99]">Amount Verified</span>
              <span className="font-mono-num text-[#E8CB72]">
                {formatCurrency(createdBooking.paid_amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <GoldButton
              variant="outline"
              onClick={() => downloadBookingReceiptPdf(createdBooking, verifiedPayment)}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Receipt</span>
            </GoldButton>
            <GoldButton onClick={onClose}>Done</GoldButton>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
