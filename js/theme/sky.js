import { mountScenes } from './scenes.js';

const randomBetween = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const blend = (a, b, ratio) => a.map((n, i) => n + (b[i] - n) * ratio);
const rgb = values => values.map(Math.round).join(',');

// A keyframe describes the sky colours, sun position and colour, stars, hill and moon.
const keyframe = (top, bottom, altitude, sun, stars, hill, moon) => [...top, ...bottom, altitude, ...sun, stars, ...hill, moon];
const night = keyframe([7,11,31], [28,30,74], 1.08, [255,120,60], 1, [10,10,24], .22);
const gradients = {
  dark: [
    keyframe([72,60,152], [255,152,72], .42, [255,214,110], 0, [46,26,66], 1.1),
    keyframe([54,40,112], [216,82,102], .62, [255,146,84], .2, [32,18,50], .85),
    keyframe([20,22,60], [96,54,114], .84, [255,110,70], .7, [20,12,36], .5), night
  ],
  light: [
    keyframe([94,126,187], [246,183,147], .61, [255,224,163], .14, [78,83,103], .34),
    keyframe([111,157,215], [255,202,159], .53, [255,229,170], .02, [78,107,110], .7),
    keyframe([92,172,246], [255,226,190], .42, [255,236,160], 0, [52,104,64], 1.1),
    keyframe([62,148,240], [204,234,255], .2, [255,248,205], 0, [58,116,72], 1.1)
  ]
};

function createStars(holder, compact) {
  const batch = document.createDocumentFragment();
  for (const [count, far] of [[compact ? 42 : 75, false], [compact ? 63 : 125, true]]) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement('i');
      const size = far ? randomBetween(.6, 1.9) : randomBetween(1, 3);
      if (far) star.className = 'dp';
      star.style.cssText = [
        'left:' + randomBetween(0, 100) + '%', 'top:' + randomBetween(0, 100) + '%',
        'width:' + size + 'px', 'height:' + size + 'px', 'opacity:' + randomBetween(.35, 1),
        'animation-delay:-' + randomBetween(0, 4) + 's'
      ].join(';');
      batch.append(star);
    }
  }
  holder.append(batch);
}

function createClouds(holder) {
  const layers = [[12,140,190,.55,1.4], [24,170,210,.55,1.4], [40,130,230,.5,1.4],
    [18,230,140,.8,.7], [34,260,160,.8,.7], [52,210,150,.75,.8],
    [28,340,100,1,0], [46,380,120,1,0], [8,300,110,.95,0]];
  const batch = document.createDocumentFragment();
  for (const [top, width, duration, opacity, blur] of layers) {
    const circles = Array.from({ length: 7 }, (_, index) => {
      const fraction = index / 6;
      const radius = randomBetween(20, 28) + (1 - Math.abs(fraction - .5) * 2) * randomBetween(14, 24);
      return [44 + fraction * 212 + randomBetween(-8,8), 96 - radius * .72, radius];
    });
    const circle = (x, y, radius) => '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + radius.toFixed(1) + '"/>';
    const shape = dy => '<rect x="20" y="' + (82 + dy) + '" width="260" height="26" rx="13"/>'
      + circles.map(([x,y,r]) => circle(x, y + dy, r)).join('');
    const highlights = circles.map(([x,y,r]) => circle(x - r * .22, y - r * .28, r * .68)).join('');
    const cloud = document.createElement('b');
    cloud.style.cssText = [
      'top:' + top + '%', 'width:' + width + 'px', '--o:' + opacity, '--bl:' + blur + 'px',
      'transform:translateX(' + randomBetween(5, 90).toFixed(0) + 'vw)',
      'animation-duration:' + duration + 's', 'animation-delay:-' + randomBetween(0, duration).toFixed(0) + 's'
    ].join(';');
    cloud.innerHTML = '<svg viewBox="0 0 300 120" aria-hidden="true"><g fill="#5b4fa0" fill-opacity=".2">'
      + shape(7) + '</g><g class="cp">' + shape(0) + '</g><g fill="#fff" fill-opacity=".28">' + highlights
      + '</g><rect x="20" y="94" width="260" height="14" rx="7" fill="#5b4fa0" fill-opacity=".14"/></svg>';
    batch.append(cloud);
  }
  holder.append(batch);
}

export function mountSky(initialTheme) {
  mountScenes();
  const root = document.documentElement;
  const get = id => document.getElementById(id);
  const sky = get('sky'), sun = get('sun'), moon = get('moon'), stars = get('stars'), clouds = get('clouds');
  const nearHill = get('hf'), farHill = get('hp'), cosmos = get('cosmos'), beachSky = get('fsky');
  const beachShade = document.querySelector('#beach .dk');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  createStars(stars, matchMedia('(max-width: 600px)').matches);
  createClouds(clouds);

  let theme;
  let frame = 0, transition, previousGradient = null;
  function render() {
    frame = 0;
    if (document.hidden) return;
    const scrollable = root.scrollHeight - innerHeight;
    const progress = reduce.matches || scrollable <= 0 ? 0 : clamp(scrollY / scrollable, 0, 1);

    if (theme === 'sad') {
      cosmos?.style.setProperty('--py', -progress * 80 + 'px');
      return;
    }

    if (theme === 'fun') {
      const sunset = Math.min(1, progress * 1.15);
      const height = Math.max(1, innerHeight);
      const horizon = clamp((height - 400 * Math.max(innerWidth / 1600, height / 900)) / height * 100, 4, 96);
      const top = rgb(blend([45,143,232], [58,40,120], sunset));
      const bottom = rgb(blend([191,238,255], [255,150,90], sunset));
      beachSky.style.background = 'linear-gradient(rgb(' + top + ') 0%, rgb(' + bottom + ') ' + horizon + '%)';
      sun.style.top = 12 + sunset * (horizon - 7) + '%';
      sun.style.left = 80 - sunset * 8 + '%';
      const color = rgb(blend([255,227,107], [255,120,50], sunset));
      sun.style.background = 'radial-gradient(circle,#fff 0%,rgb(' + color + ') 55%)';
      sun.style.boxShadow = '0 0 80px 40px rgba(' + color + ',.6)';
      beachShade.style.opacity = (sunset * .3).toFixed(2);
      return;
    }

    const frames = gradients[theme];
    const segment = Math.min(progress * (frames.length - 1), frames.length - 1 - 1e-8);
    const index = Math.floor(segment);
    const target = blend(frames[index], frames[index + 1], segment - index);
    const current = previousGradient && !reduce.matches ? blend(previousGradient, target, .18) : target;
    previousGradient = current;
    const colourTop = current.slice(0, 3), colourBottom = current.slice(3, 6);
    sky.style.background = 'linear-gradient(rgb(' + rgb(colourTop) + '),rgb(' + rgb(colourBottom) + ') 70%)';
    sun.style.top = current[6] * 100 + '%';
    sun.style.left = 76 - progress * 10 + '%';
    const sunColour = rgb(current.slice(7, 10));
    sun.style.background = 'radial-gradient(circle,#fff 0%,rgb(' + sunColour + ') 55%)';
    sun.style.boxShadow = '0 0 90px 50px rgba(' + sunColour + ',.55),0 0 220px 110px rgba(' + sunColour + ',.25)';
    stars.style.opacity = clamp(current[10], 0, 1);
    moon.style.top = current[14] * 100 + '%';
    farHill.style.fill = 'rgb(' + rgb(current.slice(11, 14)) + ')';
    nearHill.style.fill = 'rgb(' + rgb(blend(current.slice(11, 14), colourBottom, .4)) + ')';
    clouds.style.transform = 'translateY(' + -progress * 90 + 'px)';
    clouds.style.setProperty('--cl', 'rgb(' + rgb(blend(colourBottom, [255,255,255], .55)) + ')');
    clouds.style.setProperty('--ca', Math.min(.85, (.12 + .36 * (1 - clamp(current[10], 0, 1))) * 1.5));
    if (!reduce.matches && current.some((value, i) => Math.abs(value - target[i]) > .45)) schedule();
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }

  function syncMotion() {
    const svg = get('cosmosSvg');
    if (reduce.matches || document.hidden) svg?.pauseAnimations?.();
    else svg?.unpauseAnimations?.();
    schedule();
  }

  function setTheme(next) {
    if (theme === next) return;
    if (theme && !reduce.matches) {
      root.dataset.from = theme;
      root.classList.add('tx');
      clearTimeout(transition);
      transition = setTimeout(() => root.classList.remove('tx'), 3400);
    }
    theme = next;
    root.dataset.theme = next;
    if (next === 'sad' || next === 'fun') {
      sky.style.background = '';
      stars.style.opacity = next === 'sad' ? '1' : '0';
      clouds.style.transform = '';
      clouds.style.setProperty('--cl', 'rgb(255,255,255)');
      clouds.style.setProperty('--ca', '.92');
    }
    schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', syncMotion);
  reduce.addEventListener('change', syncMotion);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  setTheme(initialTheme);
  syncMotion();
  return { setTheme };
}
