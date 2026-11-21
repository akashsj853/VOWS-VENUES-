import heroBallroom from '../assets/images/hero_grand_ballroom_1794682456794.jpg';
import hallImperial from '../assets/images/hall_imperial_chandelier_1794682457202.jpg';
import hallCourtyard from '../assets/images/hall_heritage_courtyard_1794682458461.jpg';
import hallSalon from '../assets/images/hall_intimate_salon_1794682457355.jpg';
import hallSummit from '../assets/images/hall_executive_summit_1794682458563.jpg';
import storyConservatory from '../assets/images/story_editorial_venue_1794682459185.jpg';
import galleryStage from '../assets/images/gallery_stage_floral_1794682459051.jpg';
import galleryDining from '../assets/images/gallery_dining_table_1794682459273.jpg';

export const MEDIA_ASSETS = {
  heroBallroom,
  hallImperial,
  hallCourtyard,
  hallSalon,
  hallSummit,
  storyConservatory,
  galleryStage,
  galleryDining,
};

const ASSET_MAP: Record<string, string> = {
  '/src/assets/images/hero_grand_ballroom_1794682456794.jpg': heroBallroom,
  '/src/assets/images/hall_imperial_chandelier_1794682457202.jpg': hallImperial,
  '/src/assets/images/hall_heritage_courtyard_1794682458461.jpg': hallCourtyard,
  '/src/assets/images/hall_intimate_salon_1794682457355.jpg': hallSalon,
  '/src/assets/images/hall_executive_summit_1794682458563.jpg': hallSummit,
  '/src/assets/images/story_editorial_venue_1794682459185.jpg': storyConservatory,
  '/src/assets/images/gallery_stage_floral_1794682459051.jpg': galleryStage,
  '/src/assets/images/gallery_dining_table_1794682459273.jpg': galleryDining,
};

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return hallImperial;
  if (ASSET_MAP[url]) return ASSET_MAP[url];
  return url;
}
