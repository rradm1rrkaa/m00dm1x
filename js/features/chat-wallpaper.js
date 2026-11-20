import { button, node, runAction, toast } from '../components/ui.js';
import { atmospheres } from '../theme/themes.js';

const options = [
  ['theme', 'Текущая тема'], ['solid', 'Однотонные'], ['pattern', 'Узор'],
  ...Object.entries(atmospheres).map(([value, { chat }]) => [value, chat])
];

export function wallpaperControl(api, layout, initial, applyAppearance) {
  const panel = node('details', 'wallpaper-control');
  const summary = node('summary', '', 'Обои');
  summary.title = 'Обои чата';
  summary.setAttribute('aria-label', 'Обои чата');
  const menu = node('div', 'wallpaper-options');
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Варианты обоев');
  menu.append(node('strong', '', 'Обои чата'));
  const items = options.map(([value, label]) => {
    const control = button(label, runAction(() => choose(value)), 'theme-option');
    menu.append(control);
    return [value, control];
  });
  const reset = button('Сбросить обои', runAction(() => choose('theme')), 'vb');
  menu.append(reset);
  panel.append(summary, menu);

  function apply(value) {
    layout.dataset.wallpaper = value;
    for (const [option, control] of items) control.setAttribute('aria-pressed', String(value === option));
    reset.hidden = value === 'theme';
    applyAppearance();
  }
  function close() {
    summary.focus();
    panel.open = false;
  }
  async function choose(value) {
    if (value !== layout.dataset.wallpaper) {
      await api.setChatWallpaper(value);
      apply(value);
      toast('Обои чата сохранены');
    }
    close();
  }
  panel.addEventListener('keydown', event => {
    if (panel.open && event.key === 'Escape') close();
  });
  layout.addEventListener('pointerdown', event => {
    if (panel.open && !panel.contains(event.target)) panel.open = false;
  });
  apply(initial);
  return { panel, apply };
}
