const shapes = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.7 8.3-2.3 5.1-5.1 2.3 2.3-5.1 5.1-2.3Z"/>',
  spark: '<path d="M12 2.5c0 5.8 3.7 9.5 9.5 9.5-5.8 0-9.5 3.7-9.5 9.5 0-5.8-3.7-9.5-9.5-9.5 5.8 0 9.5-3.7 9.5-9.5Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-15a3 3 0 0 1 0 6m1 3a4 4 0 0 1 3 4v2"/>',
  chat: '<path d="M20.5 11.6a7.8 7.8 0 0 1-8.2 7.9 10 10 0 0 1-3.1-.5L4 21l1.6-4.3a7.8 7.8 0 1 1 14.9-5.1Z"/><path d="M8.5 11.5h7m-7 3h4.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1.3a2 2 0 0 0 1.3-3.6 1.3 1.3 0 0 1 1-2.3H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z"/><path d="M7.5 11h.01M10 7.5h.01m4.7 0h.01m2.9 3.5h.01" stroke-width="2.8"/>',
  heart: '<path d="m12 20-7-7a4.6 4.6 0 0 1 6.5-6.5l.5.5.5-.5A4.6 4.6 0 0 1 19 13l-7 7Z"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.7-5.3 2.7 1-5.8-4.2-4.1 5.9-.9 2.6-5.3Z"/>',
  pin: '<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sliders: '<path d="M4 7h16M4 12h16M4 17h16M8 5v4m8 1v4m-7 1v4"/>',
  pen: '<path d="m13.5 6.5 4 4M5 19l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L5 19Z"/>',
  dots: '<path d="M5 12h.01m7 0h.01m7 0h.01" stroke-width="3"/>',
  send: '<path d="m21 3-7 18-3.5-7.5L3 10l18-7ZM10.5 13.5 21 3"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3.5v5m8-5v5M4 10h16"/>',
  camera: '<path d="M4 8h4l1.5-3h5L16 8h4v11H4Z"/><circle cx="12" cy="13" r="3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M5 16C3 7 12 4 20 4c0 8-3 17-12 15M4 21l10-10"/>',
  bag: '<path d="M5 8h14l1.5 12h-17L5 8Zm4 1V6a3 3 0 0 1 6 0v3"/>',
  waves: '<path d="M3 8c3-3 6-3 9 0s6 3 9 0M3 13c3-3 6-3 9 0s6 3 9 0M3 18c3-3 6-3 9 0s6 3 9 0"/>',
  cup: '<path d="M4 8h13v4a6.5 6.5 0 0 1-13 0V8Zm13 1h2a2 2 0 0 1 0 4h-2M3 21h17M8 3v2m5-2v2"/>',
  game: '<path d="M7.5 7h9c4.5 0 7 10 3.5 11-1.3.4-3-1-4.5-2.5h-7C7 17 5.3 18.4 4 18 0.5 17 3 7 7.5 7ZM7.5 10v4m-2-2h4m6 0h.01m3 1.5h.01"/>',
  museum: '<path d="m3 8 9-5 9 5v2H3ZM4 21h16m-14-2v-6m4 6v-6m4 6v-6m4 6v-6"/>',
  pyramid: '<path d="m12 3 9 15-9 3-9-3L12 3Zm0 0v18M6 13l6 2 6-2"/>',
  music: '<path d="M9 18V6l11-2v12M9 10l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  external: '<path d="M13 4h7v7m0-7-9 9m6 0v7H4V7h7"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M7 11H5v10h14V11h-2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.4"/><path d="m4 18 5-5 3 3 4-5 4 4"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>'
};

export function icon(name) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  element.setAttribute('viewBox', '0 0 24 24');
  element.setAttribute('class', 'icon');
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('focusable', 'false');
  element.setAttribute('fill', 'none');
  element.setAttribute('stroke', 'currentColor');
  element.setAttribute('stroke-width', '1.7');
  element.setAttribute('stroke-linecap', 'round');
  element.setAttribute('stroke-linejoin', 'round');
  element.innerHTML = shapes[name] || shapes.compass;
  return element;
}

export function paintIcons(root = document) {
  for (const target of root.querySelectorAll('[data-icon]')) {
    const graphic = icon(target.dataset.icon);
    if (target.className) graphic.classList.add(...target.classList);
    target.replaceWith(graphic);
  }
}

export function ratingStars(value) {
  const stars = document.createElement('span');
  stars.className = 'review-stars';
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', 'Оценка ' + value + ' из 5');
  for (let index = 1; index <= 5; index++) {
    const star = icon('star');
    if (index <= value) star.classList.add('is-filled');
    stars.append(star);
  }
  return stars;
}
