# MoodMix 4.0

Страница места доступна по адресу `app.html?place=mm-057`. Каталог перед переходом сохраняет вкладку, фильтры, объём выдачи, прокрутку и активную ссылку в History API. При открытии места из рекомендаций в истории сохраняется пояснение к подборке. Старая запись без расширенных данных получает ту же страницу с доступными сведениями и понятными пустыми состояниями.

## Архитектура

- `js/main.js` управляет навигацией и контекстом профиля. `js/features/place-detail.js` собирает страницу из галереи, справочных сведений, отзывов, реакций и планировщика.
- `js/services/catalog.js` собирает модель из 188 исходных записей, адресов и расписаний из `js/data/place-details.js`, а также путеводителей и инфраструктуры из `js/data/place-guides.js`. У каждого места прежний ID. Поля расписания, галереи, путеводителя и инфраструктуры необязательны.
- `js/services/local-api.js` остаётся границей между интерфейсом и хранилищем. Сердце использует общий метод избранного. Сбой записи отменяет действие, после восстановления хранилища его можно повторить.
- Новые параметры `settings.chatWallpaper` и `message.walkAt` добавлены в существующий ключ `moodmix_showcase`. Старые сообщения сохраняют текст и статус. Дата прогулки хранится в UTC, ввод и отображение используют `Asia/Almaty`.
- Лендинг и приложение используют одни и те же пейзажи и плавную смену изображений. Для закатного первого экрана лендинга используется отдельная иллюстрация Астаны. Пользователь может назначить в Direct текущую атмосферу, однотонный фон, узор или один из четырёх пейзажей.

## Проверка сведений о местах

19 мест получили расширенные путеводители. Ссылки и дата проверки 20 ноября 2026 года хранятся рядом с данными. Билеты, доступ на мероприятия и график отдельных заведений внутри комплексов стоит уточнять у оператора.

| Место | Подтверждённые сведения |
|---|---|
| Хан Шатыр | Адрес, телефон и часы ТРЦ. В каталоге оператора найдены Zara, Bershka и Pull&Bear. Отдельно описаны Chaplin, Fame City и Sky Beach Club. [ТРЦ](https://khanshatyr.com/index.php/ru) · [Каталог магазинов](https://khanshatyr.com/index.php/ru/shopping) · [График ТРЦ](https://www.visitastana.kz/ru/about-city/what-to-see/trts-khan-shatyr/) |
| Национальный музей | Рабочая неделя, адрес, телефон и описания экспозиций. Конкретная стоимость зависит от выставки и билета. [Музей](https://nmrk.kz/ru/) · [Экспозиции](https://nmrk.kz/ru/structure/exhibition-activities/) · [Контакты](https://visitastana.kz/ru/map/) |
| Байтерек | Адрес, контакты, сезонный график, обычные и льготные тарифы. В карточке диапазон обычных индивидуальных билетов. [Оператор](https://a-vm.kz/objects/bayterek/) |
| Ботанический сад | Опубликованный график и описания прогулочных зон. [Visit Astana](https://visitastana.kz/ru/about-city/what-to-see/botanicheskiy-sad/) |
| Центральный и Президентский парки | Опубликованные часы, прогулочная и спортивная инфраструктура. [Центральный парк](https://visitastana.kz/ru/about-city/what-to-see/tsentralnyy-park/) · [Президентский парк](https://visitastana.kz/ru/about-city/what-to-see/prezidentskiy-park/) |

Для непроверенных сведений интерфейс показывает ссылку для уточнения или объясняет, что поле пока неизвестно. Подтверждённого календаря будущих праздничных исключений нет. Информация о конкретном мероприятии, остатках билетов и фактическом состоянии объекта в этот момент требует запроса к оператору. Продолжительность помечена как редакционный ориентир.

### Новые фотографии

| Файл | Автор и лицензия | Источник |
|---|---|---|
| `khan-shatyr-exterior` | Quarot · CC0 | [Khan Shatyr](https://commons.wikimedia.org/wiki/File:Khan_Shatyr.jpg) |
| `national-museum-atrium` | Davide Mauro · CC BY-SA 4.0 | [Атриум Национального музея](https://commons.wikimedia.org/wiki/File:National_Museum_of_the_Republic_of_Kazakhstan_01.jpg) |
| `astana-central-park` | Vmenkov · CC BY-SA 3.0 | [Есиль и Центральный парк, архив, 2007](https://commons.wikimedia.org/wiki/File:Astana-Ishim-7802.jpg) |
| `esil-riverfront` | Dauren Nabijan · CC0 | [Вид с берега Есиля](https://commons.wikimedia.org/wiki/File:Astana_Esil_view.jpg) |

Новые фотографии взяты в уменьшенных версиях и перекодированы для сайта. В галереях Ботанического сада и Байтерека также есть авторство, лицензии и ссылки на оригиналы. Иллюстрации атмосфер используются для оформления, а в галереях показываются фотографии и явно обозначенные пустые состояния.

## Визуальная проверка

Снимки сделаны в Chrome при 1440 × 900 и в мобильной эмуляции при 390 × 844. Адаптивность проверена в диапазоне 320–1920 px. Для Direct с открытой клавиатурой тесты имитируют уменьшение высоты рабочей области. Физические устройства и Safari остаются отдельной проверкой.

| Экран | Desktop | Mobile |
|---|---|---|
| Лендинг | [Первый экран](screenshots/v4/desktop-landing.jpg) · [Меню темы](screenshots/v4/desktop-theme-menu.jpg) · [Footer](screenshots/v4/desktop-footer.jpg) | [Первый экран](screenshots/v4/mobile-landing.jpg) · [Меню темы](screenshots/v4/mobile-theme-menu.jpg) · [Footer](screenshots/v4/mobile-footer.jpg) |
| Каталог | [Восход](screenshots/v4/desktop-catalog-sunrise.jpg) · [Закат](screenshots/v4/desktop-catalog-sunset.jpg) · [Грусть](screenshots/v4/desktop-catalog-night.jpg) · [Веселье](screenshots/v4/desktop-catalog-beach.jpg) | [Закат](screenshots/v4/mobile-catalog-sunset.jpg) |
| Страница места | [Хан Шатыр](screenshots/v4/desktop-place.jpg) · [Инфраструктура](screenshots/v4/desktop-facilities.jpg) · [Практическая информация](screenshots/v4/desktop-practical.jpg) · [Без фото](screenshots/v4/desktop-no-photo.jpg) | [Хан Шатыр](screenshots/v4/mobile-place.jpg) · [Практическая информация](screenshots/v4/mobile-practical.jpg) |
| Социальные разделы | [Отзывы](screenshots/v4/desktop-reviews.jpg) · [Планировщик](screenshots/v4/desktop-planner.jpg) | [Отзывы](screenshots/v4/mobile-reviews.jpg) · [Планировщик](screenshots/v4/mobile-planner.jpg) |
| Галерея | [Полноэкранный просмотр](screenshots/v4/desktop-lightbox.jpg) | [Полноэкранный просмотр](screenshots/v4/mobile-lightbox.jpg) |
| Direct | [Диалог](screenshots/v4/desktop-direct.jpg) · [Обои](screenshots/v4/desktop-wallpaper.jpg) | [Диалог](screenshots/v4/mobile-direct.jpg) · [Обои](screenshots/v4/mobile-wallpaper.jpg) |

## Будущий backend

Интерфейс можно подключить к HTTP-реализации текущих методов сервиса. Для этого потребуются серверные профили и сессии, авторизация действий, стабильные идентификаторы, миграция локальных данных по согласию пользователя, серверный каталог с датами проверки и права доступа к сообщениям и приглашениям. Понадобятся также доставка новых сообщений, обработка конфликтов и модерация публичных отзывов. Деморежим использует локальную реализацию сервиса.

## Файлы релиза

- Разметка и входные модули — `index.html`, `app.html`, `js/landing.js`, `js/main.js`, `scripts/serve.js`.
- Стили — `css/app.css`, `css/base.css`, `css/landing.css`, `css/messenger.css`, `css/place.css`, `css/quiz.css`, `css/showcase.css`, `css/tokens.css`.
- Интерфейс — `js/components/icons.js`, `js/components/favorite-button.js`, `js/features/catalog.js`, `js/features/messenger.js`, `js/features/chat-wallpaper.js`, `js/features/social.js`, `js/features/place-detail.js`, `js/features/place-gallery.js`, `js/features/place-info.js`, `js/features/place-invitation.js`, `js/features/place-social.js`.
- Данные и сервисы — `js/data/place-details.js`, `js/data/place-guides.js`, `js/services/catalog.js`, `js/services/local-api.js`, `js/services/storage.js`, `js/services/visit-time.js`.
- Атмосферы — `js/theme/theme.js` и `js/theme/atmosphere.js`. Удалены прежние `css/sky.css`, `js/theme/sky.js` и `js/theme/scenes.js`.
- Тесты — `tests/place.spec.js`, `tests/showcase.spec.js` и `tests/storage.test.js`.
- Ресурсы — четыре фотографии WebP в `assets/images/`, скриншоты в `docs/screenshots/v4/`, `README.md` и этот отчёт.
