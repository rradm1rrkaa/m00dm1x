import { mountSky } from './sky.js';
import { node, select } from '../components/ui.js';
import { icon } from '../components/icons.js';

const choices = [['auto', 'Авто — по настроению'], ['light', 'Восход'], ['dark', 'Закат'], ['sad', 'Грусть'], ['fun', 'Веселье']];

export async function createTheme(api, mount, onError) {
  const { theme } = await api.settings();
  let selection = theme;
  let moodTheme = null;
  const control = select(choices);
  control.id = 'theme-select';
  control.className = 'theme-select';
  control.setAttribute('aria-label', 'Тема оформления');
  control.value = selection;
  const wrapper = node('span', 'theme-control tbtn');
  const label = node('span', 'theme-current');
  const full = node('span', 'theme-full');
  const compact = node('span', 'theme-compact');
  label.setAttribute('aria-hidden', 'true');
  label.append(full, compact);
  wrapper.append(icon('palette'), label, icon('chevron'), control);
  mount.replaceChildren(wrapper);

  function paintLabel() {
    full.textContent = control.selectedOptions[0].textContent;
    compact.textContent = selection === 'auto' ? 'Авто' : full.textContent;
  }
  paintLabel();
  const effective = () => selection === 'auto' ? moodTheme || 'dark' : selection;
  const sky = mountSky(effective());
  control.addEventListener('change', async () => {
    selection = control.value;
    paintLabel();
    sky.setTheme(effective());
    try {
      await api.setTheme(selection);
      if (api.storageIssue()) onError?.(api.storageIssue());
    } catch (error) { onError?.(error.message); }
  });

  return {
    setMood(next) {
      moodTheme = ['light', 'dark', 'sad', 'fun'].includes(next) ? next : null;
      sky.setTheme(effective());
    }
  };
}
