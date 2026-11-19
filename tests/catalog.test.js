import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, filterPlaces, hoursStatus, mapLink, placeById, places, resolvePlaceId, safeHttps } from '../js/services/catalog.js';
import { analyzeAnswers, questionsFor, rankPlaces } from '../js/services/recommendations.js';

test('catalog preserves the 188 original entries with stable IDs', () => {
  assert.equal(places.length, 188);
  assert.equal(categories.length, 10);
  assert.equal(new Set(places.map(place => place.id)).size, 188);
  assert.equal(places.filter(place => place.type === 'idea').length, 62);
  assert.equal(places.filter(place => place.source).length, 19);
  assert.equal(resolvePlaceId('0|Ботанический сад'), 'mm-001');
});

test('safe URLs preserve a verified exact map and geographically scope fallbacks', () => {
  assert.equal(safeHttps('javascript:void(0)'), null);
  assert.equal(safeHttps('https://example.test@attacker.test'), null);
  assert.match(mapLink(placeById('mm-001')), /2gis/);
  const fallback = decodeURIComponent(mapLink(placeById('mm-124')));
  assert.match(fallback, /Бурабай/);
  assert.doesNotMatch(fallback, /Астана/);
});

test('search combines name, description, city and categories', () => {
  assert.deepEqual(filterPlaces(places, { query: 'ботанический аллеи астана' }).map(place => place.id), ['mm-001']);
  assert(filterPlaces(places, { query: 'УЕДИНЕНИЕ' }).some(place => place.id === 'mm-001'));
});

test('availability respects city timezone, weekdays and seasonal hours', () => {
  const monday = new Date('2026-11-16T06:00:00Z');
  const thursday = new Date('2026-11-19T06:00:00Z');
  assert.equal(hoursStatus(placeById('mm-002'), monday), 'closed');
  assert.equal(hoursStatus(placeById('mm-002'), thursday), 'open');
  assert.equal(hoursStatus(placeById('mm-124'), thursday), 'unknown');
  assert.equal(hoursStatus(placeById('mm-170'), new Date('2026-07-04T16:30:00Z')), 'open');
  assert.equal(hoursStatus(placeById('mm-170'), new Date('2026-11-04T16:30:00Z')), 'closed');
});

test('filters compose without treating missing price, hours or rating as evidence', () => {
  const ratings = { 'mm-001': { avg: 5 }, 'mm-002': { avg: 4.1 }, 'mm-170': { avg: 3 } };
  const date = new Date('2026-11-19T06:00:00Z');
  assert.deepEqual(filterPlaces(places, { rating: '4', price: 'paid', hours: 'open' }, ratings, date).map(place => place.id), ['mm-002']);
  assert.equal(filterPlaces(places, { category: 'quiet', rating: 'unrated', query: 'музей' }, ratings).some(place => place.id === 'mm-002'), false);
  assert.equal(filterPlaces(places, { price: 'unknown', hours: 'unknown' }).some(place => place.id === 'mm-124'), true);
});

test('both quiz lengths score ten categories with stable ordering', () => {
  for (const [mode, count] of [['quick', 7], ['full', 25]]) {
    const questions = questionsFor(mode);
    assert.equal(questions.length, count);
    const answers = questions.map(({ data }) => data[2].length - 1);
    const result = analyzeAnswers(questions, answers);
    assert.equal(Object.keys(result.scores).length, 10);
    assert(result.categories.every(category => categories.some(item => item.id === category)));
    assert(Object.values(result.scores).every(Number.isFinite));
    assert.deepEqual(result, analyzeAnswers(questions, answers));
  }
});

test('ranking rewards supported preferences and explains actual matches', () => {
  const result = { scores: { quiet: 50, walks: 50, attractions: 50 }, preferences: {
    pace: 'quiet', company: 'family', atmosphere: 'outdoor', duration: 120, budget: 0
  } };
  const items = ['mm-001', 'mm-170', 'mm-039'].map(placeById);
  const ranked = rankPlaces(items, result);
  assert.equal(ranked[0].place.id, 'mm-001');
  assert.match(ranked[0].reason, /спокойного отдыха/);
  assert.doesNotMatch(ranked[0].reason, /бюджет|бесплатно/);
  assert.deepEqual(ranked, rankPlaces([...items].reverse(), result));
  assert.equal(analyzeAnswers(questionsFor('quick'), [0, 0, 1, 4, 0, 2, 0]).preferences.budget, 0);
});

test('known price and estimated duration change ranking independently', () => {
  const base = placeById('mm-170');
  const offer = { ...base, id: 'test-cheap', durationMinutes: 45, price: { status: 'paid', min: 1000, max: 1000 } };
  const expensive = { ...base, id: 'test-expensive', price: { status: 'paid', min: 6000, max: 6000 } };
  const unknown = { ...base, id: 'test-unknown', durationMinutes: null, price: { status: 'unknown' } };
  const ranking = rankPlaces([expensive, unknown, offer], { scores: { attractions: 20 }, preferences: { budget: 1200, duration: 60 } });
  assert.deepEqual(ranking.map(row => row.place.id), [offer.id, unknown.id, expensive.id]);
  assert.match(ranking[0].reason, /бюджету/);
  assert.doesNotMatch(ranking[1].reason, /бюджету|время/);
});
