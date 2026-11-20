const tourism = slug => 'https://visitastana.kz/ru/about-city/what-to-see/' + slug + '/';
const cityMap = 'https://visitastana.kz/ru/map/';
const checked = '2026-11-20';
const mall = 'https://khanshatyr.com/index.php/ru';
const museum = 'https://nmrk.kz/ru/';
const bayterek = 'https://a-vm.kz/objects/bayterek/';
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const daily = (start, end) => Object.fromEntries(days.map(day => [day, [[start, end]]]));
const commons = (filename, page, alt, author, license = 'CC BY-SA 4.0', wideWidth = 0) => ({
  src: 'assets/images/' + filename, alt, author, license,
  source: 'https://commons.wikimedia.org/wiki/File:' + page,
  variants: wideWidth ? [
    [filename.replace(/\.(jpg|webp)$/, '-720.webp'), 720],
    [filename.replace(/\.(jpg|webp)$/, '-wide.webp'), wideWidth]
  ].map(([asset, width]) => ['assets/images/' + asset, width]) : null,
  licenseUrl: {
    'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
  }[license]
});

// Published address, map and opening hours only. Suggested visit lengths are editorial.
export const verifiedPlaces = {
  'mm-001': {
    address: 'Проспект Кабанбай Батыра, напротив стадиона «Астана Арена»',
    source: tourism('botanicheskiy-sad'), mapUrl: 'https://2gis.kz/nur_sultan/geo/70030076141234916',
    openingHours: daily(9 * 60, 20 * 60), hoursVerifiedAt: checked, durationMinutes: 90,
    description: 'Прогулочные аллеи и зелёные зоны рядом с «Астана Ареной».',
    images: [
      commons('botanical-garden-view.jpg', 'A_view_of_Nur-Sultan%27s_Botanical_Garden.jpg', 'Вид на Ботанический сад Астаны', 'Demir Berisha', 'CC BY-SA 4.0', 1920),
      commons('botanical-garden-flowers.jpg', 'Flowers_at_sunset_in_Botanical_Garden_Nur-Sultan_city.jpg', 'Цветы в Ботаническом саду на закате', 'DiamondMoore', 'CC BY-SA 4.0', 1920)
    ]
  },
  'mm-002': {
    address: 'Проспект Тауелсиздик, 54', source: museum, website: museum, contact: '+7 (7172) 91-90-35', mapUrl: 'https://2gis.kz/astana/firm/70000001018608940',
    openingHours: { ...daily(10 * 60, 18 * 60), Mon: [] }, hoursVerifiedAt: checked, durationMinutes: 120,
    description: 'Музей истории и культуры Казахстана. Для посещения выставок уточняйте билеты на сайте музея.',
    price: { status: 'paid', min: null, max: null, currency: 'KZT' },
    images: [commons('national-museum-atrium.webp', 'National_Museum_of_the_Republic_of_Kazakhstan_01.jpg', 'Атриум Национального музея Казахстана', 'Davide Mauro', 'CC BY-SA 4.0', 1920)]
  },
  'mm-004': {
    address: 'Проспект Тауелсиздик, 57', source: tourism('dvorets-mira-i-soglasiya'), durationMinutes: 90,
    images: [commons('palace-hall.webp', 'Hall%2C_Astana_Pyramid%2C_2026.jpg', 'Зал Дворца мира и согласия в Астане', 'Bdx', 'CC0', 1920)]
  },
  'mm-011': { address: 'Улица Кенесары, 32', source: tourism('gosudarstvennaya-akademicheskaya-filarmoniya-imeni-erkegali-rakhmadieva') },
  'mm-028': { address: 'Проспект Республики, 34', source: tourism('dvorets-zhastar') },
  'mm-038': {
    address: 'Набережная реки Есиль', source: cityMap, durationMinutes: 60,
    images: [commons('esil-riverfront.webp', 'Astana_Esil_view.jpg', 'Вид на левый берег Астаны с берега Есиля, 2026 год', 'Dauren Nabijan', 'CC0', 1920)]
  },
  'mm-039': {
    address: 'Район Нура, набережная реки Есиль', source: tourism('tsentralnyy-park'),
    mapUrl: 'https://go.2gis.com/PFSv8', openingHours: daily(10 * 60, 21 * 60), hoursVerifiedAt: checked, durationMinutes: 90,
    description: 'Прогулки вдоль Есиля, зелёные аллеи и детские площадки.',
    contact: '+7 (7172) 44-64-72',
    images: [commons('astana-central-park.webp', 'Astana-Ishim-7802.jpg', 'Есиль и Центральный парк слева, архивный снимок 2007 года', 'Vmenkov', 'CC BY-SA 3.0', 1920)]
  },
  'mm-040': { address: 'Проспект Тауелсиздик, вокруг Дворца Мира и Согласия', source: tourism('prezidentskiy-park'), durationMinutes: 60, openingHours: daily(8 * 60, 22 * 60), hoursVerifiedAt: checked },
  'mm-042': { address: 'Бульвар Нуржол', source: cityMap, durationMinutes: 45 },
  'mm-049': { address: 'Проспект Тауелсиздик, пересечение с улицей А. Байтурсынова', source: tourism('monument-aza-eli-'), durationMinutes: 30 },
  'mm-050': { address: 'Есильский район, проспект Мангилик Ел', source: tourism('triumfalnaya-arka-m-gilik-el9679'), durationMinutes: 30 },
  'mm-051': { address: 'Улица Сарайшык, 13/1', source: tourism('park-zhetysu'), durationMinutes: 60 },
  'mm-052': { address: 'Улица М. Толебаева, район Алматы', source: tourism('park-zheruyyk'), durationMinutes: 60 },
  'mm-053': { address: 'Правый берег Ишима, возле парка Бауыржана Момышулы', source: tourism('triatlon-park-astana'), durationMinutes: 75 },
  'mm-054': { address: 'Проспект Тауелсиздик', source: tourism('monument-stena-mira'), durationMinutes: 30 },
  'mm-056': { address: 'Проспект Тауелсиздик, 52', source: tourism('dvorets-nezavisimosti') },
  'mm-057': {
    address: 'Проспект Туран, 37', source: tourism('trts-khan-shatyr'), website: mall, contact: '+7 (7172) 57-26-26',
    openingHours: daily(10 * 60, 22 * 60), hoursVerifiedAt: checked,
    description: 'Торговый центр под шатром с кинотеатром, семейными развлечениями и крытым пляжным клубом.',
    images: [commons('khan-shatyr-exterior.webp', 'Khan_Shatyr.jpg', 'Шатёр торгового центра Хан Шатыр, вид снаружи', 'Quarot', 'CC0', 1920)]
  },
  'mm-170': {
    address: 'Бульвар Нуржол, 14', source: bayterek, website: bayterek, contact: '+7 (7172) 44-64-72',
    mapUrl: 'https://2gis.kz/nur_sultan/firm/70000001021365759', durationMinutes: 60,
    openingHours: daily(10 * 60, 21 * 60), summerHours: daily(10 * 60, 22 * 60), hoursVerifiedAt: checked,
    price: { status: 'paid', min: 1250, max: 2500, currency: 'KZT' },
    images: [
      commons('bayterek-night.jpg', 'Baiterek_monument_at_night.jpg', 'Байтерек в вечерней подсветке', 'Dauren Nabijan', 'CC0', 1080),
      commons('bayterek-interior.jpg', 'Interior_of_Bayterek_Tower_05.jpg', 'Интерьер монумента Байтерек', 'Davide Mauro', 'CC BY-SA 4.0', 1920),
      commons('bayterek-tower.webp', 'B%C3%A4iterek_tower.jpg', 'Башня Байтерека в вечерней подсветке, июль 2024 года', 'Dauren Nabijan', 'CC0', 1920)
    ]
  },
  'mm-182': { address: 'Бульвар Нуржол, 1', source: tourism('akorda'), durationMinutes: 30 }
};

const park = ['walk', 'outdoor', 'city', 'solo', 'pair', 'family'];
const quietPark = ['quiet', ...park];
export const placeTraits = {
  'mm-001': quietPark,
  'mm-002': ['quiet', 'indoor', 'culture', 'solo', 'family'],
  'mm-004': ['quiet', 'indoor', 'culture', 'pair'],
  'mm-007': ['culture', 'indoor', 'pair'],
  'mm-011': ['culture', 'indoor', 'pair'],
  'mm-028': ['culture', 'indoor', 'friends'],
  'mm-038': park, 'mm-039': [...park, 'active'], 'mm-040': quietPark, 'mm-042': park,
  'mm-049': [...park, 'culture'], 'mm-050': [...park, 'culture'], 'mm-051': quietPark,
  'mm-052': [...park, 'active'], 'mm-053': [...park, 'active', 'friends'],
  'mm-054': ['walk', 'outdoor', 'city', 'culture'],
  'mm-056': ['culture', 'city'], 'mm-057': ['indoor', 'city', 'family', 'friends'],
  'mm-077': ['indoor', 'active', 'friends', 'family'],
  'mm-113': ['quiet', 'nature', 'outdoor', 'walk', 'friends', 'family'],
  'mm-123': ['quiet', 'nature', 'outdoor', 'pair', 'family'],
  'mm-124': ['active', 'nature', 'outdoor', 'friends'],
  'mm-126': ['quiet', 'nature', 'outdoor', 'walk', 'family'],
  'mm-170': ['culture', 'city', 'indoor', 'family', 'pair'],
  'mm-182': ['culture', 'walk', 'outdoor', 'city']
};
