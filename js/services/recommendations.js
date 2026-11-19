import { fullQuestions } from '../data/questions.js';
import { categories } from './catalog.js';

const scaleNames = ['E', 'V', 'S', 'N', 'T', 'P'];
const categoryProfiles = [
  [20,45,10,25,65,40], [90,80,95,60,30,10], [55,60,40,40,45,85], [60,65,55,60,35,10], [65,65,50,45,50,40],
  [25,50,45,30,75,20], [40,50,25,65,80,100], [40,65,60,40,35,15], [80,75,80,65,40,10], [80,80,65,90,30,50]
];
const weights = [1.3, .8, 1, .8, 1.1, .9];
const quickIndices = [2, 9, 11, 4, 8, 7, 15];

export function questionsFor(mode) {
  const indices = mode === 'full' ? fullQuestions.map((_, i) => i) : quickIndices;
  return indices.map(id => ({ id, data: fullQuestions[id] }));
}

function moodAtmosphere(dimensions, selected) {
  const { E, V, T } = dimensions;
  const answer = selected[24] ?? selected[2];
  if (answer === 0 || selected[24] === 1 || V <= 32) return 'sad';
  if (answer === 4 || (V >= 70 && E >= 68 && T < 55)) return 'fun';
  if (selected[23] === 0 && E < 68) return 'dark';
  if (answer === 3 || (V >= 58 && T < 55)) return 'light';
  return 'dark';
}

const moodLabels = {
  sad: 'Хочется отдохнуть и восстановиться',
  fun: 'Есть силы на новые впечатления',
  light: 'Подойдёт день в спокойном ритме',
  dark: 'Хочется провести время в своём темпе'
};

export function analyzeAnswers(questions, answers) {
  const sum = {}, total = {}, affinity = categories.map(() => 0);
  const selected = {};
  questions.forEach(({ id, data: [, weight, options] }, i) => {
    const answer = options[answers[i]];
    if (!answer) return;
    selected[id] = answers[i];
    const [, dimensions, bonuses] = answer;

    for (const token of dimensions.split(',').filter(Boolean)) {
      const scale = token[0];
      sum[scale] = (sum[scale] || 0) + Number(token.slice(1)) * weight;
      total[scale] = (total[scale] || 0) + weight;
    }
    for (const item of bonuses.split(',').filter(Boolean)) {
      const [category, points] = item.split(':');
      affinity[category] += Number(points) * weight;
    }
  });
  const dims = Object.fromEntries(scaleNames.map(k => [k, total[k] ? Math.round(sum[k] / total[k] * 25) : 50]));
  const sad = dims.V <= 40 || (dims.V <= 50 && dims.E <= 35) || (dims.V <= 45 && dims.T >= 60) ||
    selected[2] === 0 || selected[22] === 3 || selected[24] <= 1;
  const theme = moodAtmosphere(dims, selected);
  const max = Math.max(1, ...affinity);
  const scores = Object.fromEntries(categoryProfiles.map((profile, i) => {
    const distance = scaleNames.reduce((sum, key, j) => sum + Math.abs(dims[key] - profile[j]) * weights[j], 0);
    let score = (100 - distance / 5.9) * .5 + affinity[i] / max * 50;
    if (sad && [0, 5, 7].includes(i)) score += 6;
    if (sad && [1, 8].includes(i)) score -= 10;
    return [categories[i].id, score];
  }));
  const preferences = {
    pace: ['quiet', 'walk', 'active', 'party'][selected[11]],
    company: ['solo', 'pair', 'friends', 'group', 'family'][selected[4]],
    atmosphere: ['indoor', 'city', 'outdoor', 'nature'][selected[7]],
    intent: ['quiet', 'active', 'relax', 'culture', 'food'][selected[9]],
    duration: [120, 300, 720, 1440][selected[8]],
    budget: [0, 5000, 10000][selected[15]]
  };
  return {
    mood: moodLabels[theme], theme, scores,
    categories: Object.keys(scores).sort((a, b) => scores[b] - scores[a]).slice(0, 2),
    preferences: Object.fromEntries(Object.entries(preferences).filter(([, value]) => value !== undefined))
  };
}

const explanations = {
  quiet: 'подходит для спокойного отдыха', walk: 'есть пространство для прогулки',
  active: 'подходит для активного отдыха', party: 'подходит для танцев и общения',
  solo: 'можно провести время в одиночестве', pair: 'подходит для прогулки вдвоём',
  friends: 'подходит для компании друзей', group: 'можно сходить компанией', family: 'подходит для семейного отдыха',
  indoor: 'отдых в помещении', city: 'городская локация', outdoor: 'отдых на свежем воздухе', nature: 'отдых на природе',
  relax: 'формат для расслабления', culture: 'культурная программа', food: 'формат для обеда или ужина'
};

export function rankPlaces(items, result) {
  if (!result) return [];
  const preferences = result.preferences || {};
  return items.map(place => {
    let score = Number(result.scores?.[place.category] ?? (result.categories?.includes(place.category) ? 50 : 0));
    const matched = new Set();
    for (const [key, weight] of [['pace', 12], ['intent', 10], ['company', 8], ['atmosphere', 8]]) {
      const value = preferences[key];
      if (place.tags.includes(value) && !matched.has(value)) {
        score += weight;
        matched.add(value);
      }
    }
    const reasons = [...matched].map(tag => explanations[tag]);
    if (Number.isFinite(preferences.duration) && place.durationMinutes) {
      const fits = place.durationMinutes <= preferences.duration;
      score += fits ? 8 : -18;
      if (fits) reasons.push('можно уложиться в выбранное время');
    }
    if (Number.isFinite(preferences.budget) && place.price.status !== 'unknown') {
      const max = place.price.status === 'free' ? 0 : place.price.max;
      if (Number.isFinite(max)) {
        const fits = max <= preferences.budget;
        score += fits ? 12 : -20;
        if (fits) reasons.push(max === 0 ? 'свободный вход' : 'подходит по бюджету');
      } else if (place.price.status === 'paid' && preferences.budget === 0) score -= 20;
    }
    const category = categories[place.categoryIndex].name.toLowerCase();
    return { place, score, reason: reasons.length ? reasons.slice(0, 3).join(' · ') : 'Подбор по категории «' + category + '»' };
  }).sort((a, b) => b.score - a.score || Number(b.place.type === 'place') - Number(a.place.type === 'place')
    || Number(Boolean(b.place.source)) - Number(Boolean(a.place.source)) || a.place.id.localeCompare(b.place.id));
}
