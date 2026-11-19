import { createModal } from './components/modal.js';
import { avatar, byId, runAction, toast } from './components/ui.js';
import { createCatalog } from './features/catalog.js';
import { createProfiles } from './features/profiles.js';
import { createQuiz } from './features/quiz.js';
import { createSocial } from './features/social.js';
import { createLocalApi } from './services/local-api.js';
import { createTheme } from './theme/theme.js';

async function initialize() {
  const api = createLocalApi();
  const modal = createModal(byId('pf'), byId('pfc'));
  let session = await api.session();
  let result = null;
  const sessionKey = () => session.mode + '|' + session.profile.id;
  const temporaryResults = new Map();

  const getSession = () => session;
  const getResult = () => result;
  const catalogRegion = byId('catalog');
  const quizRegion = byId('quiz');

  const theme = await createTheme(api, byId('theme-slot'), toast);
  const context = { api, modal, getSession, getResult, afterWrite };
  const catalog = createCatalog({ ...context, social: () => social });
  const social = createSocial(context);
  const profiles = createProfiles({ ...context, changeMode, openPlace: catalog.openPlace });
  const quiz = createQuiz(quizRegion, {
    leave: () => showCatalog(true),
    finish: completeQuiz,
    preference: () => session.profile.preferences.rememberMood,
    setTheme: theme.setMood
  });

  const params = new URLSearchParams(location.search);
  const entry = params.get('start');
  if (params.has('guest') || entry === 'quiz' || entry === 'catalog' || params.has('reg')) await api.switchProfile('guest');
  if (params.has('demo')) await api.switchProfile('demo');
  if (params.size) history.replaceState(history.state, '', location.pathname + location.hash);

  function showCatalog(focus) {
    quizRegion.hidden = true;
    catalogRegion.hidden = false;
    byId('skip-link').hidden = false;
    theme.setMood(result?.theme);
    if (focus) byId('out').focus();
  }

  function showQuiz() {
    catalogRegion.hidden = true;
    byId('skip-link').hidden = true;
    quizRegion.hidden = false;
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
    for (const control of ['find-friends', 'friends', 'chats']) byId(control).hidden = guest;
    const profileControl = byId('profile');
    profileControl.replaceChildren(avatar(session.profile, 'sm'), document.createTextNode(guest ? 'Профиль' : session.profile.name));
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
    showCatalog(false);
    catalog.reset();
    catalog.setView('all');
    await afterWrite({ redraw: true });
  }

  byId('start-quiz').addEventListener('click', showQuiz);
  byId('profile').addEventListener('click', runAction(() => profiles.open()));
  byId('profiles').addEventListener('click', runAction(profiles.pick));
  byId('find-friends').addEventListener('click', runAction(() => social.openPeople()));
  byId('friends').addEventListener('click', runAction(() => social.openPeople(true)));
  byId('chats').addEventListener('click', runAction(social.openChats));

  window.addEventListener('storage', async event => {
    if (event.key !== api.storageKey) return;
    try {
      const previous = sessionKey();
      session = await api.session();
      if (previous !== sessionKey()) { modal.close(); await refreshMode(); }
      else { await social.refreshChat(); await afterWrite({ redraw: !modalIsOpen() }); }
    } catch (error) { toast(error.message); }
  });

  function modalIsOpen() { return byId('pf').open; }

  await refreshMode();
  if (entry === 'quiz') showQuiz();
}

initialize().catch(error => {
  const notice = byId('startup-note') || byId('storage-note');
  notice.hidden = false;
  notice.textContent = 'Не удалось загрузить MoodMix. Обновите страницу. ' + error.message;
  console.error(error);
});
