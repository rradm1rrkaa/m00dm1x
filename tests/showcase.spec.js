import { expect, test } from '@playwright/test';

const errors = new WeakMap();
const dialog = page => page.getByRole('dialog');
const tabs = page => page.locator('#tabs');
const card = (page, name) => page.locator('.card').filter({ has: page.getByRole('heading', { name, exact: true }) });

test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && message.location().url.includes('/js/')) errors.get(page).push(message.text());
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
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
  await expect(page.getByRole('button', { name: 'Чаты' })).toBeHidden();
  await tabs(page).getByRole('button', { name: 'Подборка Астаны' }).click();
  await expect(page.locator('.showcase-grid .card')).toHaveCount(19);
  await expect(page.locator('.showcase-grid .card').first()).toHaveCSS('flex-direction', 'column');
});

for (const [mode, total] of [['Быстрый', 7], ['Полный', 25]]) {
  test(mode + ' тест supports changing answers and shows ranked recommendations', async ({ page }) => {
    await page.goto('/app.html?start=quiz&guest=1');
    await page.getByRole('button', { name: new RegExp(mode + ' тест') }).click();
    const quiz = page.locator('#quiz');
    const choices = quiz.locator('.opts button');
    await expect(quiz.getByText('Вопрос 1 из ' + total)).toBeVisible();
    await choices.first().click();
    await quiz.getByRole('button', { name: '← Назад' }).click();
    await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
    await choices.nth(1).click();
    for (let question = 2; question <= total; question++) {
      await expect(quiz.getByText('Вопрос ' + question + ' из ' + total)).toBeVisible();
      await choices.first().click();
    }
    await expect(quiz.getByRole('button', { name: 'Начать заново' })).toBeVisible();
    await quiz.getByRole('button', { name: 'Показать подборку →' }).click();
    await expect(tabs(page).getByRole('button', { name: '✨ Для вас' })).toHaveAttribute('aria-pressed', 'true');
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
  await expect(panel.getByRole('button', { name: 'Закрыть' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Предыдущее фото' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Следующее фото' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel.getByText('Фото 2 из 2')).toBeVisible();
  await expect.poll(() => panel.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await panel.getByRole('button', { name: '♡ Сохранить' }).focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('button', { name: '♥ Сохранено' })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: '✔ Был здесь' }).click();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(opener).toBeFocused();
  await page.reload();
  await tabs(page).getByRole('button', { name: '♥ Избранное' }).click();
  await expect(card(page, 'Ботанический сад')).toBeVisible();
  await card(page, 'Ботанический сад').getByRole('button', { name: 'Подробнее' }).click();
  await expect(dialog(page).getByRole('button', { name: '✔ Вы были здесь' })).toBeVisible();
});

test('demo ratings, query and filters combine; reset recovers an empty result', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await expect(page.locator('#mode-note')).toContainText('Демо');
  await page.locator('summary').click();
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
  const selector = page.getByLabel('Тема оформления');
  for (const theme of ['light', 'dark', 'sad', 'fun']) {
    await selector.selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }
  await page.getByRole('button', { name: /Быстрый тест/ }).click();
  for (let i = 0; i < 7; i++) await page.locator('.opts button').first().click();
  await page.getByRole('button', { name: 'Показать подборку →' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fun');
  await page.reload();
  await expect(page.getByLabel('Тема оформления')).toHaveValue('fun');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fun');
});

test('switching demo participants isolates favorites and displays sent messages', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await tabs(page).getByRole('button', { name: '♥ Избранное' }).click();
  await expect(card(page, 'Ботанический сад')).toBeVisible();
  await page.getByRole('button', { name: 'Сменить профиль' }).click();
  await dialog(page).getByRole('button', { name: 'Тимур', exact: true }).click();
  await tabs(page).getByRole('button', { name: '♥ Избранное' }).click();
  await expect(card(page, 'Байтерек')).toBeVisible();
  await expect(card(page, 'Ботанический сад')).toHaveCount(0);
  await page.getByRole('button', { name: /Чаты/ }).click();
  await dialog(page).getByRole('button', { name: /Алия/ }).click();
  await dialog(page).getByRole('button', { name: 'Принять прогулку' }).click();
  await expect(dialog(page).getByRole('log').getByText('Принято', { exact: true })).toBeVisible();
  await dialog(page).getByLabel('Сообщение', { exact: true }).fill('Проверка: встречаемся в саду!');
  await dialog(page).getByRole('button', { name: 'Отправить' }).click();
  await expect(dialog(page).getByRole('log').getByText('Проверка: встречаемся в саду!')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Сменить профиль' }).click();
  await dialog(page).getByRole('button', { name: 'Алия', exact: true }).click();
  await page.getByRole('button', { name: /Чаты/ }).click();
  await dialog(page).getByRole('button', { name: /Тимур/ }).click();
  await expect(dialog(page).getByRole('log').getByText('Проверка: встречаемся в саду!')).toBeVisible();
});

test('profile deletion leaves a guest state and empty favorites after reload', async ({ page }) => {
  page.on('dialog', prompt => prompt.accept());
  await page.goto('/app.html?demo=1');
  await page.locator('#profile').click();
  await dialog(page).getByRole('button', { name: 'Удалить локальный профиль' }).click();
  await expect(page.locator('#mode-note')).toContainText('Гость');
  await page.reload();
  await expect(page.locator('#mode-note')).toContainText('Гость');
  await tabs(page).getByRole('button', { name: '♥ Избранное' }).click();
  await expect(page.getByRole('heading', { name: 'Избранное пока пусто' })).toBeVisible();
  await page.getByRole('button', { name: 'Демо-профили' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Алия', exact: true })).toHaveCount(0);
});

test('profile editing, portrait and privacy survive a switch', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  await page.locator('#profile').click();
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
  await panel.getByRole('button', { name: 'Сохранить настройки' }).click();
  await expect(panel.getByRole('heading', { name: 'Алия · демо' })).toBeVisible();
  await expect(panel.locator('img')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Сменить профиль' }).click();
  await panel.getByRole('button', { name: 'Тимур', exact: true }).click();
  await page.locator('#friends').click();
  const alia = panel.locator('.rv').filter({ hasText: 'Алия · демо' });
  await alia.getByRole('button', { name: 'Профиль', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Посещённые места' })).toBeVisible();
});

test('long local messages wrap at 320 px and stay within the dialog', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 680 });
  await page.goto('/app.html?demo=1');
  await page.getByRole('button', { name: /Чаты/ }).click();
  await dialog(page).getByRole('button', { name: /Тимур/ }).click();
  const message = 'сообщение'.repeat(80);
  await dialog(page).getByLabel('Сообщение', { exact: true }).fill(message);
  await dialog(page).getByRole('button', { name: 'Отправить' }).click();
  const bubble = dialog(page).getByText(message, { exact: true });
  await expect(bubble).toBeVisible();
  expect(await bubble.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await dialog(page).evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('demo review updates card rating and profile export contains the review', async ({ page }) => {
  await page.goto('/app.html?demo=1');
  const place = card(page, 'Ботанический сад');
  await place.getByRole('button', { name: 'Подробнее' }).click();
  const panel = dialog(page);
  await panel.getByRole('button', { name: 'Отзывы', exact: true }).click();
  await panel.getByRole('combobox', { name: 'Оценка' }).selectOption('3');
  await panel.getByRole('textbox', { name: 'Текст отзыва' }).fill('Демо: понравились тихие дорожки.');
  await panel.getByRole('button', { name: 'Обновить отзыв' }).click();
  await expect(panel.getByText('Демо: понравились тихие дорожки.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(place).toContainText('3.0');
  await page.locator('#profile').click();
  const exported = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Скачать мои данные' }).click();
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
  await page.locator('summary').click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await fits(), 'catalog at ' + width).toBe(true);
    await card(page, 'Ботанический сад').getByRole('button', { name: 'Подробнее' }).click();
    const box = await dialog(page).boundingBox();
    expect(box.width, 'dialog at ' + width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Подобрать место', exact: true }).click();
  await page.getByRole('button', { name: /Быстрый тест/ }).click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await fits(), 'quiz at ' + width).toBe(true);
  }
});
