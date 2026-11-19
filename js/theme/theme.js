import { mountSky } from './sky.js';
import { select } from '../components/ui.js';

const choices = [['auto', 'Авто'], ['light', '☀ Восход'], ['dark', '🌇 Закат'], ['sad', '🌌 Грусть'], ['fun', '🏝 Веселье']];

export async function createTheme(api, mount, onError) {
  const { theme } = await api.settings();
  let selection = theme;
  let moodTheme = null;
  const control = select(choices);
  control.id = 'theme-select';
  control.className = 'tbtn theme-select';
  control.setAttribute('aria-label', 'Тема оформления');
  control.value = selection;
  mount.replaceChildren(control);

  const effective = () => selection === 'auto' ? moodTheme || 'dark' : selection;
  const sky = mountSky(effective());
  control.addEventListener('change', async () => {
    selection = control.value;
    sky.setTheme(effective());
    try {
      await api.setTheme(selection);
      if (api.storageIssue()) onError?.(api.storageIssue());
    } catch (error) { onError?.(error.message); }
  });

  return {
    setMood(next) {
      moodTheme = ['sad', 'fun'].includes(next) ? next : null;
      sky.setTheme(effective());
    }
  };
}
