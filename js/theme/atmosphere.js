import { atmospheres } from './themes.js';
import { addSceneEffects, observeSceneVisibility } from './scene-controller.js';

const mobileMedia = '(max-width: 730px) and (orientation: portrait)';
const assets = 'assets/images/';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

async function loadPicture(holder, theme, file, mobile) {
  const stage = document.createElement('div');
  stage.className = 'atmosphere-layer';
  stage.dataset.scene = atmospheres[theme].scene;
  stage.dataset.atmosphere = theme;
  const picture = document.createElement('picture');
  picture.className = 'atmosphere-art';
  picture.dataset.atmosphere = theme;
  if (mobile) {
    const source = document.createElement('source');
    source.media = mobileMedia;
    source.srcset = assets + mobile;
    picture.append(source);
  }
  const image = new Image();
  image.alt = '';
  picture.append(image);
  stage.append(picture);
  holder.append(stage);
  const viewport = mobile && matchMedia(mobileMedia);
  const firstIsMobile = viewport?.matches;
  image.src = assets + file;
  try {
    try { await image.decode(); }
    catch (error) {
      if (viewport?.matches === firstIsMobile) throw error;
      await image.decode();
    }
    return { stage, picture, image };
  } catch (error) {
    stage.remove();
    throw error;
  }
}

export function mountAtmosphere(holder, { context = 'app', onError } = {}) {
  let active = holder.querySelector('.atmosphere-layer.visible');
  let committed;
  let requested;
  let pending;
  let revision = 0;
  if (context !== 'chat') observeSceneVisibility(holder);

  function clear() {
    revision++;
    requested = committed = active = pending = undefined;
    holder.replaceChildren();
  }

  function show(theme, commit) {
    if (requested === theme) return pending;
    requested = theme;
    const frame = ++revision;
    pending = theme === committed ? Promise.resolve(true) : apply(theme, frame, commit);
    return pending;
  }

  async function apply(theme, frame, commit) {
    const { artwork, hero, scene } = atmospheres[theme];
    const base = 'wallpaper-' + artwork;
    const candidates = [[base + '.webp', base + '-mobile.webp'], ['atmosphere-' + artwork + '.jpg']];
    if (context === 'hero' && hero) candidates.unshift([hero]);
    if (context === 'chat') candidates.unshift(['direct-' + artwork + '.webp', 'direct-' + artwork + '-mobile.webp']);
    let next;
    for (const [file, mobile] of candidates) {
      try { next = await loadPicture(holder, theme, file, mobile); }
      catch (error) {
        if (frame !== revision) return false;
        console.warn('MoodMix: не удалось загрузить сцену ' + theme + ' (' + file + ')', error.message);
      }
      if (frame !== revision) { next?.stage.remove(); return false; }
      if (next) break;
    }
    if (!next) {
      requested = undefined;
      onError?.('Не удалось загрузить атмосферу. Сохранён предыдущий фон.');
      return false;
    }
    const { stage, picture, image } = next;
    if (context !== 'chat') addSceneEffects(scene, stage, picture);
    const previous = active;
    active = stage;
    committed = theme;
    image.classList.add('visible');
    if (previous && !reducedMotion.matches) {
      // Start the transition with the outgoing scene still fully opaque.
      getComputedStyle(stage).opacity;
      previous.classList.add('scene-leaving');
    }
    stage.classList.add('visible');
    commit?.(theme);
    if (!previous || reducedMotion.matches) previous?.remove();
    else setTimeout(() => { if (previous !== active) previous.remove(); }, 740);
    return true;
  }

  return { show, clear };
}
