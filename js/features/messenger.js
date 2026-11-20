import { placeById } from '../services/catalog.js';
import { avatar, button, formatDate, node, runAction, toast } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { VISIT_ZONE } from '../services/visit-time.js';
import { wallpaperControl } from './chat-wallpaper.js';
import { mountAtmosphere } from '../theme/atmosphere.js';
import { ATMOSPHERE_CHANGE, currentAtmosphere, isAtmosphere } from '../theme/themes.js';

const statusText = { pending: 'Ожидает ответа', accepted: 'Принято', declined: 'Отклонено' };
const textFor = message => message?.placeId ? 'Приглашение на прогулку' : message?.text || 'Сообщений пока нет';

function displayTime(value, short = false) {
  if (!value) return '';
  const sameDay = new Date(value).toDateString() === new Date().toDateString();
  if (!short || sameDay) return new Intl.DateTimeFormat('ru-KZ', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  return new Intl.DateTimeFormat('ru-KZ', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export function createMessenger({ api, workspace, modal, getSession, afterWrite, openPeople }) {
  let updateThread, refreshAtmosphere;
  const drafts = new Map();
  document.addEventListener(ATMOSPHERE_CHANGE, () => refreshAtmosphere?.());

  async function show(selectedId = null, back = null, query = '') {
    modal.close();
    const { profile } = getSession();
    const [conversations, settings] = await Promise.all([api.chats(), api.settings()]);
    const layout = node('div', 'messenger');
    const art = node('div', 'chat-art scene-art');
    art.setAttribute('aria-hidden', 'true');
    const scene = mountAtmosphere(art, { context: 'chat', onError: toast });
    const wallpaper = wallpaperControl(api, layout, settings.chatWallpaper, syncAppearance);

    function syncAppearance() {
      if (!layout.isConnected) return;
      const mode = layout.dataset.wallpaper;
      const theme = mode === 'theme' ? currentAtmosphere() : mode;
      if (isAtmosphere(theme)) {
        scene.show(theme, applied => { layout.dataset.chatAtmosphere = applied; });
      } else {
        scene.clear();
        layout.dataset.chatAtmosphere = 'neutral';
      }
    }
    function showMessenger(focus) {
      workspace.show('messages', layout, focus, { threadId: selectedId });
      refreshAtmosphere = syncAppearance;
      syncAppearance();
    }
    const sidebar = node('aside', 'messenger-sidebar');
    const listTitle = node('div', 'messenger-list-title');
    const leave = button('', runAction(async () => {
      workspace.close();
      if (back) await back();
    }), 'btn quiet icon-button');
    leave.setAttribute('aria-label', 'Выйти из сообщений');
    leave.append(icon('back'));
    const heading = node('h1', '', 'Direct');
    const listActions = node('div', 'messenger-list-actions');
    if (!selectedId) listActions.append(wallpaper.panel);
    listActions.append(leave);
    listTitle.append(heading, listActions);
    const search = node('input');
    search.type = 'search';
    search.placeholder = 'Поиск диалогов';
    search.value = query;
    search.setAttribute('aria-label', 'Поиск диалогов');
    const searchbox = node('div', 'messenger-search');
    searchbox.append(icon('search'), search);
    const list = node('nav', 'conversation-list');
    list.setAttribute('aria-label', 'Диалоги');
    sidebar.append(listTitle, searchbox, list);
    const active = node('section', 'messenger-thread');
    active.setAttribute('aria-label', 'Переписка');
    active.append(art);
    layout.append(sidebar, active);
    if (selectedId) layout.dataset.thread = 'open';

    function paintList(chats) {
      const focused = list.contains(document.activeElement) ? document.activeElement.dataset.chatId : null;
      list.replaceChildren();
      const query = search.value.trim().toLocaleLowerCase('ru');
      for (const chat of chats) {
        if (![chat.name, textFor(chat.last)].some(text => text.toLocaleLowerCase('ru').includes(query))) continue;
        const item = button('', runAction(() => show(chat.id, back, search.value)), 'chat-list-button');
        item.dataset.chatId = chat.id;
        if (chat.id === selectedId) item.setAttribute('aria-current', 'page');
        const copy = node('span', 'conversation-copy');
        const line = node('span', 'conversation-title');
        line.append(node('strong', '', chat.name));
        if (chat.last?.at) {
          const time = node('time', 'm', displayTime(chat.last.at, true));
          time.dateTime = chat.last.at;
          line.append(time);
        }
        const preview = node('span', 'conversation-preview');
        const excerpt = textFor(chat.last);
        preview.append(node('span', 'm', excerpt.length > 92 ? excerpt.slice(0, 92) + '…' : excerpt));
        if (chat.unread) {
          const badge = node('span', 'bd', String(chat.unread));
          badge.setAttribute('aria-label', 'Непрочитанных: ' + chat.unread);
          preview.append(badge);
        }
        copy.append(line, preview);
        item.append(avatar(chat), copy);
        list.append(item);
      }
      if (!list.children.length) {
        list.append(node('p', 'conversation-empty m', query ? 'Диалоги по этому запросу не найдены.' : 'Диалогов пока нет.'));
        if (!query) list.append(button('Найти друзей', runAction(() => openPeople()), 'vb'));
      }
      if (focused) [...list.children].find(item => item.dataset.chatId === focused)?.focus({ preventScroll: true });
    }

    let visibleChats = conversations;
    search.addEventListener('input', () => paintList(visibleChats));
    paintList(visibleChats);

    if (!selectedId) {
      const empty = node('div', 'messenger-empty');
      empty.append(node('h2', '', conversations.length ? 'Выберите диалог' : 'Начните переписку'),
        node('p', 'm', conversations.length ? 'Здесь откроется история сообщений.' : 'Найдите друзей и напишите первое сообщение.'));
      active.append(empty);
      updateThread = async () => {
        if (!layout.isConnected) return;
        visibleChats = await api.chats();
        wallpaper.apply((await api.settings()).chatWallpaper);
        if (layout.isConnected) paintList(visibleChats);
      };
      showMessenger(true);
      return;
    }

    const firstThread = await api.chat(selectedId);
    const header = node('header', 'thread-header');
    const backButton = button('', runAction(() => show(null, back, search.value)), 'btn quiet icon-button thread-back');
    backButton.setAttribute('aria-label', 'К списку диалогов');
    backButton.append(icon('back'));
    const identity = node('div', 'thread-identity');
    const title = node('h2', '', firstThread.profile.name);
    title.tabIndex = -1;
    identity.append(title, node('p', 'm', getSession().mode === 'demo' ? 'Демонстрационный профиль' : 'Локальный профиль'));
    header.append(backButton, avatar(firstThread.profile), identity, wallpaper.panel);
    const transcript = node('div', 'transcript');
    transcript.setAttribute('role', 'log');
    transcript.setAttribute('aria-label', 'Сообщения');
    transcript.tabIndex = 0;

    const draftKey = profile.id + '|' + selectedId;
    const form = node('form', 'chat-form');
    const input = node('textarea');
    input.rows = 1;
    input.maxLength = 1000;
    input.value = drafts.get(draftKey) || '';
    input.setAttribute('aria-label', 'Сообщение');
    input.placeholder = 'Напишите сообщение';
    const submit = node('button', 'btn c icon-button chat-send');
    submit.type = 'submit';
    submit.setAttribute('aria-label', 'Отправить');
    submit.append(icon('send'));
    const readOnly = node('p', 'm thread-readonly', 'Переписка доступна для чтения. Отправка доступна друзьям.');
    form.append(input, submit);
    active.append(header, transcript, form, readOnly);
    let sending = false, signature;

    function submitState() { submit.disabled = sending || !input.value.trim(); }
    input.addEventListener('input', () => { drafts.set(draftKey, input.value); submitState(); });
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      if (!submit.disabled) form.requestSubmit();
    });
    submitState();

    function bubbleFor(message) {
      const own = message.from === profile.id;
      const bubble = node('article', 'bubble' + (own ? ' mine' : '') + (message.placeId ? ' invitation' : ''));
      if (message.placeId) {
        const label = node('div', 'invite-label', 'Приглашение на прогулку');
        bubble.append(label, node('strong', '', placeById(message.placeId)?.name || 'Место недоступно'));
        if (message.walkAt) {
          const time = node('time', 'invite-date', new Intl.DateTimeFormat('ru-KZ', {
            dateStyle: 'long', timeStyle: 'short', timeZone: VISIT_ZONE
          }).format(new Date(message.walkAt)));
          time.dateTime = message.walkAt;
          bubble.append(time);
        }
        if (message.text) bubble.append(node('p', 'message-text', message.text));
        bubble.append(node('span', 'status-label', statusText[message.status]));
      } else if (message.text) bubble.append(node('p', 'message-text', message.text));

      if (message.placeId && !own && message.status === 'pending') {
        const actions = node('div', 'place-actions');
        for (const [status, label] of [['accepted', 'Принять прогулку'], ['declined', 'Отклонить прогулку']]) {
          actions.append(button(label, runAction(async () => {
            await api.replyWalk(message.id, status);
            await refresh();
            await afterWrite();
            if (!input.closest('[hidden]')) input.focus();
          }), status === 'accepted' ? 'btn c' : 'vb'));
        }
        bubble.append(actions);
      }
      const time = node('time', 'm bubble-time', displayTime(message.at));
      if (message.at) { time.dateTime = message.at; time.title = formatDate(message.at); }
      bubble.append(time);
      return bubble;
    }

    function paint(thread, forceBottom = false) {
      form.hidden = !thread.canSend;
      readOnly.hidden = thread.canSend;
      const nextSignature = JSON.stringify(thread.messages);
      if (signature === nextSignature) return;
      const previousTop = transcript.scrollTop;
      const atBottom = transcript.scrollHeight - transcript.clientHeight - previousTop < 64;
      signature = nextSignature;
      transcript.replaceChildren();
      if (!thread.messages.length) transcript.append(node('p', 'm conversation-empty', 'Здесь появится первое сообщение.'));
      let lastDay;
      for (const message of thread.messages) {
        if (message.at) {
          const day = new Date(message.at).toDateString();
          if (day !== lastDay) {
            lastDay = day;
            const marker = node('p', 'transcript-date');
            const date = new Intl.DateTimeFormat('ru-KZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(message.at));
            marker.append(node('span', '', date));
            transcript.append(marker);
          }
        }
        transcript.append(bubbleFor(message));
      }
      transcript.scrollTop = forceBottom || atBottom ? transcript.scrollHeight : previousTop;
    }

    async function refresh(forceBottom = false) {
      if (!layout.isConnected || workspace.active !== 'messages') return;
      const thread = await api.chat(selectedId);
      visibleChats = await api.chats();
      wallpaper.apply((await api.settings()).chatWallpaper);
      if (!layout.isConnected || workspace.active !== 'messages') return;
      paint(thread, forceBottom);
      paintList(visibleChats);
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !input.value.trim()) return;
      sending = true;
      submitState();
      try {
        await api.send(selectedId, input.value);
        input.value = '';
        drafts.delete(draftKey);
        await refresh(true);
        await afterWrite();
      } catch (error) { toast(error.message); }
      finally { sending = false; submitState(); if (input.isConnected) input.focus(); }
    });
    showMessenger(false);
    title.focus({ preventScroll: true });
    paint(firstThread, true);
    visibleChats = await api.chats();
    paintList(visibleChats);
    updateThread = refresh;
    await afterWrite();
  }

  return { show, refresh: () => updateThread?.() };
}
