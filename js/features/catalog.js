import { favoriteButton } from '../components/favorite-button.js';
import { photoSource, showPlacePhoto } from '../components/place-photo.js';
import { categories, filterPlaces, places, placeHref } from '../services/catalog.js';
import { rankPlaces } from '../services/recommendations.js';
import { byId, button, field, link, node, select } from '../components/ui.js';
import { icon } from '../components/icons.js';

const PAGE_SIZE = 24;
const labels = { free: 'Бесплатно', paid: 'Платно', unknown: 'Цена не указана' };
const allOptions = ['','Все'];
const landmarkStyles = { 'mm-002': 'museum', 'mm-004': 'pyramid', 'mm-011': 'music' };
const photoPriority = place => Number(Boolean(place.source)) + Number(Boolean(place.images.length));

export function placeIllustration(place, className) {
  const illustration = node('div', className);
  illustration.dataset.illustration = landmarkStyles[place.id] || categories[place.categoryIndex].icon;
  illustration.setAttribute('aria-hidden', 'true');
  return illustration;
}

export function createCatalog(context) {
  const { api, getSession, getResult, openPlace } = context;
  const out = byId('out');
  const tabs = byId('tabs');
  const search = byId('q');
  const filterPanel = byId('filters');
  const filters = { query: '', category: '', type: '', price: '', hours: '', rating: '' };
  const operands = [
    ['category', 'Категория', [allOptions, ...categories.map(category => [category.id, category.name])]],
    ['type', 'Формат', [allOptions, ['place', 'Места'], ['idea', 'Идеи']]],
    ['rating', 'Оценка', [allOptions, ['4', '4 и выше'], ['3', '3 и выше'], ['rated', 'Есть отзывы'], ['unrated', 'Без отзывов']]],
    ['price', 'Стоимость', [allOptions, ['free', 'Бесплатно'], ['paid', 'Платно'], ['unknown', 'Цена не указана']]],
    ['hours', 'Доступность', [allOptions, ['open', 'По графику открыто'], ['closed', 'По графику закрыто'], ['unknown', 'График не указан']]]
  ];
  const selects = {};
  const controls = byId('filter-controls');
  const count = node('p', 'm');
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');
  let view = 'all', limit = PAGE_SIZE, ratings = {};
  let searchTimer, renderVersion = 0;

  for (const [name, label, options] of operands) {
    const input = select(options);
    input.id = 'filter-' + name;
    input.addEventListener('change', () => {
      filters[name] = input.value;
      limit = PAGE_SIZE;
      render();
    });
    controls.append(field(label, input));
    selects[name] = input;
  }
  controls.append(button('Сбросить фильтры', reset, 'vb filter-reset'));
  filterPanel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && filterPanel.open) {
      filterPanel.open = false;
      filterPanel.querySelector('summary').focus();
    }
  });
  search.addEventListener('input', () => {
    filters.query = search.value;
    clearTimeout(searchTimer);
    limit = PAGE_SIZE;
    searchTimer = setTimeout(render, 100);
  });

  function reset(event) {
    search.value = '';
    Object.keys(filters).forEach(key => { filters[key] = ''; });
    Object.values(selects).forEach(input => { input.value = ''; });
    limit = PAGE_SIZE;
    render();
    if (event && document.activeElement === document.body) search.focus();
  }

  function updateTabs() {
    const entries = [['all', 'Все места'], ['featured', 'Подборка Астаны'], ['recommended', 'Для вас'], ['saved', 'Избранное']];
    tabs.replaceChildren(...entries.map(([id, label]) => {
      const item = button(label, () => {
        setView(id);
        [...tabs.children].find(tab => tab.dataset.view === id)?.focus();
      }, view === id ? 'on' : '');
      item.dataset.view = id;
      item.setAttribute('aria-pressed', String(view === id));
      return item;
    }));
  }

  function setView(next) {
    view = next;
    limit = PAGE_SIZE;
    updateTabs();
    render();
  }

  function ratingLine(rating) {
    const line = node('small', 'meta-row rating');
    const prefix = getSession().mode === 'demo' ? 'Демо · ' : '';
    line.append(icon('star'), node('span', '', prefix + rating.avg.toFixed(1) + ' · отзывов: ' + rating.count));
    return line;
  }

  function card(place, reason) {
    const article = node('article', 'card');
    article.dataset.place = place.id;
    const container = node('div', 'card-kicker');
    const category = categories[place.categoryIndex];
    article.dataset.category = category.id;
    container.append(node('span', '', category.name));
    if (place.type === 'idea') container.append(node('span', 'status-label', 'Идея'));
    const cover = place.images[0];
    if (cover && photoSource(cover.src)) {
      const image = node('img', 'card-cover');
      image.alt = '';
      image.loading = 'lazy';
      showPlacePhoto(image, cover, '(max-width: 600px) 94vw, 360px', () => {
        image.replaceWith(placeIllustration(place, 'card-cover card-cover-art'));
      });
      article.append(image);
    } else {
      article.append(placeIllustration(place, 'card-cover card-cover-art'));
    }
    const heading = node('h3');
    const title = link(place.name, placeHref(place.id), 'ttl');
    title.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openPlace(place, reason);
    });
    heading.append(title);
    article.append(heading, container, node('p', '', place.description));
    const where = place.address || place.city || place.region;
    if (where) article.append(node('span', 'meta-row', where));
    if (reason) article.append(node('p', 'recommendation-reason', reason));
    if (ratings[place.id]) article.append(ratingLine(ratings[place.id]));
    if (place.price.status !== 'unknown') article.append(node('span', 'meta-row', priceLabel(place.price)));

    article.append(favoriteButton(place, context, isSaved => {
      if (view === 'saved' && !isSaved) {
        render();
        (out.querySelector('.ttl') || out).focus({ preventScroll: true });
      }
    }));
    return article;
  }

  function empty(title, copy, action) {
    const state = node('section', 'card empty-state');
    state.append(node('h2', '', title), node('p', 'm', copy));
    if (action) state.append(action);
    out.replaceChildren(state);
  }

  function render() {
    renderVersion++;
    const version = renderVersion;
    const { profile } = getSession();
    const result = getResult();
    if (view === 'recommended' && !result) {
      empty('Подборка появится после теста', 'Ответьте на семь вопросов о планах и настроении.',
        button('Подобрать место', () => byId('start-quiz').click(), 'btn c'));
      return;
    }
    if (view === 'saved' && !profile.favorites.length) {
      empty('Избранное пока пусто', 'Сохраните любую карточку, чтобы вернуться к ней позже.',
        button('Открыть все места', () => setView('all'), 'btn c'));
      return;
    }
    let pool = places;
    if (view === 'saved') pool = places.filter(place => profile.favorites.includes(place.id));
    if (view === 'featured') pool = places.filter(place => place.source).sort((a, b) => photoPriority(b) - photoPriority(a));
    if (view === 'all') pool = [...places].sort((a, b) => photoPriority(b) - photoPriority(a));
    const visible = filterPlaces(pool, filters, ratings);
    if (!visible.length) {
      empty('Места не найдены', 'Попробуйте изменить запрос или убрать часть фильтров.',
        button('Сбросить фильтры', reset, 'btn c'));
      return;
    }
    const entries = view === 'recommended' ? rankPlaces(visible, result) : visible.map(place => ({ place }));
    const viewTitles = { all: 'Места и идеи отдыха', featured: 'Астана · карточки с источниками', recommended: 'Для вас', saved: 'Избранное' };
    const heading = node('h2', 'catalog-heading', viewTitles[view]);
    const header = node('div', 'catalog-results-heading');
    count.textContent = 'Показано ' + Math.min(limit, entries.length) + ' из ' + entries.length;
    header.append(heading, count);
    const grid = node('div', 'g showcase-grid');
    const renderBatch = (start, end) => grid.append(...entries.slice(start, end).map(({ place, reason }) => card(place, reason)));
    renderBatch(0, limit);
    out.replaceChildren(header, grid);
    if (entries.length > limit) {
      const more = button('Показать ещё', () => {
        if (version !== renderVersion) return;
        const start = limit;
        limit += PAGE_SIZE;
        renderBatch(start, limit);
        count.textContent = 'Показано ' + Math.min(limit, entries.length) + ' из ' + entries.length;
        grid.children[start]?.querySelector('.ttl')?.focus();
        if (entries.length <= limit) more.remove();
      }, 'btn load-more');
      out.append(more);
    }
  }

  function priceLabel(price) {
    const format = value => new Intl.NumberFormat('ru-KZ').format(value) + ' ₸';
    if (price.status === 'paid' && Number.isFinite(price.min)) {
      if (price.max === price.min) return format(price.min);
      if (Number.isFinite(price.max)) return format(price.min) + ' – ' + format(price.max);
      return 'От ' + format(price.min);
    }
    if (price.status === 'paid' && Number.isFinite(price.max)) return 'До ' + format(price.max);
    return labels[price.status];
  }

  return {
    setView,
    capture() { return { view, limit, filters: { ...filters }, expanded: filterPanel.open }; },
    restore(snapshot) {
      if (!snapshot) return;
      ({ view, limit } = snapshot);
      Object.assign(filters, snapshot.filters);
      search.value = filters.query;
      for (const [id, input] of Object.entries(selects)) input.value = filters[id];
      filterPanel.open = snapshot.expanded;
      updateTabs();
      render();
    },
    reset,
    async refresh({ redraw = true } = {}) {
      ratings = await api.ratings();
      if (redraw) { updateTabs(); render(); }
    }
  };
}
