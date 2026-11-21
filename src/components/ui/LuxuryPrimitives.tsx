import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { resolveMediaUrl } from '../../lib/media';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function GoldButton({
  variant = 'gold',
  size = 'md',
  className = '',
  children,
  ...rest
}: GoldButtonProps) {
  const sizeCls =
    size === 'sm'
      ? 'px-4 py-2 text-xs'
      : size === 'lg'
        ? 'px-7 py-3.5 text-sm'
        : 'px-5 py-2.5 text-xs';

  const variantCls =
    variant === 'gold'
      ? 'bg-[#D6B65B] text-[#100B08] hover:bg-[#E8CB72] font-semibold shadow-sm'
      : variant === 'outline'
        ? 'border border-[#D6B65B]/50 text-[#F6EBD8] hover:border-[#E8CB72] hover:text-[#E8CB72] bg-transparent'
        : variant === 'danger'
          ? 'border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 bg-transparent'
          : 'text-[#B9AA99] hover:text-[#F6EBD8] bg-transparent';

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-sm tracking-[0.12em] uppercase transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B65B] ${sizeCls} ${variantCls} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  accent,
  subtitle,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  const alignCls = align === 'center' ? 'text-center mx-auto items-center' : 'text-left items-start';
  return (
    <div className={`flex flex-col gap-3 max-w-2xl ${alignCls}`}>
      {eyebrow && (
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#D6B65B]">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] leading-[1.15] text-[#FFFFFF] font-medium">
        {title}{' '}
        {accent && (
          <span className="font-accent italic font-normal text-[#E8CB72]">{accent}</span>
        )}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-[#B9AA99] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function SafeImage({
  src,
  alt,
  className = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const resolved = resolveMediaUrl(src);

  if (errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2A1C15] via-[#21150F] to-[#100B08] text-[#B9AA99] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sparkles className="w-7 h-7 text-[#D6B65B]/60 mb-2" aria-hidden="true" />
        <span className="font-display text-sm text-[#F6EBD8]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

export function StatusLabel({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (['CONFIRMED', 'COMPLETED', 'PAID', 'VERIFIED', 'ACTIVE', 'PROCESSED'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{normalized}</span>
      </span>
    );
  }
  if (['PENDING', 'APPROVED', 'PARTIAL', 'CREATED'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E8CB72]">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{normalized}</span>
      </span>
    );
  }
  if (['CANCELLED', 'REJECTED', 'FAILED', 'SUSPENDED'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{normalized}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B9AA99]">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
}

export function ModalShell({
  title,
  subtitle,
  onClose,
  maxWidth = 'max-w-3xl',
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`relative w-full ${maxWidth} bg-[#18100C] border border-white/15 rounded-sm shadow-2xl my-auto max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/12 shrink-0">
          <div>
            <h3 className="font-display text-xl sm:text-2xl text-[#FFFFFF]">{title}</h3>
            {subtitle && <p className="text-xs sm:text-sm text-[#B9AA99] mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="p-2 text-[#B9AA99] hover:text-[#FFFFFF] border border-white/10 rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
