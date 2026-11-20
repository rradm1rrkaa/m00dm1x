import { avatar, button, field, node, runAction, toast } from '../components/ui.js';
import { plannedVisit, visitParts } from '../services/visit-time.js';
import { photoSource, showPlacePhoto } from '../components/place-photo.js';

export function createWalkPlanner({ api, modal, getSession, afterWrite, openPeople, openChat, pickProfile }) {
  return async function plan(place, returnToPlace) {
    if (getSession().mode === 'guest') return pickProfile();
    const people = (await api.people()).filter(person => person.related);
    const options = { className: 'walk-planner', footer: false };
    const preview = node('div', 'walk-place');
    const photo = place.images.find(image => photoSource(image.src));
    if (photo) {
      const image = node('img');
      image.alt = '';
      showPlacePhoto(image, photo, '88px', () => image.remove());
      preview.append(image);
    }
    preview.append(node('strong', '', place.name));
    if (!people.length) return modal.show('Запланировать прогулку', [
      preview, node('p', 'm', 'Добавьте друга, чтобы отправить приглашение.'),
      button('Найти друзей', runAction(() => openPeople()), 'btn c')
    ], options);

    const form = node('form', 'walk-form');
    const friends = node('fieldset', 'walk-friends');
    friends.append(node('legend', '', 'Кого позвать'));
    for (const person of people) {
      const choice = node('label', 'walk-friend');
      const radio = node('input');
      radio.type = 'radio';
      radio.name = 'friend';
      radio.value = person.id;
      radio.required = true;
      const identity = node('span', 'walk-friend-name');
      identity.append(node('strong', '', person.name), node('small', 'm', person.lastMood || (getSession().mode === 'demo' ? 'Демопрофиль' : 'Локальный профиль')));
      choice.append(radio, avatar(person, 'sm'), identity);
      friends.append(choice);
    }
    const date = node('input');
    date.type = 'date';
    date.required = true;
    date.min = visitParts(new Date()).date;
    const time = node('input');
    time.type = 'time';
    time.required = true;
    const schedule = node('div', 'walk-schedule');
    schedule.append(field('Дата', date), field('Время в Астане', time));
    const comment = node('textarea');
    comment.rows = 3;
    comment.maxLength = 300;
    const feedback = node('p', 'form-error');
    feedback.setAttribute('role', 'alert');
    const submit = node('button', 'btn c', 'Отправить приглашение');
    submit.type = 'submit';
    const actions = node('div', 'place-actions');
    actions.append(submit, button('Отменить', () => modal.close(), 'vb'));
    form.append(friends, schedule, field('Комментарий (необязательно)', comment), feedback, actions);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      feedback.textContent = '';
      const friend = people.find(person => person.id === form.elements.friend.value);
      try {
        if (!friend) throw new Error('Выберите друга.');
        const when = plannedVisit(date.value, time.value);
        await api.send(friend.id, comment.value, place.id, when);
      } catch (error) {
        feedback.textContent = error.message;
        submit.disabled = false;
        return;
      }
      if (!form.isConnected) return;
      modal.show('Приглашение сохранено', [
        preview,
        node('p', 'm', 'Приглашение для ' + friend.name + ' появилось в локальной переписке.'),
        button('Открыть Direct', runAction(() => openChat(friend.id, returnToPlace)), 'btn c')
      ], options);
      await afterWrite().catch(error => toast(error.message));
    });
    modal.show('Запланировать прогулку', [preview, form], options);
  };
}
