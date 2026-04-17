/* ============================================
   AEOB — Home Page Widgets
   Era Timeline, Legend of the Week rotator,
   On This Day in PBA History, Live strip.
   All placeholder data — swap for backend later.
   ============================================ */

// ---------- Era Timeline ----------
const ERAS = [
  {
    id: '1970s',
    label: '1970s',
    title: 'The Founding Years',
    accent: '#cc2030',
    blurb: 'Asia\'s first professional league is born. Crispa and Toyota ignite the greatest rivalry in PBA history.',
    highlights: ['1975: PBA founded', 'Crispa wins first grand slam', 'Toyota-Crispa rivalry era', 'Jaworski becomes a legend'],
    teams: ['Crispa Redmanizers', 'Toyota Tamaraws', 'U/Tex Wranglers'],
    episodeCount: 48
  },
  {
    id: '1980s',
    label: '1980s',
    title: 'The Golden Age',
    accent: '#e8772b',
    blurb: 'Three dynasties rise. Great Taste, Crispa\'s second run, and San Miguel define an era of packed arenas.',
    highlights: ['Great Taste triple crown 1984', 'Ramon Fernandez MVP run', 'Philip Cezar era', 'Rise of Alvin Patrimonio'],
    teams: ['Great Taste', 'Crispa', 'San Miguel', 'Ginebra'],
    episodeCount: 72
  },
  {
    id: '1990s',
    label: '1990s',
    title: 'The Modern Dawn',
    accent: '#f4a62a',
    blurb: 'Alaska builds a dynasty. The Beermen reload. Patrimonio, Paras, and Caidic cement their place among the immortals.',
    highlights: ['Alaska grand slam 1996', 'Allan Caidic sniper era', 'Jaworski as player-coach', 'Purefoods hot dog dynasty'],
    teams: ['Alaska', 'San Miguel', 'Purefoods', 'Ginebra', 'Shell'],
    episodeCount: 84
  },
  {
    id: '2000s',
    label: '2000s',
    title: 'New Blood',
    accent: '#3b5cc6',
    blurb: 'Talk N Text emerges, San Miguel reloads, and a new generation of stars takes the torch.',
    highlights: ['TNT back-to-back', 'Mark Caguioa rise', 'Kelly Williams imports era', 'SMB dominance'],
    teams: ['Talk N Text', 'San Miguel', 'Barangay Ginebra', 'Red Bull'],
    episodeCount: 64
  },
  {
    id: '2010s',
    label: '2010s',
    title: 'The Beermen Reign',
    accent: '#2a3a8e',
    blurb: 'SMB\'s five-peat redefines dominance. June Mar Fajardo collects MVPs like trading cards.',
    highlights: ['SMB Grand Slam 2017', 'June Mar 6x MVP', 'Justin Brownlee arrives', 'TNT-Ginebra rivalry peaks'],
    teams: ['San Miguel Beermen', 'Ginebra', 'Talk N Text', 'Meralco'],
    episodeCount: 52
  },
  {
    id: '2020s',
    label: '2020s',
    title: 'The Current Chapter',
    accent: '#1a1f5e',
    blurb: 'The league evolves. Bubble playoffs, rising stars, and new dynasties in the making.',
    highlights: ['2020 bubble championship', 'Scottie Thompson MVP', 'TNT championship core', 'Rise of the new imports'],
    teams: ['Ginebra', 'TNT', 'Magnolia', 'San Miguel'],
    episodeCount: 20
  }
];

function renderEraTimeline() {
  const container = document.getElementById('eraTimeline');
  if (!container) return;
  container.innerHTML = ERAS.map((era, i) => `
    <button class="era-node ${i === 0 ? 'active' : ''}" data-era="${era.id}" style="--era-accent:${era.accent};">
      <div class="era-node-dot"></div>
      <div class="era-node-label">${era.label}</div>
      <div class="era-node-title">${era.title}</div>
    </button>
  `).join('');

  container.querySelectorAll('.era-node').forEach(node => {
    node.addEventListener('click', () => {
      container.querySelectorAll('.era-node').forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      renderEraDetails(node.dataset.era);
    });
  });

  renderEraDetails(ERAS[0].id);
}

function renderEraDetails(eraId) {
  const era = ERAS.find(e => e.id === eraId);
  const container = document.getElementById('eraDetails');
  if (!container || !era) return;
  container.style.setProperty('--era-accent', era.accent);
  container.innerHTML = `
    <div class="era-details-inner">
      <div class="era-details-left">
        <span class="era-details-label">${era.label}</span>
        <h3>${era.title}</h3>
        <p class="era-blurb">${era.blurb}</p>
        <div class="era-teams">
          ${era.teams.map(t => `<span class="era-team-chip">${t}</span>`).join('')}
        </div>
        <a href="/episodes.html?era=${era.id}" class="btn btn-primary">Browse ${era.episodeCount} ${era.label} episodes &rarr;</a>
      </div>
      <div class="era-details-right">
        <h4>Defining Moments</h4>
        <ul class="era-highlights">
          ${era.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ---------- Legend of the Week ----------
const LEGENDS = [
  {
    name: 'Robert "The Big J" Jaworski',
    years: '1975–1998',
    teams: 'Toyota, Ginebra',
    titles: 'PBA MVP, 7× All-Star',
    quote: 'Never say die — the phrase he made immortal.',
    bio: 'The embodiment of Philippine basketball. Jaworski played until he was 52, coached while playing, and turned Ginebra into a cultural phenomenon.',
    era: '1970s–90s',
    color: '#cc2030'
  },
  {
    name: 'Atoy "The Fortune Cookie" Co',
    years: '1975–1988',
    teams: 'Crispa',
    titles: 'MVP 1976, 1979',
    quote: 'The pure shooter who defined the Crispa dynasty.',
    bio: 'One of the deadliest shooters in PBA history and a cornerstone of Crispa\'s grand slam teams.',
    era: '1970s–80s',
    color: '#e63946'
  },
  {
    name: 'Allan "The Triggerman" Caidic',
    years: '1987–2002',
    teams: 'Great Taste, Presto, San Miguel',
    titles: '1990 MVP, legendary shooter',
    quote: 'If he got his feet set, the defense was already too late.',
    bio: 'Arguably the greatest shooter the PBA has ever seen. Caidic once scored 79 points in a single game.',
    era: '1980s–90s',
    color: '#e8772b'
  },
  {
    name: 'Alvin "Captain" Patrimonio',
    years: '1988–2004',
    teams: 'Purefoods',
    titles: '4× PBA MVP',
    quote: 'Loyalty, leadership, longevity — the Purefoods cornerstone.',
    bio: 'The only player with four MVP awards before June Mar Fajardo matched him. One-team loyalty personified.',
    era: '1980s–2000s',
    color: '#f4a62a'
  },
  {
    name: 'June Mar "The Kraken" Fajardo',
    years: '2012–present',
    teams: 'San Miguel Beermen',
    titles: '6× PBA MVP',
    quote: 'The modern game\'s most dominant big man.',
    bio: 'Six MVP awards and counting. Anchor of the San Miguel dynasty and the face of modern PBA dominance.',
    era: '2010s–Now',
    color: '#3b5cc6'
  }
];

let legendIndex = 0;

function renderLegend() {
  const container = document.getElementById('legendCard');
  if (!container) return;
  const leg = LEGENDS[legendIndex];
  container.style.setProperty('--legend-accent', leg.color);
  container.innerHTML = `
    <div class="legend-visual">
      <div class="legend-initials">${leg.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
      <span class="legend-era-badge">${leg.era}</span>
    </div>
    <div class="legend-content">
      <h3>${leg.name}</h3>
      <div class="legend-meta">
        <span><strong>Years:</strong> ${leg.years}</span>
        <span><strong>Teams:</strong> ${leg.teams}</span>
        <span><strong>Accolades:</strong> ${leg.titles}</span>
      </div>
      <blockquote class="legend-quote">&ldquo;${leg.quote}&rdquo;</blockquote>
      <p class="legend-bio">${leg.bio}</p>
      <div class="legend-actions">
        <a href="/episodes.html?search=${encodeURIComponent(leg.name.split(' ')[0])}" class="btn btn-primary btn-sm">Episodes about ${leg.name.split(' ')[0]}</a>
        <span class="legend-pagination">${legendIndex + 1} / ${LEGENDS.length}</span>
      </div>
    </div>
  `;
}

document.getElementById('legendNext')?.addEventListener('click', () => {
  legendIndex = (legendIndex + 1) % LEGENDS.length;
  renderLegend();
});
document.getElementById('legendPrev')?.addEventListener('click', () => {
  legendIndex = (legendIndex - 1 + LEGENDS.length) % LEGENDS.length;
  renderLegend();
});

// ---------- On This Day in PBA History ----------
const ON_THIS_DAY_EVENTS = [
  { month: 0, day: 15, year: 1988, title: 'Allan Caidic drops 79 points', desc: 'One of the highest single-game scoring performances in PBA history.' },
  { month: 1, day: 10, year: 1985, title: 'Great Taste completes Triple Crown', desc: 'Coach Baby Dalupan cements his legacy with an unprecedented sweep.' },
  { month: 2, day: 22, year: 1976, title: 'PBA\'s inaugural season tips off', desc: 'Asia\'s first pro basketball league begins its eternity.' },
  { month: 3, day: 8, year: 1996, title: 'Alaska clinches Grand Slam', desc: 'Tim Cone\'s Milkmen become one of the most complete teams in league history.' },
  { month: 4, day: 30, year: 2014, title: 'June Mar wins first MVP', desc: 'The Kraken begins his six-MVP reign.' },
  { month: 5, day: 12, year: 1991, title: 'Jaworski coaches Ginebra to title', desc: 'Player-coach legend delivers another "Never Say Die" moment.' },
  { month: 6, day: 4, year: 2003, title: 'Talk N Text back-to-back', desc: 'The Phone Pals sweep the finals for consecutive championships.' },
  { month: 7, day: 18, year: 1982, title: 'Crispa wins 13th PBA title', desc: 'The Redmanizers dynasty reaches its peak.' },
  { month: 8, day: 5, year: 2017, title: 'SMB completes Grand Slam', desc: 'San Miguel joins the exclusive list of grand slam teams.' },
  { month: 9, day: 21, year: 1994, title: 'Patrimonio wins 3rd MVP', desc: 'Purefoods\' Captain cements his four-MVP campaign.' },
  { month: 10, day: 9, year: 1978, title: 'Toyota-Crispa all-time classic', desc: 'One of the rivalry\'s most storied Finals games.' },
  { month: 11, day: 15, year: 2000, title: 'Barangay Ginebra title run', desc: 'A Christmas-season championship for the most popular franchise.' }
];

function renderOnThisDay() {
  const today = new Date();
  // Find closest event for this month, otherwise random
  let event = ON_THIS_DAY_EVENTS.find(e => e.month === today.getMonth() && e.day === today.getDate());
  if (!event) event = ON_THIS_DAY_EVENTS.find(e => e.month === today.getMonth());
  if (!event) event = ON_THIS_DAY_EVENTS[today.getDate() % ON_THIS_DAY_EVENTS.length];

  const dateEl = document.getElementById('onThisDayDate');
  const titleEl = document.getElementById('onThisDayTitle');
  const descEl = document.getElementById('onThisDayDesc');

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (dateEl) dateEl.innerHTML = `<span class="otd-month">${monthNames[event.month]}</span><span class="otd-day">${event.day}</span><span class="otd-year">${event.year}</span>`;
  if (titleEl) titleEl.textContent = event.title;
  if (descEl) descEl.textContent = event.desc;
}

// ---------- Home Live Strip ----------
function renderHomeLiveStrip() {
  const label = document.getElementById('homeLiveLabel');
  const title = document.getElementById('homeLiveTitle');
  const sub = document.getElementById('homeLiveSub');
  if (!label || !title) return;

  const now = new Date();
  const next = new Date();
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
  next.setDate(now.getDate() + daysUntilSat);
  next.setHours(20, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);

  const diffHrs = Math.round((next - now) / 3600000);
  if (diffHrs < 48) {
    label.textContent = diffHrs < 1 ? 'LIVE SOON' : 'Live in ' + diffHrs + ' hours';
    title.textContent = next.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  } else {
    label.textContent = 'Next Stream';
    title.textContent = next.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + ' · 8:00 PM PHT';
  }
}

// ---------- Init ----------
renderEraTimeline();
renderLegend();
renderOnThisDay();
renderHomeLiveStrip();
