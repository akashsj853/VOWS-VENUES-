import { Heart, Star, ArrowUpRight } from 'lucide-react';
import type { Hall } from '../types';
import { formatCurrency } from '../lib/bookingRules';
import { SafeImage, GoldButton } from './ui/LuxuryPrimitives';

export function VenueCard({
  hall,
  onViewDetails,
  onToggleFavorite,
  onBookNow,
}: {
  hall: Hall;
  onViewDetails: (hall: Hall) => void;
  onToggleFavorite?: (hallId: string) => void;
  onBookNow?: (hall: Hall) => void;
}) {
  const cover = hall.images?.[0]?.url;

  return (
    <article className="group bg-[#2A1C15]/70 border border-white/14 rounded-sm overflow-hidden flex flex-col transition-colors duration-200 hover:border-[#D6B65B]/45">
      {/* Large Photography */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#18100C]">
        <SafeImage
          src={cover}
          alt={hall.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#100B08]/85 via-transparent to-[#100B08]/25 pointer-events-none"
          aria-hidden="true"
        />

        {/* Optional Favorite Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(hall.id);
            }}
            aria-label={hall.is_favorite ? `Remove ${hall.name} from favorites` : `Save ${hall.name} to favorites`}
            className={`absolute top-3.5 right-3.5 p-2.5 rounded-sm border transition-colors cursor-pointer ${
              hall.is_favorite
                ? 'bg-[#D6B65B] border-[#D6B65B] text-[#100B08]'
                : 'bg-[#100B08]/75 border-white/20 text-[#F6EBD8] hover:border-[#D6B65B]'
            }`}
          >
            <Heart className={`w-4 h-4 ${hall.is_favorite ? 'fill-current' : ''}`} />
          </button>
        )}

        <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-xs text-[#F6EBD8]">
          <span className="tracking-[0.12em] uppercase text-[11px] text-[#E8CB72]">
            {hall.category}
          </span>
          <span className="inline-flex items-center gap-1 font-mono-num">
            <Star className="w-3.5 h-3.5 text-[#D6B65B] fill-[#D6B65B]" aria-hidden="true" />
            <span>{hall.rating.toFixed(1)}</span>
          </span>
        </div>
      </div>

      {/* Editorial Body */}
      <div className="p-6 flex flex-col flex-1 justify-between gap-5">
        <div>
          <h3 className="font-display text-xl sm:text-2xl text-[#FFFFFF] font-medium leading-snug">
            {hall.name}
          </h3>

          {/* Quiet Unboxed Metadata (Zero-Pill Rule) */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#B9AA99]">
            <span>{hall.location}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Up to {hall.capacity} Guests</span>
            {hall.ac_available && (
              <>
                <span aria-hidden="true">·</span>
                <span>Climate Controlled</span>
              </>
            )}
          </div>

          <p className="mt-3 text-sm text-[#B9AA99] line-clamp-2 leading-relaxed">
            {hall.description}
          </p>

          {/* Compact Amenities Line */}
          {hall.amenities?.length > 0 && (
            <p className="mt-3 text-xs text-[#F6EBD8]/75 truncate">
              {hall.amenities
                .slice(0, 3)
                .map((a) => a.name)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-white/12 flex items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-[#B9AA99]">
              Starting From
            </span>
            <span className="font-mono-num text-lg text-[#E8CB72] font-medium">
              {formatCurrency(hall.base_price)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <GoldButton variant="outline" size="sm" onClick={() => onViewDetails(hall)}>
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </GoldButton>
            {onBookNow && (
              <GoldButton size="sm" onClick={() => onBookNow(hall)}>
                Book
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
