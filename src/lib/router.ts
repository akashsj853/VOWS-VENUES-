export type AppRoute =
  | { page: 'home' }
  | { page: 'our-story' }
  | { page: 'venues' }
  | { page: 'venue-detail'; hallId: string }
  | { page: 'gallery' }
  | { page: 'packages' }
  | { page: 'contact' }
  | { page: 'dashboard' }
  | { page: 'admin' };

export type PublicPageName =
  | 'home'
  | 'our-story'
  | 'venues'
  | 'venue-detail'
  | 'gallery'
  | 'packages'
  | 'contact';

export function normalizePathname(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0].trim();
  if (!clean || clean === '/') return '/';
  return clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

export function parseRoute(pathname: string): AppRoute {
  const normalized = normalizePathname(pathname);
  switch (normalized) {
    case '/':
      return { page: 'home' };
    case '/our-story':
      return { page: 'our-story' };
    case '/venues':
      return { page: 'venues' };
    case '/gallery':
      return { page: 'gallery' };
    case '/packages':
      return { page: 'packages' };
    case '/contact':
      return { page: 'contact' };
    case '/dashboard':
      return { page: 'dashboard' };
    case '/admin':
      return { page: 'admin' };
    default: {
      if (normalized.startsWith('/venues/')) {
        const hallId = decodeURIComponent(normalized.slice('/venues/'.length));
        if (hallId && !hallId.includes('/')) {
          return { page: 'venue-detail', hallId };
        }
      }
      return { page: 'home' };
    }
  }
}

export function routeToPath(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '/';
    case 'our-story':
      return '/our-story';
    case 'venues':
      return '/venues';
    case 'venue-detail':
      return `/venues/${encodeURIComponent(route.hallId)}`;
    case 'gallery':
      return '/gallery';
    case 'packages':
      return '/packages';
    case 'contact':
      return '/contact';
    case 'dashboard':
      return '/dashboard';
    case 'admin':
      return '/admin';
  }
}
