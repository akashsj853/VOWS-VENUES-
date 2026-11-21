import { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { MEDIA_ASSETS } from '../lib/media';
import { GoldButton } from './ui/LuxuryPrimitives';

const HERO_SLIDES = [
  {
    image: MEDIA_ASSETS.heroBallroom,
    caption: 'The Imperial Crown Ballroom · South Mumbai',
  },
  {
    image: MEDIA_ASSETS.hallCourtyard,
    caption: 'The Saffron Courtyard · Jaipur Heritage Quarter',
  },
  {
    image: MEDIA_ASSETS.hallImperial,
    caption: 'Gilded Chandelier Dining · Evening Reception',
  },
];

export function CinematicHero({
  onReserveClick,
  onExploreClick,
}: {
  onReserveClick: () => void;
  onExploreClick: () => void;
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      id="top"
      className="relative min-h-[92vh] lg:min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#100B08]"
    >
      {/* Background Slideshow */}
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={slide.caption}
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
            idx === activeSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.caption}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-[1.03]"
          />
        </div>
      ))}

      {/* Measured Espresso Cinematic Scrim */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#100B08]/80 via-[#100B08]/55 to-[#100B08]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-radial from-transparent via-[#100B08]/30 to-[#100B08]/80"
        aria-hidden="true"
      />

      {/* Center Editorial Composition */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pt-24 pb-16 text-center flex flex-col items-center">
        {/* Quiet Unboxed Metadata Badges */}
        <div className="flex items-center gap-3 text-[11px] sm:text-xs tracking-[0.26em] uppercase text-[#E8CB72] mb-6">
          <span>Premium Venues</span>
          <span aria-hidden="true" className="text-white/40">
            ·
          </span>
          <span>Dates Available</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.25rem] font-medium leading-[1.08] text-[#FFFFFF] tracking-tight max-w-3xl">
          The perfect space for{' '}
          <span className="block font-accent italic font-normal text-[#E8CB72] mt-1 sm:mt-2">
            Your unforgettable moments.
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-base lg:text-lg text-[#F6EBD8]/85 max-w-xl leading-relaxed font-normal">
          From intimate gatherings to grand celebrations, discover beautiful spaces designed to
          bring people together.
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <GoldButton size="lg" onClick={onReserveClick}>
            Reserve Your Date
          </GoldButton>
          <GoldButton size="lg" variant="outline" onClick={onExploreClick}>
            Explore Our Venues
          </GoldButton>
        </div>
      </div>

      {/* Bottom Slider Indicators & Scroll Cue */}
      <div className="absolute bottom-8 inset-x-0 z-10 max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between text-xs text-[#B9AA99]">
        <div className="hidden sm:block tracking-[0.14em] uppercase text-[11px] text-[#F6EBD8]/75">
          {HERO_SLIDES[activeSlide].caption}
        </div>

        {/* Slider progress indicators */}
        <div className="flex items-center gap-2.5 mx-auto sm:mx-0" role="tablist" aria-label="Hero venue showcase slides">
          {HERO_SLIDES.map((s, idx) => (
            <button
              key={s.caption}
              type="button"
              role="tab"
              aria-selected={idx === activeSlide}
              aria-label={`View slide ${idx + 1}: ${s.caption}`}
              onClick={() => setActiveSlide(idx)}
              className={`h-[2px] transition-all duration-300 cursor-pointer ${
                idx === activeSlide ? 'w-10 bg-[#D6B65B]' : 'w-5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        <a
          href="#venue-discovery"
          className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#F6EBD8]/80 hover:text-[#E8CB72] transition-colors"
        >
          <span>Scroll</span>
          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
