import { useState } from 'react';
import {
  Check,
  Mail,
  Phone,
  MapPin,
  Star,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import type { GalleryItem, Hall, PackageItem, ReviewItem } from '../types';
import { HALL_CATEGORIES, EVENT_TYPES } from '../types';
import { formatCurrency } from '../lib/bookingRules';
import { MEDIA_ASSETS } from '../lib/media';
import { apiFetch } from '../lib/api';
import { GoldButton, SafeImage, SectionHeading, ModalShell } from './ui/LuxuryPrimitives';
import { VenueCard } from './VenueCard';

export function FeaturedHallsSection({
  halls,
  loading,
  activeCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  onClearFilters,
  onViewDetails,
  onToggleFavorite,
  onBookNow,
  previewOnly = false,
  onViewAllClick,
}: {
  halls: Hall[];
  loading: boolean;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
  onViewDetails: (hall: Hall) => void;
  onToggleFavorite: (hallId: string) => void;
  onBookNow: (hall: Hall) => void;
  previewOnly?: boolean;
  onViewAllClick?: () => void;
}) {
  const displayedHalls = previewOnly ? halls.slice(0, 4) : halls;

  return (
    <section id="venues" className="py-20 sm:py-24 bg-[#100B08]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <SectionHeading
            eyebrow="Curated Collection"
            title="Featured Community"
            accent="Halls & Estates"
            subtitle="From cathedral-ceiling grand ballrooms to intimate candlelit salons and acoustic conference auditoriums."
          />

          {!previewOnly ? (
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="sort-venues" className="sr-only">
                Sort venues
              </label>
              <select
                id="sort-venues"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-[#21150F] border border-white/15 rounded-sm px-3.5 py-2 text-xs text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              >
                <option value="featured">Featured Order</option>
                <option value="rating">Highest Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          ) : (
            onViewAllClick && (
              <GoldButton variant="outline" onClick={onViewAllClick}>
                View All Venues →
              </GoldButton>
            )
          )}
        </div>

        {/* Interactive Category Filter Tabs */}
        {!previewOnly && (
          <div
            className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-white/10"
            role="tablist"
            aria-label="Venue categories"
          >
            {['All', ...HALL_CATEGORIES].map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-4 py-2 text-xs tracking-[0.1em] uppercase rounded-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#D6B65B] text-[#100B08] font-semibold'
                      : 'bg-[#21150F] text-[#B9AA99] hover:text-[#F6EBD8] border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-[440px] bg-[#21150F]/60 border border-white/10 rounded-sm animate-pulse"
              />
            ))}
          </div>
        ) : displayedHalls.length === 0 ? (
          <div className="py-16 text-center bg-[#21150F]/50 border border-white/12 rounded-sm space-y-4">
            <p className="font-display text-xl text-[#FFFFFF]">
              No venues match those exact criteria.
            </p>
            <p className="text-sm text-[#B9AA99]">
              Try adjusting your capacity, date, or budget filters to see available halls.
            </p>
            <GoldButton variant="outline" onClick={onClearFilters}>
              Reset All Filters
            </GoldButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayedHalls.map((hall) => (
              <VenueCard
                key={hall.id}
                hall={hall}
                onViewDetails={onViewDetails}
                onToggleFavorite={onToggleFavorite}
                onBookNow={onBookNow}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function OurStorySection({ onReserveClick }: { onReserveClick: () => void }) {
  return (
    <section id="our-story" className="py-20 sm:py-28 bg-[#18100C] border-y border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        <div className="lg:col-span-6 relative min-h-[360px] rounded-sm overflow-hidden border border-white/12">
          <SafeImage
            src={MEDIA_ASSETS.storyConservatory}
            alt="Sunlit architectural glass conservatory at Vows & Venues"
            className="w-full h-full lg:h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#100B08]/60 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 py-2">
          <SectionHeading
            eyebrow="Our Story"
            title="Spaces That Bring"
            accent="People Together."
          />
          <p className="text-sm sm:text-base text-[#F6EBD8]/85 leading-relaxed">
            Vows &amp; Venues was founded on a simple conviction: every milestone—whether a
            three-day wedding celebration, a milestone birthday, a civic cultural festival, or an
            executive leadership summit—deserves architectural beauty and effortless hospitality.
          </p>
          <p className="text-sm sm:text-base text-[#B9AA99] leading-relaxed">
            For years, reserving a community hall meant opaque pricing, paper ledgers, and endless
            site visits. We united heritage architectural venues with real-time slot verification,
            transparent package pricing, and instant digital receipts so families and organizers
            can focus on what truly matters—their guests.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/12">
            <div>
              <span className="font-mono-num text-2xl sm:text-3xl text-[#E8CB72] block">650+</span>
              <span className="text-xs text-[#B9AA99]">Peak Guest Capacity</span>
            </div>
            <div>
              <span className="font-mono-num text-2xl sm:text-3xl text-[#E8CB72] block">100%</span>
              <span className="text-xs text-[#B9AA99]">Slot Lock Guarantee</span>
            </div>
            <div>
              <span className="font-mono-num text-2xl sm:text-3xl text-[#E8CB72] block">4.9★</span>
              <span className="text-xs text-[#B9AA99]">Verified Host Rating</span>
            </div>
          </div>
          <div className="pt-2">
            <GoldButton onClick={onReserveClick}>Begin Your Reservation</GoldButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExploreSpacesSection({
  onSelectCategory,
}: {
  onSelectCategory: (cat: string) => void;
}) {
  const spaceSummaries: Record<string, string> = {
    'Grand Banquet Halls': 'Double-height chandelier ballrooms for 300–650 guests',
    'Wedding Venues': 'Ceremonial arches, bridal suites, and sacred mandap layouts',
    'Community Spaces': 'Welcoming civic halls for cultural festivals and family milestones',
    'Conference Halls': 'Tiered acoustic auditoriums for seminars and leadership summits',
    'Outdoor Celebration Spaces': 'Lantern-lit sandstone courtyards under twilight skies',
    'Intimate Event Spaces': 'Mahogany dining salons crafted for 40–90 cherished guests',
  };

  return (
    <section className="py-20 sm:py-24 bg-[#100B08]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading
          eyebrow="Explore Our Spaces"
          title="Designed for Every"
          accent="Occasion & Gathering"
          subtitle="Select a venue typology to explore halls tailored to your celebration scale and acoustic needs."
        />

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {HALL_CATEGORIES.map((cat, idx) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="text-left p-6 bg-[#21150F]/70 border border-white/12 rounded-sm hover:border-[#D6B65B]/60 transition-all group cursor-pointer flex flex-col justify-between gap-4"
            >
              <div>
                <span className="font-mono-num text-xs text-[#D6B65B]">
                  0{idx + 1}.
                </span>
                <h3 className="font-display text-xl text-[#FFFFFF] mt-2 group-hover:text-[#E8CB72] transition-colors">
                  {cat}
                </h3>
                <p className="text-xs sm:text-sm text-[#B9AA99] mt-2 leading-relaxed">
                  {spaceSummaries[cat]}
                </p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#E8CB72]">
                Browse Spaces →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GallerySection({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState('All');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];
  const visible = filter === 'All' ? items : items.filter((i) => i.category === filter);

  return (
    <section id="gallery" className="py-20 sm:py-24 bg-[#18100C] border-y border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <SectionHeading
            eyebrow="Editorial Gallery"
            title="Atmosphere, Light &"
            accent="Architectural Detail"
          />
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-3.5 py-1.5 text-[11px] tracking-[0.12em] uppercase rounded-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  filter === cat
                    ? 'bg-[#D6B65B] text-[#100B08] font-semibold'
                    : 'bg-[#21150F] text-[#B9AA99] hover:text-[#F6EBD8] border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Masonry-style Columns */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {visible.map((item) => (
            <figure
              key={item.id}
              className="break-inside-avoid group relative overflow-hidden rounded-sm border border-white/12 bg-[#100B08]"
            >
              <button
                type="button"
                onClick={() => setLightboxItem(item)}
                aria-label={`Inspect ${item.title}`}
                className="block w-full text-left cursor-pointer"
              >
                <SafeImage
                  src={item.url}
                  alt={item.title}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <figcaption className="p-4 bg-[#21150F]/90 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="font-display text-sm text-[#FFFFFF] group-hover:text-[#E8CB72] transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#D6B65B] whitespace-nowrap">
                    {item.category}
                  </span>
                </figcaption>
              </button>
            </figure>
          ))}
        </div>
      </div>

      {lightboxItem && (
        <ModalShell
          title={lightboxItem.title}
          subtitle={lightboxItem.category}
          onClose={() => setLightboxItem(null)}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="rounded-sm overflow-hidden border border-white/12 bg-[#100B08]">
              <SafeImage
                src={lightboxItem.url}
                alt={lightboxItem.title}
                className="w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
          </div>
        </ModalShell>
      )}
    </section>
  );
}

export function PackagesSection({
  packages,
  onSelectPackage,
}: {
  packages: PackageItem[];
  onSelectPackage: (pkg: PackageItem) => void;
}) {
  return (
    <section id="packages" className="py-20 sm:py-24 bg-[#100B08]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading
          eyebrow="Celebration Packages"
          title="Curated Hospitality"
          accent="Experiences"
          subtitle="Pair any community hall with a transparent hospitality tier. Every package can be tailored during your reservation."
          align="center"
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-7">
          {packages.map((pkg, idx) => {
            const isSignature = idx === 1;
            return (
              <div
                key={pkg.id}
                className={`p-7 rounded-sm border flex flex-col justify-between gap-6 ${
                  isSignature
                    ? 'bg-[#2A1C15] border-[#D6B65B]/55 gold-glow'
                    : 'bg-[#21150F]/75 border-white/14'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#D6B65B] uppercase tracking-[0.16em]">
                    <span>{pkg.tier}</span>
                    {isSignature && <span>Most Selected</span>}
                  </div>
                  <h3 className="font-display text-2xl text-[#FFFFFF] mt-3">{pkg.name}</h3>
                  <p className="text-xs text-[#B9AA99] mt-1">{pkg.subtitle}</p>
                  <div className="mt-5 pb-5 border-b border-white/12">
                    <span className="font-mono-num text-3xl text-[#E8CB72] font-medium">
                      {formatCurrency(pkg.price)}
                    </span>
                    <span className="text-xs text-[#B9AA99] ml-2">package add-on</span>
                  </div>
                  <p className="mt-4 text-xs sm:text-sm text-[#F6EBD8]/85 leading-relaxed">
                    {pkg.description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {pkg.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-[#F6EBD8]/90">
                        <Check className="w-3.5 h-3.5 text-[#D6B65B] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <GoldButton
                  variant={isSignature ? 'gold' : 'outline'}
                  className="w-full"
                  onClick={() => onSelectPackage(pkg)}
                >
                  Reserve With {pkg.name}
                </GoldButton>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      num: '01.',
      title: 'Discover your venue',
      body: 'Browse curated banquet halls, outdoor courtyards, intimate salons, and conference auditoriums by guest capacity and district.',
    },
    {
      num: '02.',
      title: 'Check availability',
      body: 'Inspect real-time slot calendars showing open dates, pending requests, confirmed events, and scheduled maintenance.',
    },
    {
      num: '03.',
      title: 'Reserve your date',
      body: 'Select your event category, time slot, and celebration package with transparent GST and security deposit calculations.',
    },
    {
      num: '04.',
      title: 'Confirm your booking',
      body: 'Complete advance or full payment via verified Razorpay checkout and download your official PDF reservation receipt.',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-[#18100C] border-y border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading
          eyebrow="How It Works"
          title="Four Steps From"
          accent="Discovery to Celebration"
        />
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className="p-6 bg-[#21150F]/70 border border-white/12 rounded-sm space-y-3"
            >
              <span className="font-mono-num text-lg text-[#D6B65B] block">{s.num}</span>
              <h3 className="font-display text-xl text-[#FFFFFF]">{s.title}</h3>
              <p className="text-xs sm:text-sm text-[#B9AA99] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <section className="py-20 sm:py-24 bg-[#100B08]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading
          eyebrow="Verified Guest Voices"
          title="Reflections From"
          accent="Completed Celebrations"
          subtitle="Every review is linked to a completed reservation hosted across our partner community venues."
        />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.slice(0, 4).map((rev) => (
            <article
              key={rev.id}
              className="p-7 bg-[#21150F]/75 border border-white/12 rounded-sm flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#D6B65B]">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                  {rev.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Verified Booking</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-lg sm:text-xl text-[#FFFFFF]">{rev.title}</h3>
                <p className="text-sm text-[#F6EBD8]/85 leading-relaxed">“{rev.comment}”</p>
              </div>
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-[#B9AA99]">
                <span className="text-[#F6EBD8] font-medium">{rev.user_name}</span>
                <span aria-hidden="true">·</span>
                <span>{rev.event_type}</span>
                {rev.hall_name && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#E8CB72]">{rev.hall_name}</span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [message, setMessage] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, eventType, message }),
      });
      setStatusMsg(res.message);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setStatusMsg(err.message || 'Unable to send inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 sm:py-24 bg-[#18100C] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <SectionHeading
            eyebrow="Private Concierge"
            title="Plan a Private Tour"
            accent="or Inquiry"
            subtitle="Speak with our venue hospitality team for multi-day wedding buyouts, corporate contracts, or custom cultural arrangements."
          />

          <div className="space-y-4 text-sm text-[#F6EBD8]/90 pt-2">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#D6B65B] mt-1 shrink-0" aria-hidden="true" />
              <div>
                <span className="block text-xs text-[#B9AA99]">Concierge Email</span>
                <a href="mailto:concierge@vowsandvenues.com" className="hover:text-[#E8CB72]">
                  concierge@vowsandvenues.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#D6B65B] mt-1 shrink-0" aria-hidden="true" />
              <div>
                <span className="block text-xs text-[#B9AA99]">Direct Line</span>
                <span className="font-mono-num">+91 22 4890 7700</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#D6B65B] mt-1 shrink-0" aria-hidden="true" />
              <div>
                <span className="block text-xs text-[#B9AA99]">Flagship Office</span>
                <span>14 Heritage Marine Promenade, Ballard Estate, Mumbai 400001</span>
              </div>
            </div>
          </div>

          {/* Embedded Interactive District Map Card */}
          <div className="overflow-hidden rounded-sm border border-white/14 bg-[#21150F]">
            <iframe
              title="Vows and Venues Flagship Location Map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=72.8300%2C18.9280%2C72.8480%2C18.9420&layer=mapnik"
              className="w-full h-48 border-0 opacity-85 grayscale contrast-125"
              loading="lazy"
            />
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-[#21150F] border border-white/14 rounded-sm p-6 sm:p-8 space-y-5"
          >
            <h3 className="font-display text-2xl text-[#FFFFFF]">Send a Venue Inquiry</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                  Full Name
                </label>
                <input
                  id="contact-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Mehta"
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav@example.com"
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-phone" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                  Phone Number
                </label>
                <input
                  id="contact-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 11223"
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact-event" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                  Celebration Type
                </label>
                <select
                  id="contact-event"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
                >
                  {EVENT_TYPES.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Event Notes &amp; Preferred Dates
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your anticipated guest count, preferred hall, or tour availability..."
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>

            {statusMsg && (
              <p className="text-sm text-[#E8CB72]" role="status">
                {statusMsg}
              </p>
            )}

            <GoldButton type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Sending Inquiry...' : 'Submit Concierge Inquiry'}
            </GoldButton>
          </form>
        </div>
      </div>
    </section>
  );
}

export function Footer({
  onSelectCategory,
  onNavigatePath,
}: {
  onSelectCategory: (cat: string) => void;
  onNavigatePath: (path: string) => void;
}) {
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const footerLinks = [
    { label: 'Home', path: '/' },
    { label: 'Our Story', path: '/our-story' },
    { label: 'Venues', path: '/venues' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Packages', path: '/packages' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <footer className="bg-[#0B0705] border-t border-white/12 py-14 text-xs text-[#B9AA99]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-center gap-2 text-[#FFFFFF] font-display text-lg tracking-[0.18em] uppercase">
            <Building2 className="w-4 h-4 text-[#D6B65B]" aria-hidden="true" />
            <span>Vows &amp; Venues</span>
          </div>
          <p className="text-xs text-[#B9AA99] leading-relaxed max-w-xs">
            Every Celebration Deserves a Beautiful Space. Architectural banquet halls, heritage
            courtyards, and community gathering venues.
          </p>
        </div>

        <div className="md:col-span-2 space-y-2.5">
          <h4 className="text-[11px] uppercase tracking-[0.16em] text-[#E8CB72]">Pages</h4>
          <ul className="space-y-2">
            {footerLinks.map((lnk) => (
              <li key={lnk.path}>
                <a
                  href={lnk.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePath(lnk.path);
                  }}
                  className="hover:text-[#FFFFFF]"
                >
                  {lnk.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3 space-y-2.5">
          <h4 className="text-[11px] uppercase tracking-[0.16em] text-[#E8CB72]">Venue Spaces</h4>
          <ul className="space-y-2">
            {HALL_CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className="hover:text-[#FFFFFF] text-left cursor-pointer"
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3 space-y-2.5">
          <h4 className="text-[11px] uppercase tracking-[0.16em] text-[#E8CB72]">Concierge</h4>
          <p>concierge@vowsandvenues.com</p>
          <p className="font-mono-num">+91 22 4890 7700</p>
          <p>Ballard Estate, South Mumbai</p>
          <div className="pt-2 flex items-center gap-4 text-[#F6EBD8]">
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/contact');
              }}
              className="hover:text-[#E8CB72]"
            >
              Instagram
            </a>
            <a
              href="/gallery"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/gallery');
              }}
              className="hover:text-[#E8CB72]"
            >
              Pinterest
            </a>
            <a
              href="/our-story"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/our-story');
              }}
              className="hover:text-[#E8CB72]"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} Vows &amp; Venues Hospitality. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setLegalDoc('terms')}
            className="hover:text-[#FFFFFF] cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <button
            type="button"
            onClick={() => setLegalDoc('privacy')}
            className="hover:text-[#FFFFFF] cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {legalDoc && (
        <ModalShell
          title={legalDoc === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
          onClose={() => setLegalDoc(null)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm text-[#B9AA99] leading-relaxed">
            {legalDoc === 'terms' ? (
              <>
                <p>
                  All venue reservations are locked against overlapping time slots upon submission
                  and verified payment. Advance bookings require at least 1 day notice.
                </p>
                <p>
                  Cancellations made 30+ days prior to the event date qualify for a 90% refund of
                  paid amounts. Cancellations 14–29 days prior receive a 50% refund. Security
                  deposits are reconciled after post-event venue inspection.
                </p>
              </>
            ) : (
              <>
                <p>
                  Vows &amp; Venues stores guest contact details, event schedules, and verified
                  payment transaction references strictly to administer venue reservations and
                  generate official tax receipts.
                </p>
                <p>
                  Online payment verification signatures are validated server-side and never shared
                  with third parties.
                </p>
              </>
            )}
          </div>
        </ModalShell>
      )}
    </footer>
  );
}
