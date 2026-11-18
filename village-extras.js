const fortuneDialog = document.querySelector('#fortune');
const villageGuide = document.querySelector('#village-guide');
villageGuide.addEventListener('close', () => map.focus({ preventScroll: true }));
const mapSign = { id: 'map-sign', x: 68, y: 37 };
const noticeBoard = { id: 'notice-board', x: 77, y: 37 };
const fountain = { id: 'fountain', x: 54, y: 61 };
const cottage = { id: 'cottage', x: 89, y: 68, title: '작은 집', description: '창가에 햇살이 들고 작은 방석이 놓여 있어요.' };
const villageSpots = [
  fountain,
  mapSign,
  noticeBoard,
  { id: 'tea-house', x: 26, y: 40, title: '보리의 찻집', description: '따뜻한 물이 끓고 찻잎 향이 퍼져요.' },
  { id: 'town-hall', x: 58, y: 33, title: '마을 회관', description: '보리가 적어둔 환영회 일정표가 걸려 있어요.' },
  cottage
];
for (const spot of villageSpots) {
  const button = document.getElementById(spot.id);
  button.style.left = spot.x + '%';
  button.style.top = spot.y + '%';
  button.onclick = () => walkTo(spot);
}
function updateVillageSpots(atDock) {
  for (const spot of villageSpots) document.getElementById(spot.id).hidden = atDock;
  document.querySelector('#map-sign-art').hidden = atDock;
  document.querySelector('#notice-board-art').hidden = atDock;
}
function updateBoriHint(actor) {
  const hint = document.querySelector('#bori-hint');
  hint.style.left = actor.x + '%';
  hint.style.top = (actor.y - 14) + '%';
}
function withinVillageSpot(spot) {
  if (spot === fountain) return ((position.x - 54) / 12) ** 2 + ((position.y - 54) / 11) ** 2 <= 1;
  return distanceTo(spot) <= 6;
}
function activateVillageSpot(spot) {
  if (activeVillageInterior || inCourtyard || ['dock', 'clearing'].includes(state.scene) || !villageSpots.includes(spot) || !withinVillageSpot(spot)) return false;
  keys.clear();
  route = [];
  target = null;
  if (spot === mapSign) {
    openVillageGuide();
  } else if (spot === noticeBoard) {
    openNoticeBoard();
  } else if (spot === fountain) {
    void tossVillageStone();
  } else if (spot.id === 'town-hall') {
    setVillageCourtyard(true);
  } else {
    setVillageInterior(spot.id);
  }
  return true;
}
function useNearbyVillageSpot() {
  return activateVillageSpot(villageSpots.filter(withinVillageSpot).sort((a, b) => distanceTo(a) - distanceTo(b))[0]);
}

const noticeDialog = document.querySelector('#notice-dialog');
const noticeMessage = document.querySelector('#notice-message');
const noticeAction = document.querySelector('#notice-action');
noticeDialog.addEventListener('close', () => map.focus({ preventScroll: true }));
function openNoticeBoard() {
  const status = villageSave.read().story.lostScarf;
  noticeAction.hidden = true;
  noticeMessage.textContent = {
    draft: '코코와 쓴 안내문\n빨간 목도리를 주웠어요. 잃어버린 분은 코코에게 목도리의 특징을 알려주세요.',
    posted: '빨간 목도리를 주웠어요.\n\n치치 “그거 내 목도리 같아. 안쪽에 내가 수놓은 고등어가 있거든!”',
    returned: '빨간 목도리는 주인에게 돌아갔어요.'
  }[status] ?? '아직 붙은 안내문이 없어요.';
  if (status === 'draft' || status === 'posted') {
    noticeAction.hidden = false;
    noticeAction.textContent = status === 'draft' ? '안내문 붙이기' : '코코와 목도리 돌려주기';
    noticeAction.onclick = () => {
      villageSave.update({ story: { lostScarf: status === 'draft' ? 'posted' : 'returned' } });
      noticeMessage.textContent = status === 'draft'
        ? '안내문을 붙였어요. 다음에 게시판에 와서 목도리를 찾는 주민이 있는지 확인해 봐요.'
        : '치치가 목도리를 받아 갔어요.\n\n코코 “네 말대로 하니까 주인 찾기가 쉽네. 다음 것도 같이 볼래?”';
      noticeAction.hidden = true;
      noticeDialog.querySelector('form button').focus();
    };
  }
  noticeDialog.showModal();
}

const seoulTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const seoulDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
const fortunes = [
  '길운 · 오늘은 먼저 인사한 사람에게 반가운 소식이 돌아와요.',
  '행운 · 잊고 있던 곳에서 작은 선물을 발견할지도 몰라요.',
  '보통 · 미뤄둔 일 하나를 끝내면 생각보다 마음이 가벼워져요.',
  '주의 · 서두르면 두 번 걷게 될 수 있어요. 출발 전에 한 번 더 확인해요.',
  '흐린 운 · 기대하던 소식이 늦어질 수 있어요. 오늘은 일찍 쉬어도 좋아요.',
  '조심 · 물건을 깜빡 두고 오기 쉬운 날이에요. 자리를 뜨기 전에 확인하세요.'
];
let previousFortune = -1;
let fountainRitual = false;
const fortuneCookie = document.querySelector('#fortune-cookie');
const fortuneMessage = document.querySelector('#fortune-message');
const stone = document.querySelector('#fountain-stone');
const spirit = document.querySelector('#fountain-spirit');
async function tossVillageStone() {
  if (fountainRitual) return;
  fountainRitual = true;
  const originatingScene = state;
  const duration = motionPreference.matches ? 100 : 480;
  const bounds = map.getBoundingClientRect();
  const dx = (fountain.x - position.x) * bounds.width / 100;
  const dy = (fountain.y - 10 - position.y) * bounds.height / 100;
  stone.style.left = position.x + '%';
  stone.style.top = position.y + '%';
  stone.hidden = false;
  if (!motionPreference.matches) player.animate(
    [{ rotate: '0deg' }, { rotate: '-16deg', offset: .3 }, { rotate: '16deg', offset: .62 }, { rotate: '0deg' }],
    { duration }
  );
  await stone.animate([
    { transform: 'translate(0, -18px)' },
    { transform: 'translate(' + dx * .48 + 'px,' + (dy * .48 - 36) + 'px)', offset: .5 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: .25 }
  ], { duration }).finished;
  stone.hidden = true;
  if (state === originatingScene && !map.hidden) {
    spirit.style.left = fountain.x + '%';
    spirit.style.top = (fountain.y - 12) + '%';
    spirit.hidden = false;
    await spirit.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0', offset: .45 },
      { opacity: 1, translate: '0 -4px' }], { duration: motionPreference.matches ? 180 : 1050 }).finished;
  }
  spirit.hidden = true;
  fountainRitual = false;
  if (state !== originatingScene || eventDialog.open || map.hidden) return;
  fortuneCookie.classList.remove('is-broken');
  fortuneCookie.disabled = false;
  fortuneMessage.hidden = true;
  fortuneDialog.showModal();
  fortuneCookie.focus();
}
fortuneCookie.onclick = () => {
  if (fortuneCookie.disabled) return;
  const offset = previousFortune < 0 ? 0 : 1;
  previousFortune = (Math.max(0, previousFortune) + offset + Math.floor(Math.random() * (fortunes.length - offset))) % fortunes.length;
  fortuneCookie.disabled = true;
  fortuneCookie.classList.add('is-broken');
  fortuneMessage.textContent = fortunes[previousFortune];
  fortuneMessage.hidden = false;
  fortuneDialog.querySelector('form button').focus();
};
fortuneDialog.addEventListener('close', () => map.focus({ preventScroll: true }));

let seoulWeather;
let weatherUnavailable = false;
let previousWeatherRequest = 0;
function updateVillageEnvironment() {
  const hour = Number(seoulTime.format().split(':')[0]);
  const now = Date.now();
  const current = seoulWeather?.current;
  const sunrise = Date.parse(seoulWeather?.daily?.sunrise?.[0] + '+09:00');
  const sunset = Date.parse(seoulWeather?.daily?.sunset?.[0] + '+09:00');
  const isNight = Number.isFinite(sunrise) && Number.isFinite(sunset) && seoulWeather.daily.time[0] === seoulDate.format()
    ? now < sunrise || now >= sunset
    : hour < 6 || hour >= 18;
  const code = current?.weather_code;
  const condition = code === 0 ? '맑음' : code <= 2 ? '구름 조금' : code === 3 ? '흐림'
    : code <= 48 ? '안개' : code >= 71 && code <= 77 || code === 85 || code === 86 ? '눈'
    : code >= 95 ? '뇌우' : code >= 51 ? '비' : '';
  const villageMap = document.querySelector('#village');
  villageMap.dataset.night = String(isNight);
  villageMap.dataset.weather = condition === '눈' ? 'snow' : ['비', '뇌우'].includes(condition) ? 'rain'
    : ['흐림', '안개'].includes(condition) ? 'cloud' : '';
  document.querySelector('#seoul-weather').textContent = '서울 ' + seoulTime.format() + (current
    ? ' · ' + condition + ' ' + Math.round(current.temperature_2m) + '°'
    : weatherUnavailable ? ' · 날씨 정보 없음' : '');
}
async function refreshVillageWeather() {
  if (document.hidden || Date.now() - previousWeatherRequest < 15 * 60 * 1000) return;
  previousWeatherRequest = Date.now();
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=Asia%2FSeoul&forecast_days=1', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      if (response.status === 429) previousWeatherRequest = Date.now() + 24 * 60 * 60 * 1000;
      throw new Error('Weather unavailable');
    }
    const data = await response.json();
    if (!Number.isFinite(data.current?.temperature_2m) || !Number.isInteger(data.current?.weather_code)) throw new Error('Invalid weather');
    seoulWeather = data;
  } catch {
    weatherUnavailable = true;
    seoulWeather = undefined;
  }
  updateVillageEnvironment();
}
updateVillageEnvironment();
void refreshVillageWeather();
setInterval(() => { updateVillageEnvironment(); void refreshVillageWeather(); }, 60000);

const musicButton = document.querySelector('#music');
let wantsMusic = villageSave.read().preferences.music;
let audioContext;
let musicVolume;
let noteTimer;
let noteIndex = 0;
const villageTune = [
  [48, 72], [76], [79], [], [55, 76], [74], [72], [],
  [45, 69], [72], [76], [], [52, 74], [72], [69], [],
  [41, 65], [69], [72], [], [48, 76], [74], [72], [],
  [43, 67], [71], [74], [76], [55, 74], [71], [72], []
];
function playVillageNote() {
  const notes = villageTune[noteIndex++ % villageTune.length];
  const now = audioContext.currentTime;
  for (const note of notes) {
    const pitch = 440 * 2 ** ((note - 69) / 12);
    for (const [ratio, gain, decay] of [[1, note < 60 ? .28 : .34, 1.15], [2.76, .042, .23]]) {
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      oscillator.frequency.value = pitch * ratio;
      envelope.gain.setValueAtTime(.001, now);
      envelope.gain.exponentialRampToValueAtTime(gain, now + .012);
      envelope.gain.exponentialRampToValueAtTime(.001, now + decay);
      oscillator.connect(envelope).connect(musicVolume);
      oscillator.onended = () => envelope.disconnect();
      oscillator.start(now);
      oscillator.stop(now + decay);
    }
  }
}
function showMusicState() {
  musicButton.textContent = wantsMusic ? '♪' : '🔇';
  musicButton.setAttribute('aria-label', wantsMusic ? '소리 끄기' : '소리 켜기');
  musicButton.setAttribute('aria-pressed', String(wantsMusic));
}
async function startVillageMusic() {
  if (!wantsMusic || noteTimer || !window.AudioContext) return;
  if (!audioContext) {
    audioContext = new AudioContext();
    musicVolume = audioContext.createGain();
    musicVolume.gain.value = .1;
    musicVolume.connect(audioContext.destination);
  }
  try { await audioContext.resume(); } catch { return; }
  if (!wantsMusic || noteTimer || !document.querySelector('#prologue').hidden) return;
  musicVolume.gain.value = .1;
  playVillageNote();
  noteTimer = setInterval(playVillageNote, 390);
  showMusicState();
}
function pauseVillageMusic() {
  clearInterval(noteTimer);
  noteTimer = undefined;
  if (musicVolume) musicVolume.gain.value = 0;
  showMusicState();
}
musicButton.onclick = () => {
  wantsMusic = !wantsMusic;
  villageSave.update({ preferences: { music: wantsMusic } });
  showMusicState();
  if (wantsMusic) void startVillageMusic();
  else {
    pauseVillageMusic();
    stopOpeningAudio();
  }
};
for (const type of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(type, event => {
    if (!event.target.closest?.('#music')) void startVillageMusic();
  });
}


const buildingLabels = [
  ...villageSpots.filter(spot => spot.title).map(spot => ({ spot, name: spot.title })),
  { spot: { x: 62, y: 46 }, name: '오래된 집', clearing: true }
].map(({ spot, name, clearing }) => {
  const label = document.createElement('span');
  label.className = 'building-name';
  label.hidden = true;
  label.textContent = name;
  label.style.left = spot.x + '%';
  label.style.top = (spot.y - (clearing ? 11 : 9)) + '%';
  document.querySelector('#village').append(label);
  return { spot, label, clearing: Boolean(clearing) };
});

function hideBuildingLabels() {
  for (const { label } of buildingLabels) label.hidden = true;
}
function updateNearbyBuildingLabel() {
  const atClearing = state.scene === 'clearing';
  for (const { spot, label, clearing } of buildingLabels) {
    label.hidden = inDive || state.scene === 'dock' || activeVillageInterior || inCourtyard || homeLocation !== 'front' ||
      clearing !== atClearing || distanceTo(spot) > 11;
  }
}

const guideMaps = {
  village: { title: '마을 지도', image: 'village-map.webp', points: [
    ['마을 입구', 14, 77], ['보리의 찻집', 20, 32, 'tea'], ['회관 마당', 55, 25, 'courtyard'],
    ['분수 광장', 54, 44], ['현재 위치', 54, 71], ['작은 집', 85, 65, 'cottage'],
    ['연못', 77, 81], ['폐가로 가는 길', 81, 35, 'clearing']
  ] },
  clearing: { title: '폐가 앞마당 지도', image: 'village-clearing.webp', parent: 'village', points: [
    ['광장으로 가는 길', 22, 87, 'village'], ['폐가 내부', 62, 39, 'home'], ['취미 공터', 21, 53, 'hobby']
  ] },
  home: { title: '폐가 내부 지도', image: 'village-old-home.webp', parent: 'clearing' },
  hobby: { title: '취미 공터 지도', image: 'village-hobby.webp', parent: 'clearing' },
  courtyard: { title: '회관 마당 지도', image: 'village-courtyard.webp', parent: 'village' },
  tea: { title: '보리의 찻집 지도', image: 'village-teahouse.webp', parent: 'village' },
  cottage: { title: '작은 집 지도', image: 'village-cottage.webp', parent: 'village' }
};
const guideMap = document.querySelector('#guide-map');
const guideBack = document.querySelector('#guide-back');
function showVillageGuidePage(id, focus = true) {
  const page = guideMaps[id];
  const title = document.querySelector('#guide-title');
  title.textContent = page.title;
  const image = document.createElement('img');
  image.src = id === 'clearing' ? currentHouseImage() : page.image;
  image.alt = page.title;
  guideMap.replaceChildren(image);
  for (const [text, x, y, destination] of page.points ?? []) {
    const label = document.createElement(destination ? 'button' : 'span');
    label.className = 'guide-place';
    label.textContent = text;
    label.style.left = x + '%';
    label.style.top = y + '%';
    if (destination) {
      label.type = 'button';
      label.onclick = () => showVillageGuidePage(destination);
    }
    guideMap.append(label);
  }
  guideBack.hidden = !page.parent;
  guideBack.onclick = () => showVillageGuidePage(page.parent);
  if (focus) (guideBack.hidden ? guideMap.querySelector('button') : guideBack)?.focus();
}
function openVillageGuide() {
  if (villageGuide.open) return;
  showVillageGuidePage('village', false);
  villageGuide.showModal();
}

const greetingBubble = document.createElement('span');
greetingBubble.className = 'resident-greeting';
greetingBubble.hidden = true;
greetingBubble.setAttribute('role', 'status');
document.querySelector('#village').append(greetingBubble);
const greetings = {
  lulu: ['연못은 오늘도 잔잔하네.', '해초 사이에 숨는 거 기억하지?', '안녕! 집은 좀 익숙해졌어?'],
  bori: ['안녕! 오늘도 천천히 둘러봐.', '차 한 잔 마시고 갈래?', '오늘 일정엔 낮잠도 넣어뒀어.'],
  chichi: ['어, 또 만났네! 안녕!', '이 길은 걸을 때마다 기분이 좋아.', '집은 좀 익숙해졌어?']
};
const encounters = new Map();
const chichiGreetingScenes = new Set(['clearing', 'follow-chichi', 'gate', 'return-walk', 'stay']);
const boriGreetingScenes = new Set(['find-chichi', 'follow-chichi', 'clearing', 'gate', 'return-walk', 'stay']);
let speaking;
let greetingUntil = 0;
function hideResidentGreeting() {
  speaking = undefined;
  greetingBubble.hidden = true;
}
function updateResidentGreeting(now) {
  if (document.querySelector('dialog[open]') || inDive || homeLocation !== 'front' || teaConversation) {
    hideResidentGreeting();
    return;
  }
  const inside = activeVillageInterior || inCourtyard;
  const visible = [
    { id: 'lulu', actor: lulu, element: luluElement, busy: diveProgress !== 'complete' },
    { id: 'bori', actor: inside ? bori.visit?.moved ?? bori : bori, element: boriButton, busy: teaInvitationPending() || !boriGreetingScenes.has(state.scene) },
    { id: 'chichi', actor: state.scene === 'clearing' ? { x: 31, y: 68 } : inside ? chichi.visit?.moved ?? chichi : chichi,
      element: chichiButton, busy: !chichiWaiting.hidden || !chichiGreetingScenes.has(state.scene) || !chichiGuidedHome || state.scene === 'follow-chichi' && !chichiAtPlaza }
  ];
  if (speaking && now >= greetingUntil) hideResidentGreeting();
  const eligible = [];
  for (const resident of visible) {
    const { id, actor, element, busy } = resident;
    const prior = encounters.get(id) ?? { near: false, last: -Infinity, line: -1 };
    encounters.set(id, prior);
    const distance = distanceTo(actor);
    if (element.hidden || busy || distance > 10) {
      prior.near = false;
      if (speaking === id) hideResidentGreeting();
    } else if (distance <= 7 && !prior.near) {
      prior.near = true;
      if (now - prior.last >= 8000) eligible.push({ ...resident, distance, prior });
    }
  }
  if (!speaking && eligible.length) {
    const { id, prior } = eligible.sort((a, b) => a.distance - b.distance)[0];
    const lines = greetings[id];
    const offset = 1 + Math.floor(Math.random() * (lines.length - 1));
    prior.line = (prior.line + offset) % lines.length;
    prior.last = now;
    speaking = id;
    greetingUntil = now + 2800;
    greetingBubble.textContent = lines[prior.line];
    greetingBubble.hidden = false;
  }
  if (speaking) {
    const { actor } = visible.find(resident => resident.id === speaking);
    greetingBubble.style.left = Math.min(84, Math.max(16, actor.x)) + '%';
    greetingBubble.style.top = Math.max(5, actor.y - 11) + '%';
  }
}

let activeVillageInterior = null;
let teaConversation;
const teaDialogue = document.createElement('span');
teaDialogue.className = 'resident-greeting';
teaDialogue.setAttribute('role', 'status');
teaDialogue.hidden = true;
const servedTea = document.createElement('span');
servedTea.className = 'served-tea';
servedTea.hidden = true;
servedTea.setAttribute('aria-label', '보리가 내어 준 차');
document.querySelector('#village').append(teaDialogue, servedTea);
const teaLines = [
  ['bori', '어서 와! 차 준비해 뒀어.\n코코 옆에 앉아.'],
  ['coco', '보리, 얘는 누구야?'],
  ['bori', '우리 마을에서 잠깐 지내게 됐어.\n아직 낯설 테니까 잘 부탁해, 코코.']
];
const scarfLines = [
  ['bori', '이 마을에 오기 전엔 뭐 하고 지냈어?'],
  ['player', '면접을 보러 가던 길이었어.\n그 뒤로는 기억이 잘 안 나.'],
  ['bori', '그랬구나. 코코가 분실물을 정리하고 있어.\n안내문 쓰는 걸 좀 도와줄래?'],
  ['coco', '보리, 나한테도 먼저 물어봐야지.\n…한 장 정도는 같이 써볼 수 있어.'],
  ['coco', '빨간 목도리 하나야.\n게시판에 그렇게 써 두면 되겠지?'],
  ['player', '안쪽에 생선 자수가 있네.\n이건 찾아오는 사람에게만 물어보자.'],
  ['coco', '…좋아. 그럼 안내문은 네가 붙여줄래?\n회관 옆에 게시판이 있어.']
];
function updateTeaConversation(now) {
  if (!teaConversation) return;
  const index = Math.floor((now - teaConversation.started) / 3700);
  if (index >= teaLines.length) servedTea.hidden = true;
  if (index >= teaConversation.lines.length) {
    villageSave.update({ story: { visitedTeaAfterDive: true, lostScarf: 'draft' } });
    teaConversation = undefined;
    teaDialogue.hidden = true;
    servedTea.hidden = true;
    return;
  }
  const [speaker, line] = teaConversation.lines[index];
  const actor = speaker === 'coco' ? cocoTeaSeat.cushion :
    speaker === 'player' ? activeVillageSeat?.cushion ?? position : bori.visit.moved;
  teaDialogue.style.left = Math.min(84, Math.max(16, actor.x)) + '%';
  teaDialogue.style.top = (actor.y - 13) + '%';
  if (teaDialogue.textContent !== line) teaDialogue.textContent = line;
  teaDialogue.hidden = false;
}
function teaInvitationPending() {
  return diveMastered && !villageSave.read().story.visitedTeaAfterDive;
}
let boriTeaDeparture;
function updateBoriTeaInvitation(now, elapsed) {
  const hint = document.querySelector('#bori-hint');
  if (bori.visit?.door.id === 'tea-house') {
    boriButton.hidden = true;
    hint.hidden = true;
    return;
  }
  if (diveDialog.open) { hint.hidden = true; return; }
  const door = villageSpots.find(spot => spot.id === 'tea-house');
  boriButton.hidden = false;
  if (boriTeaDeparture === undefined) {
    boriTeaDeparture = now + 2600;
    bori.visit = null;
    bori.visitDoor = null;
    bori.route = findRoute(door, bori);
  }
  const walking = now >= boriTeaDeparture;
  hint.hidden = walking;
  hint.textContent = '찻집에서 차 마시러 올래?\n찻집에서 만나!';
  moveResident(bori, boriButton, boriContext, 'bori', now, elapsed, walking, 24);
  if (walking && !bori.route.length) {
    bori.visit = { door, until: Infinity, moved: { x: 50, y: 58 } };
    boriButton.hidden = true;
  }
}
const villageInteriorExit = { x: 50, y: 89 };
const villageInteriorExitButton = document.querySelector('#village-interior-exit');
villageInteriorExitButton.style.left = villageInteriorExit.x + '%';
villageInteriorExitButton.style.top = villageInteriorExit.y + '%';
villageInteriorExitButton.onclick = () => walkTo(villageInteriorExit);
function setVillageInterior(room) {
  standFromVillageSeat();
  const door = villageSpots.find(spot => spot.id === (room ?? activeVillageInterior));
  activeVillageInterior = room;
  teaConversation = undefined;
  teaDialogue.hidden = true;
  servedTea.hidden = true;
  if (room === 'tea-house' && diveMastered && !villageSave.read().story.lostScarf) {
    const welcome = teaInvitationPending();
    const now = performance.now();
    bori.route = [];
    const lines = welcome ? [...teaLines, ...scarfLines] : scarfLines;
    bori.visit = { door, until: now + lines.length * 3700 + 8000, moved: { x: 60, y: 49 } };
    teaConversation = { started: now, lines };
    servedTea.hidden = !welcome;
  }
  keys.clear();
  route = [];
  target = null;
  position = room ? { x: 50, y: room === 'tea-house' ? 82 : 81 }
    : { x: door.x, y: door.y + 2 };
  render();
  map.focus({ preventScroll: true });
}
function walkableVillageInterior({ x, y }) {
  if (activeVillageInterior === 'cottage') return walkableCottage({ x, y });
  if (y >= 70) return x >= 39 && x <= 61;
  if (x < 8 || x > 92 || y < 40) return false;
  const leftTable = x >= 12 && x <= 37 && y >= 47 && y <= 64;
  const rightTable = x >= 63 && x <= 88 && y >= 47 && y <= 64;
  return !leftTable && !rightTable;
}

function walkableCottage({ x, y }) {
  if (y >= 76) return x >= 39 && x <= 60;
  if (x < 11 || x > 89 || y < 35) return false;
  const desk = x >= 13 && x <= 41 && y >= 43 && y <= 69;
  const chest = x >= 68 && x <= 89 && y >= 42 && y <= 67;
  const bedding = x >= 56 && x <= 79 && y <= 39;
  return !desk && !chest && !bedding;
}

let chichiGuidedHome = villageSave.read().story.chichiGuided;
function markChichiGuided(done) {
  chichiGuidedHome = done;
  villageSave.update({ story: { chichiGuided: done } });
}

const seatsByBuilding = {
  'tea-house': [
    { x: 10, y: 55, cushion: { x: 15, y: 56 } },
    { x: 39, y: 55, cushion: { x: 34, y: 56 } },
    { x: 21, y: 67, cushion: { x: 21, y: 64 } },
    { x: 28, y: 67, cushion: { x: 28, y: 64 } },
    { x: 61, y: 55, cushion: { x: 66, y: 56 } },
    { x: 90, y: 55, cushion: { x: 85, y: 56 } },
    { x: 72, y: 67, cushion: { x: 72, y: 64 } },
    { x: 79, y: 67, cushion: { x: 79, y: 64 } }
  ],
  cottage: [
    { x: 11, y: 57, cushion: { x: 14, y: 58 } },
    { x: 44, y: 57, cushion: { x: 38, y: 58 } },
    { x: 28, y: 41, cushion: { x: 28, y: 47 } },
    { x: 27, y: 72, cushion: { x: 27, y: 68 } }
  ]
};
const villageSeatPanel = document.querySelector('#village-seats');
const cocoTeaSeat = seatsByBuilding['tea-house'][4];
function availableVillageSeats() {
  return (seatsByBuilding[activeVillageInterior] ?? []).filter(seat =>
    !(activeVillageInterior === 'tea-house' && diveMastered && seat === cocoTeaSeat));
}
let activeVillageSeat;
function renderVillageSeats() {
  villageSeatPanel.replaceChildren();
  const seats = seatsByBuilding[activeVillageInterior];
  villageSeatPanel.hidden = !seats;
  for (const seat of availableVillageSeats()) {
    const button = document.createElement('button');
    button.className = 'village-seat';
    button.type = 'button';
    button.setAttribute('aria-label', activeVillageInterior === 'tea-house' && diveMastered &&
      seat === seatsByBuilding['tea-house'][6] ? '코코 옆에 앉기' : '방석에 앉기');
    button.style.left = seat.cushion.x + '%';
    button.style.top = seat.cushion.y + '%';
    button.onclick = () => {
      if (activeVillageSeat) standFromVillageSeat();
      else if (distanceTo(seat) <= 5) sitOnVillageSeat(seat);
      else walkTo(seat);
    };
    villageSeatPanel.append(button);
  }
}
function standFromVillageSeat() {
  activeVillageSeat = undefined;
}
function sitOnVillageSeat(seat) {
  keys.clear();
  route = [];
  target = null;
  activeVillageSeat = seat;
}
function useVillageSeat() {
  if (activeVillageSeat) {
    standFromVillageSeat();
    return true;
  }
  const seat = availableVillageSeats()
    .filter(candidate => distanceTo(candidate) <= 5)
    .sort((a, b) => distanceTo(a) - distanceTo(b))[0];
  if (!seat) return false;
  sitOnVillageSeat(seat);
  return true;
}
function finishSeatApproach() {
  if (availableVillageSeats().includes(target) && distanceTo(target) <= 2.8) {
    sitOnVillageSeat(target);
    return true;
  }
  return false;
}

const roomVisits = {
  'tea-house': { entrance: { x: 50, y: 76 }, points: [{ x: 50, y: 46 }, { x: 40, y: 60 }, { x: 61, y: 66 }] },
  cottage: { entrance: { x: 50, y: 76 }, points: [{ x: 49, y: 46 }, { x: 60, y: 58 }, { x: 51, y: 69 }] },
  'town-hall': { entrance: { x: 50, y: 39 }, points: [{ x: 25, y: 70 }, { x: 43, y: 61 }, { x: 47, y: 40 }] }
};
function restoreResidentToVillage(actor, now) {
  if (!actor.visit) return;
  const { door } = actor.visit;
  Object.assign(actor, { x: door.x, y: door.y + 2, route: [], visit: null, nextVisit: now + 15000 + Math.random() * 15000 });
}
function walkVillageResident(actor, element, context, id, now, elapsed, pause) {
  const boriAvailable = id !== 'bori' || boriGreetingScenes.has(state.scene);
  const ready = boriAvailable && !pause;
  if (!boriAvailable && actor.visitDoor) { actor.visitDoor = null; actor.route = []; }
  if (actor.visit && (!boriAvailable || now >= actor.visit.until)) restoreResidentToVillage(actor, now);
  element.hidden = Boolean(actor.visit);
  if (actor.visit) return;
  actor.nextVisit ??= now + (id === 'coco' ? 7500 : 14000) + Math.random() * 6000;
  if (ready && now >= actor.nextVisit && !actor.visitDoor) {
    const choices = villageSpots.filter(spot => Object.hasOwn(roomVisits, spot.id));
    actor.visitDoor = choices[Math.floor(Math.random() * choices.length)];
    actor.route = findRoute(actor.visitDoor, { x: actor.x, y: actor.y });
  }
  if (actor.visitDoor && ready) {
    moveResident(actor, element, context, id, now, elapsed, true, 14);
    if (!actor.route.length) {
      const door = actor.visitDoor;
      actor.visitDoor = null;
      const inside = roomVisits[door.id];
      actor.visit = { door, until: now + 11000 + Math.random() * 9000, moved: { ...inside.entrance } };
      element.hidden = true;
    }
  } else {
    stroll(actor, element, context, id, now, elapsed, pause);
  }
}
function updateVisitingResidents(now, elapsed) {
  const room = inCourtyard ? 'town-hall' : activeVillageInterior;
  const options = roomVisits[room];
  for (const [id, actor, element, context, eligible] of [
    ['coco', coco, cocoSprite, cocoContext, true],
    ['lulu', lulu, luluElement, luluContext, diveProgress === 'complete'],
    ['bori', bori, boriButton, boriContext, boriGreetingScenes.has(state.scene)],
    ['chichi', chichi, chichiButton, chichiContext, chichiAtPlaza]
  ]) {
    if (id === 'coco' && room === 'tea-house' && diveMastered) {
      element.hidden = false;
      element.style.left = cocoTeaSeat.cushion.x + '%';
      element.style.top = cocoTeaSeat.cushion.y + '%';
      drawVillageSprite(context, id, 'sitting', -1, now);
      continue;
    }
    const visit = actor.visit;
    element.hidden = !eligible || !visit || visit.door.id !== room;
    if (element.hidden) continue;
    if (id === 'bori' && teaConversation) {
      moveResident(visit.moved, element, context, id, now, elapsed, false);
      continue;
    }
    if (now < visit.until) {
      stroll(visit.moved, element, context, id, now, elapsed, false, options.points);
    } else {
      if (!visit.leaving) {
        visit.leaving = true;
        visit.moved.route = findRoute(options.entrance, { x: visit.moved.x, y: visit.moved.y });
      }
      moveResident(visit.moved, element, context, id, now, elapsed, true, 14);
      if (!visit.moved.route.length) {
        restoreResidentToVillage(actor, now);
        element.hidden = true;
      }
    }
  }
  updateTeaConversation(now);
}
