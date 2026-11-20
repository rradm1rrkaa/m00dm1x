import { icon } from './icons.js';
import { button, runAction, toast } from './ui.js';

export function paintFavorite(control, saved) {
  control.setAttribute('aria-pressed', String(saved));
  control.setAttribute('aria-label', saved ? 'Сохранено' : 'Сохранить в избранное');
  control.title = saved ? 'Убрать из избранного' : 'Сохранить в избранное';
}

export function favoriteButton(place, { api, getSession, afterWrite }, onChange) {
  const control = button('', runAction(async () => {
    const next = await api.toggleFavorite(place.id, { durable: true });
    paintFavorite(control, next);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      control.animate([{ scale: 1 }, { scale: 1.18 }, { scale: 1 }], 250);
    }
    await afterWrite();
    await onChange?.(next);
    toast(api.storageIssue() || (next ? 'Место сохранено' : 'Место убрано из избранного'));
  }), 'favorite icon-button');
  control.append(icon('heart'));
  paintFavorite(control, getSession().profile.favorites.includes(place.id));
  return control;
}
