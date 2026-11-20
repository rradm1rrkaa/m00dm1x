const starPaths = [
  'M34 22h.2 M111 45h.2 M174 17h.2 M239 73h.2 M324 34h.2 M387 66h.2 M441 23h.2 M478 88h.2 M73 105h.2 M271 125h.2 M141 142h.2 M468 143h.2',
  'M65 36h.2 M133 76h.2 M203 49h.2 M288 25h.2 M355 85h.2 M408 43h.2 M492 30h.2 M22 147h.2 M241 122h.2 M302 149h.2 M423 120h.2'
];

function layer(name) {
  const effect = document.createElement('div');
  effect.className = 'scene-effect scene-' + name;
  effect.dataset.effect = name;
  return effect;
}

function drawnLayer(name, viewBox, paths) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene-effect scene-' + name);
  svg.setAttribute('data-effect', name);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('preserveAspectRatio', 'none');
  for (const d of paths) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export function addSceneEffects(scene, stage, picture) {
  if (scene === 'dawn' || scene === 'dusk') {
    const solar = layer('solar');
    picture.before(solar);
    solar.append(picture, layer('sunlight'));
    stage.append(layer('cirrus'), layer('high-cloud'));
    return;
  }
  if (scene === 'coast') {
    const palm = picture.cloneNode(true);
    palm.classList.add('scene-effect', 'scene-palm');
    palm.dataset.effect = 'palm';
    stage.append(palm, drawnLayer('waves', '0 0 800 200', [
      'M-35 104 Q75 66 158 106 T350 99 T549 102 T820 89',
      'M-42 129 Q52 98 162 127 T360 121 T541 126 T821 111',
      'M30 165 Q128 136 230 155 T442 152 T632 150 T828 147'
    ]), layer('waterlight'));
    return;
  }
  const planet = picture.cloneNode(true);
  planet.classList.add('scene-effect', 'scene-planet');
  planet.dataset.effect = 'planet';
  stage.append(planet, layer('nebula'), drawnLayer('stars', '0 0 500 180', starPaths));
}

export function observeSceneVisibility(holder) {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(([entry]) => holder.toggleAttribute('data-outside', !entry.isIntersecting));
  observer.observe(holder);
}
