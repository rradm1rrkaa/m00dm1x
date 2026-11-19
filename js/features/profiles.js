import { placeById } from '../services/catalog.js';
import { avatar, button, field, formatDate, node, runAction, toast } from '../components/ui.js';

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

export function createProfiles({ api, modal, getSession, afterWrite, changeMode, openPlace }) {
  function privacy() {
    modal.show('Данные и приватность', [
      node('p', '', 'Избранное, профиль, оценки и переписка хранятся в этом браузере. В демонстрационном режиме другие участники — вымышленные профили.'),
      node('p', '', 'История теста сохраняется по вашему выбору. Последнее настроение и недавние посещения можно показывать отдельно.'),
      node('p', '', 'В профиле доступны экспорт и удаление данных. Fraunces и Manrope загружаются через Google Fonts. Внешние карты открываются по вашему нажатию.')
    ], { back: open });
  }

  async function pick() {
    const profiles = await api.profiles();
    const session = getSession();
    const modes = node('div', 'social-list');
    modes.append(node('p', 'm', 'Алия, Тимур и Дана — вымышленные участники. Отзывы, переписка и изменения видны в этом браузере.'));
    for (const [mode, collection] of [['demo', profiles.demo], ['legacy', profiles.legacy]]) {
      if (mode === 'legacy' && !collection.length) continue;
      const group = node('div', 'place-actions');
      for (const profile of collection) {
        const current = session.mode === mode && session.profile.id === profile.id;
        const item = button(profile.name, runAction(() => changeMode(mode, profile.id)), 'vb');
        item.setAttribute('aria-pressed', String(current));
        group.append(item);
      }
      modes.append(node('h3', '', mode === 'demo' ? 'Демонстрационные профили' : 'Профили из прежней версии'),
        group);
    }
    modes.append(button('Гостевой режим', runAction(() => changeMode('guest'))));
    if (session.mode === 'demo' || !profiles.demo.length) {
      modes.append(button('Сбросить демо-данные', runAction(async () => {
        if (!confirm('Вернуть демонстрационные профили и примеры к исходному состоянию?')) return;
        await changeMode('reset-demo');
        toast('Демо-данные сброшены');
      })));
    }
    if (profiles.legacyBackups) {
      modes.append(button('Очистить резервные данные старой версии', runAction(async () => {
        if (!confirm('Удалить исходные ключи старой версии? Перенесённые профили останутся.')) return;
        await api.purgeLegacyBackups();
        await pick();
        toast('Резервные данные старой версии удалены');
      })));
    }
    modal.show('Режим работы', [modes]);
  }

  function open() {
    const { mode, profile } = getSession();
    const header = node('div', 'ph2 profile-head');
    header.append(avatar(profile, 'xl'), node('p', 'm', mode === 'guest' ? 'Гостевой режим · данные этого браузера'
      : mode === 'demo' ? 'Демонстрационный профиль' : 'Профиль из прежней версии'));
    const settings = node('form', 'profile-form');
    const history = checkbox('Хранить историю теста в этом браузере', profile.preferences.rememberMood);
    const mood = checkbox('Показывать последнее настроение в локальном профиле', profile.preferences.shareMood);
    const visits = checkbox('Показывать недавние посещения в локальном профиле', profile.preferences.shareVisits);
    const submit = node('button', 'vb', 'Сохранить настройки');
    submit.type = 'submit';
    const name = node('input');
    const upload = node('input');
    if (mode !== 'guest') {
      name.value = profile.name;
      name.maxLength = 32;
      name.required = true;
      upload.type = 'file';
      upload.accept = 'image/jpeg,image/png,image/webp';
      settings.append(field('Имя', name), field('Аватар · JPG, PNG или WebP', upload));
      if (profile.avatar) settings.append(button('Удалить аватар', runAction(async () => {
        await api.saveProfile({ avatar: null });
        await afterWrite();
        open();
      }), 'vb'));
    }
    settings.append(history.row);
    if (mode !== 'guest') settings.append(mood.row, visits.row);
    settings.append(submit);
    settings.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        const update = { rememberMood: history.input.checked };
        if (mode !== 'guest') {
          Object.assign(update, { name: name.value, shareMood: mood.input.checked, shareVisits: visits.input.checked });
          if (upload.files[0]) update.avatar = await resizeAvatar(upload.files[0]);
        }
        await api.saveProfile(update);
        await afterWrite();
        open();
        toast('Профиль обновлён');
      } catch (error) { toast(error.message); }
      finally { submit.disabled = false; }
    });

    const activity = node('section', 'pb');
    activity.append(node('h3', '', 'История настроения'));
    if (!profile.moods.length) activity.append(node('p', 'm', 'Сохранённых результатов пока нет.'));
    for (const result of profile.moods.slice(-10).reverse()) {
      activity.append(node('p', '', result.mood + (result.at ? ' · ' + formatDate(result.at) : '')));
    }
    activity.append(node('h3', '', 'Посещения · ' + profile.visits.length));
    if (!profile.visits.length) activity.append(node('p', 'm', 'Отметьте посещение на карточке места.'));
    for (const visit of profile.visits.slice(-25).reverse()) {
      const place = placeById(visit.placeId);
      if (!place) continue;
      const row = node('div', 'visit-row');
      row.append(button(place.name, () => openPlace(place), 'vb'), node('small', 'm', formatDate(visit.at)));
      activity.append(row);
    }

    const actions = node('div', 'place-actions');
    actions.append(button('Сменить режим', runAction(pick), 'vb'), button('Данные и приватность', privacy, 'vb'),
      button('Скачать мои данные', runAction(async () => download(await api.exportData())), 'vb'),
      button(mode === 'guest' ? 'Очистить гостевые данные' : 'Удалить локальный профиль', runAction(async () => {
        const scope = mode === 'legacy' ? ' Данные профиля также будут удалены из прежнего хранилища.' : '';
        if (!confirm('Удалить данные этого профиля?' + scope)) return;
        const { backupRemoved } = await api.deleteProfile();
        await changeMode('guest', undefined, true);
        const problem = api.storageIssue();
        toast(problem || (backupRemoved ? 'Локальные данные профиля удалены' : 'Не удалось очистить исходную копию в браузере.'));
      }), 'vb'));
    modal.show(mode === 'guest' ? 'Гостевой профиль' : profile.name, [header, settings, activity, actions]);
  }

  return { pick, open };
}
