import { mountSky } from './sky.js';
import { button, node } from '../components/ui.js';
import { icon } from '../components/icons.js';

const choices = [['auto', 'Авто — по настроению'], ['light', 'Восход'], ['dark', 'Закат'], ['sad', 'Грусть'], ['fun', 'Веселье']];

export async function createTheme(api, mount, onError, previews = []) {
  const { theme } = await api.settings();
  let selection = theme;
  let moodTheme = null;
  const effective = () => selection === 'auto' ? moodTheme || 'dark' : selection;
  const sky = document.getElementById('sky') ? mountSky(effective()) : null;
  const wrapper = node('div', 'theme-control');
  const trigger = button('', () => setOpen(menu.hidden), 'theme-trigger');
  const label = node('span', 'theme-current');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'theme-options');
  trigger.append(icon('palette'), label, icon('chevron'));
  const menu = node('div', 'theme-options');
  menu.id = 'theme-options';
  menu.hidden = true;
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Варианты оформления');
  const options = choices.map(([value, name]) => {
    const option = button('', () => {
      setOpen(false, true);
      choose(value);
    }, 'theme-option');
    const swatch = node('span', 'theme-swatch');
    swatch.dataset.themeSwatch = value;
    swatch.setAttribute('aria-hidden', 'true');
    option.append(swatch, node('span', '', name), icon('check'));
    menu.append(option);
    return option;
  });
  wrapper.append(trigger, menu);
  mount.replaceChildren(wrapper);

  function repaint() {
    const name = choices.find(([value]) => value === selection)?.[1] || choices[0][1];
    label.textContent = selection === 'auto' ? 'Авто' : name;
    trigger.setAttribute('aria-label', 'Тема оформления · ' + name);
    choices.forEach(([value], index) => options[index].setAttribute('aria-pressed', String(selection === value)));
    for (const preview of previews) preview.setAttribute('aria-pressed', String(selection === preview.dataset.chooseTheme));
    if (sky) sky.setTheme(effective());
    else document.documentElement.dataset.theme = effective();
  }

  function setOpen(open, restoreFocus = false) {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) (options.find(option => option.getAttribute('aria-pressed') === 'true') || options[0]).focus();
    else if (restoreFocus) trigger.focus();
  }

  async function choose(value) {
    if (value === selection) return;
    selection = value;
    repaint();
    try {
      await api.setTheme(value);
      if (api.storageIssue()) onError?.(api.storageIssue());
    } catch (error) { onError?.(error.message); }
  }

  wrapper.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
      return;
    }
    const index = options.indexOf(document.activeElement);
    const positions = { ArrowUp: (index - 1 + options.length) % options.length, ArrowDown: (index + 1) % options.length, Home: 0, End: options.length - 1 };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    options[positions[event.key]].focus();
  });
  wrapper.addEventListener('focusout', event => {
    if (!wrapper.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!wrapper.contains(event.target)) setOpen(false);
  });
  for (const preview of previews) preview.addEventListener('click', () => choose(preview.dataset.chooseTheme));
  repaint();

  return {
    setMood(next) {
      moodTheme = ['light', 'dark', 'sad', 'fun'].includes(next) ? next : null;
      repaint();
    }
  };
}
