import { expect, test } from '@playwright/test';
import { visitParts } from '../js/services/visit-time.js';

const place = page => page.locator('.place-page');
const theme = page => page.locator('.theme-trigger');
const catalog = page => page.locator('#catalog');
const chat = page => page.locator('.messenger');
const errors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const failure = [];
  errors.set(page, failure);
  page.on('pageerror', error => failure.push(error.message));
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test('deep links, missing photos and sourced schedules are distinct', async ({ page }) => {
  await page.goto('/app.html?place=mm-057');
  await expect(place(page).getByRole('heading', { name: 'Хан Шатыр', level: 1 })).toBeVisible();
  await expect(place(page).getByRole('heading', { name: 'Что здесь находится' })).toBeVisible();
  await expect(place(page).getByText('Pull&Bear', { exact: true })).toBeVisible();
  await expect(place(page).getByText('Сегодня · 10:00–22:00')).toBeVisible();
  const gallery = place(page).locator('.place-gallery');
  await expect(gallery.getByRole('button', { name: 'Следующее фото' })).toBeHidden();
  await expect(gallery.getByRole('link', { name: 'CC0' })).toBeVisible();
  await expect.poll(() => gallery.locator('img').first().evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await page.goto('/app.html?place=mm-011');
  await expect(place(page).getByText('Фотографии пока недоступны')).toBeVisible();
  await expect(place(page).getByText('Уточните время работы на официальном сайте.')).toBeVisible();
  await page.goto('/app.html?place=missing');
  await expect(page.getByRole('heading', { name: 'Место не найдено' })).toBeVisible();
  await page.getByRole('button', { name: 'К списку мест' }).click();
  await expect(catalog(page)).toBeVisible();
  await expect(page).toHaveURL(/app\.html$/);
});

test('catalog filters, scroll and focus survive Back and Forward', async ({ page }) => {
  await page.goto('/app.html');
  await page.locator('#filters > summary').click();
  await page.getByRole('combobox', { name: 'Формат' }).selectOption('place');
  const search = page.getByLabel('Поиск по местам');
  const results = page.locator('.catalog-results-heading [role="status"]');
  const before = await results.textContent();
  await search.fill('сад');
  await expect(results).not.toHaveText(before);
  const opener = page.locator('.card[data-place="mm-001"] .ttl');
  await expect(opener).toBeVisible();
  await opener.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  expect(y).toBeGreaterThan(0);
  await opener.click();
  await expect(page).toHaveURL(/place=mm-001/);
  await page.goBack();
  await expect(search).toHaveValue('сад');
  await expect(page.getByRole('combobox', { name: 'Формат' })).toHaveValue('place');
  await expect(opener).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(y);
  await page.goForward();
  await expect(place(page).getByRole('heading', { name: 'Ботанический сад', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'К списку мест' }).click();
  await expect(search).toHaveValue('сад');
});

test('swipe changes gallery image on the page and in fullscreen', async ({ page }) => {
  await page.goto('/app.html?place=mm-001');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  async function swipe(frame) {
    await frame.scrollIntoViewIfNeeded();
    const { x, y, width, height } = await frame.boundingBox();
    const point = { x: x + width * .74, y: y + height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x - 80, y: point.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const gallery = place(page).locator('.place-gallery');
  await swipe(gallery.locator('.gallery-frame').first());
  await expect(gallery.getByText('Фото 2 из 2')).toBeVisible();
  await gallery.getByRole('button', { name: 'Открыть полноэкранный просмотр' }).click();
  const viewer = page.getByRole('dialog');
  await swipe(viewer.locator('.gallery-frame'));
  await expect(viewer.getByText('Фото 1 из 2')).toBeVisible();
  await viewer.getByRole('button', { name: 'Закрыть просмотр' }).click();
  await expect(viewer).toBeHidden();
});

test('reactions, invitation with Astana date and Direct wallpaper persist', async ({ page }) => {
  await page.goto('/app.html?place=mm-057&demo=1');
  const reaction = place(page).getByRole('button', { name: /Пойду/ });
  await reaction.click();
  await expect(reaction).toHaveAttribute('aria-pressed', 'true');
  await expect(reaction).toContainText('1');
  await page.reload();
  await expect(reaction).toHaveAttribute('aria-pressed', 'true');
  await reaction.click();
  await expect(reaction).toHaveAttribute('aria-pressed', 'false');

  await place(page).getByRole('button', { name: 'Запланировать прогулку' }).click();
  const drawer = page.getByRole('dialog', { name: 'Запланировать прогулку' });
  await drawer.getByRole('radio', { name: /Тимур/ }).check();
  const date = drawer.getByLabel('Дата', { exact: true });
  const time = drawer.getByLabel('Время в Астане');
  await date.fill(visitParts(Date.now() - 86400000).date);
  await time.fill('17:30');
  const submit = drawer.getByRole('button', { name: 'Отправить приглашение' });
  await submit.click();
  expect(await date.evaluate(input => input.validity.rangeUnderflow)).toBe(true);
  await expect(drawer).toBeVisible();
  const future = visitParts(Date.now() + 86400000 * 2).date;
  await date.fill(future);
  await drawer.getByLabel('Комментарий (необязательно)', { exact: true }).fill('Встретимся у входа.');
  await submit.click();
  await page.getByRole('button', { name: 'Открыть Direct' }).click();
  const invitation = chat(page).getByRole('log').locator('.invitation').filter({ hasText: 'Хан Шатыр' });
  await expect(invitation).toContainText('17:30');
  await expect(invitation).toContainText('Встретимся у входа.');
  await expect(invitation).toContainText('Ожидает ответа');
  await page.goBack();
  await expect(place(page).getByRole('heading', { name: 'Хан Шатыр', level: 1 })).toBeVisible();
  await page.goForward();
  await expect(invitation).toContainText('17:30');

  const wallpaper = chat(page).getByLabel('Обои чата', { exact: true });
  await wallpaper.click();
  const options = chat(page).getByRole('group', { name: 'Варианты обоев' });
  await options.getByRole('button', { name: 'Узор', exact: true }).click();
  await expect(chat(page)).toHaveAttribute('data-wallpaper', 'pattern');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(invitation).toBeVisible();
  await expect(chat(page)).toHaveAttribute('data-wallpaper', 'pattern');
  await expect(invitation).toContainText('17:30');
  await wallpaper.click();
  await options.getByRole('button', { name: 'Сбросить обои' }).click();
  await expect(chat(page)).toHaveAttribute('data-wallpaper', 'theme');
});

test('landing menu stays above the title and all app atmospheres load', async ({ page }) => {
  await page.goto('/');
  await theme(page).click();
  const menu = await page.locator('.theme-options').boundingBox();
  const title = await page.locator('#wt').boundingBox();
  expect(menu.y + menu.height <= title.y || menu.x >= title.x + title.width).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('.theme-options')).toBeHidden();
  await page.goto('/app.html');
  for (const [label, scene] of [['Восход', 'sunrise'], ['Закат', 'sunset'], ['Грусть', 'night'], ['Веселье', 'beach']]) {
    await theme(page).click();
    await page.locator('.theme-options').getByRole('button', { name: label, exact: true }).click();
    const artwork = page.locator('.app-atmosphere img.visible').last();
    await expect(artwork).toHaveAttribute('src', new RegExp('wallpaper-' + scene + '\\.webp$'));
    await expect.poll(() => artwork.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test('header and footer use the viewport and share the script wordmark', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  const header = page.locator('.app-header');
  const brand = header.getByRole('link', { name: 'MoodMix' });
  await expect(brand).toHaveCSS('font-family', /MoodMix Script/);
  await expect(header.locator('nav svg, .theme-trigger svg')).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Каталог' })).toHaveCSS('font-family', /Montserrat/);
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const [left, center, right] = await Promise.all([
      brand.boundingBox(),
      header.locator('.head-primary').boundingBox(),
      header.locator('.head-utilities').boundingBox()
    ]);
    expect(left.x).toBeLessThan(55);
    expect(Math.abs(center.x + center.width / 2 - width / 2)).toBeLessThan(2);
    expect(width - right.x - right.width).toBeLessThan(55);
  }

  await page.goto('/');
  const footer = page.locator('.landing-footer');
  const footerBrand = footer.getByRole('link', { name: 'MoodMix' });
  await expect(footerBrand).toHaveCSS('font-family', /MoodMix Script/);
  await expect(footer.locator('svg')).toHaveCount(0);
  for (const width of [1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const [left, center, right] = await Promise.all([
      footerBrand.boundingBox(),
      footer.locator('.footer-navigation').boundingBox(),
      footer.locator('.footer-contacts').boundingBox()
    ]);
    expect(left.x).toBeLessThan(55);
    if (width === 390) {
      expect(center.y).toBeGreaterThan(left.y + left.height);
      expect(right.y).toBe(center.y);
      expect(right.x).toBeGreaterThanOrEqual(center.x + center.width);
    } else {
      const gap = right.x - (center.x + center.width);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(64);
      expect(width - right.x - right.width).toBeLessThan(55);
    }
    const contacts = footer.locator('.footer-contacts');
    const [heading, firstLink] = await Promise.all([
      contacts.getByRole('heading').boundingBox(),
      contacts.getByRole('link').first().boundingBox()
    ]);
    expect(heading.x).toBeCloseTo(firstLink.x, 1);
  }
});

test('place titles keep every word whole in narrow layouts', async ({ page }) => {
  const ids = ['mm-039', 'mm-002', 'mm-004', 'mm-011', 'mm-057'];
  for (const id of ids) {
    await page.goto('/app.html?place=' + id);
    const heading = place(page).getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const keptWhole = await heading.evaluate(async title => {
        await document.fonts.ready;
        const box = title.getBoundingClientRect();
        const text = title.firstChild;
        const words = text.textContent.matchAll(/\S+/g);
        return [...words].every(word => {
          const range = document.createRange();
          range.setStart(text, word.index);
          range.setEnd(text, word.index + word[0].length);
          const bounds = range.getClientRects();
          return bounds.length === 1 && bounds[0].left >= box.left - 1 && bounds[0].right <= box.right + 1;
        });
      });
      expect(keptWhole, id + ' at ' + width).toBe(true);
    }
  }
});

test('catalog and Direct use detailed wallpapers sized for each viewport', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  const artwork = page.locator('.app-atmosphere img.visible').last();
  for (const [width, suffix] of [[1440, ''], [390, '-mobile']]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => artwork.evaluate(image => image.currentSrc)).toMatch(new RegExp('wallpaper-sunset' + suffix + '\\.webp$'));
    await expect.poll(() => artwork.evaluate(image => image.naturalWidth)).toBe(width === 390 ? 864 : 1536);
  }
  await page.getByRole('button', { name: /Direct/ }).click();
  await chat(page).getByRole('button', { name: /Тимур/ }).click();
  const chatArt = chat(page).locator('.chat-art .visible:not(.scene-leaving) img');
  await expect.poll(() => chatArt.evaluate(image => image.currentSrc)).toMatch(/direct-sunset-mobile\.webp$/);
  await expect(chat(page).locator('.transcript-date > span').first()).toBeVisible();
  await chat(page).getByLabel('Обои чата', { exact: true }).click();
  await chat(page).getByRole('button', { name: 'Космос', exact: true }).click();
  await expect.poll(() => chatArt.evaluate(image => image.currentSrc)).toMatch(/direct-night-mobile\.webp$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
