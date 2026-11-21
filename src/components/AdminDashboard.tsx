import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck2,
  CalendarClock,
  Users,
  CreditCard,
  Package,
  Images,
  MessageSquareQuote,
  Bell,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  Plus,
  Download,
  Trash2,
  Edit3,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/bookingRules';
import { downloadBookingReceiptPdf } from '../lib/pdfReceipt';
import type {
  Amenity,
  AvailabilityBlock,
  Booking,
  GalleryItem,
  Hall,
  NotificationItem,
  PackageItem,
  PaymentRecord,
  RefundRecord,
  ReviewItem,
  SystemSettings,
} from '../types';
import { HALL_CATEGORIES } from '../types';
import { GoldButton, ModalShell, SafeImage, StatusLabel } from './ui/LuxuryPrimitives';
import { BookingCalendar } from './BookingCalendar';

type AdminTab =
  | 'dashboard'
  | 'halls'
  | 'bookings'
  | 'availability'
  | 'users'
  | 'payments'
  | 'packages'
  | 'gallery'
  | 'reviews'
  | 'notifications'
  | 'reports'
  | 'settings'
  | 'profile';

const CHART_COLORS = ['#D6B65B', '#34D399', '#E8CB72', '#F87171', '#A8A29E'];

const IMAGE_PRESETS = [
  {
    label: 'Grand Chandelier Ballroom',
    url: '/src/assets/images/hero_grand_ballroom_1794682456794.jpg',
  },
  {
    label: 'Imperial Reception Dining',
    url: '/src/assets/images/hall_imperial_chandelier_1794682457202.jpg',
  },
  {
    label: 'Sandstone Twilight Courtyard',
    url: '/src/assets/images/hall_heritage_courtyard_1794682458461.jpg',
  },
  {
    label: 'Velvet Hearth Intimate Salon',
    url: '/src/assets/images/hall_intimate_salon_1794682457355.jpg',
  },
  {
    label: 'Executive Acoustic Auditorium',
    url: '/src/assets/images/hall_executive_summit_1794682458563.jpg',
  },
  {
    label: 'Sunlit Glass Conservatory',
    url: '/src/assets/images/story_editorial_venue_1794682459185.jpg',
  },
];

export function AdminDashboard({
  onBackToSite,
  onDataMutated,
}: {
  onBackToSite: () => void;
  onDataMutated: () => void;
}) {
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');

  // State Stores
  const [overview, setOverview] = useState<any>(null);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Filters & Modals
  const [bookingFilterStatus, setBookingFilterStatus] = useState('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [availHallId, setAvailHallId] = useState('');
  const [availDate, setAvailDate] = useState(new Date().toISOString().slice(0, 10));

  // Hall Modal
  const [hallModal, setHallModal] = useState<Partial<Hall> | null>(null);
  const [hallForm, setHallForm] = useState({
    name: '',
    category: HALL_CATEGORIES[0] as string,
    location: '',
    address: '',
    capacity: 250,
    base_price: 95000,
    hourly_rate: 8500,
    description: '',
    seating_arrangements: 'Banquet Rounds, Theatre Style',
    parking_info: 'Valet parking for 100 cars',
    ac_available: true,
    kitchen_available: true,
    featured: false,
    imageUrl: IMAGE_PRESETS[0].url,
    amenityIds: [] as string[],
  });

  // Package Edit Modal
  const [pkgEdit, setPkgEdit] = useState<PackageItem | null>(null);

  // Booking Admin Notes Modal
  const [bookingInspect, setBookingInspect] = useState<Booking | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState('');

  // Refund Modal
  const [refundModal, setRefundModal] = useState<PaymentRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');

  // Availability Block Form
  const [blkStart, setBlkStart] = useState('08:00');
  const [blkEnd, setBlkEnd] = useState('23:00');
  const [blkStatus, setBlkStatus] = useState<'MAINTENANCE' | 'UNAVAILABLE'>('MAINTENANCE');
  const [blkReason, setBlkReason] = useState('');

  // Gallery Add Form
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState('Banquet Interiors');
  const [galUrl, setGalUrl] = useState(IMAGE_PRESETS[0].url);

  // Broadcast Form
  const [bcTitle, setBcTitle] = useState('');
  const [bcMsg, setBcMsg] = useState('');

  // Profile Form
  const [profName, setProfName] = useState(user?.name || '');
  const [profPhone, setProfPhone] = useState(user?.phone || '');

  const loadAll = async () => {
    try {
      const [
        ov,
        hl,
        am,
        bk,
        us,
        py,
        pk,
        gl,
        rv,
        nt,
        av,
        lg,
        iq,
        st,
      ] = await Promise.all([
        apiFetch('/api/admin/overview'),
        apiFetch<{ halls: Hall[] }>('/api/admin/halls'),
        apiFetch<{ amenities: Amenity[] }>('/api/amenities'),
        apiFetch<{ bookings: Booking[] }>('/api/admin/bookings'),
        apiFetch<{ users: any[] }>('/api/admin/users'),
        apiFetch<{ payments: PaymentRecord[]; refunds: RefundRecord[] }>('/api/admin/payments'),
        apiFetch<{ packages: PackageItem[] }>('/api/admin/packages'),
        apiFetch<{ items: GalleryItem[] }>('/api/gallery'),
        apiFetch<{ reviews: ReviewItem[] }>('/api/admin/reviews'),
        apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
        apiFetch<{ blocks: AvailabilityBlock[] }>(
          `/api/admin/availability?month=${new Date().toISOString().slice(0, 7)}`
        ),
        apiFetch<{ logs: any[] }>('/api/admin/audit-logs'),
        apiFetch<{ inquiries: any[] }>('/api/admin/inquiries'),
        apiFetch<{ settings: SystemSettings }>('/api/admin/settings'),
      ]);
      setOverview(ov);
      setHalls(hl.halls);
      if (!availHallId && hl.halls.length > 0) setAvailHallId(hl.halls[0].id);
      setAmenities(am.amenities);
      setBookings(bk.bookings);
      setUsersList(us.users);
      setPayments(py.payments);
      setRefunds(py.refunds);
      setPackages(pk.packages);
      setGallery(gl.items);
      setReviews(rv.reviews);
      setNotifications(nt.notifications);
      setBlocks(av.blocks);
      setAuditLogs(lg.logs);
      setInquiries(iq.inquiries);
      setSettings(st.settings);
    } catch (err: any) {
      setNotice(err.message || 'Failed to load admin console data.');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateHall = () => {
    setHallForm({
      name: '',
      category: HALL_CATEGORIES[0],
      location: '',
      address: '',
      capacity: 250,
      base_price: 95000,
      hourly_rate: 8500,
      description: '',
      seating_arrangements: 'Banquet Rounds, Theatre Style',
      parking_info: 'Valet parking for 100 cars',
      ac_available: true,
      kitchen_available: true,
      featured: false,
      imageUrl: IMAGE_PRESETS[0].url,
      amenityIds: amenities.slice(0, 4).map((a) => a.id),
    });
    setHallModal({});
  };

  const openEditHall = (h: Hall) => {
    setHallForm({
      name: h.name,
      category: h.category,
      location: h.location,
      address: h.address,
      capacity: h.capacity,
      base_price: h.base_price,
      hourly_rate: h.hourly_rate,
      description: h.description,
      seating_arrangements: h.seating_arrangements,
      parking_info: h.parking_info,
      ac_available: h.ac_available,
      kitchen_available: h.kitchen_available,
      featured: h.featured,
      imageUrl: h.images?.[0]?.url || IMAGE_PRESETS[0].url,
      amenityIds: h.amenities.map((a) => a.id),
    });
    setHallModal(h);
  };

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...hallForm,
        imageUrls: [hallForm.imageUrl],
      };
      if (hallModal?.id) {
        await apiFetch(`/api/admin/halls/${hallModal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setNotice(`Updated venue "${hallForm.name}".`);
      } else {
        await apiFetch('/api/admin/halls', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice(`Created venue "${hallForm.name}".`);
      }
      setHallModal(null);
      await loadAll();
      onDataMutated();
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  const handleBookingStatus = async (bookingId: string, status: string, notes?: string) => {
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      setNotice(`Booking updated to ${status}.`);
      setBookingInspect(null);
      await loadAll();
      onDataMutated();
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Booking Ref',
      'Event Name',
      'Event Type',
      'Venue',
      'Host',
      'Event Date',
      'Status',
      'Payment Status',
      'Total Amount',
      'Paid Amount',
    ];
    const rows = bookings.map((b) => [
      b.booking_ref,
      `"${b.event_name.replace(/"/g, '""')}"`,
      b.event_type,
      `"${(b.hall_name || '').replace(/"/g, '""')}"`,
      `"${(b.user_name || '').replace(/"/g, '""')}"`,
      b.event_date,
      b.booking_status,
      b.payment_status,
      b.total_amount,
      b.paid_amount,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VowsAndVenues_Bookings_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: any; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'halls', label: 'Hall Management', icon: Building2 },
    {
      id: 'bookings',
      label: 'Booking Management',
      icon: CalendarCheck2,
      badge: overview?.kpis?.pendingBookings || undefined,
    },
    { id: 'availability', label: 'Availability', icon: CalendarClock },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'gallery', label: 'Gallery Management', icon: Images },
    { id: 'reviews', label: 'Reviews', icon: MessageSquareQuote },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Admin Profile', icon: UserCog },
  ];

  const filteredBookings = bookings
    .filter((b) => (bookingFilterStatus === 'ALL' ? true : b.booking_status === bookingFilterStatus))
    .filter((b) => {
      if (!bookingSearch.trim()) return true;
      const t = bookingSearch.toLowerCase();
      return (
        b.booking_ref.toLowerCase().includes(t) ||
        b.event_name.toLowerCase().includes(t) ||
        (b.user_name || '').toLowerCase().includes(t) ||
        (b.hall_name || '').toLowerCase().includes(t)
      );
    });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    const t = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t);
  });

  return (
    <div className="min-h-screen bg-[#100B08] text-[#F6EBD8] flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between bg-[#160F0B] border-r border-white/12 p-5">
        <div className="space-y-5">
          <div>
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 text-xs text-[#B9AA99] hover:text-[#E8CB72] cursor-pointer mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Website</span>
            </button>
            <div className="font-display text-lg tracking-[0.16em] uppercase text-[#FFFFFF]">
              Vows &amp; Venues
            </div>
            <p className="text-[11px] text-[#D6B65B] mt-0.5">Administrative Console</p>
          </div>

          <nav className="space-y-1" aria-label="Admin portal navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#D6B65B] text-[#100B08] font-semibold'
                      : 'text-[#B9AA99] hover:text-[#FFFFFF] hover:bg-[#21150F]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
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
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-rose-300 hover:bg-rose-950/30 rounded-sm cursor-pointer mt-4"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#160F0B] border-b border-white/12 px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle admin navigation"
              className="lg:hidden p-2 border border-white/15 rounded-sm"
            >
              {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="font-display text-lg sm:text-xl text-[#FFFFFF]">
                {navItems.find((i) => i.id === tab)?.label}
              </h1>
              <p className="text-xs text-[#B9AA99]">Administrator · {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GoldButton variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </GoldButton>
            <GoldButton size="sm" onClick={openCreateHall}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Hall</span>
            </GoldButton>
          </div>
        </header>

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
          </div>
        )}

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {notice && (
            <div className="p-3.5 bg-[#21150F] border border-[#D6B65B]/50 rounded-sm text-xs text-[#E8CB72] flex items-center justify-between">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} className="text-[#B9AA99] hover:text-white cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* 1. ADMIN DASHBOARD OVERVIEW */}
          {tab === 'dashboard' && overview && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', val: formatCurrency(overview.kpis.totalRevenue) },
                  { label: 'Total Bookings', val: overview.kpis.totalBookings },
                  { label: 'Pending Approvals', val: overview.kpis.pendingBookings },
                  { label: 'Confirmed Bookings', val: overview.kpis.confirmedBookings },
                  { label: 'Active Halls', val: `${overview.kpis.activeHalls} / ${overview.kpis.totalHalls}` },
                  { label: 'Registered Members', val: overview.kpis.totalUsers },
                  { label: 'Cancelled / Rejected', val: overview.kpis.cancelledBookings },
                  { label: 'Upcoming Events', val: overview.upcomingEvents.length },
                ].map((k) => (
                  <div key={k.label} className="p-5 bg-[#21150F] border border-white/12 rounded-sm">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
                      {k.label}
                    </span>
                    <span className="block font-mono-num text-xl sm:text-2xl text-[#E8CB72] mt-2">
                      {k.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-[#21150F] border border-white/12 rounded-sm p-6">
                  <h2 className="font-display text-lg text-[#FFFFFF] mb-4">
                    Monthly Revenue &amp; Booking Trends
                  </h2>
                  <div style={{ width: '100%', height: 270 }}>
                    <ResponsiveContainer width="100%" height={270}>
                      <AreaChart data={overview.monthlySeries}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#B9AA99" fontSize={11} />
                        <YAxis stroke="#B9AA99" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18100C',
                            border: '1px solid rgba(214,182,91,0.4)',
                            color: '#F6EBD8',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#D6B65B"
                          fill="rgba(214,182,91,0.22)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#21150F] border border-white/12 rounded-sm p-6">
                  <h2 className="font-display text-lg text-[#FFFFFF] mb-4">
                    Booking Status Distribution
                  </h2>
                  <div style={{ width: '100%', height: 270 }}>
                    <ResponsiveContainer width="100%" height={270}>
                      <PieChart>
                        <Pie
                          data={overview.statusDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={3}
                          isAnimationActive={false}
                        >
                          {overview.statusDistribution.map((_: any, i: number) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: '11px', color: '#F6EBD8' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18100C',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#F6EBD8',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Hall Occupancy + Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 bg-[#21150F] border border-white/12 rounded-sm p-6">
                  <h2 className="font-display text-lg text-[#FFFFFF] mb-4">Hall Revenue &amp; Occupancy</h2>
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={overview.hallOccupancy}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                        <XAxis dataKey="hall" stroke="#B9AA99" fontSize={10} tickFormatter={(v) => v.split(' ').slice(0, 2).join(' ')} />
                        <YAxis stroke="#B9AA99" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18100C',
                            border: '1px solid rgba(214,182,91,0.4)',
                            color: '#F6EBD8',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="revenue" fill="#D6B65B" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-2">
                  <h2 className="font-display text-lg text-[#FFFFFF] mb-2">Recent Activity</h2>
                  <div className="divide-y divide-white/10 text-xs">
                    {overview.recentBookings.map((rb: any) => (
                      <div
                        key={rb.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-mono-num text-[#E8CB72]">{rb.booking_ref}</span>
                          <p className="text-[#FFFFFF] mt-0.5">
                            {rb.user_name} · {rb.event_name}
                          </p>
                          <span className="text-[#B9AA99]">{rb.hall_name}</span>
                        </div>
                        <StatusLabel status={rb.booking_status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. HALL MANAGEMENT */}
          {tab === 'halls' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {halls.map((h) => (
                  <div
                    key={h.id}
                    className="bg-[#21150F] border border-white/12 rounded-sm overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-44 h-40 shrink-0 bg-[#100B08]">
                        <SafeImage
                          src={h.images?.[0]?.url}
                          alt={h.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-wider text-[#D6B65B]">
                            {h.category}
                          </span>
                          <StatusLabel status={h.is_active ? 'ACTIVE' : 'SUSPENDED'} />
                        </div>
                        <h3 className="font-display text-lg text-[#FFFFFF]">{h.name}</h3>
                        <p className="text-xs text-[#B9AA99]">
                          {h.location} · {h.capacity} guests
                        </p>
                        <p className="font-mono-num text-sm text-[#E8CB72]">
                          {formatCurrency(h.base_price)}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-[#18100C] border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GoldButton variant="outline" size="sm" onClick={() => openEditHall(h)}>
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </GoldButton>
                        <GoldButton
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await apiFetch(`/api/admin/halls/${h.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ is_active: !h.is_active }),
                            });
                            await loadAll();
                            onDataMutated();
                          }}
                        >
                          {h.is_active ? 'Deactivate' : 'Activate'}
                        </GoldButton>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/halls/${h.id}`, { method: 'DELETE' });
                          await loadAll();
                          onDataMutated();
                        }}
                        aria-label={`Delete or archive ${h.name}`}
                        className="p-2 text-rose-300 hover:bg-rose-950/40 rounded-sm cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. BOOKING MANAGEMENT */}
          {tab === 'bookings' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#21150F] border border-white/12 rounded-sm flex flex-col sm:flex-row gap-3">
                <input
                  placeholder="Search booking ref, event, host, or hall..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="flex-1 bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-xs text-[#F6EBD8]"
                />
                <select
                  value={bookingFilterStatus}
                  onChange={(e) => setBookingFilterStatus(e.target.value)}
                  className="bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-xs text-[#F6EBD8]"
                >
                  <option value="ALL">All Statuses</option>
                  {['PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="bg-[#21150F] border border-white/12 rounded-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/12 text-[#B9AA99] uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Ref</th>
                      <th className="p-4">Host &amp; Event</th>
                      <th className="p-4">Venue &amp; Date</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#2A1C15]/50">
                        <td className="p-4 font-mono-num text-[#E8CB72] whitespace-nowrap">
                          {b.booking_ref}
                        </td>
                        <td className="p-4">
                          <span className="block text-[#FFFFFF] font-medium">{b.event_name}</span>
                          <span className="text-[#B9AA99]">
                            {b.user_name} ({b.guest_count} guests)
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="block text-[#F6EBD8]">{b.hall_name}</span>
                          <span className="font-mono-num text-[#B9AA99]">
                            {b.event_date} · {b.start_time}–{b.end_time}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono-num text-[#FFFFFF] block">
                            {formatCurrency(b.paid_amount)} / {formatCurrency(b.total_amount)}
                          </span>
                          <StatusLabel status={b.payment_status} />
                        </td>
                        <td className="p-4">
                          <StatusLabel status={b.booking_status} />
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {b.booking_status === 'PENDING' && (
                              <GoldButton
                                size="sm"
                                onClick={() =>
                                  handleBookingStatus(
                                    b.id,
                                    'CONFIRMED',
                                    'Approved and confirmed by administrator.'
                                  )
                                }
                              >
                                Approve
                              </GoldButton>
                            )}
                            <GoldButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBookingInspect(b);
                                setAdminNotesInput(b.admin_notes || '');
                              }}
                            >
                              Inspect
                            </GoldButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. AVAILABILITY MANAGEMENT */}
          {tab === 'availability' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs uppercase text-[#B9AA99] mb-1.5">
                    Inspect Venue Calendar
                  </label>
                  <select
                    value={availHallId}
                    onChange={(e) => setAvailHallId(e.target.value)}
                    className="w-full bg-[#21150F] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
                  >
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                {availHallId && (
                  <BookingCalendar
                    hallId={availHallId}
                    selectedDate={availDate}
                    onSelectDate={setAvailDate}
                  />
                )}
              </div>

              <div className="lg:col-span-5 space-y-5">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/availability/blocks', {
                      method: 'POST',
                      body: JSON.stringify({
                        hallId: availHallId,
                        date: availDate,
                        startTime: blkStart,
                        endTime: blkEnd,
                        status: blkStatus,
                        reason: blkReason,
                      }),
                    });
                    setBlkReason('');
                    setNotice(`Added ${blkStatus} block on ${availDate}.`);
                    await loadAll();
                  }}
                  className="bg-[#21150F] border border-white/12 rounded-sm p-5 space-y-4"
                >
                  <h3 className="font-display text-lg text-[#FFFFFF]">
                    Schedule Maintenance / Unavailable Block
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#B9AA99] mb-1">Date</label>
                      <input
                        type="date"
                        value={availDate}
                        onChange={(e) => setAvailDate(e.target.value)}
                        className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#B9AA99] mb-1">Type</label>
                      <select
                        value={blkStatus}
                        onChange={(e) => setBlkStatus(e.target.value as any)}
                        className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs"
                      >
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="UNAVAILABLE">Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={blkStart}
                      onChange={(e) => setBlkStart(e.target.value)}
                      className="bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num"
                    />
                    <input
                      type="time"
                      value={blkEnd}
                      onChange={(e) => setBlkEnd(e.target.value)}
                      className="bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs font-mono-num"
                    />
                  </div>
                  <input
                    required
                    placeholder="Reason (e.g., Chandelier restoration)"
                    value={blkReason}
                    onChange={(e) => setBlkReason(e.target.value)}
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs"
                  />
                  <GoldButton type="submit" className="w-full">
                    Lock Slot Block
                  </GoldButton>
                </form>

                <div className="bg-[#21150F] border border-white/12 rounded-sm p-5 space-y-3">
                  <h3 className="font-display text-base text-[#FFFFFF]">Active Maintenance Blocks</h3>
                  {blocks.length === 0 ? (
                    <p className="text-xs text-[#B9AA99]">No active maintenance blocks.</p>
                  ) : (
                    blocks.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 bg-[#18100C] border border-white/10 rounded-sm flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="text-[#FFFFFF] block">{b.hall_name}</span>
                          <span className="font-mono-num text-[#B9AA99]">
                            {b.date} · {b.start_time}–{b.end_time} ({b.reason})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/availability/blocks/${b.id}`, {
                              method: 'DELETE',
                            });
                            await loadAll();
                          }}
                          className="text-rose-300 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. USER MANAGEMENT */}
          {tab === 'users' && (
            <div className="space-y-4">
              <input
                placeholder="Search members by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full max-w-md bg-[#21150F] border border-white/15 rounded-sm px-3.5 py-2 text-xs text-[#F6EBD8]"
              />
              <div className="bg-[#21150F] border border-white/12 rounded-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/12 text-[#B9AA99] uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Member</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Bookings</th>
                      <th className="p-4">Total Spend</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="p-4">
                          <span className="text-[#FFFFFF] font-medium block">{u.name}</span>
                          <span className="text-[#B9AA99]">
                            {u.email} · {u.phone}
                          </span>
                        </td>
                        <td className="p-4 font-mono-num text-[#E8CB72]">{u.role}</td>
                        <td className="p-4 font-mono-num">{u.booking_count}</td>
                        <td className="p-4 font-mono-num">{formatCurrency(u.total_spent)}</td>
                        <td className="p-4">
                          <StatusLabel status={u.status} />
                        </td>
                        <td className="p-4 text-right">
                          {u.role !== 'ADMIN' && (
                            <GoldButton
                              variant={u.status === 'ACTIVE' ? 'danger' : 'outline'}
                              size="sm"
                              onClick={async () => {
                                await apiFetch(`/api/admin/users/${u.id}/status`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({
                                    status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                  }),
                                });
                                await loadAll();
                              }}
                            >
                              {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </GoldButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PAYMENTS & REFUNDS */}
          {tab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-[#21150F] border border-white/12 rounded-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/12 text-[#B9AA99] uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Order / Payment ID</th>
                      <th className="p-4">Booking &amp; Member</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-right">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-4 font-mono-num">
                          <span className="text-[#FFFFFF] block">{p.razorpay_payment_id || 'Pending'}</span>
                          <span className="text-[#B9AA99]">{p.razorpay_order_id}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-[#E8CB72] font-mono-num block">{p.booking_ref}</span>
                          <span className="text-[#B9AA99]">{p.user_name}</span>
                        </td>
                        <td className="p-4">{p.method}</td>
                        <td className="p-4">
                          <StatusLabel status={p.status} />
                        </td>
                        <td className="p-4 text-right font-mono-num">{formatCurrency(p.amount)}</td>
                        <td className="p-4 text-right">
                          {p.status === 'VERIFIED' && (
                            <GoldButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRefundModal(p);
                                setRefundAmount(p.amount);
                                setRefundReason('Administrator refund');
                              }}
                            >
                              Refund
                            </GoldButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {refunds.length > 0 && (
                <div className="bg-[#21150F] border border-white/12 rounded-sm p-5 space-y-3">
                  <h3 className="font-display text-lg text-[#FFFFFF]">Refund Ledger</h3>
                  {refunds.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-[#18100C] border border-white/10 rounded-sm flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono-num text-[#E8CB72]">{r.booking_ref}</span>
                        <span className="text-[#B9AA99] ml-2">{r.reason}</span>
                      </div>
                      <span className="font-mono-num text-rose-300">-{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. PACKAGES */}
          {tab === 'packages' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((p) => (
                <div
                  key={p.id}
                  className="p-6 bg-[#21150F] border border-white/12 rounded-sm flex flex-col justify-between gap-4"
                >
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#D6B65B]">{p.tier}</span>
                    <h3 className="font-display text-xl text-[#FFFFFF] mt-1">{p.name}</h3>
                    <p className="font-mono-num text-2xl text-[#E8CB72] mt-2">
                      {formatCurrency(p.price)}
                    </p>
                    <p className="text-xs text-[#B9AA99] mt-2">{p.description}</p>
                  </div>
                  <GoldButton variant="outline" size="sm" onClick={() => setPkgEdit(p)}>
                    Edit Package
                  </GoldButton>
                </div>
              ))}
            </div>
          )}

          {/* 8. GALLERY MANAGEMENT */}
          {tab === 'gallery' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/gallery', {
                    method: 'POST',
                    body: JSON.stringify({ title: galTitle, category: galCategory, url: galUrl }),
                  });
                  setGalTitle('');
                  await loadAll();
                  onDataMutated();
                }}
                className="p-5 bg-[#21150F] border border-white/12 rounded-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] text-[#B9AA99] mb-1">Photo Title</label>
                  <input
                    required
                    value={galTitle}
                    onChange={(e) => setGalTitle(e.target.value)}
                    placeholder="Evening Ballroom Reception"
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#B9AA99] mb-1">Category</label>
                  <input
                    required
                    value={galCategory}
                    onChange={(e) => setGalCategory(e.target.value)}
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#B9AA99] mb-1">Select Asset</label>
                  <select
                    value={galUrl}
                    onChange={(e) => setGalUrl(e.target.value)}
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs"
                  >
                    {IMAGE_PRESETS.map((img) => (
                      <option key={img.url} value={img.url}>
                        {img.label}
                      </option>
                    ))}
                  </select>
                </div>
                <GoldButton type="submit" size="sm" className="h-[34px]">
                  Add Gallery Photo
                </GoldButton>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {gallery.map((g) => (
                  <div key={g.id} className="bg-[#21150F] border border-white/12 rounded-sm overflow-hidden">
                    <div className="aspect-[4/3]">
                      <SafeImage src={g.url} alt={g.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-[#FFFFFF]">{g.title}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/gallery/${g.id}`, { method: 'DELETE' });
                          await loadAll();
                          onDataMutated();
                        }}
                        className="text-rose-300 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. REVIEWS */}
          {tab === 'reviews' && (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-5 bg-[#21150F] border border-white/12 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#E8CB72]">
                      <span>{r.hall_name}</span>
                      <span>·</span>
                      <span>{r.rating}/5 Stars</span>
                      <span>·</span>
                      <span>{r.is_verified ? 'Verified Booking' : 'Standard'}</span>
                    </div>
                    <h3 className="font-display text-lg text-[#FFFFFF] mt-1">{r.title}</h3>
                    <p className="text-xs text-[#B9AA99] mt-1">{r.comment}</p>
                  </div>
                  <GoldButton
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await apiFetch(`/api/admin/reviews/${r.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ is_published: !r.is_published }),
                      });
                      await loadAll();
                      onDataMutated();
                    }}
                  >
                    {r.is_published ? 'Hide Review' : 'Publish Review'}
                  </GoldButton>
                </div>
              ))}
            </div>
          )}

          {/* 10. NOTIFICATIONS & INQUIRIES */}
          {tab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/notifications/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ title: bcTitle, message: bcMsg, targetUserId: 'ALL' }),
                  });
                  setBcTitle('');
                  setBcMsg('');
                  setNotice('Announcement broadcast to all members.');
                }}
                className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4"
              >
                <h3 className="font-display text-lg text-[#FFFFFF]">Broadcast Member Announcement</h3>
                <input
                  required
                  placeholder="Notification Title"
                  value={bcTitle}
                  onChange={(e) => setBcTitle(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-xs"
                />
                <textarea
                  required
                  rows={3}
                  placeholder="Announcement message..."
                  value={bcMsg}
                  onChange={(e) => setBcMsg(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2 text-xs"
                />
                <GoldButton type="submit">Send Broadcast</GoldButton>
              </form>

              <div className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-3">
                <h3 className="font-display text-lg text-[#FFFFFF]">
                  Admin Alerts &amp; Concierge Inquiries ({inquiries.length})
                </h3>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="p-3 bg-[#18100C] border border-white/10 rounded-sm text-xs">
                    <span className="text-[#E8CB72] block">{n.title}</span>
                    <p className="text-[#B9AA99] mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. REPORTS & ANALYTICS */}
          {tab === 'reports' && (
            <div className="space-y-6">
              <div className="p-6 bg-[#21150F] border border-white/12 rounded-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl text-[#FFFFFF]">Executive Reports &amp; Audit Trail</h2>
                  <p className="text-xs text-[#B9AA99]">
                    Download comprehensive booking &amp; revenue ledgers or review administrative actions.
                  </p>
                </div>
                <GoldButton onClick={handleExportCsv}>
                  <Download className="w-4 h-4" />
                  <span>Download Bookings CSV</span>
                </GoldButton>
              </div>

              <div className="bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-3">
                <h3 className="font-display text-lg text-[#FFFFFF]">Administrative Audit Log</h3>
                <div className="space-y-2 text-xs">
                  {auditLogs.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 bg-[#18100C] border border-white/10 rounded-sm flex items-center justify-between gap-4"
                    >
                      <div>
                        <span className="font-mono-num text-[#D6B65B]">{l.action}</span>
                        <span className="text-[#FFFFFF] ml-2">{l.details}</span>
                      </div>
                      <span className="font-mono-num text-[#B9AA99] whitespace-nowrap">
                        {l.admin_name} · {l.created_at.slice(0, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 12. SETTINGS */}
          {tab === 'settings' && settings && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch('/api/admin/settings', {
                  method: 'PATCH',
                  body: JSON.stringify(settings),
                });
                setNotice('System booking & policy rules updated.');
                onDataMutated();
              }}
              className="max-w-2xl bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4"
            >
              <h2 className="font-display text-xl text-[#FFFFFF]">Booking &amp; Refund Policy Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#B9AA99] mb-1">Min Advance Notice (Days)</label>
                  <input
                    type="number"
                    value={settings.min_advance_days}
                    onChange={(e) =>
                      setSettings({ ...settings, min_advance_days: Number(e.target.value) })
                    }
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-[#B9AA99] mb-1">Advance Payment (%)</label>
                  <input
                    type="number"
                    value={settings.advance_payment_percent}
                    onChange={(e) =>
                      setSettings({ ...settings, advance_payment_percent: Number(e.target.value) })
                    }
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-[#B9AA99] mb-1">Tax / GST Rate (%)</label>
                  <input
                    type="number"
                    value={settings.tax_rate_percent}
                    onChange={(e) =>
                      setSettings({ ...settings, tax_rate_percent: Number(e.target.value) })
                    }
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-[#B9AA99] mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={settings.security_deposit_amount}
                    onChange={(e) =>
                      setSettings({ ...settings, security_deposit_amount: Number(e.target.value) })
                    }
                    className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-[#F6EBD8]">
                <input
                  type="checkbox"
                  checked={settings.auto_confirm_on_payment}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_confirm_on_payment: e.target.checked })
                  }
                />
                <span>Automatically confirm reservations upon verified Razorpay payment</span>
              </label>
              <GoldButton type="submit">Save System Settings</GoldButton>
            </form>
          )}

          {/* 13. ADMIN PROFILE */}
          {tab === 'profile' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch('/api/auth/profile', {
                  method: 'PATCH',
                  body: JSON.stringify({ name: profName, phone: profPhone }),
                });
                await refreshUser();
                setNotice('Administrator profile saved.');
              }}
              className="max-w-xl bg-[#21150F] border border-white/12 rounded-sm p-6 space-y-4"
            >
              <h2 className="font-display text-xl text-[#FFFFFF]">Administrator Profile</h2>
              <p className="text-xs text-[#B9AA99]">{user?.email} · Role: ADMIN</p>
              <div>
                <label className="block text-xs text-[#B9AA99] mb-1">Name</label>
                <input
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B9AA99] mb-1">Phone</label>
                <input
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
                />
              </div>
              <GoldButton type="submit">Update Profile</GoldButton>
            </form>
          )}
        </main>
      </div>

      {/* Create / Edit Hall Modal */}
      {hallModal && (
        <ModalShell
          title={hallModal.id ? `Edit ${hallModal.name}` : 'Create New Community Hall'}
          onClose={() => setHallModal(null)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveHall} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#B9AA99] mb-1">Hall Name</label>
                <input
                  required
                  value={hallForm.name}
                  onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#B9AA99] mb-1">Category</label>
                <select
                  value={hallForm.category}
                  onChange={(e) => setHallForm({ ...hallForm, category: e.target.value })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
                >
                  {HALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#B9AA99] mb-1">City / District</label>
                <input
                  required
                  value={hallForm.location}
                  onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#B9AA99] mb-1">Full Address</label>
                <input
                  required
                  value={hallForm.address}
                  onChange={(e) => setHallForm({ ...hallForm, address: e.target.value })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[#B9AA99] mb-1">Capacity</label>
                <input
                  type="number"
                  required
                  value={hallForm.capacity}
                  onChange={(e) => setHallForm({ ...hallForm, capacity: Number(e.target.value) })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[#B9AA99] mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  required
                  value={hallForm.base_price}
                  onChange={(e) => setHallForm({ ...hallForm, base_price: Number(e.target.value) })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[#B9AA99] mb-1">Hourly Rate (₹)</label>
                <input
                  type="number"
                  required
                  value={hallForm.hourly_rate}
                  onChange={(e) => setHallForm({ ...hallForm, hourly_rate: Number(e.target.value) })}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#B9AA99] mb-1">Featured Photography</label>
              <select
                value={hallForm.imageUrl}
                onChange={(e) => setHallForm({ ...hallForm, imageUrl: e.target.value })}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
              >
                {IMAGE_PRESETS.map((p) => (
                  <option key={p.url} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#B9AA99] mb-1">Editorial Description</label>
              <textarea
                rows={3}
                value={hallForm.description}
                onChange={(e) => setHallForm({ ...hallForm, description: e.target.value })}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hallForm.ac_available}
                  onChange={(e) => setHallForm({ ...hallForm, ac_available: e.target.checked })}
                />
                <span>Climate Controlled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hallForm.kitchen_available}
                  onChange={(e) => setHallForm({ ...hallForm, kitchen_available: e.target.checked })}
                />
                <span>Catering Kitchen</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hallForm.featured}
                  onChange={(e) => setHallForm({ ...hallForm, featured: e.target.checked })}
                />
                <span>Featured on Homepage</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <GoldButton type="button" variant="outline" onClick={() => setHallModal(null)}>
                Cancel
              </GoldButton>
              <GoldButton type="submit">Save Venue</GoldButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Booking Inspection & Status Update Modal */}
      {bookingInspect && (
        <ModalShell
          title={`Booking ${bookingInspect.booking_ref}`}
          subtitle={`${bookingInspect.event_name} · ${bookingInspect.hall_name}`}
          onClose={() => setBookingInspect(null)}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#21150F] rounded-sm border border-white/10">
              <div>
                <span className="text-[#B9AA99] block">Host</span>
                <span className="text-[#FFFFFF]">{bookingInspect.user_name}</span>
                <span className="text-[#B9AA99] block">{bookingInspect.user_email}</span>
              </div>
              <div>
                <span className="text-[#B9AA99] block">Schedule</span>
                <span className="font-mono-num text-[#E8CB72]">
                  {bookingInspect.event_date} ({bookingInspect.start_time}–{bookingInspect.end_time})
                </span>
              </div>
              <div>
                <span className="text-[#B9AA99] block">Special Requirements</span>
                <span className="text-[#F6EBD8]">
                  {bookingInspect.special_requirements || 'None specified'}
                </span>
              </div>
              <div>
                <span className="text-[#B9AA99] block">Payment</span>
                <span className="font-mono-num text-[#FFFFFF]">
                  {formatCurrency(bookingInspect.paid_amount)} /{' '}
                  {formatCurrency(bookingInspect.total_amount)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[#B9AA99] mb-1">Administrative Notes</label>
              <textarea
                rows={2}
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <GoldButton
                size="sm"
                onClick={() => handleBookingStatus(bookingInspect.id, 'APPROVED', adminNotesInput)}
              >
                Approve
              </GoldButton>
              <GoldButton
                size="sm"
                onClick={() => handleBookingStatus(bookingInspect.id, 'CONFIRMED', adminNotesInput)}
              >
                Confirm
              </GoldButton>
              <GoldButton
                variant="outline"
                size="sm"
                onClick={() => handleBookingStatus(bookingInspect.id, 'COMPLETED', adminNotesInput)}
              >
                Mark Completed
              </GoldButton>
              <GoldButton
                variant="danger"
                size="sm"
                onClick={() => handleBookingStatus(bookingInspect.id, 'REJECTED', adminNotesInput)}
              >
                Reject
              </GoldButton>
              <GoldButton
                variant="ghost"
                size="sm"
                onClick={() =>
                  downloadBookingReceiptPdf(
                    bookingInspect,
                    payments.find((p) => p.booking_id === bookingInspect.id)
                  )
                }
              >
                <Download className="w-3.5 h-3.5" />
                <span>Receipt</span>
              </GoldButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Package Edit Modal */}
      {pkgEdit && (
        <ModalShell
          title={`Edit ${pkgEdit.name}`}
          onClose={() => setPkgEdit(null)}
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch(`/api/admin/packages/${pkgEdit.id}`, {
                method: 'PATCH',
                body: JSON.stringify(pkgEdit),
              });
              setPkgEdit(null);
              await loadAll();
              onDataMutated();
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-[#B9AA99] mb-1">Package Name</label>
              <input
                value={pkgEdit.name}
                onChange={(e) => setPkgEdit({ ...pkgEdit, name: e.target.value })}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[#B9AA99] mb-1">Price (₹)</label>
              <input
                type="number"
                value={pkgEdit.price}
                onChange={(e) => setPkgEdit({ ...pkgEdit, price: Number(e.target.value) })}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[#B9AA99] mb-1">Description</label>
              <textarea
                rows={3}
                value={pkgEdit.description}
                onChange={(e) => setPkgEdit({ ...pkgEdit, description: e.target.value })}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <GoldButton type="submit">Save Package</GoldButton>
          </form>
        </ModalShell>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <ModalShell
          title="Process Payment Refund"
          subtitle={`Order ${refundModal.razorpay_order_id} · Max ${formatCurrency(refundModal.amount)}`}
          onClose={() => setRefundModal(null)}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/api/admin/refunds', {
                method: 'POST',
                body: JSON.stringify({
                  paymentId: refundModal.id,
                  amount: refundAmount,
                  reason: refundReason,
                }),
              });
              setRefundModal(null);
              setNotice('Refund processed and logged.');
              await loadAll();
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-[#B9AA99] mb-1">Refund Amount (₹)</label>
              <input
                type="number"
                min={1}
                max={refundModal.amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[#B9AA99] mb-1">Refund Reason</label>
              <input
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2"
              />
            </div>
            <GoldButton type="submit" className="w-full">
              Confirm Refund
            </GoldButton>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
