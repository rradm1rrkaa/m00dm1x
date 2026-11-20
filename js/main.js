import { createModal } from './components/modal.js';
import { avatar, byId, node, runAction, toast } from './components/ui.js';
import { paintIcons } from './components/icons.js';
import { createCatalog, placeIllustration } from './features/catalog.js';
import { createPlaceDetail } from './features/place-detail.js';
import { placeById, placeHref } from './services/catalog.js';
import { createProfiles } from './features/profiles.js';
import { createQuiz } from './features/quiz.js';
import { createSocial } from './features/social.js';
import { createLocalApi } from './services/local-api.js';
import { createTheme } from './theme/theme.js';

async function initialize() {
  paintIcons();
  const api = createLocalApi();
  const modal = createModal(byId('pf'), byId('pfc'));
  const params = new URLSearchParams(location.search);
  const entry = params.get('start');
  if (params.has('guest') || entry === 'quiz' || entry === 'catalog' || params.has('reg')) await api.switchProfile('guest');
  if (params.has('demo')) await api.switchProfile('demo');
  let session = await api.session();
  let result = session.profile.moods.at(-1) || null;
  const sessionKey = () => session.mode + '|' + session.profile.id;
  const temporaryResults = new Map();

  const getSession = () => session;
  const getResult = () => result;
  const catalogRegion = byId('catalog');
  const quizRegion = byId('quiz');
  const workspaceRegion = byId('workspace');
  const app = byId('app');
  const path = location.pathname;
  const routePlace = () => new URLSearchParams(location.search).get('place');
  history.scrollRestoration = 'manual';
  let catalogScroll = 0;
  const workspace = {
    get active() { return app.dataset.view; },
    show(view, content, focus = true, state = {}) {
      if (view !== 'place') leavePlaceRoute({ ...state, view });
      if (view === 'messages' && history.state?.view === 'messages') {
        history.replaceState({ ...history.state, ...state }, '', location.href);
      }
      const changed = app.dataset.view !== view;
      switchView(view);
      workspaceRegion.replaceChildren(content);
      const heading = workspaceRegion.querySelector('h1');
      workspaceRegion.setAttribute('aria-label', heading?.textContent || 'MoodMix');
      if (focus && heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      if (changed) scrollTo(0, 0);
    },
    close() {
      showCatalog(false);
      if (history.state?.view) history.replaceState({ ...history.state, view: 'catalog' }, '', location.href);
      scrollTo(0, catalogScroll);
      byId('nav-catalog').focus({ preventScroll: true });
    }
  };

  const theme = await createTheme(api, byId('theme-slot'), toast, { mood: result?.theme });
  const context = { api, modal, workspace, getSession, getResult, afterWrite };
  const catalog = createCatalog({ ...context, openPlace });
  const social = createSocial(context);
  const profiles = createProfiles({ ...context, changeMode, openPlace, openPeople: social.openPeople });
  const detail = createPlaceDetail({
    ...context, ...social, goBack, returnToPlace, placeIllustration,
    pickProfile: profiles.pick, refreshCatalog: catalog.refresh
  });
  const quiz = createQuiz(quizRegion, {
    leave: () => showCatalog(true),
    finish: completeQuiz,
    preference: () => session.profile.preferences.rememberMood,
    setTheme: theme.setMood
  });

  for (const key of ['start', 'guest', 'demo', 'reg']) params.delete(key);
  history.replaceState(history.state, '', path + (params.size ? '?' + params : '') + location.hash);

  function catalogState(y = scrollY, focusPlace = null) {
    return { catalog: catalog.capture(), scroll: y, focusPlace };
  }

  function openPlace(place, reason) {
    const from = workspace.active;
    if (from === 'catalog') history.replaceState(catalogState(scrollY, place.id), '', location.href);
    if (from === 'profile') history.replaceState({ view: 'profile', catalog: catalog.capture(), scroll: scrollY }, '', location.href);
    history.pushState({ placeOrigin: true, reason }, '', placeHref(place.id));
    detail.show(place.id, reason);
    scrollTo(0, 0);
  }

  function leavePlaceRoute(next = {}) {
    const placeId = routePlace();
    if (placeId === null) return;
    history.pushState({ ...catalogState(catalogScroll), returnPlace: placeId, ...next }, '', path);
    document.title = 'MoodMix — каталог и подборка';
  }

  function returnToPlace(place, reason) {
    if (history.state?.returnPlace === place.id) history.back();
    else openPlace(place, reason);
  }

  function goBack() {
    if (history.state?.placeOrigin) history.back();
    else {
      history.replaceState(catalogState(catalogScroll), '', path);
      restoreRoute(history.state);
    }
  }

  function restoreRoute(state) {
    if (byId('pf').open) modal.close();
    document.querySelector('.gallery-lightbox[open]')?.close();
    const placeId = routePlace();
    if (placeId !== null) {
      detail.show(placeId, state?.reason);
      scrollTo(0, 0);
      return;
    }
    if (state?.view === 'profile') {
      profiles.open().then(() => scrollTo(0, state.scroll || 0)).catch(error => toast(error.message));
      return;
    }
    if (state?.view === 'messages' && session.mode !== 'guest') {
      const from = placeById(state.returnPlace);
      const show = state.threadId ? social.openChat(state.threadId, from ? () => returnToPlace(from) : null) : social.openChats();
      show.catch(error => {
        showCatalog(false);
        toast(error.message);
      });
      return;
    }
    showCatalog(false);
    catalog.restore(state?.catalog);
    const target = state?.focusPlace && catalogRegion.querySelector('[data-place="' + CSS.escape(state.focusPlace) + '"] .ttl');
    (target || byId('out')).focus({ preventScroll: true });
    scrollTo(0, state?.scroll || 0);
  }
  window.addEventListener('popstate', event => restoreRoute(event.state));

  function switchView(view) {
    if (app.dataset.view === 'catalog' && view !== 'catalog') catalogScroll = window.scrollY;
    app.dataset.view = view;
    byId('app-loading').hidden = true;
    quizRegion.hidden = view !== 'quiz';
    catalogRegion.hidden = view !== 'catalog';
    workspaceRegion.hidden = view === 'quiz' || view === 'catalog';
    byId('skip-link').hidden = view !== 'catalog';
    for (const [name, id] of Object.entries({ catalog: 'nav-catalog', quiz: 'nav-quiz', profile: 'profile', messages: 'chats' })) {
      if (name === view || name === 'catalog' && view === 'place') byId(id).setAttribute('aria-current', 'page');
      else byId(id).removeAttribute('aria-current');
    }
    if (view !== 'quiz') theme.setMood(result?.theme);
  }

  function showCatalog(focus, keepPlaceRoute = false) {
    if (!keepPlaceRoute) leavePlaceRoute();
    switchView('catalog');
    document.title = 'MoodMix — каталог и подборка';
    if (focus) byId('out').focus();
  }

  function showQuiz() {
    leavePlaceRoute();
    switchView('quiz');
    scrollTo(0, 0);
    quiz.choose();
  }

  async function completeQuiz(selection, remember) {
    await api.saveMood(selection, remember);
    result = selection;
    temporaryResults.set(sessionKey(), selection);
    await afterWrite();
    catalog.reset();
    catalog.setView('recommended');
    showCatalog(true);
  }

  async function badges() {
    if (session.mode === 'guest') return;
    const [people, chats] = await Promise.all([api.people(), api.chats()]);
    const badge = (name, count) => {
      const element = byId(name);
      element.hidden = count === 0;
      element.textContent = count;
    };
    badge('friend-badge', people.filter(person => person.incoming).length);
    badge('chat-badge', chats.reduce((sum, row) => sum + row.unread, 0));
  }

  async function afterWrite({ redraw = false } = {}) {
    session = await api.session();
    const guest = session.mode === 'guest';
    for (const control of ['friends', 'chats']) byId(control).hidden = guest;
    const profileControl = byId('profile');
    profileControl.replaceChildren(avatar(session.profile, 'sm'), node('span', 'profile-caption', guest ? 'Профиль' : session.profile.name));
    profileControl.setAttribute('aria-label', guest ? 'Профиль' : 'Профиль · ' + session.profile.name);
    byId('mode-note').textContent = guest ? 'Гость · избранное и отметки сохраняются в этом браузере.'
      : session.mode === 'demo' ? 'Демо · вымышленные профили и локальная переписка.'
        : 'Локальный профиль · данные из прежней версии.';
    byId('profiles').textContent = guest ? 'Демо-профили' : 'Сменить профиль';
    const issue = api.storageIssue();
    byId('storage-note').hidden = !issue;
    byId('storage-note').textContent = issue;
    if (redraw) await catalog.refresh();
    await badges();
  }

  async function changeMode(mode, id, cleared = false) {
    if (cleared || mode === 'reset-demo') temporaryResults.clear();
    if (mode === 'reset-demo') await api.resetDemo();
    else await api.switchProfile(mode, id);
    modal.close();
    await refreshMode();
    toast(session.mode === 'guest' ? 'Гостевой режим' : 'Выбран профиль ' + session.profile.name);
  }

  async function refreshMode() {
    session = await api.session();
    result = temporaryResults.get(sessionKey()) || session.profile.moods.at(-1) || null;
    if (routePlace() === null) showCatalog(false, true);
    catalog.reset();
    catalog.setView('all');
    await afterWrite({ redraw: true });
    scrollTo(0, 0);
    if (routePlace() !== null) detail.show(routePlace(), history.state?.reason);
  }

  byId('start-quiz').addEventListener('click', showQuiz);
  byId('nav-catalog').addEventListener('click', () => {
    if (workspace.active === 'place') { goBack(); return; }
    catalog.setView('all');
    showCatalog(false);
    scrollTo(0, 0);
  });
  byId('nav-quiz').addEventListener('click', () => {
    if (workspace.active === 'quiz') return;
    if (result) { catalog.setView('recommended'); showCatalog(true); }
    else showQuiz();
  });
  byId('profile').addEventListener('click', runAction(() => profiles.open()));
  byId('profiles').addEventListener('click', runAction(profiles.pick));
  byId('friends').addEventListener('click', runAction(() => social.openPeople(true)));
  byId('chats').addEventListener('click', runAction(social.openChats));

  window.addEventListener('storage', async event => {
    if (event.key !== api.storageKey) return;
    try {
      const previous = sessionKey();
      session = await api.session();
      if (previous !== sessionKey()) { modal.close(); await refreshMode(); }
      else {
        await social.refreshChat();
        await afterWrite({ redraw: !modalIsOpen() });
        if (workspace.active === 'place') await detail.refresh();
      }
    } catch (error) { toast(error.message); }
  });

  function modalIsOpen() { return byId('pf').open; }

  await refreshMode();
  if (routePlace() === null && history.state?.catalog) restoreRoute(history.state);
  if (routePlace() === null && entry === 'quiz') showQuiz();
}

initialize().catch(error => {
  const notice = byId('startup-note') || byId('storage-note');
  byId('app-loading').hidden = false;
  notice.hidden = false;
  notice.textContent = 'Не удалось загрузить MoodMix. Обновите страницу. ' + error.message;
  console.error(error);
});
