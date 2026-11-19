import { placeGroups } from '../data/places.js';
import { verifiedPlaces, placeTraits } from '../data/place-details.js';

export const categories = placeGroups.map(({ id, icon, name }) => ({ id, icon, name }));
const knownRegions = /Бурабай|Коргальжын|Акмолинская обл\.|Малиновка|Пригород/i;

export const places = placeGroups.flatMap(({ id: category, places: entries }, categoryIndex) =>
  entries.map((entry) => {
    const details = verifiedPlaces[entry.id] || {};
    const type = entry.type || 'place';
    const legacyLocation = entry.legacyLocation || null;
    const regional = knownRegions.test(legacyLocation || '');
    return {
      id: entry.id,
      name: entry.name,
      category,
      categoryIndex,
      type,
      description: details.description || entry.description,
      city: details.city ?? (type === 'idea' || regional ? null : 'Астана'),
      region: details.region ?? (regional ? (legacyLocation?.includes('Малиновка') ? 'Малиновка, Акмолинская область' : legacyLocation === 'Пригород' ? 'Акмолинская область' : legacyLocation) : null),
      legacyLocation,
      address: details.address || null,
      tags: placeTraits[entry.id] || [],
      durationMinutes: details.durationMinutes || null,
      price: details.price || { status: 'unknown', min: null, max: null, currency: 'KZT' },
      openingHours: details.openingHours || null,
      summerHours: details.summerHours || null,
      mapUrl: details.mapUrl || null,
      images: details.images || [],
      source: details.source || null,
      lastVerifiedAt: details.source ? '2026-11-19' : null,
      verificationStatus: details.source ? 'partial' : 'unverified'
    };
  })
);

const byId = new Map(places.map(p => [p.id, p]));
const byName = new Map(places.map(p => [p.name, p.id]));
const byLegacyKey = new Map(places.map(p => [p.categoryIndex + '|' + p.name, p.id]));
export const placeById = id => byId.get(id);
export function resolvePlaceId(value) {
  if (byId.has(value)) return value;
  const previousName = typeof value === 'string' ? value.replace(/^\d+\|/, '') : '';
  return byLegacyKey.get(value) || byName.get(previousName) || null;
}

export function safeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function mapLink(place) {
  const exact = safeHttps(place.mapUrl);
  if (exact) return exact;
  const isAstana = place.city === 'Астана' || place.type === 'idea';
  const location = place.city || place.region || (isAstana ? 'Астана' : 'Казахстан');
  const query = encodeURIComponent([place.name, location].filter(Boolean).join(', '));
  return isAstana ? 'https://2gis.kz/astana/search/' + query : 'https://www.google.com/maps/search/?api=1&query=' + query;
}

const normalize = value => String(value || '').toLowerCase().replaceAll('ё', 'е').trim();

export function hoursStatus(place, date = new Date()) {
  if (!place.openingHours) return 'unknown';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Almaty', weekday: 'short', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const part = type => parts.find(p => p.type === type).value;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const day = days.indexOf(part('weekday'));
  const time = Number(part('hour')) * 60 + Number(part('minute'));
  const month = Number(part('month'));
  const schedule = place.summerHours && month >= 6 && month <= 8 ? place.summerHours : place.openingHours;
  const intervals = d => schedule[days[d]] || [];
  const open = intervals(day).some(([from, to]) => time >= from && (to < from || time < to))
    || intervals((day + 6) % 7).some(([from, to]) => to < from && time < to);
  return open ? 'open' : 'closed';
}

export function filterPlaces(items, filters, ratings = {}, date = new Date()) {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean);
  return items.filter(place => {
    const rating = ratings[place.id];
    const category = categories[place.categoryIndex];
    const search = normalize([place.name, place.description, category?.name, place.city, place.region, place.address].join(' '));
    if (!words.every(word => search.includes(word))) return false;
    if (filters.category && filters.category !== place.category) return false;
    if (filters.type && filters.type !== place.type) return false;
    if (filters.price && filters.price !== place.price.status) return false;
    if (filters.hours && filters.hours !== hoursStatus(place, date)) return false;
    if (filters.rating === 'rated') return Boolean(rating);
    if (filters.rating === 'unrated') return !rating;
    if (filters.rating) return Boolean(rating) && rating.avg >= Number(filters.rating);
    return true;
  });
}
