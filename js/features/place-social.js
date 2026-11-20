import { icon, ratingStars } from '../components/icons.js';
import { avatar, button, field, formatDate, node, runAction, toast } from '../components/ui.js';

function reviewRating(current) {
  const fieldset = node('fieldset', 'rating-field');
  const picker = node('div', 'rating-picker');
  for (let value = 1; value <= 5; value++) {
    const choice = node('label', 'rating-choice');
    const input = node('input', 'visually-hidden');
    input.type = 'radio';
    input.name = 'rating';
    input.value = String(value);
    input.checked = value === current;
    input.required = true;
    choice.append(input, icon('star'), node('span', 'visually-hidden', value + ' из 5'));
    picker.append(choice);
  }
  fieldset.append(node('legend', '', 'Оценка'), picker);
  return fieldset;
}

export function placeReviews(place, { api, getSession, afterWrite, openPerson, pickProfile }) {
  const section = node('section', 'place-section place-reviews');
  section.id = 'place-reviews';
  const heading = node('h2', '', 'Отзывы');
  heading.tabIndex = -1;
  const summary = node('div', 'review-summary');
  const action = button('Написать отзыв', () => edit(), 'btn quiet');
  const formHost = node('div');
  const list = node('div', 'social-list');
  list.append(node('p', 'm', 'Загружаем отзывы…'));
  section.append(heading, summary, action, formHost, list);
  const { mode, profile } = getSession();
  let own;
  if (mode === 'demo') section.append(node('p', 'm place-local-note', 'Отзывы вымышленных участников локального демо.'));
  if (mode === 'guest') {
    action.textContent = 'Выбрать профиль для отзыва';
    action.onclick = pickProfile;
  }

  function closeForm() {
    formHost.replaceChildren();
    action.hidden = false;
    action.focus({ preventScroll: true });
  }

  function edit() {
    if (mode === 'guest') return;
    const form = node('form', 'review-form');
    const rating = reviewRating(own?.rating || 5);
    const comment = node('textarea');
    comment.maxLength = 1000;
    comment.value = own?.text || '';
    comment.rows = 4;
    const feedback = node('p', 'form-error');
    feedback.setAttribute('role', 'alert');
    const submit = node('button', 'btn c', own ? 'Обновить отзыв' : 'Сохранить отзыв');
    submit.type = 'submit';
    const controls = node('div', 'place-actions');
    controls.append(submit, button('Отменить', closeForm, 'vb'));
    form.append(rating, field('Текст отзыва', comment), feedback, controls);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      feedback.textContent = '';
      try {
        await api.saveReview(place.id, Number(form.elements.rating.value), comment.value, { durable: true });
      } catch (error) {
        feedback.textContent = error.message;
        submit.disabled = false;
        return;
      }
      closeForm();
      toast('Отзыв сохранён');
      Promise.all([refresh(), afterWrite({ redraw: true })]).catch(error => toast(error.message));
    });
    action.hidden = true;
    formHost.replaceChildren(form);
    form.querySelector(':checked')?.focus();
  }

  async function reviewRow(review) {
    const article = node('article', 'place-review');
    const author = node('div', 'rh');
    const identity = node('div');
    identity.append(node('strong', '', review.author.name), node('p', 'm', formatDate(review.at)));
    author.append(avatar(review.author), identity);
    article.append(author, ratingStars(review.rating));
    if (review.text) article.append(node('p', 'message-text', review.text));
    if (mode === 'guest') return article;

    const controls = node('div', 'place-actions');
    if (profile.id === review.authorId) controls.append(button('Удалить отзыв', runAction(async () => {
      await api.deleteReview(review.id);
      if (formHost.children.length) closeForm();
      await Promise.all([refresh(), afterWrite({ redraw: true })]);
      action.focus({ preventScroll: true });
      toast('Отзыв удалён');
    }), 'vb'));
    else {
      const initial = await api.reactions(review.id);
      const votes = [['up', 'Полезно'], ['down', 'Не полезно']].map(([kind, label]) => {
        const control = button('', runAction(async () => {
          await api.toggleReaction(review.id, kind);
          paintVotes(await api.reactions(review.id));
          await afterWrite();
        }), 'vb');
        controls.append(control);
        return { kind, label, control };
      });
      function paintVotes(state) {
        for (const { kind, label, control } of votes) {
          control.textContent = label + ' · ' + state[kind].count;
          control.setAttribute('aria-pressed', String(state[kind].mine));
        }
      }
      paintVotes(initial);
      controls.append(button('Профиль автора', runAction(() => openPerson(review.authorId)), 'vb'));
    }
    article.append(controls);
    return article;
  }

  let request = 0;
  async function refresh() {
    const current = ++request;
    try {
      const rows = await api.reviews(place.id);
      const articles = await Promise.all(rows.map(reviewRow));
      if (current !== request) return;
      own = rows.find(row => row.authorId === profile.id);
      if (mode !== 'guest') action.textContent = own ? 'Редактировать отзыв' : 'Написать отзыв';
      summary.replaceChildren();
      if (rows.length) {
        const average = rows.reduce((total, row) => total + row.rating, 0) / rows.length;
        summary.append(node('strong', '', average.toFixed(1)), ratingStars(Math.round(average)), node('span', 'm', 'Оценок: ' + rows.length));
      }
      list.replaceChildren(...(articles.length ? articles : [node('p', 'm', 'Пока нет отзывов.')]));
    } catch {
      if (current === request) list.replaceChildren(node('p', 'm', 'Не удалось загрузить отзывы.'), button('Повторить', refresh, 'vb'));
    }
  }
  if (mode !== 'guest') action.disabled = true;
  refresh().finally(() => { action.disabled = false; });
  return { section, refresh };
}

export function placeReactions(place, { api, getSession, afterWrite, pickProfile }) {
  const section = node('section', 'place-section place-reactions');
  section.append(node('h2', '', 'Реакции'));
  const controls = node('div', 'reaction-row');
  section.append(controls);
  const guest = getSession().mode === 'guest';
  const reactions = [['like', 'Нравится'], ['go', 'Пойду'], ['recommend', 'Рекомендую']].map(([kind, label]) => {
    const count = node('span', 'reaction-count');
    const control = button('', runAction(async () => {
      if (guest) return pickProfile();
      await api.toggleReaction(place.id, kind);
      await refresh();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) control.animate([{ scale: .97 }, { scale: 1 }], 170);
      await afterWrite();
    }), 'reaction');
    control.append(node('span', '', label), count);
    control.setAttribute('aria-pressed', 'false');
    controls.append(control);
    return { kind, control, count };
  });
  async function refresh() {
    try {
      const state = await api.reactions(place.id);
      for (const { kind, control, count } of reactions) {
        count.textContent = state[kind].count;
        control.setAttribute('aria-pressed', String(state[kind].mine));
      }
    } catch (error) { toast(error.message); }
  }
  refresh();
  return { section, refresh };
}
