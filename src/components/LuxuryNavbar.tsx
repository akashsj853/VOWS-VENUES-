import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { PublicPageName } from '../lib/router';
import { GoldButton } from './ui/LuxuryPrimitives';

interface LuxuryNavbarProps {
  onReserveClick: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigatePath: (path: string) => void;
  activePage: PublicPageName | 'dashboard' | 'admin';
}

export function LuxuryNavbar({
  onReserveClick,
  onOpenAuth,
  onNavigatePath,
  activePage,
}: LuxuryNavbarProps) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks: Array<{ label: string; path: string; matches: Array<LuxuryNavbarProps['activePage']> }> = [
    { label: 'Our Story', path: '/our-story', matches: ['our-story'] },
    { label: 'Venues', path: '/venues', matches: ['venues', 'venue-detail'] },
    { label: 'Gallery', path: '/gallery', matches: ['gallery'] },
    { label: 'Packages', path: '/packages', matches: ['packages'] },
    { label: 'Contact', path: '/contact', matches: ['contact'] },
  ];

  const handleNavClick = (path: string) => {
    setMobileOpen(false);
    onNavigatePath(path);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled || activePage !== 'home'
          ? 'bg-[#100B08]/95 backdrop-blur-md border-b border-white/12 py-3.5'
          : 'bg-gradient-to-b from-[#100B08]/85 via-[#100B08]/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('/');
          }}
          className="font-display text-lg sm:text-xl tracking-[0.18em] uppercase text-[#FFFFFF] whitespace-nowrap shrink-0 hover:text-[#E8CB72] transition-colors"
        >
          Vows &amp; Venues
        </a>

        {/* Zone 2: 5 Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-xs tracking-[0.16em] uppercase text-[#F6EBD8]/90"
        >
          {navLinks.map((link) => {
            const isActive = link.matches.includes(activePage);
            return (
              <a
                key={link.path}
                href={link.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.path);
                }}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b ${
                  isActive
                    ? 'text-[#E8CB72] border-[#D6B65B]'
                    : 'border-transparent hover:text-[#E8CB72] hover:border-[#D6B65B]/60'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action + Mobile Drawer Toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                type="button"
                onClick={() => handleNavClick(user.role === 'ADMIN' ? '/admin' : '/dashboard')}
                className="text-xs tracking-[0.14em] uppercase text-[#E8CB72] hover:text-[#FFFFFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {user.role === 'ADMIN' ? 'Admin Portal' : 'My Dashboard'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="text-xs tracking-[0.14em] uppercase text-[#F6EBD8]/90 hover:text-[#E8CB72] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>
            )}
            <GoldButton size="sm" onClick={onReserveClick}>
              Reserve Your Date
            </GoldButton>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 text-[#F6EBD8] hover:text-[#E8CB72] border border-white/15 rounded-sm cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#160F0B] border-b border-white/15 px-6 py-6 space-y-5">
          <nav className="flex flex-col gap-3" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const isActive = link.matches.includes(activePage);
              return (
                <a
                  key={link.path}
                  href={link.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.path);
                  }}
                  className={`text-sm tracking-[0.16em] uppercase py-2 border-b border-white/8 transition-colors ${
                    isActive
                      ? 'text-[#E8CB72] font-medium'
                      : 'text-[#F6EBD8] hover:text-[#E8CB72]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
          <div className="flex flex-col gap-3 pt-2">
            {user ? (
              <GoldButton
                variant="outline"
                onClick={() => handleNavClick(user.role === 'ADMIN' ? '/admin' : '/dashboard')}
                className="w-full"
              >
                {user.role === 'ADMIN' ? 'Open Admin Portal' : 'Open My Dashboard'}
              </GoldButton>
            ) : (
              <GoldButton
                variant="outline"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('login');
                }}
                className="w-full"
              >
                Sign In / Register
              </GoldButton>
            )}
            <GoldButton
              onClick={() => {
                setMobileOpen(false);
                onReserveClick();
              }}
              className="w-full"
            >
              Reserve Your Date
            </GoldButton>
          </div>
        </div>
      )}
    </header>
  );
}
