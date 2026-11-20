import { placeById } from '../services/catalog.js';
import { createMessenger } from './messenger.js';
import { icon, ratingStars } from '../components/icons.js';
import { avatar, button, field, formatDate, node, runAction, toast } from '../components/ui.js';

function personRow(profile) {
  const card = node('div', 'rv');
  const title = node('div', 'rh');
  title.append(avatar(profile, 'sm'), node('strong', '', profile.name));
  card.append(title);
  if (profile.lastMood) card.append(node('p', 'm', profile.lastMood));
  return card;
}

function reviewRating(current) {
  const fieldset = node('fieldset', 'rating-field');
  const picker = node('div', 'rating-picker');
  for (let value = 1; value <= 5; value++) {
    const choice = node('label', 'rating-choice');
    const input = node('input', 'visually-hidden');
    input.type = 'radio';
    input.name = 'rating';
    input.value = String(value);
    input.checked = current === value;
    choice.append(input, icon('star'), node('span', 'visually-hidden', value + ' из 5'));
    picker.append(choice);
  }
  fieldset.append(node('legend', '', 'Оценка'), picker);
  return fieldset;
}

export function createSocial({ api, modal, getSession, getResult, afterWrite, workspace }) {
  const messenger = createMessenger({ api, workspace, modal, getSession, afterWrite, openPeople });

  function show(title, content, options = {}) {
    modal.show(title, content, options);
  }

  async function openPerson(profileId, back) {
    const profile = await api.publicProfile(profileId);
    const body = personRow(profile);
    if (profile.createdAt) body.append(node('p', 'm', 'Профиль создан ' + formatDate(profile.createdAt)));
    if (profile.visits?.length) {
      body.append(node('h3', '', 'Посещённые места'));
      const list = node('ul');
      for (const visit of profile.visits.slice(-5).reverse()) list.append(node('li', '', placeById(visit.placeId)?.name));
      body.append(list);
    }
    show('Профиль участника', [body], { back });
  }

  function relationshipActions(profile, redraw) {
    const controls = node('div', 'place-actions');
    const perform = (label, task, message) => button(label, runAction(async () => {
      await task();
      await afterWrite();
      await redraw();
      toast(message);
    }), 'vb');
    if (profile.related) {
      controls.append(button('Написать', runAction(() => openChat(profile.id, redraw)), 'vb'),
        perform('Убрать из друзей', () => api.removeFriend(profile.id), 'Удалён из друзей'));
    } else if (profile.incoming) {
      controls.append(perform('Принять', () => api.replyFriend(profile.incoming, 'accept'), 'Заявка принята'),
        perform('Отклонить', () => api.replyFriend(profile.incoming, 'decline'), 'Заявка отклонена'));
    } else if (profile.outgoing) {
      controls.append(perform('Отменить заявку', () => api.replyFriend(profile.outgoing, 'cancel'), 'Заявка отменена'));
    } else controls.append(perform('Добавить в друзья', () => api.addFriend(profile.id), 'Заявка отправлена'));
    controls.append(button('Профиль', runAction(() => openPerson(profile.id, redraw)), 'vb'));
    return controls;
  }

  async function openPeople(onlyConnections = false) {
    const people = await api.people(getResult()?.categories);
    const visible = people.filter(person => !onlyConnections || person.related || person.incoming || person.outgoing);
    const scope = node('div', 'social-list');
    const search = node('input');
    search.type = 'search';
    search.setAttribute('aria-label', 'Поиск по имени');
    search.placeholder = 'Найти по имени';
    const filters = node('div', 'field-row people-filters');
    const redraw = () => openPeople(onlyConnections);
    for (const [label, mine] of [['Мои связи', true], ['Найти друзей', false]]) {
      const item = button(label, runAction(() => openPeople(mine)), 'btn');
      item.setAttribute('aria-pressed', String(mine === onlyConnections));
      filters.append(item);
    }
    function render() {
      const query = search.value.trim().toLocaleLowerCase('ru');
      scope.replaceChildren();
      for (const person of visible.filter(person => person.name.toLocaleLowerCase('ru').includes(query))) {
        const card = personRow(person);
        const status = person.incoming ? 'Входящая заявка' : person.outgoing ? 'Заявка отправлена' : person.related ? 'В друзьях' : person.sharedCategories ? 'Есть общие предпочтения' : '';
        if (status) card.append(node('span', 'status-label', status));
        card.append(relationshipActions(person, redraw));
        scope.append(card);
      }
      if (!scope.children.length) scope.append(node('p', 'm', query ? 'По этому имени никого не найдено.' : onlyConnections ? 'Друзей и заявок пока нет.' : 'Других локальных профилей пока нет.'));
    }
    search.addEventListener('input', render);
    render();
    show('Друзья и заявки', [filters, search, scope], { className: 'people-panel' });
  }

  function openChats() {
    return messenger.show();
  }

  function openChat(profileId, back) {
    return messenger.show(profileId, back);
  }

  async function openInvite(place, back) {
    const people = (await api.people()).filter(person => person.related);
    if (!people.length) {
      show('Предложить прогулку', [node('p', 'm', 'Добавьте друзей, чтобы отправить приглашение.'),
        button('Найти друзей', runAction(() => openPeople()))], { back });
      return;
    }
    const when = node('input');
    when.maxLength = 300;
    when.placeholder = 'Например, в субботу в 18:00';
    const peopleList = node('div', 'social-list');
    for (const person of people) {
      const card = personRow(person);
      card.append(button('Пригласить', runAction(async () => {
        await api.send(person.id, when.value, place.id);
        await openChat(person.id, () => openInvite(place, back));
        toast('Локальное приглашение добавлено в чат');
      }), 'vb'));
      peopleList.append(card);
    }
    show('Прогулка · ' + place.name, [field('Когда? (необязательно)', when), peopleList], { back });
  }

  async function openReviews(place, back) {
    const { profile, mode } = getSession();
    const reviews = await api.reviews(place.id);
    const own = reviews.find(row => row.authorId === profile.id);
    const form = node('form', 'review-form');
    const comment = node('textarea');
    comment.maxLength = 1000;
    comment.value = own?.text || '';
    const submit = node('button', 'btn c', own ? 'Обновить отзыв' : 'Опубликовать отзыв');
    submit.type = 'submit';
    form.append(reviewRating(own?.rating || 5), field('Текст отзыва', comment), submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        await api.saveReview(place.id, Number(form.elements.rating.value), comment.value);
        await afterWrite({ redraw: true });
        await openReviews(place, back);
        toast('Отзыв сохранён');
      } catch (error) { toast(error.message); }
      finally { submit.disabled = false; }
    });
    const list = node('div', 'social-list');
    if (!reviews.length) list.append(node('p', 'm', 'Пока нет отзывов.'));
    for (const row of reviews) {
      const card = personRow(row.author);
      const reactions = await api.reactions(row.id);
      const rating = node('p', 'review-meta');
      rating.append(ratingStars(row.rating), node('span', 'm', formatDate(row.at)));
      card.append(rating);
      if (row.text) card.append(node('p', 'message-text', row.text));
      const controls = node('div', 'place-actions');
      if (row.authorId === profile.id) controls.append(button('Удалить отзыв', runAction(async () => {
        await api.deleteReview(row.id);
        await afterWrite({ redraw: true });
        await openReviews(place, back);
        toast('Отзыв удалён');
      }), 'vb'));
      else {
        for (const [kind, label] of [['up', 'Полезно'], ['down', 'Не полезно']]) {
          const vote = button(label + ' · ' + reactions[kind].count, runAction(async () => {
            await api.toggleReaction(row.id, kind);
            const updated = await api.reactions(row.id);
            for (const item of controls.querySelectorAll('[data-reaction]')) {
              const state = updated[item.dataset.reaction];
              item.textContent = item.dataset.label + ' · ' + state.count;
              item.setAttribute('aria-pressed', String(state.mine));
            }
            await afterWrite();
          }), 'vb');
          vote.dataset.reaction = kind;
          vote.dataset.label = label;
          vote.setAttribute('aria-pressed', String(reactions[kind].mine));
          controls.append(vote);
        }
        controls.append(button('Профиль автора', runAction(() => openPerson(row.authorId, () => openReviews(place, back))), 'vb'));
      }
      card.append(controls);
      list.append(card);
    }
    show('Отзывы · ' + place.name, [node('p', 'm', mode === 'demo' ? 'Отзывы демонстрационных профилей' : 'Отзывы из этого браузера'), form, list], { back });
  }

  async function openReactions(place, back) {
    const reactions = await api.reactions(place.id);
    const controls = node('div', 'place-actions');
    for (const [kind, label] of [['like', 'Нравится'], ['go', 'Пойду'], ['recommend', 'Рекомендую']]) {
      const item = button(label + ' · ' + reactions[kind].count, runAction(async () => {
        await api.toggleReaction(place.id, kind);
        const updated = (await api.reactions(place.id))[kind];
        item.textContent = label + ' · ' + updated.count;
        item.setAttribute('aria-pressed', String(updated.mine));
        await afterWrite();
      }), 'vb');
      item.setAttribute('aria-pressed', String(reactions[kind].mine));
      controls.append(item);
    }
    show('Реакции · ' + place.name, [controls], { back });
  }

  return { openPeople, openChats, openInvite, openReviews, openReactions, refreshChat: messenger.refresh };
}
