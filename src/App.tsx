import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import { DEFAULT_SETTINGS } from './lib/bookingRules';
import { MEDIA_ASSETS } from './lib/media';
import { parseRoute, type AppRoute } from './lib/router';
import type { GalleryItem, Hall, PackageItem, ReviewItem, SystemSettings } from './types';
import { LuxuryNavbar } from './components/LuxuryNavbar';
import { PageBanner } from './components/PageBanner';
import { CinematicHero } from './components/CinematicHero';
import { VenueSearchBar, type VenueSearchFilters } from './components/VenueSearchBar';
import {
  FeaturedHallsSection,
  OurStorySection,
  ExploreSpacesSection,
  GallerySection,
  PackagesSection,
  HowItWorksSection,
  TestimonialsSection,
  ContactSection,
  Footer,
} from './components/LandingSections';
import { VenueDetailPage } from './components/VenueDetailPage';
import { VenueDetailsModal } from './components/VenueDetailsModal';
import { BookingFlowModal } from './components/BookingFlowModal';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { GoldButton } from './components/ui/LuxuryPrimitives';

function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseRoute(window.location.pathname) : { page: 'home' }
  );

  // Public Catalog Data
  const [halls, setHalls] = useState<Hall[]>([]);
  const [allHalls, setAllHalls] = useState<Hall[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [hallsLoading, setHallsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<VenueSearchFilters>({
    location: '',
    eventDate: '',
    minCapacity: '',
    eventType: '',
    maxBudget: '',
    category: 'All',
    sort: 'featured',
  });

  // Modals (used inside portals & quick reserve triggers)
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [detailHallId, setDetailHallId] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<{
    hallId?: string;
    packageId?: string;
    date?: string;
  } | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const navigateTo = (path: string, replace = false) => {
    const nextRoute = parseRoute(path);
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState(null, '', path);
      } else {
        window.history.pushState(null, '', path);
      }
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const titles: Record<AppRoute['page'], string> = {
      home: 'Vows & Venues — Luxury Community Hall Booking & Management',
      'our-story': 'Our Story — Vows & Venues',
      venues: 'Venues & Estates — Vows & Venues',
      'venue-detail': 'Venue Details — Vows & Venues',
      gallery: 'Editorial Gallery — Vows & Venues',
      packages: 'Celebration Packages — Vows & Venues',
      contact: 'Concierge & Contact — Vows & Venues',
      dashboard: 'Member Dashboard — Vows & Venues',
      admin: 'Admin Portal — Vows & Venues',
    };
    document.title = titles[route.page];
  }, [route.page]);

  const loadFilteredHalls = async (activeFilters: VenueSearchFilters) => {
    setHallsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (activeFilters.location) qs.set('location', activeFilters.location);
      if (activeFilters.eventDate) qs.set('eventDate', activeFilters.eventDate);
      if (activeFilters.minCapacity) qs.set('minCapacity', activeFilters.minCapacity);
      if (activeFilters.maxBudget) qs.set('maxBudget', activeFilters.maxBudget);
      if (activeFilters.category && activeFilters.category !== 'All') {
        qs.set('category', activeFilters.category);
      }
      if (activeFilters.sort) qs.set('sort', activeFilters.sort);

      const res = await apiFetch<{ halls: Hall[] }>(`/api/halls?${qs.toString()}`);
      setHalls(res.halls);
    } finally {
      setHallsLoading(false);
    }
  };

  const loadInitialCatalog = async () => {
    try {
      const [hRes, pRes, gRes, rRes, sRes] = await Promise.all([
        apiFetch<{ halls: Hall[] }>('/api/halls'),
        apiFetch<{ packages: PackageItem[] }>('/api/packages'),
        apiFetch<{ items: GalleryItem[] }>('/api/gallery'),
        apiFetch<{ reviews: ReviewItem[] }>('/api/reviews'),
        apiFetch<{ settings: SystemSettings }>('/api/settings/public'),
      ]);
      setAllHalls(hRes.halls);
      setHalls(hRes.halls);
      setPackages(pRes.packages);
      setGallery(gRes.items);
      setReviews(rRes.reviews);
      setSettings(sRes.settings);
    } finally {
      setHallsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialCatalog();
  }, [user?.id, refreshSignal]);

  const handleToggleFavorite = async (hallId: string) => {
    if (!user) {
      setAuthModal('login');
      return;
    }
    await apiFetch(`/api/favorites/${hallId}`, { method: 'POST' });
    await loadFilteredHalls(filters);
  };

  const handleCategoryPick = (cat: string) => {
    const next = { ...filters, category: cat };
    setFilters(next);
    loadFilteredHalls(next);
    navigateTo('/venues');
  };

  // Member Dashboard Route
  if (route.page === 'dashboard') {
    if (!authLoading && !user) {
      return (
        <div className="min-h-screen bg-[#100B08] text-[#F6EBD8] flex flex-col">
          <LuxuryNavbar
            onReserveClick={() => setBookingModal({})}
            onOpenAuth={(mode = 'login') => setAuthModal(mode)}
            onNavigatePath={navigateTo}
            activePage="dashboard"
          />
          <main className="flex-1 flex items-center justify-center px-6 pt-28 pb-16">
            <div className="max-w-md w-full bg-[#21150F] border border-white/15 rounded-sm p-8 text-center space-y-5">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#D6B65B] block">
                Member Portal
              </span>
              <h1 className="font-display text-2xl text-[#FFFFFF]">
                Sign In to Access Your Dashboard
              </h1>
              <p className="text-sm text-[#B9AA99]">
                View your active hall reservations, official receipts, and saved venues.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <GoldButton onClick={() => setAuthModal('login')}>Sign In</GoldButton>
                <GoldButton variant="outline" onClick={() => navigateTo('/')}>
                  Return Home
                </GoldButton>
              </div>
            </div>
          </main>
          {authModal && (
            <AuthModal
              initialMode={authModal}
              onClose={() => setAuthModal(null)}
              onSuccess={(role) => navigateTo(role === 'ADMIN' ? '/admin' : '/dashboard')}
            />
          )}
        </div>
      );
    }

    if (user) {
      return (
        <>
          <UserDashboard
            halls={allHalls}
            onBackToSite={() => navigateTo('/')}
            onOpenBookModal={(hall, date) => setBookingModal({ hallId: hall?.id, date })}
            onOpenHallDetails={(hall) => setDetailHallId(hall.id)}
            onToggleFavorite={handleToggleFavorite}
            refreshSignal={refreshSignal}
          />
          {detailHallId && (
            <VenueDetailsModal
              hallId={detailHallId}
              onClose={() => setDetailHallId(null)}
              onBookVenue={(hall, date) => {
                setDetailHallId(null);
                setBookingModal({ hallId: hall.id, date });
              }}
              onToggleFavorite={handleToggleFavorite}
              onOpenAuth={() => setAuthModal('login')}
            />
          )}
          {bookingModal && (
            <BookingFlowModal
              halls={allHalls}
              packages={packages}
              settings={settings}
              initialHallId={bookingModal.hallId}
              initialPackageId={bookingModal.packageId}
              initialDate={bookingModal.date}
              onClose={() => setBookingModal(null)}
              onOpenAuth={() => setAuthModal('login')}
              onBookingComplete={() => setRefreshSignal((s) => s + 1)}
            />
          )}
        </>
      );
    }
  }

  // Admin Portal Route
  if (route.page === 'admin') {
    if (!authLoading && user?.role !== 'ADMIN') {
      return (
        <div className="min-h-screen bg-[#100B08] text-[#F6EBD8] flex flex-col">
          <LuxuryNavbar
            onReserveClick={() => setBookingModal({})}
            onOpenAuth={(mode = 'login') => setAuthModal(mode)}
            onNavigatePath={navigateTo}
            activePage="admin"
          />
          <main className="flex-1 flex items-center justify-center px-6 pt-28 pb-16">
            <div className="max-w-md w-full bg-[#21150F] border border-white/15 rounded-sm p-8 text-center space-y-5">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#D6B65B] block">
                Administrative Access
              </span>
              <h1 className="font-display text-2xl text-[#FFFFFF]">
                Administrator Sign-In Required
              </h1>
              <p className="text-sm text-[#B9AA99]">
                Sign in with an administrator account to manage venues, reservations, and billing.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <GoldButton onClick={() => setAuthModal('login')}>Admin Sign In</GoldButton>
                <GoldButton variant="outline" onClick={() => navigateTo('/')}>
                  Return Home
                </GoldButton>
              </div>
            </div>
          </main>
          {authModal && (
            <AuthModal
              initialMode={authModal}
              onClose={() => setAuthModal(null)}
              onSuccess={(role) => navigateTo(role === 'ADMIN' ? '/admin' : '/dashboard')}
            />
          )}
        </div>
      );
    }

    if (user?.role === 'ADMIN') {
      return (
        <AdminDashboard
          onBackToSite={() => navigateTo('/')}
          onDataMutated={() => setRefreshSignal((s) => s + 1)}
        />
      );
    }
  }

  const activePublicPage = route.page === 'dashboard' || route.page === 'admin' ? 'home' : route.page;

  return (
    <div className="min-h-screen bg-[#100B08] text-[#F6EBD8] flex flex-col">
      <LuxuryNavbar
        onReserveClick={() => setBookingModal({})}
        onOpenAuth={(mode = 'login') => setAuthModal(mode)}
        onNavigatePath={navigateTo}
        activePage={activePublicPage}
      />

      <main className="flex-1">
        {/* HOME PAGE */}
        {route.page === 'home' && (
          <>
            <CinematicHero
              onReserveClick={() => setBookingModal({})}
              onExploreClick={() => navigateTo('/venues')}
            />

            <VenueSearchBar
              filters={filters}
              onChange={setFilters}
              onSearch={() => {
                loadFilteredHalls(filters);
                navigateTo('/venues');
              }}
            />

            <FeaturedHallsSection
              halls={allHalls}
              loading={hallsLoading}
              activeCategory="All"
              onSelectCategory={handleCategoryPick}
              sortBy="featured"
              onSortChange={() => {}}
              onClearFilters={() => {}}
              onViewDetails={(hall) => navigateTo(`/venues/${hall.id}`)}
              onToggleFavorite={handleToggleFavorite}
              onBookNow={(hall) =>
                setBookingModal({ hallId: hall.id, date: filters.eventDate || undefined })
              }
              previewOnly
              onViewAllClick={() => navigateTo('/venues')}
            />

            <ExploreSpacesSection onSelectCategory={handleCategoryPick} />

            <HowItWorksSection />

            <TestimonialsSection reviews={reviews} />
          </>
        )}

        {/* OUR STORY PAGE */}
        {route.page === 'our-story' && (
          <>
            <PageBanner
              eyebrow="Heritage & Hospitality"
              title="Our"
              accent="Story"
              subtitle="Why we unite architectural heritage venues with real-time digital slot precision for families and civic communities."
              image={MEDIA_ASSETS.storyConservatory}
              imageAlt="Architectural sunlit conservatory at Vows & Venues"
              breadcrumbLabel="Our Story"
              onNavigateHome={() => navigateTo('/')}
            />
            <OurStorySection onReserveClick={() => setBookingModal({})} />
            <HowItWorksSection />
            <TestimonialsSection reviews={reviews} />
          </>
        )}

        {/* VENUES PAGE */}
        {route.page === 'venues' && (
          <>
            <PageBanner
              eyebrow="Curated Portfolio"
              title="Community Halls &"
              accent="Architectural Estates"
              subtitle="Filter by district, guest capacity, event date, and budget to check live hall availability across every typology."
              image={MEDIA_ASSETS.hallImperial}
              imageAlt="Grand chandelier banquet dining interior"
              breadcrumbLabel="Venues"
              onNavigateHome={() => navigateTo('/')}
            />
            <VenueSearchBar
              filters={filters}
              onChange={setFilters}
              onSearch={() => loadFilteredHalls(filters)}
            />
            <FeaturedHallsSection
              halls={halls}
              loading={hallsLoading}
              activeCategory={filters.category}
              onSelectCategory={(cat) => {
                const next = { ...filters, category: cat };
                setFilters(next);
                loadFilteredHalls(next);
              }}
              sortBy={filters.sort}
              onSortChange={(sort) => {
                const next = { ...filters, sort };
                setFilters(next);
                loadFilteredHalls(next);
              }}
              onClearFilters={() => {
                const reset: VenueSearchFilters = {
                  location: '',
                  eventDate: '',
                  minCapacity: '',
                  eventType: '',
                  maxBudget: '',
                  category: 'All',
                  sort: 'featured',
                };
                setFilters(reset);
                loadFilteredHalls(reset);
              }}
              onViewDetails={(hall) => navigateTo(`/venues/${hall.id}`)}
              onToggleFavorite={handleToggleFavorite}
              onBookNow={(hall) =>
                setBookingModal({ hallId: hall.id, date: filters.eventDate || undefined })
              }
            />
            <ExploreSpacesSection
              onSelectCategory={(cat) => {
                const next = { ...filters, category: cat };
                setFilters(next);
                loadFilteredHalls(next);
                window.scrollTo({ top: 320, behavior: 'smooth' });
              }}
            />
          </>
        )}

        {/* VENUE DETAIL PAGE */}
        {route.page === 'venue-detail' && (
          <VenueDetailPage
            hallId={route.hallId}
            initialDate={filters.eventDate || undefined}
            onNavigateHome={() => navigateTo('/')}
            onNavigateVenues={() => navigateTo('/venues')}
            onBookVenue={(hall, date) => setBookingModal({ hallId: hall.id, date })}
            onToggleFavorite={handleToggleFavorite}
            onOpenAuth={() => setAuthModal('login')}
          />
        )}

        {/* GALLERY PAGE */}
        {route.page === 'gallery' && (
          <>
            <PageBanner
              eyebrow="Editorial Archive"
              title="Atmosphere, Light &"
              accent="Celebrations"
              subtitle="Explore architectural ballrooms, floral stage designs, chandelier dining settings, and twilight courtyard gatherings."
              image={MEDIA_ASSETS.galleryStage}
              imageAlt="Wedding floral stage setting"
              breadcrumbLabel="Gallery"
              onNavigateHome={() => navigateTo('/')}
            />
            <GallerySection items={gallery} />
            <section className="py-16 bg-[#100B08] text-center px-5">
              <div className="max-w-xl mx-auto space-y-4">
                <h2 className="font-display text-2xl sm:text-3xl text-[#FFFFFF]">
                  Envision Your Celebration Here
                </h2>
                <p className="text-sm text-[#B9AA99]">
                  Explore live hall availability or reserve your preferred date with instant lock
                  protection.
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-2">
                  <GoldButton onClick={() => setBookingModal({})}>Reserve Your Date</GoldButton>
                  <GoldButton variant="outline" onClick={() => navigateTo('/venues')}>
                    Browse Venues
                  </GoldButton>
                </div>
              </div>
            </section>
          </>
        )}

        {/* PACKAGES PAGE */}
        {route.page === 'packages' && (
          <>
            <PageBanner
              eyebrow="Hospitality Tiers"
              title="Curated Celebration"
              accent="Packages"
              subtitle="Transparent hospitality add-ons crafted for weddings, community milestones, cultural programmes, and executive summits."
              image={MEDIA_ASSETS.galleryDining}
              imageAlt="Candlelit dining table arrangement"
              breadcrumbLabel="Packages"
              onNavigateHome={() => navigateTo('/')}
            />
            <PackagesSection
              packages={packages}
              onSelectPackage={(pkg) => setBookingModal({ packageId: pkg.id })}
            />
            <HowItWorksSection />
          </>
        )}

        {/* CONTACT PAGE */}
        {route.page === 'contact' && (
          <>
            <PageBanner
              eyebrow="Private Concierge"
              title="Inquiries &"
              accent="Private Venue Tours"
              subtitle="Connect with our hospitality specialists to schedule a walkthrough, multi-day buyout, or custom arrangement."
              image={MEDIA_ASSETS.hallCourtyard}
              imageAlt="Heritage sandstone courtyard evening lights"
              breadcrumbLabel="Contact"
              onNavigateHome={() => navigateTo('/')}
            />
            <ContactSection />
          </>
        )}
      </main>

      <Footer onSelectCategory={handleCategoryPick} onNavigatePath={navigateTo} />

      {/* Modals */}
      {detailHallId && (
        <VenueDetailsModal
          hallId={detailHallId}
          initialDate={filters.eventDate || undefined}
          onClose={() => setDetailHallId(null)}
          onBookVenue={(hall, date) => {
            setDetailHallId(null);
            setBookingModal({ hallId: hall.id, date });
          }}
          onToggleFavorite={handleToggleFavorite}
          onOpenAuth={() => setAuthModal('login')}
        />
      )}

      {bookingModal && (
        <BookingFlowModal
          halls={allHalls}
          packages={packages}
          settings={settings}
          initialHallId={bookingModal.hallId}
          initialPackageId={bookingModal.packageId}
          initialDate={bookingModal.date}
          onClose={() => setBookingModal(null)}
          onOpenAuth={() => setAuthModal('login')}
          onBookingComplete={() => setRefreshSignal((s) => s + 1)}
        />
      )}

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={(role) => {
            if (!bookingModal) {
              navigateTo(role === 'ADMIN' ? '/admin' : '/dashboard');
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
