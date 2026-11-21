import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Compass,
  CalendarDays,
  CalendarCheck2,
  CreditCard,
  Heart,
  Bell,
  User,
  HelpCircle,
  LogOut,
  Plus,
  Download,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatTime12h } from '../lib/bookingRules';
import { downloadBookingReceiptPdf } from '../lib/pdfReceipt';
import type {
  Booking,
  Hall,
  NotificationItem,
  PaymentRecord,
  RefundRecord,
} from '../types';
import { GoldButton, StatusLabel, ModalShell } from './ui/LuxuryPrimitives';
import { VenueCard } from './VenueCard';
import { BookingCalendar } from './BookingCalendar';

type UserTab =
  | 'overview'
  | 'explore'
  | 'bookings'
  | 'calendar'
  | 'payments'
  | 'favorites'
  | 'notifications'
  | 'profile'
  | 'support';

export function UserDashboard({
  halls,
  onBackToSite,
  onOpenBookModal,
  onOpenHallDetails,
  onToggleFavorite,
  refreshSignal,
}: {
  halls: Hall[];
  onBackToSite: () => void;
  onOpenBookModal: (hall?: Hall, date?: string) => void;
  onOpenHallDetails: (hall: Hall) => void;
  onToggleFavorite: (hallId: string) => void;
  refreshSignal: number;
}) {
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<UserTab>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [favorites, setFavorites] = useState<Hall[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Explore filters
  const [searchLoc, setSearchLoc] = useState('');
  const [searchCap, setSearchCap] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');
  const [searchSort, setSearchSort] = useState('rating');

  // Calendar hall selector
  const [calHallId, setCalHallId] = useState(halls[0]?.id || '');
  const [calDate, setCalDate] = useState('');

  // Booking detail / cancel / balance pay modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  // Profile form
  const [profName, setProfName] = useState(user?.name || '');
  const [profPhone, setProfPhone] = useState(user?.phone || '');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [profMsg, setProfMsg] = useState('');

  // Support form
  const [supMsg, setSupMsg] = useState('');
  const [supStatus, setSupStatus] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes, fRes, nRes] = await Promise.all([
        apiFetch<{ bookings: Booking[] }>('/api/bookings/my'),
        apiFetch<{ payments: PaymentRecord[]; refunds: RefundRecord[] }>('/api/payments/my'),
        apiFetch<{ halls: Hall[] }>('/api/favorites'),
        apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
      ]);
      setBookings(bRes.bookings);
      setPayments(pRes.payments);
      setRefunds(pRes.refunds);
      setFavorites(fRes.halls);
      setNotifications(nRes.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshSignal]);

  useEffect(() => {
    if (!calHallId && halls.length > 0) setCalHallId(halls[0].id);
  }, [halls, calHallId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(
      (b) =>
        b.event_date >= new Date().toISOString().slice(0, 10) &&
        ['PENDING', 'APPROVED', 'CONFIRMED'].includes(b.booking_status)
    ).length,
    pending: bookings.filter((b) => b.booking_status === 'PENDING').length,
    confirmed: bookings.filter((b) => ['CONFIRMED', 'APPROVED'].includes(b.booking_status)).length,
    completed: bookings.filter((b) => b.booking_status === 'COMPLETED').length,
  };

  const handleCancelBooking = async (bookingId: string) => {
    setActionMsg('');
    try {
      const res = await apiFetch<{ refund: { refundableAmount: number; policyTier: string } }>(
        `/api/bookings/${bookingId}/cancel`,
        { method: 'POST', body: JSON.stringify({ reason: 'Cancelled by member from dashboard.' }) }
      );
      setActionMsg(
        `Reservation cancelled. ${
          res.refund.refundableAmount > 0
            ? `Refund of ${formatCurrency(res.refund.refundableAmount)} processed (${res.refund.policyTier}).`
            : res.refund.policyTier
        }`
      );
      setSelectedBooking(null);
      await loadData();
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

  const handlePayBalance = async (booking: Booking) => {
    setPayingId(booking.id);
    setActionMsg('');
    try {
      const order = await apiFetch<{ orderId: string }>('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id, paymentType: 'BALANCE' }),
      });
      const authPayload = await apiFetch('/api/payments/test-checkout-authorize', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.orderId, method: 'UPI · Verified Balance' }),
      });
      await apiFetch('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify(authPayload),
      });
      setActionMsg(`Balance payment verified for ${booking.booking_ref}.`);
      setSelectedBooking(null);
      await loadData();
    } catch (err: any) {
      setActionMsg(err.message);
    } finally {
      setPayingId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfMsg('');
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profName,
          phone: profPhone,
          ...(newPass ? { currentPassword: curPass, newPassword: newPass } : {}),
        }),
      });
      setCurPass('');
      setNewPass('');
      await refreshUser();
      setProfMsg('Profile updated successfully.');
    } catch (err: any) {
      setProfMsg(err.message);
    }
  };

  const filteredExplore = halls
    .filter((h) => (!searchLoc ? true : h.location.toLowerCase().includes(searchLoc.toLowerCase())))
    .filter((h) => (!searchCap ? true : h.capacity >= Number(searchCap)))
    .filter((h) => (!searchMaxPrice ? true : h.base_price <= Number(searchMaxPrice)))
    .sort((a, b) => {
      if (searchSort === 'price_asc') return a.base_price - b.base_price;
      if (searchSort === 'price_desc') return b.base_price - a.base_price;
      return b.rating - a.rating;
    });

  const navItems: Array<{ id: UserTab; label: string; icon: any; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'explore', label: 'Explore Halls', icon: Compass },
    { id: 'bookings', label: 'My Bookings', icon: CalendarCheck2, badge: stats.pending || undefined },
    { id: 'calendar', label: 'Availability Calendar', icon: CalendarDays },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount || undefined },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#100B08] text-[#F6EBD8] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between bg-[#160F0B] border-r border-white/12 p-5">
        <div className="space-y-6">
          <div>
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 text-xs text-[#B9AA99] hover:text-[#E8CB72] cursor-pointer mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Website</span>
            </button>
            <div className="font-display text-lg tracking-[0.16em] uppercase text-[#FFFFFF]">
              Vows &amp; Venues
            </div>
            <p className="text-[11px] text-[#D6B65B] mt-0.5">Member Portal</p>
          </div>

          <nav className="space-y-1" aria-label="User portal navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs tracking-wide transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#D6B65B] text-[#100B08] font-semibold'
                      : 'text-[#B9AA99] hover:text-[#FFFFFF] hover:bg-[#21150F]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span
                      className={`font-mono-num text-[10px] px-1.5 py-0.5 rounded-xs ${
                        active ? 'bg-[#100B08] text-[#E8CB72]' : 'bg-[#2A1C15] text-[#E8CB72]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            onBackToSite();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-rose-300 hover:bg-rose-950/30 rounded-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="bg-[#160F0B] border-b border-white/12 px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle dashboard navigation"
              className="lg:hidden p-2 border border-white/15 rounded-sm text-[#F6EBD8]"
            >
              {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="font-display text-lg sm:text-xl text-[#FFFFFF]">
                {navItems.find((i) => i.id === tab)?.label}
              </h1>
              <p className="text-xs text-[#B9AA99]">Welcome, {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GoldButton size="sm" onClick={() => onOpenBookModal()}>
              <Plus className="w-3.5 h-3.5" />
              <span>Book a Venue</span>
            </GoldButton>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {mobileMenu && (
          <div className="lg:hidden bg-[#18100C] border-b border-white/15 p-4 grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setMobileMenu(false);
                }}
                className={`px-3 py-2 text-xs text-left rounded-sm ${
                  tab === item.id ? 'bg-[#D6B65B] text-[#100B08] font-semibold' : 'bg-[#21150F] text-[#F6EBD8]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                logout();
                onBackToSite();
              }}
              className="px-3 py-2 text-xs text-left rounded-sm bg-rose-950/40 text-rose-300"
            >
              Logout
            </button>
          </div>
        )}

        <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          {actionMsg && (
            <div className="p-3.5 bg-[#21150F] border border-[#D6B65B]/45 rounded-sm text-xs text-[#E8CB72] flex items-center justify-between">
              <span>{actionMsg}</span>
              <button type="button" onClick={() => setActionMsg('')} className="text-[#B9AA99] hover:text-white cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* 1. OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Bookings', value: stats.total },
                  { label: 'Upcoming Events', value: stats.upcoming },
                  { label: 'Pending', value: stats.pending },
                  { label: 'Confirmed', value: stats.confirmed },
                  { label: 'Completed', value: stats.completed },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="p-5 bg-[#21150F] border border-white/12 rounded-sm"
                  >
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
                      {k.label}
                    </span>
                    <span className="block font-mono-num text-2xl sm:text-3xl text-[#E8CB72] mt-2">
                      {k.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-[#FFFFFF]">Recent Booking Activity</h2>
                  <GoldButton variant="outline" size="sm" onClick={() => setTab('bookings')}>
                    View All Bookings
                  </GoldButton>
                </div>

                {loading ? (
                  <p className="text-xs text-[#B9AA99]">Loading reservations...</p>
                ) : bookings.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <p className="text-sm text-[#B9AA99]">You have no venue reservations yet.</p>
                    <GoldButton onClick={() => onOpenBookModal()}>Book Your First Venue</GoldButton>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/12 text-[#B9AA99] uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 pr-4">Ref</th>
                          <th className="py-3 pr-4">Event &amp; Venue</th>
                          <th className="py-3 pr-4">Date &amp; Slot</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {bookings.slice(0, 5).map((b) => (
                          <tr key={b.id} className="hover:bg-[#2A1C15]/50">
                            <td className="py-3.5 pr-4 font-mono-num text-[#E8CB72]">
                              {b.booking_ref}
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className="block text-[#FFFFFF] font-medium">{b.event_name}</span>
                              <span className="text-[#B9AA99]">{b.hall_name}</span>
                            </td>
                            <td className="py-3.5 pr-4 font-mono-num text-[#F6EBD8]">
                              {b.event_date} · {b.start_time}–{b.end_time}
                            </td>
                            <td className="py-3.5 pr-4">
                              <StatusLabel status={b.booking_status} />
                            </td>
                            <td className="py-3.5 text-right font-mono-num text-[#FFFFFF]">
                              {formatCurrency(b.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. EXPLORE HALLS */}
          {tab === 'explore' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#21150F] border border-white/12 rounded-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  placeholder="Filter by city or location..."
                  value={searchLoc}
                  onChange={(e) => setSearchLoc(e.target.value)}
                  className="bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs text-[#F6EBD8]"
                />
                <input
                  type="number"
                  placeholder="Min guest capacity..."
                  value={searchCap}
                  onChange={(e) => setSearchCap(e.target.value)}
                  className="bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num text-[#F6EBD8]"
                />
                <input
                  type="number"
                  placeholder="Max base price (₹)..."
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  className="bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num text-[#F6EBD8]"
                />
                <select
                  value={searchSort}
                  onChange={(e) => setSearchSort(e.target.value)}
                  className="bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs text-[#F6EBD8]"
                >
                  <option value="rating">Sort: Highest Rated</option>
                  <option value="price_asc">Sort: Price Low → High</option>
                  <option value="price_desc">Sort: Price High → Low</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredExplore.map((h) => (
                  <VenueCard
                    key={h.id}
                    hall={h}
                    onViewDetails={onOpenHallDetails}
                    onToggleFavorite={async (id) => {
                      await onToggleFavorite(id);
                      await loadData();
                    }}
                    onBookNow={(hall) => onOpenBookModal(hall)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. MY BOOKINGS */}
          {tab === 'bookings' && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="p-12 bg-[#21150F] border border-white/12 rounded-sm text-center space-y-3">
                  <p className="text-sm text-[#B9AA99]">No bookings found.</p>
                  <GoldButton onClick={() => onOpenBookModal()}>Reserve a Venue</GoldButton>
                </div>
              ) : (
                bookings.map((b) => {
                  const balance = Math.max(0, b.total_amount - b.paid_amount);
                  const relatedPayment = payments.find(
                    (p) => p.booking_id === b.id && p.status === 'VERIFIED'
                  );
                  return (
                    <div
                      key={b.id}
                      className="p-5 sm:p-6 bg-[#21150F] border border-white/12 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="font-mono-num text-[#E8CB72]">{b.booking_ref}</span>
                          <span aria-hidden="true">·</span>
                          <StatusLabel status={b.booking_status} />
                          <span aria-hidden="true">·</span>
                          <StatusLabel status={b.payment_status} />
                        </div>
                        <h3 className="font-display text-xl text-[#FFFFFF]">{b.event_name}</h3>
                        <p className="text-xs text-[#B9AA99]">
                          {b.hall_name} ({b.hall_location}) · {b.event_date} ·{' '}
                          {formatTime12h(b.start_time)} – {formatTime12h(b.end_time)} ·{' '}
                          {b.guest_count} guests
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        <div className="text-left lg:text-right mr-2">
                          <span className="block text-[10px] uppercase text-[#B9AA99]">
                            Paid / Total
                          </span>
                          <span className="font-mono-num text-sm text-[#FFFFFF]">
                            {formatCurrency(b.paid_amount)} / {formatCurrency(b.total_amount)}
                          </span>
                        </div>

                        <GoldButton
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBooking(b)}
                        >
                          Manage &amp; Timeline
                        </GoldButton>

                        {balance > 0 && !['CANCELLED', 'REJECTED'].includes(b.booking_status) && (
                          <GoldButton
                            size="sm"
                            disabled={payingId === b.id}
                            onClick={() => handlePayBalance(b)}
                          >
                            {payingId === b.id ? 'Processing...' : `Pay ${formatCurrency(balance)}`}
                          </GoldButton>
                        )}

                        <GoldButton
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadBookingReceiptPdf(b, relatedPayment)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </GoldButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 4. AVAILABILITY CALENDAR */}
          {tab === 'calendar' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-md w-full">
                  <label htmlFor="cal-hall-select" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                    Select Venue to Inspect
                  </label>
                  <select
                    id="cal-hall-select"
                    value={calHallId}
                    onChange={(e) => setCalHallId(e.target.value)}
                    className="w-full bg-[#21150F] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
                  >
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.location})
                      </option>
                    ))}
                  </select>
                </div>
                {calDate && (
                  <GoldButton
                    onClick={() => {
                      const hall = halls.find((h) => h.id === calHallId);
                      onOpenBookModal(hall, calDate);
                    }}
                  >
                    Reserve {calDate}
                  </GoldButton>
                )}
              </div>

              {calHallId && (
                <BookingCalendar
                  hallId={calHallId}
                  selectedDate={calDate}
                  onSelectDate={(d) => setCalDate(d)}
                />
              )}
            </div>
          )}

          {/* 5. PAYMENTS */}
          {tab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-[#21150F] border border-white/12 rounded-sm p-6">
                <h2 className="font-display text-xl text-[#FFFFFF] mb-4">Transaction History</h2>
                {payments.length === 0 ? (
                  <p className="text-xs text-[#B9AA99]">No payment transactions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/12 text-[#B9AA99] uppercase text-[10px]">
                        <tr>
                          <th className="py-3 pr-4">Date</th>
                          <th className="py-3 pr-4">Booking</th>
                          <th className="py-3 pr-4">Order / Payment ID</th>
                          <th className="py-3 pr-4">Method</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 pr-4 font-mono-num text-[#B9AA99]">
                              {p.created_at.slice(0, 10)}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-[#E8CB72] font-mono-num block">{p.booking_ref}</span>
                              <span className="text-[#B9AA99]">{p.hall_name}</span>
                            </td>
                            <td className="py-3 pr-4 font-mono-num text-[#F6EBD8]">
                              {p.razorpay_payment_id || p.razorpay_order_id}
                            </td>
                            <td className="py-3 pr-4 text-[#F6EBD8]">{p.method}</td>
                            <td className="py-3 pr-4">
                              <StatusLabel status={p.status} />
                            </td>
                            <td className="py-3 text-right font-mono-num text-[#FFFFFF]">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {refunds.length > 0 && (
                <div className="bg-[#21150F] border border-white/12 rounded-sm p-6">
                  <h2 className="font-display text-xl text-[#FFFFFF] mb-4">Processed Refunds</h2>
                  <div className="space-y-3">
                    {refunds.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 bg-[#18100C] border border-white/10 rounded-sm flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono-num text-[#E8CB72]">{r.booking_ref}</span>
                          <p className="text-[#B9AA99] mt-1">{r.reason}</p>
                        </div>
                        <span className="font-mono-num text-emerald-300 text-sm">
                          +{formatCurrency(r.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. FAVORITES */}
          {tab === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="p-12 bg-[#21150F] border border-white/12 rounded-sm text-center space-y-3">
                  <p className="text-sm text-[#B9AA99]">No favorite venues saved yet.</p>
                  <GoldButton variant="outline" onClick={() => setTab('explore')}>
                    Browse Venues
                  </GoldButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {favorites.map((h) => (
                    <VenueCard
                      key={h.id}
                      hall={h}
                      onViewDetails={onOpenHallDetails}
                      onToggleFavorite={async (id) => {
                        await onToggleFavorite(id);
                        await loadData();
                      }}
                      onBookNow={(hall) => onOpenBookModal(hall)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-[#FFFFFF]">Notifications</h2>
                {unreadCount > 0 && (
                  <GoldButton
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await apiFetch('/api/notifications/read-all', { method: 'POST' });
                      await loadData();
                    }}
                  >
                    Mark All Read
                  </GoldButton>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-[#B9AA99]">You are all caught up.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-sm border flex items-start justify-between gap-4 ${
                        n.is_read
                          ? 'bg-[#18100C] border-white/8 text-[#B9AA99]'
                          : 'bg-[#2A1C15] border-[#D6B65B]/40 text-[#FFFFFF]'
                      }`}
                    >
                      <div>
                        <span className="block text-sm font-medium">{n.title}</span>
                        <p className="text-xs text-[#B9AA99] mt-1">{n.message}</p>
                        <span className="block text-[10px] font-mono-num text-[#B9AA99]/70 mt-2">
                          {n.created_at}
                        </span>
                      </div>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' });
                            await loadData();
                          }}
                          className="text-[11px] text-[#E8CB72] hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8. MY PROFILE */}
          {tab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="max-w-xl bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="font-display text-xl text-[#FFFFFF]">Profile Settings</h2>
                  <p className="text-xs text-[#B9AA99]">{user?.email}</p>
                </div>
                <StatusLabel status={user?.email_verified ? 'VERIFIED' : 'PENDING'} />
              </div>

              {profMsg && <p className="text-xs text-[#E8CB72]">{profMsg}</p>}

              <div>
                <label className="block text-xs uppercase text-[#B9AA99] mb-1">Full Name</label>
                <input
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-[#B9AA99] mb-1">Phone Number</label>
                <input
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
                />
              </div>
              <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-[#B9AA99] mb-1">Current Password</label>
                  <input
                    type="password"
                    value={curPass}
                    onChange={(e) => setCurPass(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-sm text-[#F6EBD8]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#B9AA99] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-sm text-[#F6EBD8]"
                  />
                </div>
              </div>
              <GoldButton type="submit">Save Profile Changes</GoldButton>
            </form>
          )}

          {/* 9. HELP & SUPPORT */}
          {tab === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4">
                <h2 className="font-display text-xl text-[#FFFFFF]">Reservation Policies &amp; FAQ</h2>
                <div className="space-y-3 text-xs text-[#B9AA99] leading-relaxed">
                  <p>
                    <strong className="text-[#FFFFFF] block">Cancellation &amp; Refunds</strong>
                    30+ days prior: 90% refund. 14–29 days prior: 50% refund. Less than 14 days:
                    partial security deposit return only.
                  </p>
                  <p>
                    <strong className="text-[#FFFFFF] block">Balance Settlement</strong>
                    30% advance locks your date immediately. Remaining balance can be settled online
                    anytime before the celebration date.
                  </p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await apiFetch<{ message: string }>('/api/contact', {
                    method: 'POST',
                    body: JSON.stringify({
                      name: user?.name,
                      email: user?.email,
                      phone: user?.phone,
                      eventType: 'Member Support',
                      message: supMsg,
                    }),
                  });
                  setSupStatus(res.message);
                  setSupMsg('');
                }}
                className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4"
              >
                <h2 className="font-display text-xl text-[#FFFFFF]">Message Concierge Desk</h2>
                <textarea
                  required
                  rows={4}
                  value={supMsg}
                  onChange={(e) => setSupMsg(e.target.value)}
                  placeholder="Describe how our team can assist with your booking..."
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
                />
                {supStatus && <p className="text-xs text-[#E8CB72]">{supStatus}</p>}
                <GoldButton type="submit">Send Support Message</GoldButton>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Booking Timeline & Cancellation Modal */}
      {selectedBooking && (
        <ModalShell
          title={selectedBooking.event_name}
          subtitle={`${selectedBooking.booking_ref} · ${selectedBooking.hall_name}`}
          onClose={() => setSelectedBooking(null)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-[#21150F] p-4 rounded-sm border border-white/10">
              <div>
                <span className="text-[#B9AA99] block">Event Date &amp; Time</span>
                <span className="font-mono-num text-[#FFFFFF]">
                  {selectedBooking.event_date} ({formatTime12h(selectedBooking.start_time)} –{' '}
                  {formatTime12h(selectedBooking.end_time)})
                </span>
              </div>
              <div>
                <span className="text-[#B9AA99] block">Booking &amp; Payment Status</span>
                <div className="flex items-center gap-3 mt-0.5">
                  <StatusLabel status={selectedBooking.booking_status} />
                  <StatusLabel status={selectedBooking.payment_status} />
                </div>
              </div>
              <div>
                <span className="text-[#B9AA99] block">Total Value</span>
                <span className="font-mono-num text-[#E8CB72]">
                  {formatCurrency(selectedBooking.total_amount)}
                </span>
              </div>
              <div>
                <span className="text-[#B9AA99] block">Paid Amount</span>
                <span className="font-mono-num text-emerald-300">
                  {formatCurrency(selectedBooking.paid_amount)}
                </span>
              </div>
            </div>

            {selectedBooking.history && selectedBooking.history.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-[#D6B65B] mb-3">
                  Status Audit Timeline
                </h4>
                <div className="space-y-2.5">
                  {selectedBooking.history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-[#100B08] border border-white/10 rounded-sm text-xs flex justify-between gap-4"
                    >
                      <div>
                        <span className="text-[#FFFFFF] font-medium">
                          {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                        </span>
                        <p className="text-[#B9AA99] mt-0.5">{h.note}</p>
                      </div>
                      <span className="font-mono-num text-[11px] text-[#B9AA99] whitespace-nowrap">
                        {h.created_at.slice(0, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              {!['CANCELLED', 'REJECTED', 'COMPLETED'].includes(selectedBooking.booking_status) ? (
                <GoldButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                >
                  Cancel Reservation
                </GoldButton>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <GoldButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadBookingReceiptPdf(
                      selectedBooking,
                      payments.find((p) => p.booking_id === selectedBooking.id)
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Receipt</span>
                </GoldButton>
                <GoldButton size="sm" onClick={() => setSelectedBooking(null)}>
                  Close
                </GoldButton>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
