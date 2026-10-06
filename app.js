const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches;
let filmsPaused = reduced;
let cityPhase = 0;
const films = $$('video');
const visibleFilms = new Set();
const hero = $('.hero');
const cities = $('.cities');
const citySticky = $('.cities-sticky');
const madinahPanel = $('.madinah-panel');
const heroFilm = $('#hero-film');
const motionToggle = $('#motion-toggle');
const filmControl = $('#film-control');

function syncFilms() {
  films.forEach(video => {
    const covered = (video.closest('.makkah-panel') && cityPhase === 2) || (video.closest('.madinah-panel') && cityPhase === 0);
    const shouldPlay = visibleFilms.has(video) && !covered && !filmsPaused && !reduced && !document.hidden;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  });
  filmControl.setAttribute('aria-pressed', String(filmsPaused || reduced));
  filmControl.setAttribute('aria-label', filmsPaused || reduced ? 'Play background films' : 'Pause background films');
  $('.film-label').textContent = filmsPaused || reduced ? 'Play films' : 'Pause film';
  filmControl.firstElementChild.textContent = filmsPaused || reduced ? '▷' : 'Ⅱ';
}
const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target, isIntersecting }) => isIntersecting ? visibleFilms.add(target) : visibleFilms.delete(target));
  syncFilms();
}, { threshold: .08 });
films.forEach(video => videoObserver.observe(video));
document.addEventListener('visibilitychange', syncFilms);
filmControl.addEventListener('click', () => {
  if (reduced) setMotion(false);
  filmsPaused = !filmsPaused;
  syncFilms();
});

function setMotion(value) {
  reduced = value;
  document.documentElement.classList.toggle('reduced-motion', value);
  document.body.classList.toggle('motion-enabled', !value);
  motionToggle.setAttribute('aria-pressed', String(value));
  motionToggle.textContent = value ? 'Enable motion' : 'Reduce motion';
  if (value) filmsPaused = true;
  if (value) $$('.city-panel').forEach(panel => panel.removeAttribute('aria-hidden'));
  syncFilms();
  requestUpdate();
}
motionToggle.addEventListener('click', () => { filmsPaused = !reduced; setMotion(!reduced); });
motionPreference.addEventListener('change', event => setMotion(event.matches));

let queued = false;
function updateScroll() {
  queued = false;
  const viewport = innerHeight;
  const total = document.documentElement.scrollHeight - viewport;
  $('.reading-progress').style.transform = `scaleX(${total > 0 ? clamp(scrollY / total) : 0})`;
  if (reduced) return;
  const heroBox = hero.getBoundingClientRect();
  if (heroBox.bottom > 0) heroFilm.style.transform = `scale(${1.04 + clamp(-heroBox.top / heroBox.height) * .12}) translateY(${Math.min(-heroBox.top * .12, 100)}px)`;
  const box = cities.getBoundingClientRect();
  if (box.bottom > 0 && box.top < viewport) {
    const progress = clamp(-box.top / Math.max(1, box.height - citySticky.offsetHeight));
    const transition = clamp((progress - .25) / .48);
    const nextPhase = transition === 0 ? 0 : transition === 1 ? 2 : 1;
    if (nextPhase !== cityPhase) { cityPhase = nextPhase; syncFilms(); }
    madinahPanel.style.opacity = String(clamp(transition * 5));
    madinahPanel.style.clipPath = `inset(0 0 0 ${(1 - transition) * 100}%)`;
    $('.city-progress i').style.transform = `scaleX(${progress})`;
    $$('[data-city]').forEach((link, i) => {
      const active = i === (progress > .5 ? 1 : 0);
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
    $('.makkah-panel').setAttribute('aria-hidden', String(progress > .6));
    madinahPanel.setAttribute('aria-hidden', String(progress <= .6));
  }
}
function requestUpdate() { if (!queued) { queued = true; requestAnimationFrame(updateScroll); } }
addEventListener('scroll', requestUpdate, { passive: true });
addEventListener('resize', requestUpdate);
$$('[data-city]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  const offset = Number(link.dataset.city) * Math.max(0, cities.offsetHeight - citySticky.offsetHeight) * .95;
  scrollTo({ top: scrollY + cities.getBoundingClientRect().top + offset, behavior: reduced ? 'instant' : 'smooth' });
}));
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
}), { threshold: .09 });
$$('.reveal').forEach(element => revealObserver.observe(element));
setMotion(reduced);

const menuButton = $('.menu-button');
const mobileNav = $('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
$$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!mobileNav.contains(event.target) && !menuButton.contains(event.target)) closeMenu(); });

$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  $$('[data-filter]').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  $$('.journey-card').forEach(card => { card.hidden = filter !== 'all' && card.dataset.duration !== filter; });
  requestUpdate();
}));
$$('.faq details').forEach(detail => detail.addEventListener('toggle', () => {
  if (detail.open) $$('.faq details').forEach(other => { if (other !== detail) other.open = false; });
  requestUpdate();
}));

const planner = $('#planner');
const form = $('#planner-form');
let downloadUrl;
$$('[data-plan]').forEach(button => button.addEventListener('click', () => {
  closeMenu();
  $('#selected-journey').value = button.dataset.plan || 'A personalised Umrah';
  $('#planner-entry').hidden = false;
  $('#planner-result').hidden = true;
  planner.showModal();
  document.body.classList.add('locked');
}));
$('.dialog-close').addEventListener('click', () => planner.close());
planner.addEventListener('close', () => document.body.classList.remove('locked'));
planner.addEventListener('click', event => {
  if (event.target !== planner) return;
  const bounds = planner.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) planner.close();
});
const today = new Date();
$('input[name=departure]').min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
$('#year').textContent = today.getFullYear();
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const lines = ['ZIYARAT — TRAVEL ENQUIRY', '', `Name: ${values.name}`, `Email: ${values.email}`, `Journey: ${values.journey}`, `Preferred departure: ${values.departure}`, `Travellers: ${values.travellers}`, `Notes: ${values.notes || 'None'}`, '', 'This is an enquiry summary, not a confirmed booking.'];
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  $('#download-enquiry').href = downloadUrl;
  const summary = $('#enquiry-summary'); summary.replaceChildren();
  [['Journey', values.journey], ['Departure', values.departure], ['Travellers', values.travellers]].forEach(([label, value]) => {
    const row = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value; row.append(dt, dd); summary.append(row);
  });
  $('#planner-entry').hidden = true; $('#planner-result').hidden = false;
  planner.scrollTop = 0; $('#download-enquiry').focus();
});
$('.edit-enquiry').addEventListener('click', () => { $('#planner-entry').hidden = false; $('#planner-result').hidden = true; $('input[name=name]').focus(); });
