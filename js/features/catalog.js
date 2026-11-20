import { categories, filterPlaces, hoursStatus, mapLink, places, safeHttps } from '../services/catalog.js';
import { rankPlaces } from '../services/recommendations.js';
import { byId, button, externalLink, field, node, runAction, select, toast } from '../components/ui.js';
import { icon } from '../components/icons.js';

const PAGE_SIZE = 24;
const labels = { free: 'Бесплатно', paid: 'Платно', unknown: 'Цена не указана' };
const statusLabels = { open: 'По графику открыто', closed: 'По графику закрыто', unknown: 'График не указан' };
const allOptions = ['','Все'];
const landmarkIcons = { 'mm-002': 'museum', 'mm-004': 'pyramid', 'mm-011': 'music' };

function placeIllustration(place, className) {
  const glyph = landmarkIcons[place.id] || categories[place.categoryIndex].icon;
  const illustration = node('div', className);
  illustration.dataset.illustration = glyph;
  illustration.setAttribute('aria-hidden', 'true');
  illustration.append(icon(glyph));
  return illustration;
}

export function createCatalog({ api, modal, getSession, getResult, afterWrite, social }) {
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
    const entries = [['all', 'Все места'], ['featured', 'Подборка Астаны'], ['recommended', 'Для вас', 'spark'], ['saved', 'Избранное', 'heart']];
    tabs.replaceChildren(...entries.map(([id, label, glyph]) => {
      const item = button(label, () => {
        setView(id);
        [...tabs.children].find(tab => tab.dataset.view === id)?.focus();
      }, view === id ? 'on' : '');
      item.dataset.view = id;
      item.setAttribute('aria-pressed', String(view === id));
      if (glyph) item.prepend(icon(glyph));
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

  function metadata(glyph, text) {
    const row = node('span', 'meta-row');
    row.append(icon(glyph), node('span', '', text));
    return row;
  }

  function imageSource(source) {
    return /^assets\/images\/[a-z\d-]+\.jpg$/.test(source) ? source : safeHttps(source);
  }

  function toggleLabel(control, glyph, label, checked) {
    control.replaceChildren(icon(glyph), node('span', '', label));
    control.setAttribute('aria-pressed', String(checked));
  }

  function card(place, reason) {
    const { profile } = getSession();
    const article = node('article', 'card');
    article.dataset.place = place.id;
    const container = node('div', 'card-kicker');
    const category = categories[place.categoryIndex];
    article.dataset.category = category.id;
    container.append(node('span', '', category.name));
    if (place.type === 'idea') container.append(node('span', 'status-label', 'Идея'));
    const cover = place.images[0];
    if (cover && imageSource(cover.src)) {
      const image = node('img', 'card-cover');
      image.src = imageSource(cover.src);
      image.alt = '';
      image.loading = 'lazy';
      article.append(image);
    } else {
      article.append(placeIllustration(place, 'card-cover card-cover-art'));
    }
    const heading = node('h3');
    heading.append(button(place.name, () => openPlace(place, reason), 'ttl'));
    article.append(container, heading, node('p', '', place.description));
    const where = place.address || place.city || place.region;
    if (where) article.append(metadata('pin', where));
    if (reason) article.append(node('p', 'recommendation-reason', reason));
    if (ratings[place.id]) article.append(ratingLine(ratings[place.id]));
    if (place.price.status !== 'unknown') article.append(metadata('calendar', priceLabel(place.price)));

    const actions = node('div', 'place-actions');
    const saved = profile.favorites.includes(place.id);
    const save = button('', runAction(async () => {
      const isSaved = await api.toggleFavorite(place.id);
      await afterWrite();
      if (view === 'saved' && !isSaved) {
        render();
        out.querySelector('.ttl')?.focus();
        if (!out.querySelector('.ttl')) out.focus();
      } else {
        toggleLabel(save, 'heart', isSaved ? 'Сохранено' : 'Сохранить', isSaved);
      }
      toast(isSaved ? 'Место сохранено' : 'Место убрано из избранного');
    }), 'vb');
    toggleLabel(save, 'heart', saved ? 'Сохранено' : 'Сохранить', saved);
    const details = button('Подробнее', () => openPlace(place, reason), 'btn quiet');
    details.append(icon('arrow'));
    actions.append(save, details);
    article.append(actions);
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
    if (view === 'featured') pool = places.filter(place => place.source);
    if (view === 'all') pool = [...places].sort((a, b) => Number(Boolean(b.source)) - Number(Boolean(a.source)));
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
        grid.children[start]?.querySelector('button')?.focus();
        if (entries.length <= limit) more.remove();
      }, 'btn load-more');
      out.append(more);
    }
  }

  function placeVisual(place) {
    const holder = node('figure', 'place-visual');
    const images = place.images.map(image => ({
      ...image, src: imageSource(image.src)
    })).filter(image => image.src);
    if (!images.length) return placeIllustration(place, 'place-illustration');
    let index = 0;
    const image = node('img');
    image.loading = 'lazy';
    const credit = node('figcaption', 'photo-credit m');
    const position = node('span', 'm');
    position.setAttribute('aria-live', 'polite');
    const change = offset => {
      index = (index + offset + images.length) % images.length;
      const photo = images[index];
      image.src = photo.src;
      image.alt = photo.alt || place.name;
      position.textContent = 'Фото ' + (index + 1) + ' из ' + images.length;
      credit.replaceChildren();
      if (safeHttps(photo.source)) credit.append(externalLink(photo.author, safeHttps(photo.source)));
      if (safeHttps(photo.licenseUrl)) credit.append(externalLink(photo.license, safeHttps(photo.licenseUrl)));
    };
    change(0);
    holder.append(image);
    if (images.length > 1) {
      const controls = node('div', 'photo-controls');
      const prev = button('', () => change(-1), 'vb icon-button');
      const next = button('', () => change(1), 'vb icon-button');
      prev.append(icon('left'));
      next.append(icon('chevron'));
      prev.setAttribute('aria-label', 'Предыдущее фото');
      next.setAttribute('aria-label', 'Следующее фото');
      controls.append(prev, position, next);
      holder.append(controls);
    }
    holder.append(credit);
    return holder;
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

  function openPlace(place, reason, focus) {
    const { mode, profile } = getSession();
    const category = categories[place.categoryIndex];
    const info = node('div', 'place-info');
    info.append(node('p', 'card-kicker', category.name + (place.type === 'idea' ? ' · Идея для отдыха' : '')));
    if (place.address || place.city || place.region) info.append(metadata('pin', place.address || place.city || place.region));
    info.append(node('p', '', place.description));
    if (reason) info.append(node('p', 'recommendation-reason', reason));
    if (place.type === 'place') {
      const status = hoursStatus(place);
      const facts = node('div', 'place-facts');
      facts.append(metadata('clock', statusLabels[status]), metadata('calendar', priceLabel(place.price)));
      info.append(facts);
    }
    if (ratings[place.id]) info.append(ratingLine(ratings[place.id]));
    const actions = node('div', 'place-actions');
    for (const action of [
      { glyph: 'heart', present: profile.favorites.includes(place.id), yes: 'Сохранено', no: 'Сохранить', toggle: () => api.toggleFavorite(place.id) },
      { glyph: 'check', present: profile.visits.some(visit => visit.placeId === place.id), yes: 'Вы были здесь', no: 'Был здесь', toggle: () => api.toggleVisit(place.id) }
    ]) {
      const item = button('', runAction(async () => {
        const next = await action.toggle();
        await afterWrite();
        toggleLabel(item, action.glyph, next ? action.yes : action.no, next);
        if (view === 'saved' && action.glyph === 'heart') render();
        else if (action.glyph === 'heart') {
          const saved = out.querySelector('[data-place="' + place.id + '"] .place-actions button');
          if (saved) toggleLabel(saved, 'heart', item.textContent, next);
        }
        toast(item.textContent);
      }), 'vb');
      toggleLabel(item, action.glyph, action.present ? action.yes : action.no, action.present);
      actions.append(item);
    }
    const map = externalLink('Найти на карте', mapLink(place));
    map.prepend(icon('pin'));
    actions.append(map);
    if (place.source && safeHttps(place.source)) actions.append(externalLink('Источник сведений', safeHttps(place.source)));
    if (mode !== 'guest') {
      actions.append(button('Отзывы', runAction(() => social().openReviews(place, () => openPlace(place, reason, 'Отзывы'))), 'vb'));
      actions.append(button('Предложить прогулку', runAction(() => social().openInvite(place, () => openPlace(place, reason, 'Предложить прогулку'))), 'vb'));
      actions.append(button('Реакции', runAction(() => social().openReactions(place, () => openPlace(place, reason, 'Реакции'))), 'vb'));
    }
    info.append(actions);
    const grid = node('div', 'place-detail-grid');
    grid.append(placeVisual(place), info);
    modal.show(place.name, [grid], { className: 'place-dialog', preserveFocus: focus });
  }

  return {
    setView,
    openPlace,
    reset,
    async refresh({ redraw = true } = {}) {
      ratings = await api.ratings();
      if (redraw) { updateTabs(); render(); }
    }
  };
}
