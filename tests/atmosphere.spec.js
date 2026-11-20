import { expect, test } from '@playwright/test';

const themes = {
  light: { label: 'Восход', scene: 'dawn', file: /wallpaper-sunrise(?:-mobile)?\.webp$/, effects: ['solar', 'cirrus', 'high-cloud'] },
  dark: { label: 'Закат', scene: 'dusk', file: /wallpaper-sunset(?:-mobile)?\.webp$/, hero: /moodmix-hero\.jpg$/, effects: ['solar', 'cirrus', 'high-cloud'] },
  sad: { label: 'Грусть', scene: 'space', file: /wallpaper-night(?:-mobile)?\.webp$/, effects: ['planet', 'nebula', 'stars'] },
  fun: { label: 'Веселье', scene: 'coast', file: /wallpaper-beach(?:-mobile)?\.webp$/, effects: ['palm', 'waves', 'waterlight'] }
};
const trigger = page => page.locator('.theme-trigger');
const layer = (page, holder = '.scene-art') => page.locator(holder + ' .atmosphere-layer.visible:not(.scene-leaving)');

async function choose(page, name) {
  await trigger(page).click();
  await page.locator('.theme-options').getByRole('button', { name, exact: true }).click();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
}

async function ready(page, key, holder, asset) {
  const theme = themes[key];
  const artwork = layer(page, holder);
  await expect(artwork).toHaveAttribute('data-scene', theme.scene);
  await expect(page.locator('html')).toHaveAttribute('data-theme', key);
  const image = artwork.locator('.atmosphere-art > img.visible');
  await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth ? img.currentSrc : '')).toMatch(asset || theme.file);
  await expect(artwork.locator('[data-effect]')).toHaveCount(theme.effects.length + (key === 'light' || key === 'dark' ? 1 : 0));
  for (const effect of theme.effects) await expect(artwork.locator('[data-effect="' + effect + '"]')).toBeAttached();
}

async function quiz(page, mood, onFirstAnswer) {
  await page.getByRole('button', { name: /Быстрый подбор/ }).click();
  const answers = page.locator('.opts button');
  await answers.nth(mood).click();
  await onFirstAnswer();
  for (let i = 1; i < 7; i++) await answers.first().click();
  await page.getByText('Настройки истории').click();
  await page.getByRole('checkbox', { name: /Сохранять результаты/ }).check();
  await page.getByRole('button', { name: 'Показать подборку' }).click();
  await expect(page.locator('#catalog')).toBeVisible();
}

test('landing and app share actual scenery, manual selection and quiz Auto', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  const title = await page.locator('#wt').elementHandle();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const titlePosition = await title.boundingBox();
  for (const [key, theme] of Object.entries(themes)) {
    await choose(page, theme.label);
    await ready(page, key, '.hero-art', theme.hero);
    expect(await title.evaluate(element => element === document.querySelector('#wt'))).toBe(true);
    expect(await title.boundingBox()).toEqual(titlePosition);
  }
  await page.reload();
  await ready(page, 'fun', '.hero-art');
  await page.getByRole('link', { name: 'Посмотреть каталог' }).click();
  await ready(page, 'fun', '.app-atmosphere');
  await page.goBack();
  await ready(page, 'fun', '.hero-art');
  await choose(page, 'Авто — по настроению');
  await ready(page, 'dark', '.hero-art', themes.dark.hero);
  await page.locator('.hero-actions').getByRole('link', { name: 'Подобрать место' }).click();
  await quiz(page, 0, () => ready(page, 'sad', '.app-atmosphere'));
  await ready(page, 'sad', '.app-atmosphere');
  await page.reload();
  await ready(page, 'sad', '.app-atmosphere');
  await page.getByRole('link', { name: 'MoodMix', exact: true }).first().click();
  await ready(page, 'sad', '.hero-art');
  await choose(page, 'Веселье');
  await ready(page, 'fun', '.hero-art');
  await page.locator('.hero-actions').getByRole('link', { name: 'Подобрать место' }).click();
  await quiz(page, 3, () => ready(page, 'fun', '.app-atmosphere'));
  await ready(page, 'fun', '.app-atmosphere');
  await choose(page, 'Авто — по настроению');
  await ready(page, 'light', '.app-atmosphere');
  expect(errors).toEqual([]);
});

test('scene effects move in real time and stop with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  for (const [key, theme] of Object.entries(themes)) {
    await choose(page, theme.label);
    await ready(page, key, '.hero-art', theme.hero);
    const artwork = layer(page, '.hero-art');
    const samples = await artwork.evaluate(async (element, names) => {
      const effects = names.map(name => element.querySelector('[data-effect="' + name + '"]' + (name === 'stars' ? ' path' : '')));
      const sample = () => effects.map(effect => {
        const style = getComputedStyle(effect);
        return { transform: style.transform, opacity: style.opacity, running: effect.getAnimations().some(a => a.playState === 'running') };
      });
      await new Promise(requestAnimationFrame);
      const start = sample();
      await new Promise(resolve => setTimeout(resolve, 535));
      return { start, end: sample() };
    }, theme.effects);
    for (const [index, before] of samples.start.entries()) {
      const after = samples.end[index];
      expect(after.running, theme.effects[index]).toBe(true);
      expect([after.transform, after.opacity], key + ' ' + theme.effects[index]).not.toEqual([before.transform, before.opacity]);
    }
    if (key === 'light' || key === 'dark') {
      const y = style => Number(style.transform.split(',').at(-1).replace(')', '').trim());
      const offset = y(samples.end[0]) - y(samples.start[0]);
      expect(offset * (key === 'light' ? -1 : 1)).toBeGreaterThan(0);
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [key, theme] of Object.entries(themes)) {
    await choose(page, theme.label);
    await ready(page, key, '.hero-art', theme.hero);
    const active = layer(page, '.hero-art');
    expect(await active.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  }
});

test('failed artwork retains the visible scene until its fallback decodes', async ({ page }) => {
  const warnings = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/wallpaper-night*.webp', async route => {
    await pending;
    await route.abort();
  });
  await page.goto('/');
  await ready(page, 'dark', '.hero-art', themes.dark.hero);
  await choose(page, 'Грусть');
  await expect(layer(page, '.hero-art')).toHaveAttribute('data-scene', 'dusk');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  release();
  await ready(page, 'sad', '.hero-art', /atmosphere-night\.jpg$/);
  expect(warnings.some(message => message.includes('MoodMix') && message.includes('wallpaper-night'))).toBe(true);

  await page.route('**/wallpaper-beach*.webp', route => route.abort());
  await page.route('**/atmosphere-beach.jpg', route => route.abort());
  await choose(page, 'Веселье');
  await expect(page.getByText('Не удалось загрузить атмосферу. Сохранён предыдущий фон.')).toBeVisible();
  await expect(trigger(page)).toHaveAccessibleName(/Грусть/);
  await ready(page, 'sad', '.hero-art', /atmosphere-night\.jpg$/);
});

test('resizing during a transition selects the portrait artwork', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  await page.route('**/wallpaper-beach.webp', async route => {
    await stalled;
    await route.continue();
  });
  await page.goto('/');
  const requested = page.waitForRequest('**/wallpaper-beach.webp');
  await choose(page, 'Веселье');
  await requested;
  await page.setViewportSize({ width: 390, height: 844 });
  release();
  await ready(page, 'fun', '.hero-art', /wallpaper-beach-mobile\.webp$/);
});

test('priority gallery photos decode and use local fallbacks', async ({ page }) => {
  const broken = [];
  page.on('response', response => { if (response.status() >= 400) broken.push(response.url()); });
  const selection = [
    ['mm-001', 'botanical-garden-view'], ['mm-002', 'national-museum-atrium'], ['mm-004', 'palace-hall'],
    ['mm-038', 'esil-riverfront'], ['mm-039', 'astana-central-park'], ['mm-057', 'khan-shatyr-exterior'],
    ['mm-170', 'bayterek-night']
  ];
  for (const [id, source] of selection) {
    await page.goto('/app.html?place=' + id);
    const gallery = page.locator('.place-gallery');
    const photo = gallery.locator('img').first();
    await expect.poll(() => photo.evaluate(image => image.decode().then(() => image.currentSrc))).toMatch(new RegExp(source + '-(?:720|wide)\\.webp$'));
    await expect(photo).toHaveCSS('filter', 'none');
    await expect(gallery.getByRole('link', { name: /^CC/, exact: false })).toBeVisible();
    await gallery.getByRole('button', { name: 'Открыть полноэкранный просмотр' }).click();
    const expanded = gallery.getByRole('dialog').locator('img');
    await expect.poll(() => expanded.evaluate(image => image.decode().then(() => image.currentSrc))).toMatch(new RegExp(source + '-(?:720|wide)\\.webp$'));
  }
  expect(broken).toEqual([]);
  await page.route('**/botanical-garden-view-*.webp', route => route.abort());
  await page.goto('/app.html?place=mm-001');
  const gallery = page.locator('.place-gallery');
  await expect.poll(() => gallery.locator('img').first().evaluate(image => image.complete && image.naturalWidth ? image.currentSrc : '')).toMatch(/botanical-garden-view\.jpg$/);
  await page.route('**/botanical-garden-view.jpg', route => route.abort());
  await page.reload();
  const unavailable = gallery.locator('.gallery-stage').first().getByText('Не удалось загрузить фотографию');
  await expect(unavailable).toBeVisible();
  await gallery.getByRole('button', { name: 'Следующее фото' }).click();
  await expect(unavailable).toBeHidden();
});

test('Direct keeps a manual wallpaper and bubble colours when the global atmosphere changes', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await page.getByRole('button', { name: /Direct/ }).click();
  const chat = page.locator('.messenger');
  await chat.getByRole('button', { name: /Тимур/ }).click();
  const image = layer(page, '.chat-art').locator('img.visible');
  const loaded = () => image.evaluate(img => img.complete && img.naturalWidth ? img.currentSrc : '');
  await expect.poll(loaded).toMatch(/direct-sunset(?:-mobile)?\.webp$/);
  await chat.getByLabel('Обои чата', { exact: true }).click();
  await chat.getByRole('button', { name: 'Космос', exact: true }).click();
  await expect.poll(loaded).toMatch(/direct-night(?:-mobile)?\.webp$/);
  const transcript = chat.locator('.transcript');
  const bubble = () => transcript.evaluate(log => getComputedStyle(log).getPropertyValue('--chat-outgoing'));
  const space = await bubble();
  const threadHidesNavigation = !(await trigger(page).isVisible());
  if (threadHidesNavigation) await chat.getByRole('button', { name: 'К списку диалогов' }).click();
  await choose(page, 'Восход');
  await ready(page, 'light', '.app-atmosphere');
  if (threadHidesNavigation) await chat.getByRole('button', { name: /Тимур/ }).click();
  await expect.poll(loaded).toMatch(/direct-night(?:-mobile)?\.webp$/);
  expect(await bubble()).toBe(space);
  await chat.getByLabel('Обои чата', { exact: true }).click();
  await chat.getByRole('button', { name: 'Текущая тема', exact: true }).click();
  await expect.poll(loaded).toMatch(/direct-sunrise(?:-mobile)?\.webp$/);
  expect(await bubble()).not.toBe(space);
});
