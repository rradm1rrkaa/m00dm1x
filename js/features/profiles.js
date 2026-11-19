import { placeById } from '../services/catalog.js';
import { avatar, button, field, formatDate, node, runAction, toast } from '../components/ui.js';
import { icon } from '../components/icons.js';

async function resizeAvatar(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Выберите JPG, PNG или WebP.');
  if (file.size > 10_000_000) throw new Error('Фото должно занимать до 10 МБ.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const canvas = node('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d', { alpha: false });
    const size = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256);
    return canvas.toDataURL('image/jpeg', .8);
  } catch {
    throw new Error('Не удалось прочитать изображение.');
  } finally { bitmap?.close(); }
}

function download(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = node('a');
  link.href = url;
  link.download = 'moodmix-data.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function checkbox(text, checked) {
  const input = node('input');
  input.type = 'checkbox';
  input.checked = checked;
  return { input, row: field(text, input, 'check-row') };
}

export function createProfiles({ api, modal, workspace, getSession, afterWrite, changeMode, openPlace, openPeople }) {
  function privacy() {
    modal.show('Данные и приватность', [
      node('p', '', 'Избранное, профиль, оценки и переписка хранятся в этом браузере. В демонстрационном режиме другие участники — вымышленные профили.'),
      node('p', '', 'История теста сохраняется по вашему выбору. Последнее настроение и недавние посещения можно показывать отдельно.'),
      node('p', '', 'В профиле доступны экспорт и удаление данных. Внешние карты открываются по вашему нажатию.')
    ]);
  }

  async function pick() {
    const profiles = await api.profiles();
    const session = getSession();
    const modes = node('div', 'social-list profile-picker');
    modes.append(node('p', 'm', 'Демоотзывы и переписка связывают вымышленных участников в этом браузере.'));
    for (const [mode, collection] of [['demo', profiles.demo], ['legacy', profiles.legacy]]) {
      if (!collection.length) continue;
      modes.append(node('h3', '', mode === 'demo' ? 'Демонстрационные профили' : 'Профили из прежней версии'));
      for (const profile of collection) {
        const current = session.mode === mode && session.profile.id === profile.id;
        const item = button('', runAction(() => changeMode(mode, profile.id)), 'profile-pick');
        item.append(avatar(profile, 'sm'), node('span', '', profile.name), icon(current ? 'check' : 'chevron'));
        item.setAttribute('aria-pressed', String(current));
        modes.append(item);
      }
    }
    modes.append(button('Гостевой режим', runAction(() => changeMode('guest'))));
    if (session.mode === 'demo' || !profiles.demo.length) {
      modes.append(button('Сбросить демо-данные', runAction(async () => {
        if (!confirm('Вернуть демонстрационные профили и примеры к исходному состоянию?')) return;
        await changeMode('reset-demo');
        toast('Демо-данные сброшены');
      }), 'btn quiet'));
    }
    if (profiles.legacyBackups) {
      modes.append(button('Очистить резервные данные старой версии', runAction(async () => {
        if (!confirm('Удалить исходные ключи старой версии? Перенесённые профили останутся.')) return;
        await api.purgeLegacyBackups();
        await pick();
        toast('Резервные данные старой версии удалены');
      }), 'btn quiet'));
    }
    modal.show('Переключить профиль', [modes]);
  }

  function edit(section) {
    const { mode, profile } = getSession();
    const form = node('form', 'profile-form');
    const error = node('p', 'form-error');
    error.setAttribute('role', 'alert');
    const history = checkbox('Хранить историю теста в этом браузере', profile.preferences.rememberMood);
    const mood = checkbox('Показывать последнее настроение в локальном профиле', profile.preferences.shareMood);
    const visits = checkbox('Показывать недавние посещения в локальном профиле', profile.preferences.shareVisits);
    const submit = node('button', 'btn c', 'Сохранить изменения');
    submit.type = 'submit';
    const name = node('input');
    const upload = node('input');
    let image = profile.avatar, reading = false, saving = false, request = 0;
    if (mode !== 'guest') {
      name.value = profile.name;
      name.maxLength = 32;
      name.required = true;
      name.autocomplete = 'nickname';
      upload.type = 'file';
      upload.accept = 'image/jpeg,image/png,image/webp';
      const portrait = node('div', 'profile-edit-portrait');
      const preview = node('div');
      const uploadLabel = field('Аватар · JPG, PNG или WebP', upload, 'upload-label');
      const clear = button('Удалить аватар', () => {
        request++;
        image = null;
        reading = false;
        upload.value = '';
        error.textContent = '';
        submit.disabled = saving;
        paintPreview();
      }, 'btn quiet');
      const paintPreview = () => {
        preview.replaceChildren(avatar({ ...profile, name: name.value.trim() || profile.name, avatar: image }, 'xl'));
        clear.hidden = !image;
      };
      paintPreview();
      name.addEventListener('input', paintPreview);
      upload.addEventListener('change', async () => {
        const file = upload.files[0];
        if (!file) return;
        const current = ++request;
        reading = submit.disabled = true;
        error.textContent = '';
        try {
          const res = await resizeAvatar(file);
          if (current === request) { image = res; paintPreview(); }
        } catch (problem) {
          if (current === request) { error.textContent = problem.message; upload.value = ''; }
        } finally {
          if (current === request) { reading = false; submit.disabled = saving; }
        }
      });
      portrait.append(preview, uploadLabel, clear);
      form.append(portrait, field('Имя', name));
    }

    const preferences = node('fieldset', 'profile-preferences');
    preferences.append(node('legend', '', 'Приватность'), history.row);
    if (mode !== 'guest') preferences.append(mood.row, visits.row);
    const actions = node('div', 'dialog-actions');
    actions.append(button('Отменить', modal.close), submit);
    form.append(preferences, error, actions);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (reading || saving) return;
      saving = submit.disabled = true;
      submit.textContent = 'Сохраняем…';
      error.textContent = '';
      try {
        const update = { rememberMood: history.input.checked };
        if (mode !== 'guest') Object.assign(update, { name: name.value, avatar: image, shareMood: mood.input.checked, shareVisits: visits.input.checked });
        await api.saveProfile(update);
        await afterWrite();
        modal.close();
        await open(section);
        toast(api.storageIssue() || 'Изменения сохранены');
      } catch (problem) {
        error.textContent = problem.message;
      } finally {
        saving = submit.disabled = false;
        submit.textContent = 'Сохранить изменения';
      }
    });
    modal.show('Редактировать профиль', [
      node('p', 'm editor-lead', 'Настройте, как профиль выглядит и что доступно другим локальным участникам.'), form
    ], { className: 'edit-profile', footer: false });
  }

  function dataActions(mode) {
    const list = node('div', 'profile-data-actions');
    list.append(button('Сменить режим', runAction(pick), 'btn quiet'), button('Данные и приватность', privacy, 'btn quiet'),
      button('Скачать мои данные', runAction(async () => download(await api.exportData())), 'btn quiet'),
      button(mode === 'guest' ? 'Очистить гостевые данные' : 'Удалить локальный профиль', runAction(async () => {
        const scope = mode === 'legacy' ? ' Данные профиля также будут удалены из прежнего хранилища.' : '';
        if (!confirm('Удалить данные этого профиля?' + scope)) return;
        const { backupRemoved } = await api.deleteProfile();
        await changeMode('guest', undefined, true);
        toast(api.storageIssue() || (backupRemoved ? 'Локальные данные профиля удалены' : 'Не удалось очистить исходную копию в браузере.'));
      }), 'btn quiet danger'));
    return list;
  }

  function placeRows(entries, empty) {
    const rows = node('div', 'profile-rows');
    for (const entry of entries) {
      const place = placeById(entry.placeId);
      if (!place) continue;
      const row = button('', () => openPlace(place), 'profile-row');
      row.append(icon('pin'), node('span', '', place.name));
      if (entry.at) row.append(node('small', 'm', formatDate(entry.at)));
      row.append(icon('chevron'));
      rows.append(row);
    }
    if (!rows.children.length) rows.append(node('p', 'm', empty));
    return rows;
  }

  async function open(section = 'overview', focusTab = false) {
    const { mode, profile } = getSession();
    const social = mode !== 'guest';
    const titles = { overview: 'Обзор', favorites: 'Избранное', visits: 'Посещения',
      ...(social ? { reviews: 'Отзывы', friends: 'Друзья' } : {}), settings: 'Настройки' };
    const page = node('div', 'profile-page surface-panel');
    const header = node('div', 'profile-banner');
    const identity = node('div', 'profile-identity');
    identity.append(node('p', 'profile-scope', social ? mode === 'demo' ? 'Демонстрационный профиль' : 'Локальный профиль' : 'Личный кабинет'),
      node('h1', '', social ? profile.name : 'Гостевой профиль'),
      node('p', 'm', social ? 'Избранное, активность и настройки этого браузера.' : 'Ваши сохранённые места и история подбора.'));
    const controls = node('div', 'profile-controls');
    const editButton = button('Редактировать профиль', () => edit(section));
    editButton.prepend(icon('pen'));
    const more = node('details', 'profile-more');
    const summary = node('summary', 'btn icon-button');
    summary.setAttribute('aria-label', 'Действия профиля');
    summary.append(icon('dots'));
    more.append(summary, dataActions(mode));
    controls.append(editButton, more);
    header.append(avatar(profile, 'xl'), identity, controls);

    const nav = node('nav', 'profile-tabs');
    nav.setAttribute('aria-label', 'Разделы профиля');
    for (const [id, label] of Object.entries(titles)) {
      const tab = button(label, runAction(() => open(id, true)), 'nav-link');
      tab.dataset.section = id;
      if (id === section) tab.setAttribute('aria-current', 'page');
      nav.append(tab);
    }

    const body = node('section', 'profile-section');
    body.append(node('h2', '', titles[section]));
    if (section === 'overview') {
      const metrics = node('dl', 'profile-metrics');
      for (const [label, count] of [['В избранном', profile.favorites.length], ['Посещено', profile.visits.length], ['В истории теста', profile.moods.length]]) {
        const entry = node('div');
        entry.append(node('dt', 'm', label), node('dd', '', String(count)));
        metrics.append(entry);
      }
      const timeline = node('div', 'profile-history');
      timeline.append(node('h3', '', 'История настроения'));
      if (!profile.moods.length) timeline.append(node('p', 'm', 'Здесь появятся сохранённые результаты тестов.'));
      for (const result of profile.moods.slice(-10).reverse()) {
        const row = node('div', 'history-row');
        row.append(icon('spark'), node('span', '', result.mood));
        if (result.at) row.append(node('small', 'm', formatDate(result.at)));
        timeline.append(row);
      }
      body.append(metrics, timeline);
    } else if (section === 'favorites') {
      body.append(placeRows(profile.favorites.map(placeId => ({ placeId })), 'Сохраните место из каталога, чтобы вернуться к нему позже.'));
    } else if (section === 'visits') {
      body.append(placeRows(profile.visits.slice().reverse(), 'Посещённые места появятся после отметки «Был здесь».'));
    } else if (section === 'reviews') {
      const { reviews } = await api.exportData();
      if (!reviews.length) body.append(node('p', 'm', 'У вас пока нет отзывов.'));
      for (const review of reviews.slice().reverse()) {
        const place = placeById(review.placeId);
        const row = node('article', 'profile-review');
        const rating = node('span', 'rating');
        rating.append(icon('star'), node('span', '', review.rating + ' из 5'));
        row.append(button(place?.name || 'Место', place ? () => openPlace(place) : null, 'ttl'), rating);
        if (review.text) row.append(node('p', '', review.text));
        body.append(row);
      }
    } else if (section === 'friends') {
      const friends = (await api.people()).filter(person => person.related);
      if (!friends.length) body.append(node('p', 'm', 'У вас пока нет друзей.'));
      for (const person of friends) {
        const row = node('div', 'profile-row');
        row.append(avatar(person, 'sm'), node('strong', '', person.name));
        body.append(row);
      }
      body.append(button('Открыть список друзей', runAction(() => openPeople(true))));
    } else {
      body.append(node('p', 'm', 'Настройки приватности и локальные данные профиля.'),
        button('Редактировать профиль', () => edit(section)), dataActions(mode));
    }
    page.append(header, nav, body);
    workspace.show('profile', page, !focusTab);
    if (focusTab) nav.querySelector('[aria-current]')?.focus();
  }

  return { pick, open };
}
