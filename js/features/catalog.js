import { categories, filterPlaces, hoursStatus, mapLink, places, safeHttps } from '../services/catalog.js';
import { rankPlaces } from '../services/recommendations.js';
import { byId, button, externalLink, field, node, runAction, select, toast } from '../components/ui.js';

const PAGE_SIZE = 24;
const labels = { free: 'Бесплатно', paid: 'Платно', unknown: 'Цена не указана' };
const statusLabels = { open: 'По графику открыто', closed: 'По графику закрыто', unknown: 'График не указан' };
const allOptions = ['','Все'];

export function createCatalog({ api, modal, getSession, getResult, afterWrite, social }) {
  const out = byId('out');
  const tabs = byId('tabs');
  const search = byId('q');
  const filters = { query: '', category: '', type: '', price: '', hours: '', rating: '' };
  const operands = [
    ['category', 'Категория', [allOptions, ...categories.map(category => [category.id, category.name])]],
    ['type', 'Формат', [allOptions, ['place', 'Места'], ['idea', 'Идеи']]],
    ['rating', 'Оценка', [allOptions, ['4', '4★ и выше'], ['3', '3★ и выше'], ['rated', 'Есть отзывы'], ['unrated', 'Без отзывов']]],
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
    const entries = [['all', 'Все места'], ['featured', 'Подборка Астаны'], ['recommended', '✨ Для вас'], ['saved', '♥ Избранное']];
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

  function ratingText(rating) {
    return rating ? '★ ' + rating.avg.toFixed(1) + ' · отзывов: ' + rating.count : 'Пока нет оценок';
  }

  function card(place, reason) {
    const { profile } = getSession();
    const article = node('article', 'card');
    const container = node('div', 'card-kicker');
    const category = categories[place.categoryIndex];
    container.append(node('span', '', category.icon + ' ' + category.name),
      node('span', 'format-label', place.type === 'idea' ? 'Идея' : 'Место'));
    const heading = node('h3');
    heading.append(button(place.name, () => openPlace(place, reason), 'ttl'));
    article.append(container, heading, node('p', '', place.description));
    const where = place.address || place.city || place.region;
    if (where) article.append(node('small', '', '📍 ' + where));
    if (reason) article.append(node('p', 'recommendation-reason', reason));
    if (ratings[place.id]) article.append(node('p', 'rt', (getSession().mode === 'demo' ? 'Демо · ' : '') + ratingText(ratings[place.id])));

    const actions = node('div', 'place-actions');
    const saved = profile.favorites.includes(place.id);
    const save = button(saved ? '♥ Сохранено' : '♡ Сохранить', runAction(async () => {
      const isSaved = await api.toggleFavorite(place.id);
      await afterWrite();
      if (view === 'saved' && !isSaved) {
        render();
        out.querySelector('.ttl')?.focus();
        if (!out.querySelector('.ttl')) out.focus();
      } else {
        save.textContent = isSaved ? '♥ Сохранено' : '♡ Сохранить';
        save.setAttribute('aria-pressed', String(isSaved));
      }
      toast(isSaved ? 'Место сохранено' : 'Место убрано из избранного');
    }), 'vb');
    save.setAttribute('aria-pressed', String(saved));
    actions.append(save, button('Подробнее', () => openPlace(place, reason), 'vb'));
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
    count.textContent = 'Показано ' + Math.min(limit, entries.length) + ' из ' + entries.length;
    const grid = node('div', 'g showcase-grid');
    const renderBatch = (start, end) => grid.append(...entries.slice(start, end).map(({ place, reason }) => card(place, reason)));
    renderBatch(0, limit);
    out.replaceChildren(heading, count, grid);
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
      ...image, src: /^assets\/images\/[a-z\d-]+\.jpg$/.test(image.src) ? image.src : safeHttps(image.src)
    })).filter(image => image.src);
    if (!images.length) {
      holder.classList.add('place-illustration');
      holder.append(node('span', '', categories[place.categoryIndex].icon));
      holder.setAttribute('aria-hidden', 'true');
      return holder;
    }
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
      const prev = button('‹', () => change(-1), 'vb');
      const next = button('›', () => change(1), 'vb');
      prev.setAttribute('aria-label', 'Предыдущее фото');
      next.setAttribute('aria-label', 'Следующее фото');
      controls.append(prev, position, next);
      holder.append(controls);
    }
    holder.append(credit);
    return holder;
  }

  function openPlace(place, reason, focus) {
    const { mode, profile } = getSession();
    const category = categories[place.categoryIndex];
    const info = node('div', 'place-info');
    info.append(node('p', 'card-kicker', category.icon + ' ' + category.name + ' · ' + (place.type === 'idea' ? 'Идея для отдыха' : 'Место')));
    if (place.address) info.append(node('p', '', '📍 ' + place.address));
    else if (place.city || place.region) info.append(node('p', '', '📍 ' + (place.city || place.region)));
    info.append(node('p', '', place.description));
    if (reason) info.append(node('p', 'recommendation-reason', reason));
    if (place.type === 'place') {
      const status = hoursStatus(place);
      const { price } = place;
      const format = value => new Intl.NumberFormat('ru-KZ').format(value) + ' ₸';
      let cost = labels[price.status];
      if (price.status === 'paid' && Number.isFinite(price.min)) {
        cost = Number.isFinite(price.max) && price.max !== price.min
          ? format(price.min) + ' – ' + format(price.max) : price.max === price.min ? format(price.min) : 'От ' + format(price.min);
      } else if (price.status === 'paid' && Number.isFinite(price.max)) cost = 'До ' + format(price.max);
      info.append(node('p', 'm', statusLabels[status] + ' · ' + cost));
      if (!place.source) info.append(node('p', 'm', 'Сведения требуют проверки перед визитом.'));
    }
    if (ratings[place.id]) info.append(node('p', 'm', ratingText(ratings[place.id])));
    const actions = node('div', 'place-actions');
    for (const action of [
      { present: profile.favorites.includes(place.id), yes: '♥ Сохранено', no: '♡ Сохранить', toggle: () => api.toggleFavorite(place.id) },
      { present: profile.visits.some(visit => visit.placeId === place.id), yes: '✔ Вы были здесь', no: '✔ Был здесь', toggle: () => api.toggleVisit(place.id) }
    ]) {
      const item = button(action.present ? action.yes : action.no, runAction(async () => {
        const next = await action.toggle();
        await afterWrite();
        item.textContent = next ? action.yes : action.no;
        item.setAttribute('aria-pressed', String(next));
        if (view === 'saved' && action.no.includes('Сохранить')) render();
        else if (action.no.includes('Сохранить')) {
          const saved = [...out.querySelectorAll('.card')].find(element => element.querySelector('.ttl')?.textContent === place.name)?.querySelector('.place-actions button');
          if (saved) { saved.textContent = item.textContent; saved.setAttribute('aria-pressed', String(next)); }
        }
        toast(item.textContent);
      }), 'vb');
      item.setAttribute('aria-pressed', String(action.present));
      actions.append(item);
    }
    actions.append(externalLink('Найти на карте', mapLink(place)));
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
