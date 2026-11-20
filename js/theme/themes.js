export const DEFAULT_THEME = 'dark';
export const ATMOSPHERE_CHANGE = 'moodmix:atmospherechange';

export const atmospheres = {
  light: { label: 'Восход', artwork: 'sunrise', scene: 'dawn', chat: 'Восход' },
  dark: { label: 'Закат', artwork: 'sunset', scene: 'dusk', hero: 'moodmix-hero.jpg', chat: 'Закат' },
  sad: { label: 'Грусть', artwork: 'night', scene: 'space', chat: 'Космос' },
  fun: { label: 'Веселье', artwork: 'beach', scene: 'coast', chat: 'Пляж' }
};

export function isAtmosphere(value) {
  return Object.hasOwn(atmospheres, value);
}

export function currentAtmosphere() {
  const current = document.documentElement.dataset.theme;
  return isAtmosphere(current) ? current : DEFAULT_THEME;
}
