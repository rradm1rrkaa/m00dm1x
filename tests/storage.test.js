import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalApi } from '../js/services/local-api.js';
import { createStorage, STORAGE_KEY, avatarSource } from '../js/services/storage.js';
import { plannedVisit } from '../js/services/visit-time.js';

function memory(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: i => [...values.keys()][i] ?? null,
    get length() { return values.size; }
  };
}

const iso = '2026-11-19T10:00:00Z';

test('a failed durable favorite leaves the previous state and a later retry can save', async () => {
  const store = memory();
  const api = createLocalApi(store);
  const write = store.setItem;
  store.setItem = () => { throw new Error('quota'); };
  await assert.rejects(() => api.toggleFavorite('mm-001', { durable: true }), /не смог сохранить/);
  assert.equal((await api.session()).profile.favorites.includes('mm-001'), false);
  store.setItem = write;
  assert.equal(await api.toggleFavorite('mm-001', { durable: true }), true);
  assert.equal((await createLocalApi(store).session()).profile.favorites.includes('mm-001'), true);
});

test('planned walks validate local times and store timestamps alongside old invitations', async () => {
  const fixedNow = new Date('2026-11-20T16:00:00Z');
  assert.equal(plannedVisit('2026-11-21', '00:15', fixedNow), '2026-11-20T19:15:00.000Z');
  assert.throws(() => plannedVisit('2026-11-20', '20:00', fixedNow), /будущем/);
  assert.throws(() => plannedVisit('2026-02-30', '14:00', fixedNow), /Проверьте/);
  assert.throws(() => plannedVisit('2026-11-21', '24:00', fixedNow), /Проверьте/);
  const store = memory();
  const api = createLocalApi(store);
  await api.switchProfile('demo');
  const walkAt = new Date(Date.now() + 86400000).toISOString();
  await api.send('demo-timur', 'У входа', 'mm-057', walkAt);
  const thread = await createLocalApi(store).chat('demo-timur');
  assert.equal(thread.messages.at(-1).walkAt, walkAt);
  assert.equal(thread.messages.find(row => row.placeId === 'mm-001').walkAt, undefined);
  await api.setChatWallpaper('pattern');
  assert.equal((await createLocalApi(store).settings()).chatWallpaper, 'pattern');
  assert.equal((await api.settings()).theme, 'auto');
});
const legacy = {
  users: {
    old: { login: 'Old', hash: 'p:discard', salt: 'discard', favs: ['0|Ботанический сад'], friends: ['friend'],
      moods: [{ mood: 'Прогулка', energy: 50, cats: [2, 0], dims: { E: 50 }, at: iso }],
      visits: [{ place: 'Ботанический сад', cat: 'Уединение', at: iso }] },
    friend: { login: 'Friend', friends: ['old'] }
  },
  reviews: [{ user: 'old', key: '0|Ботанический сад', rating: 5, text: 'Спокойно', at: iso }],
  messages: [{ from: 'old', to: 'friend', place: 'Ботанический сад', status: 'accepted', text: 'Пример', at: iso }]
};

test('old favorites, identities, mood, reviews, reactions and messages migrate without moving credentials', async () => {
  const source = JSON.stringify(legacy);
  const store = memory({ astana_db: source, astana_session: 'old', moodmix_theme: 'light',
    moodmix_kind_Old: 'fun', moodmix_guest: '{"favs":["0|Ботанический сад"]}',
    moodmix_px: '{"likes":{"0|Ботанический сад":["old"]}}' });
  const api = createLocalApi(store);
  assert.equal((await api.session()).mode, 'guest');
  assert.equal((await api.settings()).theme, 'light');
  assert.deepEqual((await api.session()).profile.favorites, ['mm-001']);
  assert.equal(store.getItem('astana_db'), source);
  await api.switchProfile('legacy', 'imported-1');
  const data = await api.exportData();
  assert.equal(data.profile.moods[0].theme, 'fun');
  assert.equal(data.profile.moods[0].energy, 50);
  assert.deepEqual(data.profile.moods[0].categories, ['walks', 'quiet']);
  assert.equal(data.profile.visits[0].placeId, 'mm-001');
  assert.equal(data.reviews.length, 1);
  assert.equal(data.reactions[0].kind, 'like');
  assert.equal(data.messages[0].status, 'accepted');
  assert(!store.getItem(STORAGE_KEY).includes('p:discard'));
});

test('corrupt and unknown data versions are preserved', async () => {
  for (const payload of ['{', '{"version":42,"future":true}']) {
    const store = memory({ [STORAGE_KEY]: payload });
    const api = createLocalApi(store);
    await api.toggleFavorite('mm-001');
    assert.equal(store.getItem(STORAGE_KEY), payload);
    assert(api.storageIssue());
  }
});

test('an unavailable store falls back with a visible warning', async () => {
  const repo = createStorage({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
  const api = createLocalApi(null, repo);
  await api.toggleFavorite('mm-001');
  assert.deepEqual((await api.session()).profile.favorites, ['mm-001']);
  assert(api.storageIssue());
});

test('round trip isolates guest, demo users and consent-based mood history', async () => {
  const store = memory();
  let api = createLocalApi(store);
  await api.toggleFavorite('mm-039');
  await api.saveMood({ mood: 'Временно' });
  assert.equal((await api.session()).profile.moods.length, 0);
  await api.saveMood({ mood: 'Сохранено', categories: ['walks'] }, true);
  api = createLocalApi(store);
  assert.equal((await api.session()).profile.moods[0].mood, 'Сохранено');
  assert.deepEqual((await api.session()).profile.favorites, ['mm-039']);
  await api.switchProfile('demo', 'demo-timur');
  assert.deepEqual((await api.session()).profile.favorites, ['mm-170']);
  await api.switchProfile('demo', 'demo-aliya');
  assert.deepEqual((await api.session()).profile.favorites, ['mm-001']);
  assert.equal((await api.publicProfile('demo-timur')).lastMood, null);
});

test('two browser views retain their own acting profile and refresh intervening writes', async () => {
  const store = memory();
  const a = createLocalApi(store);
  const b = createLocalApi(store);
  await a.switchProfile('demo', 'demo-aliya');
  await b.switchProfile('demo', 'demo-timur');
  await Promise.all([a.toggleFavorite('mm-002'), b.toggleFavorite('mm-003')]);
  assert((await a.session()).profile.favorites.includes('mm-002'));
  assert((await b.session()).profile.favorites.includes('mm-003'));
  assert.equal((await a.session()).profile.id, 'demo-aliya');
});

test('review edits replace rating; deleting review clears associated votes', async () => {
  const api = createLocalApi(memory());
  await api.switchProfile('demo', 'demo-aliya');
  const first = await api.saveReview('mm-001', 4, 'Ещё отзыв');
  const update = await api.saveReview('mm-001', 3, 'Обновлённый');
  assert.equal(first.id, update.id);
  assert.equal((await api.ratings())['mm-001'].avg, 3);
  await api.switchProfile('demo', 'demo-timur');
  await api.toggleReaction(first.id, 'up');
  await api.toggleReaction(first.id, 'down');
  assert.equal((await api.reactions(first.id)).up.count, 0);
  assert.equal((await api.reactions(first.id)).down.count, 1);
  await api.switchProfile('demo', 'demo-aliya');
  await api.deleteReview(first.id);
  assert.equal((await api.reactions(first.id)).down.count, 0);
});

test('friendship, message, unread and invitation transitions enforce the local state', async () => {
  const api = createLocalApi(memory());
  await api.switchProfile('demo', 'demo-timur');
  const dana = (await api.people()).find(row => row.id === 'demo-dana');
  await assert.rejects(() => api.send(dana.id, 'Привет'), /друзьям/);
  await api.replyFriend(dana.incoming, 'accept');
  await api.send(dana.id, 'Привет');
  await api.send(dana.id, 'В субботу', 'mm-001');
  await assert.rejects(() => api.send(dana.id, 'Ещё раз', 'mm-001'), /ждёт ответа/);
  await api.switchProfile('demo', 'demo-dana');
  assert.equal((await api.chats())[0].unread, 2);
  const conversation = await api.chat('demo-timur');
  assert.equal((await api.chats())[0].unread, 0);
  await api.replyWalk(conversation.messages.at(-1).id, 'accepted');
  assert.equal((await api.chat('demo-timur')).messages.at(-1).status, 'accepted');
});

test('profile deletion clears dependencies and remains deleted after reload', async () => {
  const store = memory();
  const api = createLocalApi(store);
  await api.switchProfile('demo', 'demo-aliya');
  await api.toggleReaction('mm-001', 'like');
  await api.deleteProfile();
  const fresh = createLocalApi(store);
  assert.equal((await fresh.session()).mode, 'guest');
  await fresh.switchProfile('demo', 'demo-timur');
  assert.equal((await fresh.chats()).some(chat => chat.id === 'demo-aliya'), false);
  assert.equal((await fresh.reviews('mm-001')).length, 0);
  assert.equal((await fresh.reactions('mm-001')).like.count, 0);
  await fresh.resetDemo();
  assert.equal((await fresh.reviews('mm-001')).length, 1);
});

test('explicit legacy deletion clears the old copy for that profile only', async () => {
  const store = memory({ astana_db: JSON.stringify(legacy), moodmix_guest: '{"favs":["0|Ботанический сад"]}' });
  const api = createLocalApi(store);
  await api.switchProfile('legacy', 'imported-1');
  assert.equal((await api.deleteProfile()).backupRemoved, true);
  const source = JSON.parse(store.getItem('astana_db'));
  assert.equal(source.users.old, undefined);
  assert(source.users.friend);
  assert.equal(source.reviews.length, 0);
  assert.equal(source.messages.length, 0);
});

test('avatar validation accepts safe raster formats only', () => {
  assert.equal(avatarSource('data:image/jpeg;base64,aGVsbG8='), 'data:image/jpeg;base64,aGVsbG8=');
  assert.equal(avatarSource('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(avatarSource('https://example.test/untrusted.png'), null);
});
