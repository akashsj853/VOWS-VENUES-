import { ChevronRight } from 'lucide-react';
import { SafeImage } from './ui/LuxuryPrimitives';

export function PageBanner({
  eyebrow,
  title,
  accent,
  subtitle,
  image,
  imageAlt,
  breadcrumbLabel,
  onNavigateHome,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  breadcrumbLabel: string;
  onNavigateHome: () => void;
}) {
  return (
    <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 overflow-hidden bg-[#100B08] border-b border-white/12">
      <div className="absolute inset-0">
        <SafeImage
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover object-center opacity-35"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#100B08]/85 via-[#100B08]/75 to-[#100B08]"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#B9AA99] mb-5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="hover:text-[#E8CB72] transition-colors uppercase tracking-[0.14em]"
          >
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-white/35" aria-hidden="true" />
          <span className="text-[#E8CB72] uppercase tracking-[0.14em]">{breadcrumbLabel}</span>
        </nav>

        <div className="max-w-3xl space-y-4">
          <span className="block text-[11px] font-medium tracking-[0.22em] uppercase text-[#D6B65B]">
            {eyebrow}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] text-[#FFFFFF] font-medium">
            {title}{' '}
            {accent && (
              <span className="font-accent italic font-normal text-[#E8CB72]">{accent}</span>
            )}
          </h1>
          <p className="text-sm sm:text-base text-[#F6EBD8]/85 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
