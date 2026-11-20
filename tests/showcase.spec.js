import { expect, test } from '@playwright/test';

const errors = new WeakMap();
const dialog = page => page.getByRole('dialog');
const tabs = page => page.locator('#tabs');
const messages = page => page.locator('.messenger');
const profilePage = page => page.locator('.profile-page');
const card = (page, name) => page.locator('.card').filter({ has: page.getByRole('heading', { name, exact: true }) });
const themeTrigger = page => page.getByRole('button', { name: /^Тема оформления/ });

test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && message.location().url.includes('/js/')) errors.get(page).push(message.text());
  });
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test('landing opens guest catalog from the first screen without a test', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to MoodMix' })).toBeVisible();
  const entry = page.getByRole('link', { name: 'Посмотреть каталог' });
  await expect(entry).toBeInViewport();
  await entry.click();
  await expect(page.getByRole('heading', { name: 'Места и идеи отдыха' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ботанический сад' })).toBeVisible();
  await expect(page.locator('#mode-note')).toContainText('Гость');
  await expect(page.getByRole('button', { name: /Direct/ })).toBeHidden();
  await tabs(page).getByRole('button', { name: 'Подборка Астаны' }).click();
  await expect(page.locator('.showcase-grid .card')).toHaveCount(19);
  await expect(page.locator('.showcase-grid .card').first()).toHaveCSS('flex-direction', 'column');
});

for (const [mode, total] of [['Быстрый', 7], ['Подробный', 25]]) {
  test(mode + ' тест supports changing answers and shows ranked recommendations', async ({ page }) => {
    await page.goto('/app.html?start=quiz&guest=1');
    await page.getByRole('button', { name: new RegExp(mode + ' подбор') }).click();
    const quiz = page.locator('#quiz');
    const choices = quiz.locator('.opts button');
    await expect(quiz.getByText('Вопрос 1 из ' + total)).toBeVisible();
    await choices.first().click();
    await expect(quiz.getByText('Вопрос 2 из ' + total)).toBeVisible();
    await quiz.getByRole('button', { name: 'Назад' }).click();
    await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
    await choices.nth(1).click();
    for (let question = 2; question <= total; question++) {
      await expect(quiz.getByText('Вопрос ' + question + ' из ' + total)).toBeVisible();
      await choices.first().click();
    }
    await expect(quiz.getByRole('button', { name: 'Начать заново' })).toBeVisible();
    await quiz.getByRole('button', { name: 'Показать подборку' }).click();
    await expect(tabs(page).getByRole('button', { name: 'Для вас' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.recommendation-reason').first()).toBeVisible();
  });
}

test('saving and marking a place persists; dialog handles keyboard focus', async ({ page }) => {
  await page.goto('/app.html');
  const opener = card(page, 'Ботанический сад').getByRole('button', { name: 'Подробнее' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const panel = dialog(page);
  const title = panel.getByRole('heading', { name: 'Ботанический сад' });
  await expect(title).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(panel.getByRole('button', { name: 'Закрыть', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Закрыть окно', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Предыдущее фото' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Следующее фото' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel.getByText('Фото 2 из 2')).toBeVisible();
  await expect.poll(() => panel.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await panel.getByRole('button', { name: 'Сохранить' }).focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('button', { name: 'Сохранено' })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: 'Был здесь' }).click();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(opener).toBeFocused();
  await page.reload();
  await tabs(page).getByRole('button', { name: 'Избранное' }).click();
  await expect(card(page, 'Ботанический сад')).toBeVisible();
  await card(page, 'Ботанический сад').getByRole('button', { name: 'Подробнее' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Вы были здесь' })).toBeVisible();
});

test('demo ratings, query and filters combine; reset recovers an empty result', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await expect(page.locator('#mode-note')).toContainText('Демо');
  await page.locator('#filters > summary').click();
  await page.getByRole('combobox', { name: 'Оценка', exact: true }).selectOption('4');
  await expect(page.locator('.showcase-grid .card')).toHaveCount(2);
  await page.getByLabel('Поиск по местам').fill('байтерек');
  await expect(page.locator('.showcase-grid .card')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Стоимость', exact: true }).selectOption('paid');
  await expect(card(page, 'Байтерек')).toBeVisible();
  await page.getByRole('combobox', { name: 'Формат', exact: true }).selectOption('idea');
  await expect(page.getByRole('heading', { name: 'Места не найдены' })).toBeVisible();
  await page.locator('#out').getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(page.getByLabel('Поиск по местам')).toHaveValue('');
  await expect(page.locator('.showcase-grid .card')).toHaveCount(24);
});

test('manual theme survives reload and overrides quiz theme', async ({ page }) => {
  await page.goto('/app.html?start=quiz&guest=1');
  const selector = themeTrigger(page);
  for (const [theme, label] of [['light', 'Восход'], ['dark', 'Закат'], ['sad', 'Грусть'], ['fun', 'Веселье']]) {
    await selector.click();
    await page.getByRole('group', { name: 'Варианты оформления' }).getByRole('button', { name: label, exact: true }).click();
    await expect(selector).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }
  await page.getByRole('button', { name: /Быстрый подбор/ }).click();
  for (let i = 0; i < 7; i++) await page.locator('.opts button').first().click();
  await page.getByRole('button', { name: 'Показать подборку' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fun');
  await page.reload();
  await expect(selector).toHaveAccessibleName(/Веселье/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fun');
});

test('automatic atmosphere previews all four themes and restores the accepted result', async ({ page }) => {
  await page.goto('/app.html?start=quiz&guest=1');
  await page.getByRole('button', { name: /Быстрый подбор/ }).click();
  const answers = page.locator('.opts button');
  for (const [index, theme] of [[0, 'sad'], [2, 'dark'], [3, 'light'], [4, 'fun']]) {
    await answers.nth(index).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    if (theme !== 'fun') await page.locator('#quiz').getByRole('button', { name: 'Назад' }).click();
  }
  for (let i = 1; i < 7; i++) await answers.first().click();
  await page.getByText('Настройки истории').click();
  await page.getByRole('checkbox', { name: /Сохранять результаты/ }).check();
  await page.getByRole('button', { name: 'Показать подборку' }).click();
  await page.reload();
  await expect(themeTrigger(page)).toHaveAccessibleName(/Авто — по настроению/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fun');
});

test('local Montserrat, SVG icons and aligned demo CTA on the landing', async ({ page }) => {
  await page.goto('/');
  const demo = page.getByRole('link', { name: 'Открыть демо с профилями' });
  const section = page.locator('#try');
  await expect(page.locator('.place-window img')).toHaveCount(2);
  await expect(page.locator('.journey-steps li')).toHaveCount(3);
  await expect(page.locator('.feature-layout article')).toHaveCount(6);
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'GitHub' })).toBeVisible();
  await expect(page.locator('.demo-review')).toHaveCount(2);
  await expect(page.locator('.demo-review img')).toHaveCount(2);
  await expect(page.locator('.demo-review .review-stars svg')).toHaveCount(10);
  await expect(page.locator('.demo-review .is-filled')).toHaveCount(9);
  await expect(page.getByRole('heading', { name: 'Welcome to MoodMix' })).toHaveCSS('font-family', /MoodMix Script/);
  for (const zoom of [.8, 1, 1.25]) {
    await page.evaluate(zoom => { document.body.style.zoom = String(zoom); }, zoom);
    await demo.scrollIntoViewIfNeeded();
    const [link, block] = await Promise.all([demo.boundingBox(), section.boundingBox()]);
    expect(Math.abs(link.x + link.width / 2 - (block.x + block.width / 2))).toBeLessThan(2);
  }
  await demo.focus();
  await expect(demo).toBeFocused();
  const isLoaded = await page.evaluate(async () => {
    const faces = await document.fonts.load('600 16px Montserrat', 'Русский текст');
    await document.fonts.ready;
    return faces.length > 0 && faces.every(font => font.family === 'Montserrat' && font.status === 'loaded')
      && document.fonts.check('600 16px Montserrat', 'Русский текст')
      && getComputedStyle(document.body).fontFamily.startsWith('Montserrat');
  });
  expect(isLoaded).toBe(true);
  expect(await page.locator('body').innerText()).not.toMatch(/[\p{Extended_Pictographic}\uFE0F\u2605]/u);
  await demo.press('Enter');
  await expect(page.locator('#mode-note')).toContainText('Демо');
  expect(await page.locator('body').innerText()).not.toMatch(/[\p{Extended_Pictographic}\uFE0F\u2605]/u);
});

test('landing atmosphere cards and keyboard theme menu stay in sync', async ({ page }) => {
  await page.goto('/');
  const trigger = themeTrigger(page);
  await trigger.focus();
  await trigger.press('Enter');
  const options = page.getByRole('group', { name: 'Варианты оформления' });
  await expect(options.getByRole('button', { name: 'Авто — по настроению' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(options.getByRole('button', { name: 'Восход' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(options).toBeHidden();
  await expect(trigger).toBeFocused();
  const postcards = page.locator('.theme-grid');
  for (const [name, value] of [['Восход', 'light'], ['Грусть', 'sad'], ['Веселье', 'fun'], ['Закат', 'dark']]) {
    const preview = postcards.getByRole('button', { name: new RegExp('^' + name) });
    await preview.click();
    await expect(preview).toHaveAttribute('aria-pressed', 'true');
    await expect(trigger).toHaveAccessibleName(new RegExp(name));
    await expect(page.locator('html')).toHaveAttribute('data-theme', value);
    await expect.poll(() => preview.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test('switching demo participants isolates favorites and displays sent messages', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await tabs(page).getByRole('button', { name: 'Избранное' }).click();
  await expect(card(page, 'Ботанический сад')).toBeVisible();
  await page.getByRole('button', { name: 'Сменить профиль' }).click();
  await dialog(page).getByRole('button', { name: 'Тимур', exact: true }).click();
  await tabs(page).getByRole('button', { name: 'Избранное' }).click();
  await expect(card(page, 'Байтерек')).toBeVisible();
  await expect(card(page, 'Ботанический сад')).toHaveCount(0);
  const directTab = page.getByRole('button', { name: /Direct/ });
  await directTab.click();
  await expect(directTab).toHaveAttribute('aria-current', 'page');
  const search = messages(page).getByRole('searchbox', { name: 'Поиск диалогов' });
  await search.fill('Алия');
  await messages(page).getByRole('button', { name: /Алия/ }).click();
  await messages(page).getByRole('button', { name: 'Принять прогулку' }).click();
  await expect(messages(page).getByRole('log').getByText('Принято', { exact: true })).toBeVisible();
  await messages(page).getByLabel('Сообщение', { exact: true }).fill('Проверка: встречаемся в саду!');
  await messages(page).getByRole('button', { name: 'Отправить' }).click();
  await expect(messages(page).getByRole('log').getByText('Проверка: встречаемся в саду!')).toBeVisible();
  const back = messages(page).getByRole('button', { name: 'К списку диалогов' });
  if (await back.isVisible()) await back.click();
  else await expect(messages(page).getByRole('navigation', { name: 'Диалоги' }).getByRole('button', { name: /Алия/ })).toHaveAttribute('aria-current', 'page');
  await expect(search).toHaveValue('Алия');
  await messages(page).getByRole('button', { name: 'Выйти из сообщений' }).click();
  await page.getByRole('button', { name: 'Сменить профиль' }).click();
  await dialog(page).getByRole('button', { name: 'Алия', exact: true }).click();
  await directTab.click();
  await messages(page).getByRole('button', { name: /Тимур/ }).click();
  await expect(messages(page).getByRole('log').getByText('Проверка: встречаемся в саду!')).toBeVisible();
});

test('profile deletion leaves a guest state and empty favorites after reload', async ({ page }) => {
  page.on('dialog', prompt => prompt.accept());
  await page.goto('/app.html?demo=1');
  await page.locator('#profile').click();
  await profilePage(page).getByLabel('Действия профиля').click();
  await profilePage(page).getByRole('button', { name: 'Удалить локальный профиль' }).click();
  await expect(page.locator('#mode-note')).toContainText('Гость');
  await page.reload();
  await expect(page.locator('#mode-note')).toContainText('Гость');
  await tabs(page).getByRole('button', { name: 'Избранное' }).click();
  await expect(page.getByRole('heading', { name: 'Избранное пока пусто' })).toBeVisible();
  await page.getByRole('button', { name: 'Демо-профили' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Алия', exact: true })).toHaveCount(0);
});

test('profile editing, portrait and privacy survive a switch', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await page.locator('#profile').click();
  await profilePage(page).getByRole('button', { name: 'Редактировать профиль' }).click();
  const panel = dialog(page);
  await panel.getByRole('textbox', { name: 'Имя' }).fill('Алия · демо');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#554f96';
    ctx.fillRect(0, 0, 8, 8);
    return canvas.toDataURL().split(',')[1];
  });
  await panel.getByLabel(/Аватар/).setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await panel.getByText('Показывать недавние посещения в локальном профиле').click();
  await expect(panel.locator('img')).toHaveCount(1);
  await panel.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(profilePage(page).getByRole('heading', { name: 'Алия · демо' })).toBeVisible();
  await expect(profilePage(page).locator('img')).toHaveCount(1);
  await page.locator('#nav-catalog').click();
  await page.getByRole('button', { name: 'Сменить профиль' }).click();
  await panel.getByRole('button', { name: 'Тимур', exact: true }).click();
  await page.locator('#friends').click();
  const alia = panel.locator('.rv').filter({ hasText: 'Алия · демо' });
  await alia.getByRole('button', { name: 'Профиль', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Посещённые места' })).toBeVisible();
});

test('long local messages wrap at 320 px and stay within the messenger', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 680 });
  await page.goto('/app.html?demo=1');
  await page.getByRole('button', { name: /Direct/ }).click();
  await messages(page).getByRole('button', { name: /Тимур/ }).click();
  const message = 'сообщение'.repeat(80);
  const composer = messages(page).getByLabel('Сообщение', { exact: true });
  await expect(messages(page).getByRole('navigation', { name: 'Диалоги' })).toBeHidden();
  await expect(messages(page).getByRole('button', { name: 'Отправить' })).toBeDisabled();
  await page.setViewportSize({ width: 320, height: 350 });
  await composer.focus();
  const inputBounds = await composer.boundingBox();
  expect(inputBounds.y + inputBounds.height).toBeLessThanOrEqual(350);
  await page.setViewportSize({ width: 320, height: 680 });
  await composer.fill('Первая строка');
  await composer.press('Shift+Enter');
  await expect(composer).toHaveValue('Первая строка\n');
  await composer.fill(message);
  await composer.press('Enter');
  const bubble = messages(page).getByRole('log').getByText(message, { exact: true });
  await expect(bubble).toBeVisible();
  expect(await bubble.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await messages(page).evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await messages(page).getByRole('button', { name: 'К списку диалогов' }).click();
  await expect(messages(page).getByRole('navigation', { name: 'Диалоги' })).toBeVisible();
});

test('demo review updates card rating and profile export contains the review', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  const place = card(page, 'Ботанический сад');
  await place.getByRole('button', { name: 'Подробнее' }).click();
  const panel = dialog(page);
  await panel.getByRole('button', { name: 'Отзывы', exact: true }).click();
  const rating = panel.getByRole('group', { name: 'Оценка' });
  await rating.getByRole('radio', { name: '5 из 5' }).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(rating.getByRole('radio', { name: '3 из 5' })).toBeChecked();
  await panel.getByRole('textbox', { name: 'Текст отзыва' }).fill('Демо: понравились тихие дорожки.');
  await panel.getByRole('button', { name: 'Обновить отзыв' }).click();
  await expect(panel.getByText('Демо: понравились тихие дорожки.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(place).toContainText('3.0');
  await page.locator('#profile').click();
  const exported = page.waitForEvent('download');
  await profilePage(page).getByLabel('Действия профиля').click();
  await profilePage(page).getByRole('button', { name: 'Скачать мои данные' }).click();
  const file = await exported;
  expect(file.suggestedFilename()).toBe('moodmix-data.json');
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.reviews[0].rating).toBe(3);
  expect(data.profile.id).toBe('demo-aliya');
});

test('layout fits nine requested widths on landing, catalog, modal and quiz', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const widths = [320, 360, 375, 390, 430, 768, 1024, 1440, 1920];
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to MoodMix' })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await fits(), 'landing at ' + width).toBe(true);
  }
  await page.goto('/app.html?demo=1');
  await expect(page.locator('.showcase-grid')).toBeVisible();
  await page.locator('#filters > summary').click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await fits(), 'catalog at ' + width).toBe(true);
    await card(page, 'Ботанический сад').getByRole('button', { name: 'Подробнее' }).click();
    const box = await dialog(page).boundingBox();
    expect(box.width, 'dialog at ' + width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Подобрать место', exact: true }).click();
  await page.getByRole('button', { name: /Быстрый подбор/ }).click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await fits(), 'quiz at ' + width).toBe(true);
    const [region, panel] = await Promise.all([page.locator('#quiz').boundingBox(), page.locator('.quiz-panel').boundingBox()]);
    expect(Math.abs(region.x + region.width / 2 - (panel.x + panel.width / 2))).toBeLessThan(2);
    expect(Math.abs(region.y + region.height / 2 - (panel.y + panel.height / 2))).toBeLessThan(12);
  }
});
