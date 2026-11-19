import { placeById } from '../services/catalog.js';
import { avatar, button, field, formatDate, node, runAction, toast } from '../components/ui.js';

function personRow(profile) {
  const card = node('div', 'rv');
  const title = node('div', 'rh');
  title.append(avatar(profile, 'sm'), node('strong', '', profile.name));
  card.append(title);
  if (profile.lastMood) card.append(node('p', 'm', profile.lastMood));
  return card;
}

const statusText = { pending: 'Ожидает ответа', accepted: 'Принято', declined: 'Отклонено' };

export function createSocial({ api, modal, getSession, getResult, afterWrite }) {
  let chatRefresh;

  function show(title, content, options = {}) {
    chatRefresh = null;
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
    const title = onlyConnections ? 'Друзья и заявки' : 'Найти друзей';
    const scope = node('div', 'social-list');
    const redraw = () => openPeople(onlyConnections);
    for (const person of visible) {
      const card = personRow(person);
      if (person.sharedCategories) card.append(node('p', 'm', 'Есть общие предпочтения'));
      if (person.incoming) card.append(node('p', 'm', 'Входящая заявка'));
      if (person.outgoing) card.append(node('p', 'm', 'Заявка отправлена'));
      card.append(relationshipActions(person, redraw));
      scope.append(card);
    }
    if (!visible.length) scope.append(node('p', 'm', onlyConnections ? 'Друзей и заявок пока нет.' : 'Других локальных профилей пока нет.'));
    const switcher = onlyConnections ? 'Найти друзей' : 'Мои друзья и заявки';
    show(title, [scope, button(switcher, runAction(() => openPeople(!onlyConnections)))]);
  }

  async function openChats() {
    const chats = await api.chats();
    const list = node('div', 'social-list');
    for (const chat of chats) {
      const action = button('', runAction(() => openChat(chat.id, openChats)), 'rv chat-list-button');
      const header = node('span', 'rh');
      header.append(avatar(chat, 'sm'), node('strong', '', chat.name));
      if (chat.unread) header.append(node('span', 'bd', String(chat.unread)));
      const last = chat.last?.placeId ? 'Приглашение на прогулку' : chat.last?.text || 'Сообщений пока нет';
      action.append(header, node('span', 'm', last.slice(0, 85)));
      list.append(action);
    }
    if (!chats.length) list.append(node('p', 'm', 'Добавьте друзей, чтобы начать локальный чат.'),
      button('Найти друзей', runAction(() => openPeople())));
    show('Чаты', [list]);
  }

  async function openChat(profileId, back = openChats) {
    const chat = await api.chat(profileId);
    const { profile } = getSession();
    const transcript = node('div', 'cm transcript');
    transcript.setAttribute('role', 'log');
    transcript.setAttribute('aria-label', 'Сообщения');
    const body = [transcript];
    const form = node('form', 'cin chat-form');
    const input = node('input');
    input.maxLength = 1000;
    input.required = true;
    input.placeholder = 'Текст сообщения';
    const submit = node('button', 'vb', 'Отправить');
    submit.type = 'submit';
    const footer = node('p', 'm');
    form.append(field('Сообщение', input), submit);
    body.push(form, footer);
    let signature;

    function paint(next) {
      form.hidden = !next.canSend;
      footer.textContent = next.canSend ? '' : 'Переписка доступна для чтения. Отправка доступна друзьям.';
      const nextSignature = JSON.stringify(next.messages);
      if (signature === nextSignature) return;
      signature = nextSignature;
      const atBottom = transcript.scrollHeight - transcript.clientHeight - transcript.scrollTop < 60;
      transcript.replaceChildren();
      if (!next.messages.length) transcript.append(node('p', 'm', 'Здесь появится первое сообщение.'));
      for (const message of next.messages) {
        const bubble = node('article', message.from === profile.id ? 'bubble mine' : 'bubble');
        if (message.placeId) {
          bubble.append(node('strong', '', 'Прогулка · ' + (placeById(message.placeId)?.name || 'Место недоступно')));
          bubble.append(node('span', 'm', statusText[message.status]));
        }
        if (message.text) bubble.append(node('p', 'message-text', message.text));
        bubble.append(node('small', 'm', formatDate(message.at)));
        if (message.placeId && message.to === profile.id && message.status === 'pending') {
          const actions = node('div', 'place-actions');
          for (const [status, name] of [['accepted', 'Принять прогулку'], ['declined', 'Отклонить прогулку']]) {
            actions.append(button(name, runAction(async () => {
              await api.replyWalk(message.id, status);
              await afterWrite();
              await refresh();
              input.focus();
            }), 'vb'));
          }
          bubble.append(actions);
        }
        transcript.append(bubble);
      }
      if (atBottom) transcript.scrollTop = transcript.scrollHeight;
    }

    async function refresh() {
      if (!transcript.isConnected || !transcript.closest('dialog')?.open) return;
      const next = await api.chat(profileId);
      if (transcript.isConnected) paint(next);
    }

    let sending = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !input.value.trim()) return;
      sending = true;
      submit.disabled = true;
      try {
        await api.send(profileId, input.value);
        input.value = '';
        await afterWrite();
        await refresh();
      } catch (error) { toast(error.message); }
      finally { sending = false; submit.disabled = false; input.focus(); }
    });
    show('Чат · ' + chat.profile.name, body, { back });
    paint(chat);
    transcript.scrollTop = transcript.scrollHeight;
    chatRefresh = refresh;
    await afterWrite();
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
    const rating = node('select');
    for (let i = 1; i <= 5; i++) {
      const option = node('option', '', String(i) + ' из 5');
      option.value = i;
      rating.append(option);
    }
    rating.value = String(own?.rating || 5);
    const comment = node('textarea');
    comment.maxLength = 1000;
    comment.value = own?.text || '';
    const submit = node('button', 'btn c', own ? 'Обновить отзыв' : 'Опубликовать отзыв');
    submit.type = 'submit';
    form.append(field('Оценка', rating), field('Текст отзыва', comment), submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        await api.saveReview(place.id, Number(rating.value), comment.value);
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
      card.append(node('p', '', '★ ' + row.rating + '/5 · ' + formatDate(row.at)));
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

  return { openPeople, openChats, openInvite, openReviews, openReactions, refreshChat: () => chatRefresh?.() };
}
