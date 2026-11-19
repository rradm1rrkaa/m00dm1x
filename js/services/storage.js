import { emptySpace, demoSpace, newProfile } from '../data/demo-data.js';
import { resolvePlaceId } from './catalog.js';

export const STORAGE_KEY = 'moodmix_showcase';
const VERSION = 1;
const themes = new Set(['auto', 'dark', 'light', 'sad', 'fun']);
const legacyKeys = ['astana_db', 'astana_session', 'moodmix_guest', 'moodmix_px', 'moodmix_theme', 'moodmix_sad', 'moodmix_sad_off'];
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = value => Array.isArray(value) ? value : [];
const text = (value, limit = 1000) => typeof value === 'string' ? value.slice(0, limit) : '';
const time = value => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
const unique = values => [...new Set(values)];
export const avatarSource = value => typeof value === 'string' && value.length <= 150000 &&
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;

function parse(store, key) {
  try { return JSON.parse(store.getItem(key)); } catch { return null; }
}

function normalizeMood(value) {
  const mood = record(value);
  const categories = list(mood.categories || mood.cats).map(category => typeof category === 'number'
    ? ['quiet', 'nightlife', 'walks', 'shopping', 'water', 'spa', 'outdoors', 'food', 'games', 'attractions'][category] : text(category, 32)).filter(Boolean);
  return {
    mood: text(mood.mood, 120), categories,
    at: time(mood.at), theme: ['light', 'dark', 'sad', 'fun'].includes(mood.theme) ? mood.theme : mood.sad ? 'sad' : null,
    ...(Number.isFinite(mood.energy) ? { energy: mood.energy } : {}),
    ...(mood.dims ? { dims: Object.fromEntries(Object.entries(record(mood.dims)).filter(([key, n]) => /^[EVSNTP]$/.test(key) && Number.isFinite(n))) } : {}),
    ...(Array.isArray(mood.why) ? { why: mood.why.slice(0, 2).map(row => list(row).slice(0, 5).map(item => text(item, 80))) } : {}),
    scores: Object.fromEntries(Object.entries(record(mood.scores)).filter(([name, score]) => /^[a-z]+$/.test(name) && Number.isFinite(score))),
    preferences: Object.fromEntries(Object.entries(record(mood.preferences)).filter(([key, value]) =>
      /^[a-z]+$/.test(key) && (typeof value === 'string' || Number.isFinite(value))))
  };
}

function normalizeProfile(raw, id) {
  const value = record(raw);
  const prefs = record(value.preferences);
  const visits = new Map();
  for (const visit of list(value.visits)) {
    const placeId = resolvePlaceId(visit?.placeId || visit?.place);
    if (placeId) visits.set(placeId, { placeId, at: time(visit.at) });
  }
  const moods = list(value.moods).map(normalizeMood).filter(m => m.mood).slice(-100);
  return {
    ...newProfile(id, text(value.name || value.login, 32) || 'Локальный профиль', time(value.createdAt || value.created)),
    avatar: avatarSource(value.avatar),
    favorites: unique(list(value.favorites || value.favs).map(resolvePlaceId).filter(Boolean)),
    visits: [...visits.values()], moods,
    preferences: { rememberMood: prefs.rememberMood === true, shareMood: prefs.shareMood === true, shareVisits: prefs.shareVisits === true }
  };
}

function normalizeSpace(raw) {
  const source = record(raw);
  const profiles = Object.fromEntries(Object.entries(record(source.profiles))
    .filter(([id, profile]) => /^[a-z0-9-]{1,100}$/.test(id) && Object.keys(record(profile)).length)
    .map(([id, profile]) => [id, normalizeProfile(profile, id)]));
  const member = id => typeof id === 'string' && Object.hasOwn(profiles, id);
  const pair = row => member(row?.from) && member(row?.to) && row.from !== row.to;
  const requests = list(source.requests).filter(pair).map(r => ({ id: text(r.id, 100), from: r.from, to: r.to, at: time(r.at) }));
  const reviews = list(source.reviews).filter(r => member(r?.authorId) && resolvePlaceId(r.placeId) && Number.isInteger(r.rating) && r.rating > 0 && r.rating < 6)
    .map(r => ({ id: text(r.id, 100), authorId: r.authorId, placeId: resolvePlaceId(r.placeId), text: text(r.text), rating: r.rating, at: time(r.at) }));
  const messages = list(source.messages).filter(pair).map(m => ({
    id: text(m.id, 100), from: m.from, to: m.to, text: text(m.text), at: time(m.at),
    ...(resolvePlaceId(m.placeId) ? { placeId: resolvePlaceId(m.placeId), status: ['accepted', 'declined'].includes(m.status) ? m.status : 'pending' } : {})
  }));
  const friendships = list(source.friendships).filter(row => Array.isArray(row) && row.length === 2 && row.every(member) && row[0] !== row[1]);
  const reviewIds = new Set(reviews.map(r => r.id));
  const reactions = list(source.reactions).filter(r => member(r?.authorId) && (['up', 'down'].includes(r.kind)
    ? reviewIds.has(r.targetId) : ['like', 'go', 'recommend'].includes(r.kind) && resolvePlaceId(r.targetId)))
    .map(r => ({ authorId: r.authorId, kind: r.kind, targetId: r.targetId }));
  const read = Object.fromEntries(Object.entries(record(source.read)).filter(([key, value]) => key.split('|').every(member) && time(value)));
  const backupKeys = Object.fromEntries(Object.entries(record(source.backupKeys)).filter(([id, key]) => member(id) && typeof key === 'string'));
  return { profiles, reviews, messages, requests, friendships, reactions, read, backupKeys };
}

export function migrateLegacy(store) {
  const previous = record(parse(store, 'astana_db'));
  const users = Object.entries(record(previous.users)).filter(([, value]) => Object.keys(record(value)).length);
  const oldIds = new Map(users.map(([key], index) => [key, 'imported-' + (index + 1)]));
  const legacy = emptySpace();
  legacy.backupKeys = Object.fromEntries([...oldIds].map(([key, id]) => [id, key]));
  const idFor = key => oldIds.get(key);
  for (const [key, user] of users) {
    const id = idFor(key);
    legacy.profiles[id] = normalizeProfile(user, id);
    legacy.profiles[id].preferences.rememberMood = legacy.profiles[id].moods.length > 0;
    const appearance = store.getItem('moodmix_kind_' + user.login);
    if (appearance === 'fun' && legacy.profiles[id].moods.length) legacy.profiles[id].moods.at(-1).theme = 'fun';
    for (const other of list(user.friends)) {
      const friendId = idFor(other);
      if (!friendId || friendId === id) continue;
      if (list(previous.users[other]?.friends).includes(key)) {
        if (id < friendId) legacy.friendships.push([id, friendId]);
      } else {
        legacy.requests.push({ id: 'imported-friend-' + id + '-' + friendId, from: id, to: friendId, at: '' });
      }
    }
  }
  for (const [index, request] of list(previous.requests).entries()) {
    legacy.requests.push({ id: 'imported-request-' + index, from: idFor(request?.from), to: idFor(request?.to), at: request?.at });
  }
  legacy.requests = [...new Map(legacy.requests.map(row => [row.from + '|' + row.to, row])).values()];
  for (const [index, review] of list(previous.reviews).entries()) {
    legacy.reviews.push({ id: 'imported-review-' + index, authorId: idFor(review?.user), placeId: resolvePlaceId(review?.key), rating: review?.rating, text: review?.text, at: review?.at });
  }
  for (const [index, message] of list(previous.messages).entries()) {
    legacy.messages.push({ id: 'imported-message-' + index, from: idFor(message?.from), to: idFor(message?.to), text: message?.text, at: message?.at, placeId: resolvePlaceId(message?.place), status: message?.status });
  }
  for (const [key, user] of users) {
    for (const [other, at] of Object.entries(record(user.read))) {
      if (idFor(other)) legacy.read[idFor(key) + '|' + idFor(other)] = at;
    }
  }
  const oldReactions = record(parse(store, 'moodmix_px'));
  for (const [group, kind] of [['likes', 'like'], ['go', 'go'], ['recs', 'recommend']]) {
    for (const [key, voters] of Object.entries(record(oldReactions[group]))) {
      for (const voter of unique(list(voters))) {
        legacy.reactions.push({ authorId: idFor(voter), kind, targetId: resolvePlaceId(key) });
      }
    }
  }
  for (const [key, votes] of Object.entries(record(oldReactions.rv))) {
    const split = key.lastIndexOf('#');
    const targetId = legacy.reviews.find(r => r.placeId === resolvePlaceId(key.slice(0, split)) && r.authorId === idFor(key.slice(split + 1)))?.id;
    for (const kind of ['up', 'down']) {
      for (const voter of unique(list(votes?.[kind]))) legacy.reactions.push({ authorId: idFor(voter), kind, targetId });
    }
  }
  const guest = normalizeProfile(parse(store, 'moodmix_guest'), 'guest');
  guest.preferences.rememberMood = guest.moods.length > 0;
  let theme = 'auto';
  try {
    const preferred = store.getItem('moodmix_theme');
    if (['dark', 'light'].includes(preferred)) theme = preferred;
  } catch {}
  return { version: VERSION, settings: { theme }, guest, active: { mode: 'guest', id: 'guest' }, demo: null, legacy: normalizeSpace(legacy) };
}

function normalizeState(value) {
  const active = record(value.active);
  const demo = value.demo ? normalizeSpace(value.demo) : null;
  const legacy = normalizeSpace(value.legacy);
  const space = active.mode === 'demo' ? demo : active.mode === 'legacy' ? legacy : null;
  return {
    version: VERSION, settings: { theme: themes.has(value.settings?.theme) ? value.settings.theme : 'auto' },
    guest: normalizeProfile(value.guest, 'guest'), demo, legacy,
    active: space && Object.hasOwn(space.profiles, active.id) ? { mode: active.mode, id: active.id } : { mode: 'guest', id: 'guest' }
  };
}

export function createStorage(storage) {
  let current;
  let storedRaw;
  let blocked = false;
  let issue = '';
  try {
    const raw = storage.getItem(STORAGE_KEY);
    storedRaw = raw;
    const previous = raw === null ? null : parse(storage, STORAGE_KEY);
    blocked = raw !== null && previous?.version !== VERSION;
    if (blocked) issue = 'Не удалось прочитать сохранённые данные. Изменения останутся в этой вкладке.';
    current = previous?.version === VERSION ? normalizeState(previous) : migrateLegacy(storage);
    if (raw === null) {
      storedRaw = JSON.stringify(current);
      storage.setItem(STORAGE_KEY, storedRaw);
    }
  } catch {
    issue = 'Хранилище браузера недоступно. Изменения могут исчезнуть после перезагрузки.';
    current ??= migrateLegacy({ getItem: () => null });
  }

  function refresh() {
    if (blocked || issue) return;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === storedRaw) return;
      const state = raw === null ? migrateLegacy(storage) : JSON.parse(raw);
      if (state.version !== VERSION) throw new Error('unknown version');
      current = normalizeState(state);
      storedRaw = raw;
    } catch {
      blocked = true;
      issue = 'Не удалось перечитать данные. Новые изменения останутся в этой вкладке.';
    }
  }

  function update(change) {
    refresh();
    const next = structuredClone(current);
    const result = change(next);
    if (!blocked) {
      try {
        const snapshot = JSON.stringify(next);
        if (snapshot !== storedRaw || issue) storage.setItem(STORAGE_KEY, snapshot);
        storedRaw = snapshot;
        issue = '';
      } catch {
        issue = 'Изменения доступны в этой вкладке. Браузер не смог их сохранить.';
      }
    }
    current = next;
    return result;
  }

  function removeLegacyProfile(key, name) {
    if (issue) return false;
    try {
      const legacy = parse(storage, 'astana_db');
      if (key && !legacy && storage.getItem('astana_db') !== null) return false;
      if (key && legacy?.users && Object.hasOwn(legacy.users, key)) {
        const references = row => row?.from === key || row?.to === key;
        name = legacy.users[key]?.login || name;
        delete legacy.users[key];
        for (const user of Object.values(legacy.users)) {
          if (user?.friends) user.friends = list(user.friends).filter(friend => friend !== key);
          if (user?.read) delete user.read[key];
        }
        legacy.reviews = list(legacy.reviews).filter(row => row?.user !== key);
        legacy.requests = list(legacy.requests).filter(row => !references(row));
        legacy.messages = list(legacy.messages).filter(row => !references(row));
        storage.setItem('astana_db', JSON.stringify(legacy));
        if (storage.getItem('astana_session') === key) storage.removeItem('astana_session');
      } else if (!key) storage.removeItem('moodmix_guest');
      const reactions = parse(storage, 'moodmix_px');
      const actor = key || 'гость';
      if (reactions && typeof reactions === 'object') {
        for (const field of ['likes', 'recs', 'go']) {
          for (const [place, voters] of Object.entries(record(reactions[field]))) {
            reactions[field][place] = list(voters).filter(voter => voter !== actor);
          }
        }
        for (const [target, votes] of Object.entries(record(reactions.rv))) {
          if (target.endsWith('#' + actor)) { delete reactions.rv[target]; continue; }
          if (votes && typeof votes === 'object') {
            for (const side of ['up', 'down']) votes[side] = list(votes[side]).filter(voter => voter !== actor);
          }
        }
        storage.setItem('moodmix_px', JSON.stringify(reactions));
      }
      if (name) storage.removeItem('moodmix_kind_' + name);
      return true;
    } catch {
      return false;
    }
  }

  function purgeLegacyBackups() {
    try {
      const dynamic = Array.from({ length: storage.length }, (_, i) => storage.key(i))
        .filter(key => key?.startsWith('moodmix_kind_'));
      for (const key of [...legacyKeys, ...dynamic]) storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function hasLegacyBackups() {
    try {
      return legacyKeys.some(key => storage.getItem(key) !== null)
        || Array.from({ length: storage.length }, (_, i) => storage.key(i)).some(key => key?.startsWith('moodmix_kind_'));
    } catch {
      return false;
    }
  }

  return {
    read() { refresh(); return structuredClone(current); },
    update, issue: () => issue, purgeLegacyBackups, removeLegacyProfile, hasLegacyBackups
  };
}

export { demoSpace, emptySpace, newProfile };
