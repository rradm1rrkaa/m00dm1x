import { STORAGE_KEY, avatarSource, createStorage, demoSpace, newProfile, wallpapers } from './storage.js';
import { placeById } from './catalog.js';

const now = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
const otherParticipant = (row, who) => row.from === who ? row.to : row.from;
const involves = (row, who) => row.from === who || row.to === who;
const readKey = (who, other) => who + '|' + other;
const belongs = (space, profileId) => Object.hasOwn(space.profiles, profileId);
const related = (space, a, b) => space.friendships.some(pair => pair.includes(a) && pair.includes(b));
const requirePlace = placeId => {
  if (!placeById(placeId)) throw new Error('Место отсутствует в каталоге.');
};
function userText(value, max, empty = false) {
  const result = String(value ?? '').trim();
  if ((!empty && !result) || result.length > max) throw new Error('Допустимая длина текста — до ' + max + ' символов.');
  return result;
}

function browserStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function createLocalApi(store = browserStorage(), repository = createStorage(store)) {
  let active = repository.read().active;
  function getState(state, social = false) {
    const space = active.mode === 'guest' ? null : state[active.mode];
    const user = space?.profiles[active.id];
    if (space && user) return { space, user };
    if (social) throw new Error('Действие доступно в демонстрационном профиле.');
    return { space: null, user: state.guest };
  }
  const profileAt = (space, profileId) => {
    if (!belongs(space, profileId)) throw new Error('Профиль больше недоступен.');
    return space.profiles[profileId];
  };
  const socialRead = run => {
    const { user, space } = getState(repository.read(), true);
    return run(space, user);
  };
  const socialWrite = (run, options) => repository.update(state => {
    const { user, space } = getState(state, true);
    return run(space, user);
  }, options);
  const userWrite = (run, options) => repository.update(state => run(getState(state).user), options);
  function publicProfile(profile) {
    const { id, name, avatar, createdAt, preferences } = profile;
    return {
      id, name, avatar, createdAt,
      lastMood: preferences.shareMood ? profile.moods.at(-1)?.mood || null : null,
      visits: preferences.shareVisits ? profile.visits : null
    };
  }
  function validOther(space, user, other) {
    if (other === user.id) throw new Error('Выберите другой профиль.');
    return profileAt(space, other);
  }
  function eraseProfile(space, profileId) {
    const removedReviews = new Set(space.reviews.filter(r => r.authorId === profileId).map(r => r.id));
    delete space.profiles[profileId];
    space.reviews = space.reviews.filter(r => r.authorId !== profileId);
    space.friendships = space.friendships.filter(pair => !pair.includes(profileId));
    space.requests = space.requests.filter(row => !involves(row, profileId));
    space.messages = space.messages.filter(row => !involves(row, profileId));
    space.reactions = space.reactions.filter(row => row.authorId !== profileId && !removedReviews.has(row.targetId));
    space.read = Object.fromEntries(Object.entries(space.read).filter(([key]) => !key.split('|').includes(profileId)));
  }
  function choose(next) {
    repository.update(state => { state.active = next; });
    active = next;
  }

  return {
    storageIssue: repository.issue,
    storageKey: STORAGE_KEY,
    async settings() { return repository.read().settings; },
    async setTheme(theme) {
      if (!['auto', 'dark', 'light', 'sad', 'fun'].includes(theme)) throw new Error('Неизвестная тема.');
      repository.update(state => { state.settings.theme = theme; });
    },
    async setChatWallpaper(wallpaper) {
      if (!wallpapers.includes(wallpaper)) throw new Error('Неизвестные обои.');
      repository.update(state => { state.settings.chatWallpaper = wallpaper; }, { durable: true });
    },
    async session() {
      const { user, space } = getState(repository.read());
      return { mode: space ? active.mode : 'guest', profile: user };
    },
    async profiles() {
      const state = repository.read();
      const pick = space => Object.values(space.profiles).map(({ id, name }) => ({ id, name }));
      return { demo: pick(state.demo || demoSpace()), legacy: pick(state.legacy), legacyBackups: repository.hasLegacyBackups() };
    },
    async switchProfile(mode, profileId) {
      if (mode === 'guest') { choose({ mode, id: 'guest' }); return; }
      if (!['demo', 'legacy'].includes(mode)) throw new Error('Неизвестный режим.');
      const next = repository.update(state => {
        if (mode === 'demo' && !state.demo) state.demo = demoSpace();
        const selected = profileId || Object.keys(state[mode].profiles)[0];
        if (selected) profileAt(state[mode], selected);
        state.active = selected ? { mode, id: selected } : { mode: 'guest', id: 'guest' };
        return state.active;
      });
      active = next;
    },
    async resetDemo() {
      const selected = active.mode === 'demo' ? active.id : 'demo-aliya';
      active = repository.update(state => {
        state.demo = demoSpace();
        state.active = { mode: 'demo', id: belongs(state.demo, selected) ? selected : 'demo-aliya' };
        return state.active;
      });
    },
    async saveProfile(input) {
      return userWrite(profile => {
        if (input.name !== undefined && profile.id !== 'guest') profile.name = userText(input.name, 32);
        if (input.avatar !== undefined) {
          if (input.avatar !== null && !avatarSource(input.avatar)) throw new Error('Выберите JPG, PNG или WebP.');
          profile.avatar = input.avatar;
        }
        for (const name of Object.keys(profile.preferences)) {
          if (typeof input[name] === 'boolean') profile.preferences[name] = input[name];
        }
        if (input.rememberMood === false) profile.moods = [];
        return profile;
      });
    },
    async saveMood(result, remember) {
      return userWrite(profile => {
        if (typeof remember === 'boolean') {
          profile.preferences.rememberMood = remember;
          if (!remember) profile.moods = [];
        }
        if (profile.preferences.rememberMood) {
          profile.moods = [...profile.moods, { ...result, at: now() }].slice(-100);
        }
      });
    },
    async toggleFavorite(placeId, options) {
      requirePlace(placeId);
      return userWrite(profile => {
        const saved = !profile.favorites.includes(placeId);
        profile.favorites = saved ? [...profile.favorites, placeId] : profile.favorites.filter(value => value !== placeId);
        return saved;
      }, options);
    },
    async toggleVisit(placeId) {
      requirePlace(placeId);
      return userWrite(profile => {
        const visited = !profile.visits.some(visit => visit.placeId === placeId);
        profile.visits = visited ? [...profile.visits, { placeId, at: now() }] : profile.visits.filter(visit => visit.placeId !== placeId);
        return visited;
      });
    },
    async ratings() {
      const { space } = getState(repository.read());
      const ratings = {};
      for (const review of space?.reviews || []) {
        const item = ratings[review.placeId] ||= { sum: 0, count: 0 };
        item.sum += review.rating;
        item.count++;
      }
      return Object.fromEntries(Object.entries(ratings).map(([key, value]) => [key, { avg: value.sum / value.count, count: value.count }]));
    },
    async reviews(placeId) {
      const { space } = getState(repository.read());
      return (space?.reviews || []).filter(row => row.placeId === placeId).slice().reverse()
        .map(row => ({ ...row, author: publicProfile(profileAt(space, row.authorId)) }));
    },
    async saveReview(placeId, rating, text, options) {
      requirePlace(placeId);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Выберите оценку от 1 до 5.');
      return socialWrite((space, user) => {
        const previous = space.reviews.find(row => row.placeId === placeId && row.authorId === user.id);
        const review = { id: previous?.id || id(), authorId: user.id, placeId, rating, text: userText(text, 1000, true), at: now() };
        space.reviews = [...space.reviews.filter(row => row.id !== review.id), review];
        return review;
      }, options);
    },
    async deleteReview(reviewId) {
      socialWrite((space, user) => {
        if (!space.reviews.some(row => row.id === reviewId && row.authorId === user.id)) throw new Error('Отзыв недоступен.');
        space.reviews = space.reviews.filter(row => row.id !== reviewId);
        space.reactions = space.reactions.filter(row => row.targetId !== reviewId);
      });
    },
    async reactions(targetId) {
      const { user, space } = getState(repository.read());
      const rows = (space?.reactions || []).filter(row => row.targetId === targetId);
      return Object.fromEntries(['like', 'go', 'recommend', 'up', 'down'].map(kind => [
        kind, { count: rows.filter(row => row.kind === kind).length, mine: rows.some(row => row.kind === kind && row.authorId === user.id) }
      ]));
    },
    async toggleReaction(targetId, kind) {
      socialWrite((space, user) => {
        const voting = ['up', 'down'].includes(kind);
        if (voting) {
          const review = space.reviews.find(row => row.id === targetId);
          if (!review || review.authorId === user.id) throw new Error('Оценивать можно отзывы других профилей.');
        } else {
          if (!['like', 'go', 'recommend'].includes(kind)) throw new Error('Неизвестная реакция.');
          requirePlace(targetId);
        }
        const found = space.reactions.some(row => row.targetId === targetId && row.authorId === user.id && row.kind === kind);
        space.reactions = space.reactions.filter(row => !(row.targetId === targetId && row.authorId === user.id && (voting ? ['up', 'down'].includes(row.kind) : row.kind === kind)));
        if (!found) space.reactions.push({ targetId, authorId: user.id, kind });
      });
    },
    async publicProfile(profileId) {
      return socialRead((space) => publicProfile(profileAt(space, profileId)));
    },
    async people(currentCategories) {
      return socialRead((space, user) => {
        const myMood = currentCategories || user.moods.at(-1)?.categories || [];
        return Object.values(space.profiles).filter(profile => profile.id !== user.id).map(profile => {
          const incoming = space.requests.find(row => row.from === profile.id && row.to === user.id);
          const outgoing = space.requests.find(row => row.to === profile.id && row.from === user.id);
          const sharedCategories = profile.preferences.shareMood ? (profile.moods.at(-1)?.categories || []).filter(category => myMood.includes(category)).length : 0;
          return { ...publicProfile(profile), related: related(space, user.id, profile.id), incoming: incoming?.id, outgoing: outgoing?.id, sharedCategories };
        }).sort((a, b) => b.sharedCategories - a.sharedCategories);
      });
    },
    async addFriend(profileId) {
      socialWrite((space, user) => {
        validOther(space, user, profileId);
        if (related(space, user.id, profileId)) return;
        const incoming = space.requests.find(row => row.from === profileId && row.to === user.id);
        if (incoming) {
          space.friendships.push([user.id, profileId]);
          space.requests = space.requests.filter(row => row.id !== incoming.id);
        } else if (!space.requests.some(row => row.from === user.id && row.to === profileId)) {
          space.requests.push({ id: id(), from: user.id, to: profileId, at: now() });
        }
      });
    },
    async replyFriend(requestId, action) {
      socialWrite((space, user) => {
        const row = space.requests.find(r => r.id === requestId);
        const permitted = action === 'cancel' ? row?.from === user.id
          : ['accept', 'decline'].includes(action) && row?.to === user.id;
        if (!permitted) throw new Error('Заявка уже обработана или недоступна.');
        if (action === 'accept' && !related(space, row.from, row.to)) space.friendships.push([row.from, row.to]);
        space.requests = space.requests.filter(r => r.id !== row.id);
      });
    },
    async removeFriend(profileId) {
      socialWrite((space, user) => {
        space.friendships = space.friendships.filter(pair => !(pair.includes(user.id) && pair.includes(profileId)));
      });
    },
    async chats() {
      return socialRead((space, user) => Object.values(space.profiles).filter(profile => profile.id !== user.id).map(profile => {
        const messages = space.messages.filter(row => involves(row, user.id) && otherParticipant(row, user.id) === profile.id);
        const unread = messages.filter(row => row.to === user.id && row.at > (space.read[readKey(user.id, profile.id)] || '')).length;
        return { ...publicProfile(profile), contact: related(space, user.id, profile.id), last: messages.at(-1), unread };
      }).filter(row => row.contact || row.last).sort((a, b) => (b.last?.at || '').localeCompare(a.last?.at || '')));
    },
    async chat(profileId) {
      const data = socialRead((space, user) => {
        const profile = validOther(space, user, profileId);
        const messages = space.messages.filter(row => involves(row, user.id) && otherParticipant(row, user.id) === profileId);
        return { profile: publicProfile(profile), messages: messages.slice(-200), canSend: related(space, user.id, profileId) };
      });
      const incoming = data.messages.filter(row => row.from === profileId).at(-1);
      if (incoming) socialWrite((space, user) => {
        const key = readKey(user.id, profileId);
        if (incoming.at > (space.read[key] || '')) space.read[key] = incoming.at;
      });
      return data;
    },
    async send(profileId, text, placeId, walkAt) {
      socialWrite((space, user) => {
        validOther(space, user, profileId);
        if (!related(space, user.id, profileId)) throw new Error('Отправлять сообщения можно друзьям.');
        const lastTime = Date.parse(space.messages.at(-1)?.at) || 0;
        const at = new Date(Math.max(Date.now(), lastTime + 1)).toISOString();
        const message = { id: id(), from: user.id, to: profileId, text: userText(text, placeId ? 300 : 1000, !!placeId), at };
        if (placeId) {
          requirePlace(placeId);
          if (walkAt !== undefined && (!Number.isFinite(Date.parse(walkAt)) || Date.parse(walkAt) <= Date.now())) {
            throw new Error('Выберите дату и время в будущем.');
          }
          if (space.messages.some(row => row.status === 'pending' && row.placeId === placeId && involves(row, user.id) && otherParticipant(row, user.id) === profileId)) {
            throw new Error('Приглашение на это место уже ждёт ответа.');
          }
          Object.assign(message, { placeId, status: 'pending' });
          if (walkAt) message.walkAt = new Date(walkAt).toISOString();
        }
        space.messages.push(message);
      }, walkAt ? { durable: true } : undefined);
    },
    async replyWalk(messageId, status) {
      socialWrite((space, user) => {
        const invite = space.messages.find(row => row.id === messageId);
        if (!invite?.placeId || invite.to !== user.id || invite.status !== 'pending' || !['accepted', 'declined'].includes(status)) {
          throw new Error('Приглашение уже обработано или недоступно.');
        }
        invite.status = status;
      });
    },
    async exportData() {
      const { space, user } = getState(repository.read());
      return {
        exportedAt: now(), profile: user, settings: repository.read().settings,
        reviews: space?.reviews.filter(row => row.authorId === user.id) || [],
        reactions: space?.reactions.filter(row => row.authorId === user.id) || [],
        messages: space?.messages.filter(row => involves(row, user.id)) || [],
        requests: space?.requests.filter(row => involves(row, user.id)) || [],
        friendships: space?.friendships.filter(pair => pair.includes(user.id)) || []
      };
    },
    async deleteProfile() {
      let backup;
      active = repository.update(state => {
        const { space, user } = getState(state);
        if (space) {
          if (active.mode === 'legacy') {
            const key = space.backupKeys?.[user.id];
            backup = { key, name: key || user.name };
            if (space.backupKeys) delete space.backupKeys[user.id];
          }
          eraseProfile(space, user.id);
        } else {
          backup = { name: 'Гость' };
          state.guest = newProfile('guest', 'Гость', now());
        }
        state.active = { mode: 'guest', id: 'guest' };
        return state.active;
      });
      return { backupRemoved: !backup || repository.removeLegacyProfile(backup.key, backup.name) };
    },
    async purgeLegacyBackups() {
      if (!repository.purgeLegacyBackups()) throw new Error('Браузер не разрешил очистить резервные данные.');
    }
  };
}
