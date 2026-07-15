const API = '';

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  curation: JSON.parse(localStorage.getItem('curation') || 'null'),
  sessionId: localStorage.getItem('sessionId') || null,
};

function saveState() {
  state.token ? localStorage.setItem('token', state.token) : localStorage.removeItem('token');
  state.user ? localStorage.setItem('user', JSON.stringify(state.user)) : localStorage.removeItem('user');
  state.curation ? localStorage.setItem('curation', JSON.stringify(state.curation)) : localStorage.removeItem('curation');
  state.sessionId ? localStorage.setItem('sessionId', state.sessionId) : localStorage.removeItem('sessionId');
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['X-Auth-Token'] = state.token;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.detail) || `요청에 실패했어요 (${res.status})`);
  }
  return data;
}

function navigate(route) {
  location.hash = '#/' + route;
}

function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.querySelector('.phone').appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ICON_TEAPOT = `<svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 30h28a4 4 0 0 1 4 4v6a12 12 0 0 1-12 12H22A12 12 0 0 1 10 40v-6a4 4 0 0 1 4-4z"/>
  <path d="M46 34h6a5 5 0 0 1 0 10h-6"/>
  <path d="M14 30 20 18h16l4 12"/>
  <path d="M26 14V9h6v5"/>
</svg>`;

const ICON_CUP = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a3 3 0 0 1 0 6h-2"/><path d="M7 4c0 1 1 1 1 2s-1 1-1 2"/><path d="M11 4c0 1 1 1 1 2s-1 1-1 2"/></svg>`;
const ICON_THERMO = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a2 2 0 0 1 2 2v9.5a4 4 0 1 1-4 0V5a2 2 0 0 1 2-2z"/><circle cx="12" cy="17" r="1.4" fill="currentColor" stroke="none"/></svg>`;
const ICON_TIMER = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/></svg>`;
const ICON_POUR = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h9l3 4-3 4H5z"/><path d="M8 12v6a2 2 0 0 0 2 2h1"/></svg>`;

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch (err) {
    /* Web Audio unavailable — silent fallback */
  }
}

function faceSvg(level) {
  const mouths = { 1: 'M9 16q3-2.5 6 0', 2: 'M9 15h6', 3: 'M9 14q3 1.6 6 0', 4: 'M8 13q4 4 8 0' };
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none"/>
    <path d="${mouths[level] || mouths[3]}"/>
  </svg>`;
}

/* ---------------- router ---------------- */

const TAB_ROUTES = ['home', 'booking', 'log', 'profile'];

function currentRoute() {
  const hash = location.hash.replace('#/', '').split('?')[0];
  if (hash) return hash;
  return state.user ? 'home' : 'splash';
}

async function render() {
  const route = currentRoute();
  const screen = document.getElementById('screen');
  const tabbar = document.getElementById('tabbar');

  if (!state.user && !['splash', 'onboarding'].includes(route)) {
    navigate('splash');
    return;
  }

  tabbar.classList.toggle('hidden', !TAB_ROUTES.includes(route));
  document.querySelectorAll('.tab-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === route);
  });

  const renderers = {
    splash: renderSplash,
    onboarding: renderOnboarding,
    home: renderHome,
    booking: renderBooking,
    brew: renderBrew,
    environment: renderEnvironment,
    log: renderLog,
    profile: renderProfile,
  };

  const renderer = renderers[route] || renderSplash;
  try {
    await renderer(screen);
  } catch (err) {
    screen.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

/* ---------------- splash ---------------- */

function renderSplash(screen) {
  screen.innerHTML = `
    <div class="splash">
      <div class="icon">${ICON_TEAPOT}</div>
      <div class="mark">茶線冊</div>
      <div class="sub">차선책</div>
      <p class="tagline">당신의 최선을 잠시 내려놓으세요.<br/>완벽한 차선책이 기다립니다.</p>
      <button class="btn btn-primary" id="start-btn" style="max-width:220px;">시작하기</button>
    </div>
  `;
  document.getElementById('start-btn').onclick = () => navigate(state.user ? 'home' : 'onboarding');
}

/* ---------------- onboarding ---------------- */

let onboardingMode = 'signup';
let selectedTone = null;
let selectedBrewLevel = null;

function renderOnboarding(screen) {
  screen.innerHTML = onboardingMode === 'signup' ? signupTemplate() : loginTemplate();
  attachOnboardingHandlers();
}

function signupTemplate() {
  return `
    <div class="top-nav" id="back-to-splash">← 돌아가기</div>
    <div class="stack">
      <div><span class="eyebrow">온보딩</span><h2>당신의 리추얼을 알려주세요</h2></div>
      <div class="card stack">
        <div class="field">
          <label>오늘 기분이 어떠세요? (선택)</label>
          <textarea id="mood-text" placeholder="예: 오늘 회사에서 너무 지쳤어요"></textarea>
        </div>
        <button class="btn btn-ghost" id="suggest-btn" type="button">말투 추천받기</button>
        <p id="suggest-result" class="muted"></p>
        <div class="field">
          <label>말투 선택</label>
          <div class="row">
            <button type="button" class="btn-chip" data-tone="calm_mentor" id="tone-calm">차분한 스승</button>
            <button type="button" class="btn-chip" data-tone="friendly" id="tone-friendly">다정한 친구</button>
          </div>
        </div>
        <div class="field">
          <label>브루잉 스타일</label>
          <div class="row">
            <button type="button" class="btn-chip" data-brew="guided" id="brew-guided">도전형 (자세히 안내받기)</button>
            <button type="button" class="btn-chip" data-brew="independent" id="brew-independent">독립형 (나만의 속도로)</button>
          </div>
        </div>
      </div>
      <div class="card stack">
        <div class="field"><label>이름</label><input id="su-name" /></div>
        <div class="field"><label>이메일</label><input id="su-email" type="email" /></div>
        <div class="field"><label>전화번호</label><input id="su-phone" placeholder="010-0000-0000" /></div>
        <div class="field"><label>비밀번호</label><input id="su-password" type="password" /></div>
        <p id="signup-error" class="error-text"></p>
        <button class="btn btn-primary" id="signup-btn">시작하기</button>
      </div>
      <p class="muted" style="text-align:center;">이미 계정이 있으신가요? <a href="#" id="to-login">로그인</a></p>
    </div>
  `;
}

function loginTemplate() {
  return `
    <div class="stack">
      <div><span class="eyebrow">로그인</span><h2>다시 만나 반가워요</h2></div>
      <div class="card stack">
        <div class="field"><label>이메일</label><input id="li-email" type="email" /></div>
        <div class="field"><label>비밀번호</label><input id="li-password" type="password" /></div>
        <p id="login-error" class="error-text"></p>
        <button class="btn btn-primary" id="login-btn">로그인</button>
      </div>
      <p class="muted" style="text-align:center;">처음 오셨나요? <a href="#" id="to-signup">회원가입</a></p>
    </div>
  `;
}

function updateToneChips() {
  const calm = document.getElementById('tone-calm');
  const friendly = document.getElementById('tone-friendly');
  if (!calm) return;
  calm.classList.toggle('selected', selectedTone === 'calm_mentor');
  friendly.classList.toggle('selected', selectedTone === 'friendly');
}

function selectTone(tone) {
  selectedTone = tone;
  updateToneChips();
}

function updateBrewChips() {
  const guided = document.getElementById('brew-guided');
  const independent = document.getElementById('brew-independent');
  if (!guided) return;
  guided.classList.toggle('selected', selectedBrewLevel === 'guided');
  independent.classList.toggle('selected', selectedBrewLevel === 'independent');
}

function selectBrewLevel(level) {
  selectedBrewLevel = level;
  updateBrewChips();
}

function attachOnboardingHandlers() {
  if (onboardingMode === 'signup') {
    document.getElementById('back-to-splash').onclick = () => navigate('splash');
    document.getElementById('to-login').onclick = (e) => {
      e.preventDefault();
      onboardingMode = 'login';
      render();
    };
    document.getElementById('suggest-btn').onclick = async () => {
      const moodText = document.getElementById('mood-text').value.trim();
      if (!moodText) return;
      try {
        const res = await api('/users/suggest-tone', { method: 'POST', body: { mood_text: moodText } });
        document.getElementById('suggest-result').textContent = res.reason;
        selectTone(res.suggested_tone);
      } catch (err) {
        toast(err.message);
      }
    };
    document.getElementById('tone-calm').onclick = () => selectTone('calm_mentor');
    document.getElementById('tone-friendly').onclick = () => selectTone('friendly');
    document.getElementById('brew-guided').onclick = () => selectBrewLevel('guided');
    document.getElementById('brew-independent').onclick = () => selectBrewLevel('independent');
    document.getElementById('signup-btn').onclick = async () => {
      const name = document.getElementById('su-name').value.trim();
      const email = document.getElementById('su-email').value.trim();
      const phone = document.getElementById('su-phone').value.trim();
      const password = document.getElementById('su-password').value;
      const errEl = document.getElementById('signup-error');
      errEl.textContent = '';
      if (!name || !email || !phone || !password) {
        errEl.textContent = '모든 항목을 입력해주세요.';
        return;
      }
      try {
        await api('/users', {
          method: 'POST',
          body: { name, email, phone, password, tone_preference: selectedTone, brew_level: selectedBrewLevel },
        });
        const login = await api('/users/login', { method: 'POST', body: { email, password } });
        state.token = login.auth_token;
        state.user = login.user;
        saveState();
        navigate('home');
      } catch (err) {
        errEl.textContent = err.message;
      }
    };
    updateToneChips();
    updateBrewChips();
  } else {
    document.getElementById('to-signup').onclick = (e) => {
      e.preventDefault();
      onboardingMode = 'signup';
      render();
    };
    document.getElementById('login-btn').onclick = async () => {
      const email = document.getElementById('li-email').value.trim();
      const password = document.getElementById('li-password').value;
      const errEl = document.getElementById('login-error');
      try {
        const login = await api('/users/login', { method: 'POST', body: { email, password } });
        state.token = login.auth_token;
        state.user = login.user;
        saveState();
        navigate('home');
      } catch (err) {
        errEl.textContent = err.message;
      }
    };
  }
}

/* ---------------- home / 리추얼 매치 ---------------- */

let moodValue = 50;
let curationLoading = false;

function moodTextFromValue(v) {
  if (v < 34) return '오늘 너무 지치고 힘들어요. 조용히 쉬고 싶어요.';
  if (v > 66) return '오늘은 활기차고 설레는 기분이에요. 가볍게 즐기고 싶어요.';
  return '차분하게 집중하고 싶은 기분이에요.';
}

function curationCardHtml(c) {
  return `
    <div class="pair-card stack">
      <div class="pair-title">${c.tea.name} + 『${c.book.title}』</div>
      ${c.personalized ? '<span class="tag" style="background: var(--gold-tint); color: var(--green-deep); font-weight: 600;">지난 리추얼 기록 반영</span>' : ''}
      <p class="muted">${c.tea.description}</p>
      <div>${c.matched_tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="row-between"><span class="muted">조명</span><span>${c.environment.lighting}</span></div>
      <div class="row-between"><span class="muted">사운드</span><span>${c.environment.sound}</span></div>
      <button class="btn btn-primary" id="go-booking">이 리추얼로 예약하기</button>
    </div>
  `;
}

function renderHome(screen) {
  const curation = state.curation;
  screen.innerHTML = `
    <div class="stack">
      <div><span class="eyebrow">리추얼 매치</span><h2>지금의 기분을 선택해 보세요</h2></div>
      <div class="card stack">
        <input type="range" min="0" max="100" value="${moodValue}" class="mood-slider" id="mood-range" />
        <div class="mood-labels"><span>차분함</span><span>활기참</span></div>
        <button class="btn btn-primary" id="find-btn" ${curationLoading ? 'disabled' : ''}>${curationLoading ? '찾는 중…' : '오늘의 리추얼 찾기'}</button>
      </div>
      ${curation ? curationCardHtml(curation) : ''}
    </div>
  `;
  document.getElementById('mood-range').oninput = (e) => {
    moodValue = Number(e.target.value);
  };
  document.getElementById('find-btn').onclick = async () => {
    curationLoading = true;
    render();
    try {
      const res = await api('/curations', {
        method: 'POST',
        body: { mode: 'chat', mood_text: moodTextFromValue(moodValue), user_id: state.user.id },
      });
      state.curation = res;
      saveState();
      resetBrewTimer();
      resetEnvState();
    } catch (err) {
      toast(err.message);
    }
    curationLoading = false;
    render();
  };
  if (curation) {
    const goBtn = document.getElementById('go-booking');
    if (goBtn) goBtn.onclick = () => navigate('booking');
  }
}

/* ---------------- booking ---------------- */

const bookingState = {
  boothId: null,
  date: null,
  boothsCache: null,
  times: [],
  selectedTime: null,
  memberships: [],
  membershipsLoaded: false,
  pairMode: false,
};

function adjacentBoothId(boothId) {
  const list = bookingState.boothsCache || [];
  const idx = list.findIndex((b) => b.id === boothId);
  if (idx === -1) return null;
  const next = list[(idx + 1) % list.length];
  return next ? next.id : null;
}

function boothNameById(boothId) {
  const list = bookingState.boothsCache || [];
  const found = list.find((b) => b.id === boothId);
  return found ? found.name : `부스 ${boothId}`;
}

function defaultBookingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function loadAvailableTimes() {
  try {
    bookingState.times = await api(`/booths/${bookingState.boothId}/available-times?target_date=${bookingState.date}`);
  } catch (err) {
    bookingState.times = [];
  }
}

async function renderBooking(screen) {
  if (!bookingState.boothsCache) {
    bookingState.boothsCache = await api('/booths');
    bookingState.boothId = bookingState.boothsCache[0].id;
  }
  if (!bookingState.date) bookingState.date = defaultBookingDate();
  if (!bookingState.membershipsLoaded) {
    bookingState.memberships = await api(`/memberships?user_id=${state.user.id}`);
    bookingState.membershipsLoaded = true;
  }
  await loadAvailableTimes();

  screen.innerHTML = `
    <div class="stack">
      <div><span class="eyebrow">예약</span><h2>90분 리추얼 세션</h2></div>
      <div class="card stack">
        <div class="field">
          <label>부스</label>
          <select id="booth-select">
            ${bookingState.boothsCache.map((b) => `<option value="${b.id}" ${b.id === bookingState.boothId ? 'selected' : ''}>${b.name}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>날짜</label>
          <input type="date" id="date-input" value="${bookingState.date}" />
        </div>
        <div class="field">
          <label>가능한 시간</label>
          <div class="row" style="flex-wrap:wrap;">
            ${
              bookingState.times.length
                ? bookingState.times
                    .map((t) => {
                      const label = t.slice(11, 16);
                      const sel = bookingState.selectedTime === t;
                      return `<button type="button" class="btn-chip ${sel ? 'selected' : ''}" data-time="${t}">${label}</button>`;
                    })
                    .join('')
                : '<p class="muted">이 날짜엔 예약 가능한 시간이 없어요.</p>'
            }
          </div>
        </div>
        ${
          bookingState.memberships.length
            ? `<div class="field">
                <label>멤버십 사용 (선택)</label>
                <select id="membership-select">
                  <option value="">사용 안 함</option>
                  ${bookingState.memberships.map((m) => `<option value="${m.id}">멤버십 #${m.id} · 잔여 ${m.remaining_sessions}회</option>`).join('')}
                </select>
              </div>`
            : ''
        }
        <div class="field">
          <label>페어 모드</label>
          <button type="button" class="btn-chip ${bookingState.pairMode ? 'selected' : ''}" id="pair-toggle">
            ${bookingState.pairMode ? `친구와 함께 (${boothNameById(bookingState.boothId)} + ${boothNameById(adjacentBoothId(bookingState.boothId))})` : '혼자 이용'}
          </button>
        </div>
        <p id="booking-error" class="error-text"></p>
        <button class="btn btn-primary" id="confirm-btn" ${bookingState.selectedTime ? '' : 'disabled'}>예약 확정하기</button>
      </div>
    </div>
  `;

  document.getElementById('booth-select').onchange = (e) => {
    bookingState.boothId = Number(e.target.value);
    bookingState.selectedTime = null;
    render();
  };
  document.getElementById('date-input').onchange = (e) => {
    bookingState.date = e.target.value;
    bookingState.selectedTime = null;
    render();
  };
  screen.querySelectorAll('[data-time]').forEach((btn) => {
    btn.onclick = () => {
      bookingState.selectedTime = btn.dataset.time;
      render();
    };
  });
  document.getElementById('pair-toggle').onclick = () => {
    bookingState.pairMode = !bookingState.pairMode;
    render();
  };
  document.getElementById('confirm-btn').onclick = confirmBooking;
}

async function confirmBooking() {
  const errEl = document.getElementById('booking-error');
  const membershipSelect = document.getElementById('membership-select');
  const membershipId = membershipSelect && membershipSelect.value ? Number(membershipSelect.value) : null;
  const pairBoothId = bookingState.pairMode ? adjacentBoothId(bookingState.boothId) : null;
  try {
    const created = await api('/sessions', {
      method: 'POST',
      body: {
        booth_id: bookingState.boothId,
        customer_name: state.user.name,
        phone: state.user.phone,
        start_time: bookingState.selectedTime,
        user_id: state.user.id,
        membership_id: membershipId,
        pair_booth_id: pairBoothId,
      },
    });
    state.sessionId = created.id;
    saveState();
    bookingState.membershipsLoaded = false;
    bookingState.pairMode = false;
    toast(pairBoothId ? '페어 모드로 예약이 확정됐어요' : '예약이 확정됐어요');
    navigate('brew');
  } catch (err) {
    errEl.textContent = err.message;
  }
}

/* ---------------- brew guide ---------------- */

let brewTimer = { remaining: null, interval: null, running: false };

function resetBrewTimer() {
  clearInterval(brewTimer.interval);
  brewTimer = { remaining: null, interval: null, running: false };
}

function brewCompletionComment() {
  const tone = state.user && state.user.tone_preference;
  if (tone === 'friendly') return '잘하셨어요! 오늘도 스스로를 잘 챙기셨네요 :)';
  if (tone === 'calm_mentor') return '훌륭합니다. 이 정성이 곧 당신의 여유가 됩니다.';
  return '완성됐어요. 천천히 향을 음미해보세요.';
}

function toggleTimer() {
  const display = document.getElementById('timer-display');
  const btn = document.getElementById('timer-btn');
  const isGuided = !state.user || state.user.brew_level !== 'independent';
  if (brewTimer.running) {
    clearInterval(brewTimer.interval);
    brewTimer.running = false;
    btn.textContent = '타이머 시작';
    return;
  }
  brewTimer.running = true;
  btn.textContent = '일시정지';
  brewTimer.interval = setInterval(() => {
    brewTimer.remaining -= 1;
    if (brewTimer.remaining <= 0) {
      brewTimer.remaining = 0;
      clearInterval(brewTimer.interval);
      brewTimer.running = false;
      btn.textContent = '다시 시작';
      toast('브루잉이 완료됐어요');
      playChime();
      const comment = document.getElementById('ai-comment');
      if (isGuided && comment) comment.textContent = brewCompletionComment();
    }
    display.textContent = formatTime(brewTimer.remaining);
  }, 1000);
}

function renderBrew(screen) {
  const curation = state.curation;
  if (!curation) {
    screen.innerHTML = `<p class="muted">먼저 홈에서 리추얼을 찾아주세요.</p><button class="btn btn-primary" id="back-home">홈으로</button>`;
    document.getElementById('back-home').onclick = () => navigate('home');
    return;
  }
  const tea = curation.tea;
  if (brewTimer.remaining === null) brewTimer.remaining = tea.brew_seconds;
  const isGuided = !state.user || state.user.brew_level !== 'independent';

  const stepsHtml = isGuided
    ? `
      <div class="card brew-steps">
        <div class="brew-step"><span class="row">${ICON_CUP}<span>차의 양</span></span><span class="value">${tea.brew_amount_g}g</span></div>
        <div class="brew-step"><span class="row">${ICON_THERMO}<span>물 온도</span></span><span class="value">${tea.brew_temp_c}℃</span></div>
        <div class="brew-step"><span class="row">${ICON_TIMER}<span>우리 시간</span></span><span class="value">${formatTime(tea.brew_seconds)}</span></div>
        <div class="brew-step"><span class="row">${ICON_POUR}<span>우려 내기</span></span><span class="value">천천히</span></div>
      </div>
      <p class="muted" id="ai-comment"></p>
    `
    : `
      <div class="card row-between">
        <span class="muted">참고 기준</span>
        <span>${tea.brew_amount_g}g · ${tea.brew_temp_c}℃ · ${formatTime(tea.brew_seconds)}</span>
      </div>
      <p class="muted">간섭 없이, 나만의 속도로 우려보세요.</p>
    `;

  screen.innerHTML = `
    <div class="stack">
      <div><span class="eyebrow">브루잉 가이드</span><h2>${tea.name}</h2></div>
      <p class="muted">${tea.description}</p>
      ${stepsHtml}
      <div class="card stack">
        <div class="timer" id="timer-display">${formatTime(brewTimer.remaining)}</div>
        <button class="btn btn-primary" id="timer-btn">${brewTimer.running ? '일시정지' : '타이머 시작'}</button>
      </div>
      <button class="btn btn-ghost" id="next-btn">다음: 공간 제어</button>
    </div>
  `;
  document.getElementById('timer-btn').onclick = toggleTimer;
  document.getElementById('next-btn').onclick = () => navigate('environment');
}

/* ---------------- environment ---------------- */

// curation.py의 _environment_for가 실제로 반환하는 세 가지 값(빗소리 ASMR / 잔잔한 화이트 노이즈 /
// 잔잔한 어쿠스틱 연주)을 그대로 포함해야 추천 사운드가 올바른 칩에 표시된다.
const SOUND_PRESETS = ['빗소리 ASMR', '잔잔한 화이트 노이즈', '잔잔한 어쿠스틱 연주', '숲 소리'];

let envState = { brightness: 35, colorTemp: 40, volume: 50, soundChoice: null };

function resetEnvState() {
  envState = { brightness: 35, colorTemp: 40, volume: 50, soundChoice: null };
}

function renderEnvironment(screen) {
  const curation = state.curation;
  if (!curation) {
    screen.innerHTML = `<p class="muted">먼저 홈에서 리추얼을 찾아주세요.</p><button class="btn btn-primary" id="back-home">홈으로</button>`;
    document.getElementById('back-home').onclick = () => navigate('home');
    return;
  }
  if (!envState.soundChoice) {
    envState.soundChoice = SOUND_PRESETS.find((s) => s === curation.environment.sound) || SOUND_PRESETS[0];
  }
  screen.innerHTML = `
    <div class="stack">
      <div><span class="eyebrow">공간 제어</span><h2>나만의 몰입 환경을 만들어 보세요</h2></div>
      <div class="card stack">
        <div class="field">
          <label>밝기</label>
          <input type="range" min="0" max="100" value="${envState.brightness}" class="env-slider" id="brightness-range" />
        </div>
        <div class="field">
          <label>색온도</label>
          <input type="range" min="0" max="100" value="${envState.colorTemp}" class="env-slider" id="colortemp-range" />
          <div class="mood-labels"><span>따뜻하게</span><span>차갑게</span></div>
        </div>
        <div class="field">
          <label>화이트 노이즈</label>
          <div class="row" style="flex-wrap:wrap;">
            ${SOUND_PRESETS.map((s) => `<button type="button" class="btn-chip ${envState.soundChoice === s ? 'selected' : ''}" data-sound="${s}">${s}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>볼륨</label>
          <input type="range" min="0" max="100" value="${envState.volume}" class="env-slider" id="volume-range" />
        </div>
      </div>
      <div class="pair-card stack">
        <div class="pair-title">추천 몰입 세팅</div>
        <p class="muted">${curation.environment.lighting} · ${curation.environment.sound} 기반으로 구성한 세팅이에요.</p>
        <button class="btn btn-primary" id="apply-btn">이 설정으로 적용하기</button>
      </div>
      <button class="btn btn-ghost" id="to-log">다음: 리추얼 마무리</button>
    </div>
  `;
  document.getElementById('brightness-range').oninput = (e) => { envState.brightness = Number(e.target.value); };
  document.getElementById('colortemp-range').oninput = (e) => { envState.colorTemp = Number(e.target.value); };
  document.getElementById('volume-range').oninput = (e) => { envState.volume = Number(e.target.value); };
  screen.querySelectorAll('[data-sound]').forEach((btn) => {
    btn.onclick = () => {
      envState.soundChoice = btn.dataset.sound;
      render();
    };
  });
  document.getElementById('apply-btn').onclick = () => toast('환경 설정을 적용했어요');
  document.getElementById('to-log').onclick = () => navigate('log');
}

/* ---------------- ritual log ---------------- */

let logDraft = { mood: null, focus: 0, note: '' };

function logItemHtml(l) {
  const date = new Date(l.created_at).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `
    <div class="log-item">
      <div class="date">${date}</div>
      <div class="row">${faceSvg(l.mood_score)}<span>집중도 ${'★'.repeat(l.focus_score)}${'☆'.repeat(5 - l.focus_score)}</span></div>
      ${l.note ? `<p class="muted">${l.note}</p>` : ''}
    </div>
  `;
}

async function renderLog(screen) {
  const logs = await api(`/logs?user_id=${state.user.id}`);
  const curation = state.curation;
  screen.innerHTML = `
    <div class="stack">
      <div><span class="eyebrow">리추얼 기록</span><h2>오늘의 리추얼</h2></div>
      <div class="card stack">
        ${curation ? `<p class="muted">${curation.tea.name} · 『${curation.book.title}』</p>` : ''}
        <div class="field">
          <label>기분</label>
          <div class="mood-picker">
            ${[1, 2, 3, 4].map((i) => `<button type="button" data-mood="${i}" class="${logDraft.mood === i ? 'selected' : ''}">${faceSvg(i)}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>집중도</label>
          <div class="stars">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${logDraft.focus >= n ? 'filled' : ''}">★</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>메모</label>
          <textarea id="note-input" placeholder="오늘의 리추얼은 어땠나요?">${logDraft.note}</textarea>
        </div>
        <p id="log-error" class="error-text"></p>
        <button class="btn btn-primary" id="save-log-btn">저장하기</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:10px;">지난 기록</h3>
        ${logs.length ? logs.map(logItemHtml).join('') : '<p class="muted">아직 기록이 없어요.</p>'}
      </div>
    </div>
  `;
  screen.querySelectorAll('[data-mood]').forEach((btn) => {
    btn.onclick = () => {
      logDraft.mood = Number(btn.dataset.mood);
      render();
    };
  });
  screen.querySelectorAll('[data-star]').forEach((btn) => {
    btn.onclick = () => {
      logDraft.focus = Number(btn.dataset.star);
      render();
    };
  });
  document.getElementById('save-log-btn').onclick = async () => {
    const errEl = document.getElementById('log-error');
    const note = document.getElementById('note-input').value;
    if (!logDraft.mood || !logDraft.focus) {
      errEl.textContent = '기분과 집중도를 선택해주세요.';
      return;
    }
    try {
      await api('/logs', {
        method: 'POST',
        body: {
          session_id: state.sessionId,
          user_id: state.user.id,
          tea_id: curation ? curation.tea.id : null,
          book_id: curation ? curation.book.id : null,
          mood_score: logDraft.mood,
          focus_score: logDraft.focus,
          note,
        },
      });
      toast('리추얼 기록을 저장했어요');
      logDraft = { mood: null, focus: 0, note: '' };
      render();
    } catch (err) {
      errEl.textContent = err.message;
    }
  };
}

/* ---------------- profile ---------------- */

async function updateTone(tone) {
  try {
    const updated = await api(`/users/${state.user.id}/tone`, { method: 'PATCH', body: { tone_preference: tone } });
    state.user = updated;
    saveState();
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function updateBrewLevel(level) {
  try {
    const updated = await api(`/users/${state.user.id}/brew-level`, { method: 'PATCH', body: { brew_level: level } });
    state.user = updated;
    saveState();
    render();
  } catch (err) {
    toast(err.message);
  }
}

function renderProfile(screen) {
  const u = state.user;
  const toneLabel = u.tone_preference === 'friendly' ? '다정한 친구' : u.tone_preference === 'calm_mentor' ? '차분한 스승' : '미설정';
  const brewLabel = u.brew_level === 'guided' ? '도전형' : u.brew_level === 'independent' ? '독립형' : '미설정';
  screen.innerHTML = `
    <div class="stack">
      <div><span class="eyebrow">마이</span><h2>${u.name}님</h2></div>
      <div class="card stack">
        <div class="row-between"><span class="muted">이메일</span><span>${u.email}</span></div>
        <div class="row-between"><span class="muted">전화번호</span><span>${u.phone}</span></div>
        <div class="row-between"><span class="muted">말투</span><span>${toneLabel}</span></div>
        <div class="row-between"><span class="muted">브루잉 스타일</span><span>${brewLabel}</span></div>
      </div>
      <div class="field">
        <label>말투 변경</label>
        <div class="row">
          <button type="button" class="btn-chip ${u.tone_preference === 'calm_mentor' ? 'selected' : ''}" id="set-calm">차분한 스승</button>
          <button type="button" class="btn-chip ${u.tone_preference === 'friendly' ? 'selected' : ''}" id="set-friendly">다정한 친구</button>
        </div>
      </div>
      <div class="field">
        <label>브루잉 스타일 변경</label>
        <div class="row">
          <button type="button" class="btn-chip ${u.brew_level === 'guided' ? 'selected' : ''}" id="set-brew-guided">도전형</button>
          <button type="button" class="btn-chip ${u.brew_level === 'independent' ? 'selected' : ''}" id="set-brew-independent">독립형</button>
        </div>
      </div>
      <button class="btn btn-ghost" id="logout-btn">로그아웃</button>
    </div>
  `;
  document.getElementById('set-calm').onclick = () => updateTone('calm_mentor');
  document.getElementById('set-friendly').onclick = () => updateTone('friendly');
  document.getElementById('set-brew-guided').onclick = () => updateBrewLevel('guided');
  document.getElementById('set-brew-independent').onclick = () => updateBrewLevel('independent');
  document.getElementById('logout-btn').onclick = () => {
    state.token = null;
    state.user = null;
    state.curation = null;
    state.sessionId = null;
    saveState();
    navigate('splash');
  };
}
