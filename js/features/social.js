import { placeById } from '../services/catalog.js';
import { createMessenger } from './messenger.js';
import { avatar, button, formatDate, node, runAction, toast } from '../components/ui.js';

function personRow(profile) {
  const card = node('div', 'rv');
  const title = node('div', 'rh');
  title.append(avatar(profile, 'sm'), node('strong', '', profile.name));
  card.append(title);
  if (profile.lastMood) card.append(node('p', 'm', profile.lastMood));
  return card;
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

  return { openPeople, openPerson, openChats, openChat, refreshChat: messenger.refresh };
}
