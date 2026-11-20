export function newProfile(id, name, createdAt) {
  return {
    id, name, createdAt, avatar: null, favorites: [], visits: [], moods: [],
    preferences: { rememberMood: false, shareMood: false, shareVisits: false }
  };
}

export function emptySpace() {
  return { profiles: {}, reviews: [], friendships: [], requests: [], messages: [], reactions: [], read: {} };
}

export function demoSpace() {
  const space = emptySpace();
  const date = '2026-10-15T10:00:00.000Z';
  const profiles = [
    newProfile('demo-aliya', 'Алия', date),
    newProfile('demo-timur', 'Тимур', date),
    newProfile('demo-dana', 'Дана', date)
  ];
  profiles[0].favorites = ['mm-001'];
  profiles[1].favorites = ['mm-170'];
  profiles[0].visits = [{ placeId: 'mm-001', at: date }];
  profiles[2].moods = [{ mood: 'Хочется тишины и покоя', categories: ['quiet', 'walks'], at: date }];
  profiles[2].preferences.shareMood = true;
  space.profiles = Object.fromEntries(profiles.map(profile => [profile.id, profile]));
  space.reviews = [
    { id: 'demo-review-1', authorId: 'demo-aliya', placeId: 'mm-001', rating: 5, text: 'После работы прошлась по дальним аллеям. Там тихо даже в пятницу, а у воды можно посидеть с кофе.', at: date },
    { id: 'demo-review-2', authorId: 'demo-timur', placeId: 'mm-170', rating: 4, text: 'Поднялся до заката и успел увидеть, как загорается бульвар. У лифта пришлось немного подождать.', at: date }
  ];
  space.friendships = [['demo-aliya', 'demo-timur']];
  space.requests = [{ id: 'demo-request-1', from: 'demo-dana', to: 'demo-timur', at: date }];
  space.messages = [
    { id: 'demo-message-1', from: 'demo-timur', to: 'demo-aliya', text: 'Привет! Есть планы на выходные?', at: date },
    { id: 'demo-message-2', from: 'demo-aliya', to: 'demo-timur', text: 'В субботу после обеда', at: date, placeId: 'mm-001', status: 'pending' }
  ];
  return space;
}
