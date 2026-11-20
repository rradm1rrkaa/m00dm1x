import { mountAtmosphere } from './atmosphere.js';
import { ATMOSPHERE_CHANGE, DEFAULT_THEME, atmospheres, isAtmosphere } from './themes.js';
import { button, node } from '../components/ui.js';

const choices = [['auto', 'Авто — по настроению'], ...Object.entries(atmospheres).map(([value, { label }]) => [value, label])];

export async function createTheme(api, mount, onError, { previews = [], readMood, mood } = {}) {
  const { theme } = await api.settings();
  let selection = theme;
  let savedSelection = theme;
  const initialMood = readMood ? await readMood() : mood;
  let moodTheme = isAtmosphere(initialMood) ? initialMood : null;
  let selectionVersion = 0;
  let pendingChoice = false;
  const effective = () => selection === 'auto' ? moodTheme || DEFAULT_THEME : selection;
  const artwork = document.querySelector('.scene-art');
  const scene = mountAtmosphere(artwork, { context: artwork.dataset.context, onError });
  const wrapper = node('div', 'theme-control');
  const trigger = button('', () => setOpen(menu.hidden), 'theme-trigger');
  const label = node('span', 'theme-current');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'theme-options');
  trigger.append(label);
  const menu = node('div', 'theme-options');
  menu.id = 'theme-options';
  menu.hidden = true;
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Варианты оформления');
  const options = choices.map(([value, name]) => {
    const option = button(name, () => {
      setOpen(false, true);
      choose(value);
    }, 'theme-option');
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
    return scene.show(effective(), current => {
      document.documentElement.dataset.theme = current;
      document.dispatchEvent(new CustomEvent(ATMOSPHERE_CHANGE, { detail: current }));
    });
  }

  function setOpen(open, restoreFocus = false) {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) (options.find(option => option.getAttribute('aria-pressed') === 'true') || options[0]).focus();
    else if (restoreFocus) trigger.focus();
  }

  async function choose(value) {
    const version = ++selectionVersion;
    pendingChoice = true;
    selection = value;
    try {
      const ready = await repaint();
      if (version !== selectionVersion) return;
      if (!ready) {
        selection = savedSelection;
        repaint();
        return;
      }
      await api.setTheme(value);
      savedSelection = value;
      if (api.storageIssue()) onError?.(api.storageIssue());
    } catch (error) { onError?.(error.message); }
    finally { if (version === selectionVersion) pendingChoice = false; }
  }

  wrapper.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
      return;
    }
    const index = options.indexOf(document.activeElement);
    const previous = (index - 1 + options.length) % options.length;
    const next = (index + 1) % options.length;
    const positions = { ArrowUp: previous, ArrowLeft: previous, ArrowDown: next, ArrowRight: next, Home: 0, End: options.length - 1 };
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
  async function readSettings() {
    if (pendingChoice) return;
    const version = selectionVersion;
    const [{ theme: saved }, mood] = await Promise.all([api.settings(), readMood?.()]);
    if (pendingChoice || version !== selectionVersion) return;
    selection = savedSelection = saved;
    if (readMood) moodTheme = isAtmosphere(mood) ? mood : null;
    repaint();
  }
  window.addEventListener('pageshow', event => {
    if (event.persisted) readSettings().catch(error => onError?.(error.message));
  });
  window.addEventListener('storage', event => {
    if (event.key === api.storageKey) readSettings().catch(error => onError?.(error.message));
  });
  repaint();

  return {
    setMood(next) {
      moodTheme = isAtmosphere(next) ? next : null;
      return repaint();
    }
  };
}
