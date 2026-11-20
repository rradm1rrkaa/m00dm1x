import { safeHttps } from '../services/catalog.js';
import { icon } from '../components/icons.js';
import { button, externalLink, node } from '../components/ui.js';
import { photoSource, showPlacePhoto } from '../components/place-photo.js';

function iconButton(glyph, label, handler, className = '') {
  const control = button('', handler, 'gallery-control icon-button ' + className);
  control.setAttribute('aria-label', label);
  control.append(icon(glyph));
  return control;
}

export function placeGallery(place, placeholder) {
  const gallery = node('figure', 'place-gallery');
  const photos = place.images.filter(photo => photoSource(photo.src));
  if (!photos.length) {
    gallery.append(placeholder, node('figcaption', 'm', 'Фотографии пока недоступны'));
    return gallery;
  }

  let index = 0;
  const lightbox = node('dialog', 'gallery-lightbox');
  const heading = node('h2', 'visually-hidden', 'Фотографии · ' + place.name);
  heading.id = 'gallery-heading';
  lightbox.setAttribute('aria-labelledby', heading.id);
  const close = iconButton('close', 'Закрыть просмотр', () => lightbox.close(), 'gallery-close');
  function open() {
    fullscreen.paint();
    lightbox.showModal();
    document.documentElement.classList.add('lock');
    close.focus();
  }

  function move(offset) {
    index = (index + offset + photos.length) % photos.length;
    preview.paint(true);
    if (lightbox.open) fullscreen.paint(true);
  }

  function frame(isFullscreen) {
    const wrap = node('div', 'gallery-frame');
    const image = node('img');
    image.draggable = false;
    const unavailable = node('p', 'gallery-image-status', 'Не удалось загрузить фотографию');
    unavailable.setAttribute('role', 'status');
    unavailable.hidden = true;
    const stage = node('div', 'gallery-stage');
    const count = node('span', 'gallery-count');
    count.setAttribute('role', 'status');
    const caption = node('div', 'gallery-credit');
    wrap.append(image, unavailable, count);
    if (photos.length > 1) wrap.append(
      iconButton('left', 'Предыдущее фото', () => move(-1), 'gallery-prev'),
      iconButton('chevron', 'Следующее фото', () => move(1), 'gallery-next')
    );
    const opener = isFullscreen ? null : iconButton('expand', 'Открыть полноэкранный просмотр', open, 'gallery-expand');
    if (opener) wrap.append(opener);
    stage.append(wrap, caption);

    let touch;
    wrap.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || event.target.closest('button') || !event.isPrimary) return;
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
      wrap.setPointerCapture(event.pointerId);
    });
    wrap.addEventListener('pointercancel', () => { touch = null; });
    wrap.addEventListener('pointerup', event => {
      if (touch?.id !== event.pointerId) return;
      const x = event.clientX - touch.x;
      const y = event.clientY - touch.y;
      touch = null;
      if (photos.length > 1 && Math.abs(x) > 42 && Math.abs(x) > Math.abs(y) * 1.5) move(x < 0 ? 1 : -1);
    });
    stage.addEventListener('keydown', event => {
      if (photos.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    });

    function paint(animate = false) {
      const photo = photos[index];
      image.alt = photo.alt || place.name;
      unavailable.hidden = true;
      showPlacePhoto(image, photo, isFullscreen ? '(max-width: 730px) 95vw, 1240px' : '(max-width: 730px) 94vw, 600px', () => {
        unavailable.hidden = false;
      });
      count.textContent = 'Фото ' + (index + 1) + ' из ' + photos.length;
      count.hidden = photos.length === 1;
      caption.replaceChildren(node('span', '', image.alt));
      if (safeHttps(photo.source)) caption.append(externalLink(photo.author || 'Источник фото', safeHttps(photo.source)));
      if (safeHttps(photo.licenseUrl)) caption.append(externalLink(photo.license || 'Лицензия', safeHttps(photo.licenseUrl)));
      if (photo.variants) caption.append(node('span', '', 'WebP, уменьшено'));
      if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) image.animate([{ opacity: .62 }, { opacity: 1 }], 210);
    }
    return { stage, opener, paint };
  }

  const preview = frame(false);
  const fullscreen = frame(true);
  lightbox.append(heading, close, fullscreen.stage);
  lightbox.addEventListener('keydown', event => {
    if (event.target !== close || photos.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  lightbox.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('lock');
    if (preview.opener.isConnected) preview.opener.focus({ preventScroll: true });
  });
  gallery.append(preview.stage, lightbox);
  preview.paint();
  return gallery;
}
