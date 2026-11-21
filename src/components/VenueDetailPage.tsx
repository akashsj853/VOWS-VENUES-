import { useEffect, useState } from 'react';
import {
  MapPin,
  Users,
  Wind,
  Utensils,
  Car,
  Star,
  Heart,
  Check,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/bookingRules';
import type { Hall, ReviewItem } from '../types';
import { SafeImage, GoldButton } from './ui/LuxuryPrimitives';
import { BookingCalendar } from './BookingCalendar';
import { useAuth } from '../context/AuthContext';

export function VenueDetailPage({
  hallId,
  initialDate,
  onNavigateHome,
  onNavigateVenues,
  onBookVenue,
  onToggleFavorite,
  onOpenAuth,
}: {
  hallId: string;
  initialDate?: string;
  onNavigateHome: () => void;
  onNavigateVenues: () => void;
  onBookVenue: (hall: Hall, date?: string) => void;
  onToggleFavorite: (hallId: string) => void;
  onOpenAuth: () => void;
}) {
  const { user } = useAuth();
  const [hall, setHall] = useState<Hall | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');

  const loadHall = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch<{ hall: Hall; reviews: ReviewItem[] }>(`/api/halls/${hallId}`);
      setHall(data.hall);
      setReviews(data.reviews);
      setActivePhoto(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load venue details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHall();
  }, [hallId]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          hallId: hall!.id,
          rating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });
      setReviewTitle('');
      setReviewComment('');
      setShowReviewForm(false);
      setReviewMsg('Thank you. Your review has been published.');
      await loadHall();
    } catch (err: any) {
      setReviewMsg(err.message);
    }
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-[#100B08] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Breadcrumb & Back Link */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#B9AA99]">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="hover:text-[#E8CB72] uppercase tracking-[0.14em]"
            >
              Home
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-white/35" aria-hidden="true" />
            <a
              href="/venues"
              onClick={(e) => {
                e.preventDefault();
                onNavigateVenues();
              }}
              className="hover:text-[#E8CB72] uppercase tracking-[0.14em]"
            >
              Venues
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-white/35" aria-hidden="true" />
            <span className="text-[#E8CB72] uppercase tracking-[0.14em]">
              {hall ? hall.name : 'Venue Details'}
            </span>
          </nav>

          <button
            type="button"
            onClick={onNavigateVenues}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#F6EBD8] hover:text-[#E8CB72] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to All Venues</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-[#B9AA99]">Loading architectural details...</div>
        ) : errorMsg || !hall ? (
          <div className="py-20 text-center bg-[#21150F]/60 border border-white/12 rounded-sm space-y-4">
            <h1 className="font-display text-2xl text-[#FFFFFF]">Venue Not Found</h1>
            <p className="text-sm text-[#B9AA99]">
              {errorMsg || 'This venue may have been archived or moved.'}
            </p>
            <GoldButton variant="outline" onClick={onNavigateVenues}>
              Browse Available Venues
            </GoldButton>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#D6B65B]">
                  {hall.category} · {hall.location}
                </span>
                <h1 className="font-display text-3xl sm:text-5xl text-[#FFFFFF] mt-2">
                  {hall.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(hall.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#21150F] border border-white/15 rounded-sm text-xs text-[#F6EBD8] hover:border-[#D6B65B] hover:text-[#E8CB72] cursor-pointer self-start md:self-auto"
              >
                <Heart
                  className={`w-4 h-4 ${hall.is_favorite ? 'fill-[#D6B65B] text-[#D6B65B]' : ''}`}
                />
                <span>{hall.is_favorite ? 'Saved to Favorites' : 'Save Venue'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 7 Columns */}
              <div className="lg:col-span-7 space-y-8">
                <div>
                  <div className="aspect-[16/10] rounded-sm overflow-hidden border border-white/12 bg-[#100B08]">
                    <SafeImage
                      src={hall.images[activePhoto]?.url}
                      alt={hall.images[activePhoto]?.caption || hall.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {hall.images.length > 1 && (
                    <div className="mt-3 grid grid-cols-4 gap-2.5">
                      {hall.images.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActivePhoto(idx)}
                          className={`aspect-[4/3] rounded-sm overflow-hidden border transition-all cursor-pointer ${
                            idx === activePhoto
                              ? 'border-[#D6B65B] ring-1 ring-[#D6B65B]'
                              : 'border-white/15 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <SafeImage
                            src={img.url}
                            alt={img.caption}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-[#E8CB72]">
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{hall.address}</span>
                  </div>
                  <p className="text-sm sm:text-base text-[#F6EBD8]/90 leading-relaxed">
                    {hall.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-[#21150F] border border-white/10 rounded-sm">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D6B65B] mb-1">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Seating Arrangements</span>
                      </div>
                      <p className="text-xs text-[#F6EBD8]/85 leading-relaxed">
                        {hall.seating_arrangements}
                      </p>
                    </div>
                    <div className="p-4 bg-[#21150F] border border-white/10 rounded-sm">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D6B65B] mb-1">
                        <Car className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Parking &amp; Arrival</span>
                      </div>
                      <p className="text-xs text-[#F6EBD8]/85 leading-relaxed">
                        {hall.parking_info}
                      </p>
                    </div>
                    <div className="p-4 bg-[#21150F] border border-white/10 rounded-sm">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D6B65B] mb-1">
                        <Wind className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Air Conditioning</span>
                      </div>
                      <p className="text-xs text-[#F6EBD8]/85">
                        {hall.ac_available
                          ? 'Centralized silent climate control throughout hall & suites'
                          : 'Natural open-air ventilation with misting fans'}
                      </p>
                    </div>
                    <div className="p-4 bg-[#21150F] border border-white/10 rounded-sm">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D6B65B] mb-1">
                        <Utensils className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Kitchen Facilities</span>
                      </div>
                      <p className="text-xs text-[#F6EBD8]/85">
                        {hall.kitchen_available
                          ? 'Dedicated commercial prep kitchen & catering service bay'
                          : 'External plated catering staging pantry'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-xl text-[#FFFFFF] mb-3">Included Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {hall.amenities.map((am) => (
                      <div
                        key={am.id}
                        className="flex items-center gap-2 text-xs text-[#F6EBD8]/90 py-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-[#D6B65B] shrink-0" aria-hidden="true" />
                        <span>{am.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-xl text-[#FFFFFF] mb-3">
                    Live Availability Calendar
                  </h2>
                  <BookingCalendar
                    hallId={hall.id}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => setSelectedDate(d)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl text-[#FFFFFF]">
                        Verified Guest Reviews ({reviews.length})
                      </h2>
                      <p className="text-xs text-[#B9AA99]">
                        Rated {hall.rating.toFixed(1)} out of 5.0
                      </p>
                    </div>
                    <GoldButton
                      variant="outline"
                      size="sm"
                      onClick={() => (user ? setShowReviewForm(!showReviewForm) : onOpenAuth())}
                    >
                      Write a Review
                    </GoldButton>
                  </div>

                  {reviewMsg && <p className="text-xs text-[#E8CB72]">{reviewMsg}</p>}

                  {showReviewForm && (
                    <form
                      onSubmit={submitReview}
                      className="p-4 bg-[#21150F] border border-white/15 rounded-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[#B9AA99]">Rating</label>
                        <select
                          value={rating}
                          onChange={(e) => setRating(Number(e.target.value))}
                          className="bg-[#100B08] border border-white/15 rounded-sm px-2.5 py-1 text-xs text-[#F6EBD8]"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} Stars
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        required
                        placeholder="Headline (e.g., Seamless evening reception)"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm text-[#F6EBD8]"
                      />
                      <textarea
                        required
                        rows={3}
                        placeholder="Share your experience with the venue, staff, and facilities..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2 text-sm text-[#F6EBD8]"
                      />
                      <GoldButton type="submit" size="sm">
                        Publish Review
                      </GoldButton>
                    </form>
                  )}

                  {reviews.length === 0 ? (
                    <p className="text-xs text-[#B9AA99] py-4 border-t border-white/10">
                      Be the first verified host to share a review for this venue.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 bg-[#21150F]/70 border border-white/10 rounded-sm space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm text-[#FFFFFF]">{rev.title}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-mono-num text-[#E8CB72]">
                              <Star className="w-3.5 h-3.5 fill-[#D6B65B] text-[#D6B65B]" />
                              {rev.rating}.0
                            </span>
                          </div>
                          <p className="text-xs text-[#B9AA99] leading-relaxed">{rev.comment}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#B9AA99]/80">
                            <span>{rev.user_name}</span>
                            <span aria-hidden="true">·</span>
                            <span>{rev.event_type}</span>
                            {rev.is_verified && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 text-emerald-300">
                                  <ShieldCheck className="w-3 h-3" /> Verified Booking
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 5 Columns: Sticky Summary */}
              <aside className="lg:col-span-5 lg:sticky lg:top-28 bg-[#21150F] border border-[#D6B65B]/30 rounded-sm p-6 space-y-5">
                <div className="pb-4 border-b border-white/12">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#D6B65B]">
                    Venue Reservation Summary
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-mono-num text-2xl sm:text-3xl text-[#FFFFFF] font-medium">
                      {formatCurrency(hall.base_price)}
                    </span>
                    <span className="text-xs text-[#B9AA99]">6-hour base charter</span>
                  </div>
                  <p className="text-xs text-[#B9AA99] mt-1 font-mono-num">
                    Additional hours: {formatCurrency(hall.hourly_rate)} / hr
                  </p>
                </div>

                <div className="space-y-3 text-xs text-[#F6EBD8]/90">
                  <div className="flex justify-between">
                    <span className="text-[#B9AA99]">Maximum Guest Capacity</span>
                    <span className="font-mono-num">{hall.capacity} Guests</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B9AA99]">District</span>
                    <span>{hall.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B9AA99]">Selected Date</span>
                    <span className="font-mono-num text-[#E8CB72]">
                      {selectedDate || 'Pick from calendar'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B9AA99]">Booking Lock Policy</span>
                    <span>30% Advance or Full Pay</span>
                  </div>
                </div>

                <GoldButton
                  size="lg"
                  className="w-full"
                  onClick={() => onBookVenue(hall, selectedDate || undefined)}
                >
                  Proceed to Reserve Date
                </GoldButton>

                <p className="text-[11px] text-[#B9AA99] leading-relaxed text-center">
                  Double-booking protection enabled. Verified Razorpay receipts generated
                  immediately upon completion.
                </p>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
