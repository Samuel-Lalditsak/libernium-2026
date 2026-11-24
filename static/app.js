const DATA_URL = 'static/data/event.json';
let eventData = null;
let peopleData = [];

const safe = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

async function loadSiteData() {
  const [eventResponse, peopleResponse] = await Promise.all([fetch(DATA_URL), fetch('static/data/people.json')]);
  if (!eventResponse.ok || !peopleResponse.ok) throw new Error('Could not load the event information.');
  eventData = await eventResponse.json();
  peopleData = await peopleResponse.json();
  renderPeople('All');
  renderSchedule();
  renderWorkshops();
  renderVenues();
  renderPanel();
  renderConcept();
}

function personCard(person) {
  const initials = person.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  const image = person.photo
    ? `<img class="person-photo" src="static/images/people/${encodeURIComponent(person.photo)}" alt="Portrait of ${safe(person.name)}" loading="lazy">`
    : `<div class="person-placeholder" role="img" aria-label="No portrait supplied for ${safe(person.name)}">${safe(initials)}</div>`;
  return `<article class="person-card">${image}<h3>${safe(person.name)}</h3><p class="person-role">${safe(person.role)}</p>${person.phone ? `<a class="phone" href="tel:${safe(person.phone.replace(/\s/g,''))}">${safe(person.phone)}</a>` : ''}</article>`;
}

function renderPeople(group) {
  const filtered = group === 'All' ? peopleData.filter(person => person.group !== 'Researchers') : peopleData.filter(person => person.group === group);
  document.getElementById('peopleGrid').innerHTML = filtered.length
    ? filtered.map(personCard).join('')
    : '<p class="muted">Profiles for this group will be added soon.</p>';
  const researchers = peopleData.filter(person => person.group === 'Researchers');
  document.getElementById('researchGrid').innerHTML = researchers.map(personCard).join('');
}

function renderSchedule() {
  document.getElementById('scheduleList').innerHTML = eventData.schedule.map((item,index) => `
    <article class="schedule-item">
      <div class="schedule-time">${safe(item.time)}</div>
      <div><h3>${safe(item.title)}</h3><p>${safe(item.description)}${item.people ? `<span class="schedule-people">${safe(item.people)}</span>` : ''}</p></div>
      <div class="schedule-venue">${safe(item.venue)}</div>
    </article>`).join('');
}

function renderWorkshops() {
  document.getElementById('workshopGrid').innerHTML = eventData.workshops.map((workshop,index) => `
    <article class="workshop-card"><span class="num">WORKSHOP 0${index+1}</span><div><h4>${safe(workshop.title)}</h4><p>${safe(workshop.description)}</p></div><small>${safe(workshop.time)}<br>${safe(workshop.venue)}<br>Resource person: ${safe(workshop.resource)}</small></article>`).join('');
}

function renderVenues() {
  document.getElementById('venueGrid').innerHTML = eventData.venue_notes.map(venue => `
    <article class="venue-card"><h3>${safe(venue.place)}</h3><p>${safe(venue.detail)}</p></article>`).join('');
}

function renderPanel() {
  document.getElementById('panelSpeakers').innerHTML = eventData.panel.speakers.map(speaker => `<li>${safe(speaker)}</li>`).join('');
}

function renderConcept() {
  const note = eventData.concept_note;
  document.getElementById('conceptCopy').innerHTML = note.paragraphs.map(paragraph => `<p>${safe(paragraph)}</p>`).join('') + `<h3>Objectives</h3><ul>${note.objectives.map(item => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

document.querySelectorAll('.people-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.people-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  renderPeople(button.dataset.group);
}));

const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded','false');
}));

// Event assistant: uses the Flask API. Without an API key, the server returns a verified-data response.
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
function addBubble(text, kind) {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${kind}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}
// Same answers as local_answer() in app.py, so the assistant works without a server.
const TITLES = new Set(['dr', 'mr', 'ms', 'mrs', 'prof']);
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasAny = (text, terms) => terms.some(t => new RegExp(`(?<![\\w:])${escapeRe(t)}(?![\\w:])`).test(text));
const wordsOf = text => text.toLowerCase().match(/[a-z]+/g) || [];

const DEVELOPER_ANSWER = 'The LIBERNIUM 2026 website was developed by Mr Samuel Lalditsak Tuolor (Professor) and Shreya S. (Student) from the Department of Liberal Arts, CHRIST University.';
// Clearly about software: enough with "who" alone. General verbs: only when the question also names the site.
const DEV_TERMS = ['develop', 'developed', 'developer', 'developers', 'coded', 'programmed', 'programmer'];
const MAKE_TERMS = ['built', 'build', 'builder', 'created', 'creator', 'creators', 'designed', 'designer', 'designers', 'made', 'maker', 'makers', 'behind'];
const SITE_TERMS = ['website', 'web site', 'site', 'webpage', 'web page', 'app', 'portal', 'chatbot', 'assistant', 'this'];
const isDeveloperQuestion = q => (hasAny(q, DEV_TERMS) && (hasAny(q, ['who']) || hasAny(q, SITE_TERMS)))
  || (hasAny(q, MAKE_TERMS) && hasAny(q, SITE_TERMS));

function localAnswer(question) {
  const q = question.toLowerCase();
  if (isDeveloperQuestion(q)) return DEVELOPER_ANSWER;
  const ev = eventData;
  const qWords = new Set(wordsOf(q));
  const found = peopleData.filter(p => wordsOf(p.name).some(w => w.length > 2 && !TITLES.has(w) && qWords.has(w)));
  if (found.length) return found.map(p => `${p.name} — ${p.role}` + (p.phone ? ` · ${p.phone}` : '')).join('\n');
  if (hasAny(q, ['1 pm', '1pm', '1:00', 'workshop', 'workshops'])) {
    const items = ev.schedule.filter(x => x.title.includes('Workshop:'));
    return 'The workshops run from 1:00 PM to 3:00 PM:\n' + items.map(x => `• ${x.title} — ${x.venue} (Resource person: ${x.people || 'Details not listed'})`).join('\n');
  }
  if (hasAny(q, ['panel', 'cool', 'speaker', 'speakers', 'panellist', 'panellists', 'panelist', 'panelists']))
    return 'The panel discussion ‘The Cost of Being Cool’ is from 10:30 AM to 12:00 PM in the Mini Auditorium on the second floor. Speakers: ' + ev.panel.speakers.join('; ');
  if (hasAny(q, ['stall', 'stalls', 'artisan', 'artisans', 'weaving', 'leatherwork']))
    return 'Artisan Stalls & Demonstrations run from 12:00 PM to 2:30 PM outside the campus near the additional entry gate. When entering campus, take the left-side route; the stalls are arranged just before that gate.';
  if (hasAny(q, ['where', 'venue', 'location', 'floor', 'direction', 'directions', 'venues', 'auditorium']))
    return 'Venue guide:\n' + ev.venue_notes.map(v => `• ${v.place}: ${v.detail}`).join('\n');
  if (hasAny(q, ['date', 'when', 'time', 'day', 'schedule', 'programme']))
    return `LIBERNIUM 2026 takes place on ${ev.date}, from ${ev.time}, at ${ev.venue}. See the Programme section for the full schedule.`;
  if (hasAny(q, ['theme', 'about', 'libernium', 'concept', 'objective', 'objectives']))
    return `The theme is ${ev.theme}. The tagline is ‘${ev.tagline}’. ${ev.about}`;
  if (hasAny(q, ['registration', 'fee', 'register', 'certificate'])) {
    const reg = ev.registration;
    return `Registration is open to ${reg.openTo}. The brochure states a workshop registration fee of ${reg.fee}. ${reg.certificate} For details, contact ${reg.email}.`;
  }
  if (hasAny(q, ['contact', 'email', 'phone', 'coordinator', 'coordinators']))
    return `For event enquiries, contact ${ev.contact.email}. Student coordinators: Jiyaa P. Shah (GR), +91 84310 13872; Sifat Puri, +91 92166 66136.`;
  if (hasAny(q, ['faculty', 'phd', 'scholar', 'research', 'people', 'who', 'team']))
    return 'The Faculty & Team section contains the supplied faculty, PhD scholar, event guest and student coordinator profiles. Dr. Embassy Lawbei is listed as Overall Event Coordinator.';
  return 'I can help with the event date, programme, workshops, panel speakers, artisan stalls, venues, registration information and people. Try asking ‘Where are the artisan stalls?’ or ‘What happens at 1 PM?’';
}

async function askAssistant(question) {
  addBubble(question, 'user');
  const pending = addBubble('Looking that up…', 'bot');
  try {
    // On the Flask server this can give live AI answers; on static hosting (GitHub Pages) it fails and we answer in the browser.
    const response = await fetch('api/ask', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question})});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    pending.textContent = result.answer || localAnswer(question);
  } catch (error) {
    pending.textContent = eventData ? localAnswer(question)
      : 'The event assistant is temporarily unavailable. Please check the programme and venue sections.';
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
chatForm.addEventListener('submit', event => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;
  chatInput.value = '';
  askAssistant(question);
});
document.querySelectorAll('.suggestions button').forEach(button => button.addEventListener('click', () => askAssistant(button.textContent)));

loadSiteData().catch(error => {
  console.error(error);
  document.getElementById('scheduleList').textContent = 'Event information could not be loaded. Please refresh the page.';
});
