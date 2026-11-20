import { safeHttps } from '../services/catalog.js';

export function photoSource(src) {
  return /^assets\/images\/[a-z\d-]+\.(?:jpg|webp)$/.test(src) ? src : safeHttps(src);
}

export function showPlacePhoto(image, photo, sizes, unavailable) {
  const fallback = photoSource(photo.src);
  image.hidden = false;
  image.onerror = () => {
    if (image.hasAttribute('srcset')) {
      image.removeAttribute('srcset');
      image.src = fallback;
      return;
    }
    image.hidden = true;
    unavailable();
  };
  if (photo.variants) {
    image.sizes = sizes;
    image.srcset = photo.variants.map(([src, width]) => photoSource(src) + ' ' + width + 'w').join(', ');
  } else image.removeAttribute('srcset');
  image.src = fallback;
}
