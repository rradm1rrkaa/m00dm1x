import { createLocalApi } from './services/local-api.js';
import { createTheme } from './theme/theme.js';
import { avatar, byId, node, toast } from './components/ui.js';
import { icon, paintIcons } from './components/icons.js';
import { placeById } from './services/catalog.js';
import { demoSpace } from './data/demo-data.js';

paintIcons();
createTheme(createLocalApi(), byId('theme-slot'), toast).catch(error => toast(error.message));

const title = byId('wt');
const name = title.textContent;
title.setAttribute('aria-label', name);
title.replaceChildren();
let offset = 0;
for (const word of name.split(' ')) {
  if (offset) title.append(' ');
  const part = node('span', 'w');
  part.setAttribute('aria-hidden', 'true');
  for (const letter of word) {
    const item = node('span', 'lt', letter);
    item.style.animationDelay = (.1 + offset++ * .032) + 's';
    part.append(item);
  }
  title.append(part);
}

const samples = demoSpace();
const reviews = byId('demo-reviews');
for (const review of samples.reviews) {
  const profile = samples.profiles[review.authorId];
  const identity = node('div');
  identity.append(node('strong', '', profile.name), node('p', 'm', placeById(review.placeId)?.name || 'Место'));
  const header = node('header', 'review-author');
  header.append(avatar(profile), identity);
  const stars = node('div', 'review-stars');
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', 'Оценка ' + review.rating + ' из 5');
  for (let i = 0; i < 5; i++) {
    const star = icon('star');
    if (i < review.rating) star.classList.add('is-filled');
    stars.append(star);
  }
  const card = node('article', 'win demo-review');
  card.append(header, stars, node('blockquote', '', review.text));
  reviews.append(card);
}
