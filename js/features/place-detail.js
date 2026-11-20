import { categories, mapLink, placeById, placeHref } from '../services/catalog.js';
import { icon } from '../components/icons.js';
import { favoriteButton, paintFavorite } from '../components/favorite-button.js';
import { button, node, runAction, toast } from '../components/ui.js';
import { placeGallery } from './place-gallery.js';
import { placeFacilities, placeFacts, placeGuide, placeLink, placeSources } from './place-info.js';
import { placeReactions, placeReviews } from './place-social.js';
import { createWalkPlanner } from './place-invitation.js';

export function createPlaceDetail(context) {
  const { api, modal, workspace, getSession, afterWrite, goBack, returnToPlace, placeIllustration } = context;
  const plan = createWalkPlanner(context);
  let current;

  function share(place) {
    const url = new URL(placeHref(place.id), location.href).href;
    return async () => {
      if (navigator.share) {
        try { await navigator.share({ title: place.name + ' · MoodMix', url }); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast('Ссылка скопирована');
      } catch {
        const input = node('input');
        input.readOnly = true;
        input.value = url;
        input.setAttribute('aria-label', 'Ссылка на место');
        modal.show('Поделиться местом', [input]);
        input.select();
      }
    };
  }

  function show(id, reason) {
    document.querySelector('.gallery-lightbox[open]')?.close();
    const place = placeById(id);
    const page = node('article', 'place-page');
    const back = button('К списку мест', goBack, 'place-back');
    back.prepend(icon('back'));
    if (!place) {
      page.classList.add('place-missing');
      page.append(node('h1', '', 'Место не найдено'), node('p', 'm', 'Проверьте ссылку или выберите другое место в каталоге.'), back);
      workspace.show('place', page);
      document.title = 'Место не найдено · MoodMix';
      current = null;
      return;
    }

    const header = node('div', 'place-header');
    const bread = node('nav', 'place-breadcrumb');
    bread.setAttribute('aria-label', 'Путь к месту');
    const name = node('span', 'place-crumb', place.name);
    name.setAttribute('aria-current', 'page');
    bread.append(back, name);
    const hero = node('header', 'place-hero');
    const identity = node('div', 'place-identity');
    const actions = node('div', 'place-primary-actions');
    const favorite = favoriteButton(place, context, () => context.refreshCatalog());
    const sendLink = button('', runAction(share(place)), 'place-share icon-button');
    sendLink.setAttribute('aria-label', 'Поделиться местом');
    sendLink.title = 'Поделиться местом';
    sendLink.append(icon('share'));
    actions.append(favorite, sendLink);
    const title = node('h1', '', place.name);
    const category = categories[place.categoryIndex].name;
    const address = place.address || place.city || place.region;
    identity.append(actions, node('p', 'card-kicker', category), title);
    if (address) identity.append(node('p', 'place-location', address));
    identity.append(node('p', 'place-lead', place.description));
    if (reason) identity.append(node('p', 'recommendation-reason m', reason));

    const visit = button('', runAction(async () => {
      const next = await api.toggleVisit(place.id);
      paintVisit(next);
      await afterWrite();
      toast(api.storageIssue() || visit.textContent);
    }), 'vb');
    function paintVisit(visited) {
      visit.textContent = visited ? 'Вы были здесь' : 'Был здесь';
      visit.setAttribute('aria-pressed', String(visited));
    }
    paintVisit(getSession().profile.visits.some(row => row.placeId === id));
    const quickLinks = node('div', 'place-actions');
    quickLinks.append(placeLink(place.mapUrl ? 'На карте' : 'Найти на карте', mapLink(place)), visit);
    const reviewLink = node('a', 'vb', 'К отзывам');
    reviewLink.href = '#place-reviews';
    reviewLink.addEventListener('click', event => {
      event.preventDefault();
      const target = page.querySelector('#place-reviews h2');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    quickLinks.append(reviewLink);
    identity.append(quickLinks);
    hero.append(placeGallery(place, placeIllustration(place, 'place-illustration')), identity);
    header.append(bread, hero);

    const main = node('div', 'place-body');
    const notes = node('div', 'place-notes');
    const reviews = placeReviews(place, context);
    const reactions = placeReactions(place, context);
    const walk = node('section', 'place-section place-walk');
    const invite = button('Запланировать прогулку', runAction(() => plan(place, () => returnToPlace(place, reason))), 'btn c');
    walk.append(node('h2', '', 'Прогулка с другом'), node('p', 'm', 'Выберите время и отправьте приглашение другу в Direct.'), invite);
    notes.append(placeGuide(place), placeFacilities(place), reviews.section, reactions.section, walk);
    const sources = placeSources(place);
    if (sources) notes.append(sources);
    main.append(notes, placeFacts(place));
    page.append(header, main);
    document.title = place.name + ' · MoodMix';
    workspace.show('place', page);
    current = { place, favorite, paintVisit, reviews, reactions };
  }

  function refresh() {
    if (!current?.favorite.isConnected) return;
    const { place, favorite, paintVisit, reviews, reactions } = current;
    const { profile } = getSession();
    paintFavorite(favorite, profile.favorites.includes(place.id));
    paintVisit(profile.visits.some(row => row.placeId === place.id));
    return Promise.all([reviews.refresh(), reactions.refresh()]);
  }
  return { show, refresh };
}
