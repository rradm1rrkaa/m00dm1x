import { createLocalApi } from './services/local-api.js';
import { createTheme } from './theme/theme.js';
import { avatar, byId, node, toast } from './components/ui.js';
import { paintIcons, ratingStars } from './components/icons.js';
import { placeById, placeHref } from './services/catalog.js';
import { demoSpace } from './data/demo-data.js';

paintIcons();
const api = createLocalApi();
const previews = document.querySelectorAll('[data-choose-theme]');
createTheme(api, byId('theme-slot'), toast, {
  previews,
  readMood: async () => (await api.session()).profile.moods.at(-1)?.theme
}).catch(error => toast(error.message));

function placeImage(photo) {
  const image = node('img');
  image.src = photo.src;
  image.alt = photo.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  return image;
}

const places = byId('landing-places');
for (const [id, note] of [['mm-001', 'Прогулка среди зелени'], ['mm-170', 'Город с высоты']]) {
  const place = placeById(id);
  const photo = place.images[0];
  const figure = node('figure', 'place-window');
  const caption = node('figcaption');
  const credit = node('a', '', photo.author + ' · ' + photo.license);
  credit.href = photo.source;
  credit.target = '_blank';
  credit.rel = 'noopener noreferrer';
  const name = node('h3');
  const open = node('a', 'place-window-title', place.name);
  open.href = placeHref(place.id);
  name.append(open);
  caption.append(node('span', '', note), name, credit);
  figure.append(placeImage(photo), caption);
  places.append(figure);
}

const samples = demoSpace();
const reviews = byId('demo-reviews');
const titles = { 'mm-001': 'Тихий час в саду', 'mm-170': 'Город перед закатом' };
for (const review of samples.reviews) {
  const place = placeById(review.placeId);
  const profile = samples.profiles[review.authorId];
  const photo = place.images[0];
  const cover = node('a', 'review-cover');
  cover.href = photo.source;
  cover.target = '_blank';
  cover.rel = 'noopener noreferrer';
  cover.title = photo.author + ' · ' + photo.license;
  cover.append(placeImage(photo), node('span', '', place.name));
  const author = node('div', 'review-author');
  author.append(avatar(profile, 'sm'), node('strong', '', profile.name));
  const copy = node('div', 'review-copy');
  copy.append(node('h3', '', titles[place.id]), ratingStars(review.rating), node('blockquote', '', review.text), author);
  const card = node('article', 'demo-review');
  card.append(cover, copy);
  reviews.append(card);
}
