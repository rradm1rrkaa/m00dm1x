import { hoursForVisit, mapLink, safeHttps, weekdays } from '../services/catalog.js';
import { icon } from '../components/icons.js';
import { externalLink, node } from '../components/ui.js';

const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const clock = time => String(Math.floor(time / 60)).padStart(2, '0') + ':' + String(time % 60).padStart(2, '0');
const intervals = slots => slots ? slots.map(([from, to]) => clock(from) + '–' + clock(to)).join(', ') || 'Закрыто' : 'Уточните расписание';
const dateLabel = date => new Intl.DateTimeFormat('ru-KZ', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date));
const money = amount => new Intl.NumberFormat('ru-KZ').format(amount) + ' ₸';

export function placeLink(label, url) {
  const link = externalLink(label, url);
  link.classList.add('place-link');
  link.append(icon('external'));
  return link;
}

function hoursContent(place) {
  const hours = hoursForVisit(place);
  const wrap = node('div', 'visit-hours');
  const source = safeHttps(hours?.sourceUrl || place.website || place.source);
  if (hours) {
    wrap.append(node('strong', '', 'Сегодня · ' + intervals(hours.today)));
    const details = node('details');
    const week = node('dl', 'visit-week');
    weekdays.forEach((day, i) => {
      week.append(node('dt', '', dayNames[i]), node('dd', '', intervals(hours.weekly[day] ?? null)));
    });
    for (const [date, slots] of Object.entries(hours.exceptions)) {
      if (new Date(date).getTime() + 86400000 < Date.now()) continue;
      week.append(node('dt', '', dateLabel(date)), node('dd', '', intervals(slots)));
    }
    details.append(node('summary', '', 'График на неделю'), week);
    if (hours.summer) details.append(node('p', 'm', 'Летом · ' + intervals(hours.summer.Mon) + '. С сентября по май · ' + intervals(place.schedule.weekly.Mon) + '.'));
    wrap.append(details, node('small', 'm', 'Проверено ' + dateLabel(hours.verifiedAt) + ' · время Астаны'));
  } else wrap.append(node('p', 'm', source ? 'Уточните время работы на официальном сайте.' : 'Подтверждённого графика пока нет.'));
  if (source) wrap.append(placeLink('Проверить расписание', source));
  return wrap;
}

function priceText(price) {
  if (price.status === 'free') return 'Бесплатно';
  if (price.status !== 'paid') return null;
  if (Number.isFinite(price.min) && Number.isFinite(price.max) && price.min !== price.max) return money(price.min) + ' — ' + money(price.max);
  if (Number.isFinite(price.min)) return price.min === price.max ? money(price.min) : 'От ' + money(price.min);
  if (Number.isFinite(price.max)) return 'До ' + money(price.max);
  return 'Стоимость зависит от билета';
}

export function placeFacts(place) {
  const aside = node('aside', 'place-practical');
  aside.append(node('h2', '', 'Практическая информация'));
  const facts = node('dl', 'visit-facts');
  function fact(label, value) {
    if (!value) return;
    const row = node('div');
    const description = node('dd');
    description.append(value);
    row.append(node('dt', '', label), description);
    facts.append(row);
  }
  fact('Адрес', place.address || place.city || place.region);
  if (place.type === 'place') {
    fact('Часы работы', hoursContent(place));
    fact('Стоимость', priceText(place.price) || 'Цена пока не подтверждена');
    if (place.durationMinutes) fact('На посещение', 'Ориентир MoodMix · ' + place.durationMinutes + ' мин');
  }
  if (place.contact && /^\+?[\d ()-]+$/.test(place.contact)) {
    const phone = node('a', 'place-link', place.contact);
    phone.href = 'tel:' + place.contact.replace(/[^\d+]/g, '');
    fact('Телефон', phone);
  }
  aside.append(facts);
  const links = node('div', 'visit-links');
  links.append(placeLink(place.mapUrl ? 'Посмотреть на карте' : 'Поиск на карте', mapLink(place)));
  if (safeHttps(place.website)) links.append(placeLink('Официальный сайт', safeHttps(place.website)));
  if (safeHttps(place.source) && place.source !== place.website) links.append(placeLink('Больше информации', safeHttps(place.source)));
  aside.append(links);
  return aside;
}

export function placeGuide(place) {
  const section = node('section', 'place-section place-guide');
  section.append(node('h2', '', 'О месте'));
  if (!place.guide) {
    if (place.description) section.append(node('p', '', place.description));
    if (place.type === 'place') section.append(node('p', 'm', 'Подробный путеводитель по этому месту пока готовится.'));
    return section;
  }

  section.append(node('p', '', place.guide.intro));
  if (place.guide.activities?.length) {
    const list = node('ul');
    for (const activity of place.guide.activities) list.append(node('li', '', activity));
    section.append(node('h3', '', 'Что можно делать'), list);
  }
  if (place.guide.tip) section.append(node('h3', '', 'Совет для визита'), node('p', 'm', place.guide.tip));
  return section;
}

export function placeFacilities(place) {
  const section = node('section', 'place-section place-facilities');
  section.append(node('h2', '', 'Что здесь находится'));
  if (!place.facilities.length) {
    section.append(node('p', 'm', 'Подтверждённых сведений об объектах внутри пока нет.'));
    return section;
  }
  const items = node('ul');
  for (const facility of place.facilities) {
    const row = node('li');
    const description = node('div');
    description.append(node('strong', '', facility.name), node('p', 'm', facility.description));
    row.append(node('span', 'facility-category', facility.category), description);
    const url = safeHttps(facility.website || facility.sourceUrl);
    if (url) {
      const link = placeLink('Подробнее', url);
      link.setAttribute('aria-label', 'Подробнее · ' + facility.name);
      row.append(link);
    }
    items.append(row);
  }
  section.append(items);
  const checked = place.facilities.find(item => item.verifiedAt)?.verifiedAt;
  if (checked) section.append(node('small', 'm', 'Проверено ' + dateLabel(checked)));
  return section;
}

export function placeSources(place) {
  const sources = place.sources.filter(item => safeHttps(item.url));
  if (!sources.length && !place.source) return null;
  const section = node('section', 'place-section place-sources');
  section.append(node('h2', '', 'Полезные ссылки'));
  if (sources.length) for (const source of sources) {
    const row = node('div', 'source-row');
    row.append(placeLink(source.label, safeHttps(source.url)));
    if (source.verifiedAt) row.append(node('small', 'm', 'Проверено ' + dateLabel(source.verifiedAt)));
    section.append(row);
  } else if (safeHttps(place.source)) section.append(placeLink('Больше о месте', safeHttps(place.source)));
  return section;
}
