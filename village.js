const map = document.querySelector('#village');
const departure = document.querySelector('#departure');
const dock = { x: 43, y: 56 };
const exit = { x: 14, y: 91 };
const prologue = document.querySelector('#prologue');
const replay = document.querySelector('#replay-prologue');
const skipPrologue = document.querySelector('#skip-prologue');
const courtyardExit = { x: 50, y: 32 };
let inCourtyard = false;
const heading = document.querySelector('#scene-title');
const story = document.querySelector('#story');
const choices = document.querySelector('#choices');
const eventDialog = document.querySelector('#village-event');
const dialogue = document.querySelector('#scene-dialogue');
const player = document.querySelector('#player');
const playerContext = player.getContext('2d');
const saveNote = document.querySelector('#save-note');
document.addEventListener('village-save-status', event => {
  saveNote.hidden = event.detail.ok;
  saveNote.textContent = event.detail.unsupported ? '이 저장은 다른 버전에서 만들어졌어요.' : '이 브라우저에서는 진행을 저장할 수 없어요.';
});
const start = { x: 14, y: 91 };
const plaza = { x: 65, y: 54 };
const plazaLabel = document.querySelector('#plaza');
const bori = { x: 88, y: 47 };
const coco = { x: 69, y: 49 };
const chichiStart = { x: 64, y: 58 };
const clearingEntrance = { x: 94, y: 25 };
const clearingReturn = { x: 92, y: 30 };
const chichi = { ...chichiStart };
const chichiButton = document.querySelector('#chichi');
let chichiInvitationUntil = 0;
let chichiSaveHintUntil = 0;
const chichiWaiting = document.querySelector('#chichi-waiting');
const chichiContext = chichiButton.querySelector('canvas').getContext('2d');
const teaPatch = { x: 45, y: 61 };
const teaButton = document.querySelector('#tea-patch');
const boriScenes = ['arrival', 'tea-return'];
let returnedFromClearing = false;
let state = { scene: 0, party: null };
let position = { ...start };
let target = null;
let route = [];
let direction = 1;
let lastFrame = 0;
const keys = new Set();
const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

function go(scene, party = state.party, guideFromHere = false) {
  const previousScene = state.scene;
  const returningFromClearing = previousScene === 'clearing' && scene === 'follow-chichi';
  standFromVillageSeat();
  wakeVillagePlayer();
  state = { scene, party };
  {
    if (scene === 0 || scene === 'find-chichi') {
      returnedFromClearing = false;
      villageSave.update({ story: { returnedFromClearing } });
    }
    if (scene === 0) { setChichiAtPlaza(false); markChichiGuided(false); resetDive(); }
    if (returningFromClearing) {
      returnedFromClearing = true;
      villageSave.update({ story: { returnedFromClearing } });
      setChichiAtPlaza(true);
      chichi.route = [];
    }
    if (scene === 'follow-chichi' && returnedFromClearing && !chichiAtPlaza) setChichiAtPlaza(true);
    if (scene === 'clearing') markChichiGuided(true);
    if (scene === 'find-chichi') setChichiAtPlaza(false);
    villageSave.update({ story: state });
  }

  homeLocation = 'front';
  activeVillageInterior = null;
  inDive = false;
  if (scene !== 'tea-return') inCourtyard = false;
  target = null;
  route = [];
  keys.clear();
  if (scene === 0 || scene === 'arrival') position = { ...start };
  if (scene === 'return-walk') position = { ...plaza };
  if (scene === 'find-chichi') {
    Object.assign(chichi, chichiStart, { route: [] });
  }
  if (scene === 'follow-chichi' && !returnedFromClearing && !chichiAtPlaza && previousScene !== 'clearing') {
    if (!guideFromHere && previousScene !== 'find-chichi') {
      Object.assign(chichi, chichiStart);
      position = { x: 62, y: 63 };
    }
    startChichiGuide();
  }
  if (scene === 'follow-chichi' && returnedFromClearing) {
    position = { ...clearingReturn };
    prepareLuluDiveGuide(returningFromClearing);
  }
  if (scene === 'clearing') {
    position = { x: 17, y: 85 };
    if (previousScene === 'follow-chichi' && !returnedFromClearing) chichiSaveHintUntil = performance.now() + 12000;
  }
  if (scene === 'dock') position = { x: 15, y: 78 };
  render();
  const focusTarget = eventDialog.open ? dialogChoices(eventDialog)[0] :
    ['arrival', 'find-chichi', 'follow-chichi', 'clearing', 'return-walk', 'dock'].includes(scene) ? map : heading;
  focusTarget?.focus({ preventScroll: true });
}
function write(title, line, speaker = '', speech = '') {
  heading.textContent = title;
  story.textContent = line;
  story.hidden = !line;
  document.querySelector('#speech').hidden = !speaker;
  document.querySelector('#speaker').textContent = speaker;
  document.querySelector('#speech-line').textContent = speech;
}
function option(label, action) {
  const button = document.createElement('button');
  button.textContent = label;
  button.type = 'button';
  button.onclick = action;
  choices.append(button);
}
function render() {
  const { scene, party } = state;
  const isOpening = Number.isInteger(scene);
  prologue.hidden = !isOpening;
  replay.hidden = isOpening || inDive || scene === 'return';
  skipPrologue.hidden = !isOpening;
  document.querySelector('#chapter').textContent = '플레이 시안 · ' + (isOpening ? '프롤로그' : scene === 'stay' ? '새로운 계절' : '마을 이야기');
  departure.hidden = scene !== 'return';
  dialogue.hidden = isOpening || scene === 'return';
  const atDock = scene === 'dock';
  const atClearing = scene === 'clearing';
  map.classList.toggle('dock-map', atDock);
  renderHomeLocation(atClearing);
  map.classList.toggle('courtyard-map', inCourtyard);
  map.classList.toggle('tea-house-map', activeVillageInterior === 'tea-house');
  map.classList.toggle('cottage-map', activeVillageInterior === 'cottage');
  villageInteriorExitButton.hidden = !activeVillageInterior;
  document.querySelector('#courtyard-exit').hidden = !inCourtyard;
  chichiButton.hidden = activeVillageInterior || inCourtyard || atDock || (chichiAtPlaza ? atClearing :
    homeLocation !== 'front' || !['find-chichi', 'follow-chichi', 'clearing'].includes(scene));
  hideBuildingLabels();
  hideResidentGreeting();
  renderVillageSeats();
  chichiWaiting.hidden = true;
  document.querySelector('#boarding').hidden = !atDock;
  document.querySelector('#village-exit').hidden = scene !== 'return-walk';
  for (const id of ['bori', 'coco']) document.querySelector('#' + id).hidden = atDock || atClearing || inCourtyard || activeVillageInterior;
  document.querySelector('#coco-name').hidden = !diveMastered;
  map.hidden = isOpening || scene === 'return';
  updateVillageEnvironment();
  choices.replaceChildren();
  teaButton.hidden = scene !== 'tea-pick' || !inCourtyard;
  const boriHint = document.querySelector('#bori-hint');
  boriHint.hidden = activeVillageInterior || inCourtyard || !['introduction', 'tea-pick'].includes(scene);
  boriHint.textContent = scene === 'introduction' ? '어? 처음 보는 얼굴이네. 넌 누구야?' : '회관 마당에 밭이 있어. 밭 앞 나무에서 따면 돼~';
  updateBoriHint(bori);
  dialogue.classList.toggle('answers-only', scene === 'introduction');
  updateVillageSpots(atDock || atClearing || inCourtyard || Boolean(activeVillageInterior) || inDive);
  renderDiveArea();
  const isEvent = ['introduction', 'tea-request', 'welcome', 'morning', 'gate'].includes(scene);
  if (isEvent) {
    if (!eventDialog.contains(dialogue)) eventDialog.append(dialogue);
    if (!eventDialog.open) eventDialog.showModal();
  } else if (eventDialog.contains(dialogue)) {
    eventDialog.close();
    map.after(dialogue);
  }
  if (isOpening) {
    playOpening();
  } else if (inDive) {
    writeDiveStatus();
  } else if (activeVillageInterior) {
    write(activeVillageInterior === 'tea-house' ? '보리의 찻집' : '작은 집', '아래쪽 출입문으로 걸어가면 마을로 돌아가요.');
  } else if (scene === 'arrival') {
    write('마을에 도착했다', '방향키·터치로 이동해요.', diveMastered ? '코코' : '낯선 고양이', '광장에서 보리를 만나 봐요.');
    option('불러오기', () => openSaveSlots('load'));
    option('새 게임', () => openSaveSlots('new'));
  } else if (scene === 'introduction') {
    write('보리에게 답하기', '');
    option('A. 나는 인간이야. 여기는 어디야?', () => go('tea-request', 'honest'));
    option('B. 나도 잘 모르겠어. 눈 떠 보니 여기였어.', () => go('tea-request', 'lost'));
    option('C. 고양이인 척하면 믿어줄래?', () => go('tea-request', 'joke'));
  } else if (scene === 'tea-request') {
    write('환영회에 쓸 찻잎', '', '보리', ({ honest: '인간은 처음 만나 봐!', lost: '놀랐겠다. 여기선 천천히 둘러봐도 돼.', joke: '수염부터 그려 와야 믿어주지!' }[party] || '처음 왔구나!') + '\n환영회에서 차를 끓이려고 해.\n밭 앞 나무에서 찻잎 한 줌만 따다 줄래?');
    option('찻잎 따러 가기', () => go('tea-pick'));
  } else if (scene === 'tea-pick') {
    write('찻잎 따기', inCourtyard ? '밭 앞 나무에 달린 찻잎을 누르거나 가까이에서 D를 누르세요.' : '회관 앞에서 D를 누르면 밭이 있는 마당으로 들어가요.');
  } else if (scene === 'tea-return') {
    write('찻잎을 땄어요', inCourtyard ? '마당 위쪽의 회관 문으로 나가면 광장으로 돌아가요.' : '찻잎을 가지고 광장의 보리에게 돌아가세요.');
  } else if (scene === 'welcome') {
    write('낮잠 자리가 꽉 찼어요', '', '보리', '찻잎 고마워요! 이제 차를 끓일 수 있겠어요.\n환영회는 언제 열까요?');
    option('오늘 저녁, 달빛 아래에서', () => go('morning', 'moon'));
    option('내일 아침, 찻집에서', () => go('morning', 'morning'));
  } else if (scene === 'morning') {
    write(party === 'moon' ? '달빛 아래 첫 친구' : '따뜻한 차 한 잔', '', party === 'moon' ? '루루' : '보리', party === 'moon'
      ? '밤에 나오는 주민도 있거든요. 저처럼요. 다음 달에도 이 시간에 모일까요?'
      : '인간 손님은 처음이라 사람이 마시는 차를 우려봤어요. 내일도 같은 걸로 준비할까요?');
    option('보리와 이야기하기', () => go('find-chichi'));
  } else if (scene === 'find-chichi') {
    write('오늘 밤 잘 곳', '광장 뒤쪽에서 치치를 찾아보세요.', '보리', '벌써 늦었네.\n치치한테 가면 오늘 잘 곳을 알려줄 거야.');
  } else if (scene === 'follow-chichi') {
    if (returnedFromClearing) write('마을 광장', '광장에서 이어지는 흙길을 따라가면 폐가로 돌아갈 수 있어요.');
    else write('치치를 따라가기', '');
  } else if (atClearing && homeLocation !== 'front') {
    writeHomeLocation();
  } else if (atClearing) {
    write('마을 뒤편 빈 터', '현관 앞에서 D를 누르면 집에 들어가고, 공구 창고 앞에서는 수리 현황을 볼 수 있어요. 처음 들어온 입구 아래쪽으로 가면 광장이에요.', chichiAtPlaza ? '' : '치치', chichiAtPlaza ? '' : '여기야. 오늘은 여기서 쉬어도 돼.\n문 오른쪽에 공구 창고가 있어. 집을 손보고 싶으면 거기서 시작해.');
    option('며칠 뒤, 마을 문으로', () => go('gate'));
  } else if (scene === 'gate') {
    write('문 너머의 목소리', '병실에서 들었던 목소리가 문 너머에서 들려온다. 첫날 만난 고양이가 등불을 들고 기다리고 있다.', diveMastered ? '코코' : '낯선 고양이', '어디로 가든,\n같이 보낸 날들은 기억할게요.');
    option('현실로 돌아가 취업 준비를 이어간다', () => go('return-walk'));
    option('고양이 마을에 남는다', () => go('stay'));
  } else if (scene === 'return-walk') {
    write('마을 문으로', '마을 입구를 지나 선착장으로 가세요.', diveMastered ? '코코' : '낯선 고양이', '마을 밖 선착장에 배가 기다리고 있어요.');
  } else if (atDock) {
    write('선착장', '배까지 걸어가거나 배 타기를 누르세요.');
  } else if (scene === 'return') {
    departure.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 0; });
  } else {
    write('오늘부터 이곳의 주민', '광장 게시판에 처음으로 내 이름을 붙였다. ' +
      (party === 'moon' ? '루루가 다음 달빛 모임 날짜를 적었다.' : '보리가 찻집에 내 자리를 하나 남겨뒀다.'));
    option('처음부터 다시 보기', () => go(0, null));
  }
}

const villageObstacles = [
  [[4, 84], [8, 84], [8, 90], [4, 90]],
  [[18, 83], [30, 84], [30, 91], [18, 90]],
  [[5, 17], [33, 13], [34, 35], [26, 38], [6, 39]],
  [[42, 7], [71, 7], [70, 28], [64, 31], [46, 31], [43, 27]],
  [[83, 51], [95, 51], [97, 62], [94, 65], [84, 64]],
  [[51, 49], [58, 49], [60, 53], [60, 57], [57, 59], [50, 58], [48, 55], [49, 51]],
  [[65, 79], [70, 74], [77, 72], [84, 74], [88, 83], [85, 90], [76, 92], [68, 88]],
  [[72, 65], [76, 65], [76, 71], [72, 71]]
];
function insideObstacle(point, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [ax, ay] = vertices[i], [bx, by] = vertices[j];
    if ((ay > point.y) !== (by > point.y) && point.x < (bx - ax) * (point.y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
const clearingObstacles = [
  [[80, 26], [92, 26], [92, 40], [89, 42], [80, 41]],
  [[35, 7], [82, 7], [79, 40], [66, 43], [37, 42]],
  [[19, 28], [26, 28], [27, 38], [19, 39]],
  [[10, 36], [17, 36], [18, 44], [10, 44]],
  [[66, 49], [72, 49], [72, 54], [66, 54]],
  [[71, 73], [79, 73], [79, 83], [71, 83]],
  [[87, 67], [95, 67], [96, 85], [86, 85]]
];
const dockPaths = [[[15, 78], [28, 65], [43, 56]]];

function nearPath(point, path, radius) {
  return path.slice(1).some(([bx, by], index) => {
    const [ax, ay] = path[index];
    const dx = bx - ax, dy = by - ay;
    const progress = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - ax - dx * progress, point.y - ay - dy * progress) <= radius;
  });
}
const courtyardObstacles = [
  [[7, 6], [95, 6], [95, 30], [7, 30]],
  [[60, 33], [98, 33], [98, 74], [56, 74]],
  [[45, 66], [52, 63], [55, 74], [44, 74]]
];
function setVillageCourtyard(inside) {
  inCourtyard = inside;
  target = null;
  route = [];
  keys.clear();
  position = inside ? { x: 50, y: 39 } : { x: 56, y: 35 };
  render();
  map.focus({ preventScroll: true });
}
function walkable(point) {
  const { x, y } = point;
  const maxY = activeVillageInterior || inCourtyard || inDive || ['dock', 'clearing'].includes(state.scene) ? 92 : 94;
  if (x < 6 || x > 94 || y < 17 || y > maxY) return false;
  if (inDive) return true;
  if (activeVillageInterior) return walkableVillageInterior(point);
  if (inCourtyard) return !courtyardObstacles.some(vertices => insideObstacle(point, vertices));
  if (state.scene === 'clearing') return walkableHomeArea(point);
  if (state.scene === 'dock') return dockPaths.some(path => nearPath(point, path, 5));
  return !villageObstacles.some(vertices => insideObstacle(point, vertices));
}
function findRoute(destination, startPoint = position) {
  const queue = [{ point: startPoint, previous: null }];
  const visited = new Set();
  let nearest = queue[0];
  const distance = point => Math.hypot(point.x - destination.x, point.y - destination.y);
  const steps = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index];
    if (distance(node.point) < distance(nearest.point)) nearest = node;
    if (distance(nearest.point) < 1.5) break;
    for (const [dx, dy] of steps) {
      const point = { x: node.point.x + dx, y: node.point.y + dy };
      const key = Math.round(point.x) + ':' + Math.round(point.y);
      const middle = { x: point.x - dx / 2, y: point.y - dy / 2 };
      if (visited.has(key) || !walkable(point) || !walkable(middle)) continue;
      visited.add(key);
      queue.push({ point, previous: node });
    }
  }
  const points = [];
  for (let node = nearest; node.previous; node = node.previous) points.push(node.point);
  points.reverse();
  const simplified = [];
  let origin = startPoint;
  while (points.length) {
    let farthest = 0;
    for (let index = 1; index < points.length; index++) {
      const point = points[index];
      const samples = Math.ceil(Math.hypot(point.x - origin.x, point.y - origin.y) * 2);
      const clear = Array.from({ length: samples }, (_, sample) => (sample + 1) / samples)
        .every(t => walkable({ x: origin.x + (point.x - origin.x) * t, y: origin.y + (point.y - origin.y) * t }));
      if (!clear) break;
      farthest = index;
    }
    [origin] = points.splice(farthest, 1);
    points.splice(0, farthest);
    simplified.push(origin);
  }
  return simplified;
}
function walkTo(destination) {
  if (inDive) leaveKelp();
  standFromVillageSeat();
  wakeVillagePlayer();
  target = destination;
  route = findRoute(destination);
}
const strollPoints = [
  { x: 26, y: 42 }, { x: 37, y: 56 }, { x: 52, y: 51 }, { x: 58, y: 34 },
  { x: 71, y: 50 }, { x: 86, y: 47 }, { x: 87, y: 29 }, { x: 72, y: 62 }
];
function startChichiGuide() {
  const destinations = [{ x: 73, y: 52 }, { x: 83, y: 45 }, { x: 89, y: 37 }, { x: 88, y: 29 }, clearingEntrance];
  chichi.route = [];
  let from = { x: chichi.x, y: chichi.y };
  for (const destination of destinations) {
    const segment = findRoute(destination, from);
    chichi.route.push(...segment);
    from = segment.at(-1) ?? from;
  }
}

function stroll(actor, element, context, id, now, elapsed, pause, points = strollPoints) {
  if (!pause && !motionPreference.matches && !actor.route?.length && now >= (actor.waitUntil ?? 0)) {
    const choices = points.filter(point => Math.hypot(point.x - actor.x, point.y - actor.y) >= 7);
    if (choices.length) actor.route = findRoute(choices[Math.floor(Math.random() * choices.length)], { x: actor.x, y: actor.y });
    actor.waitUntil = now + 600 + Math.random() * 1800;
  }
  moveResident(actor, element, context, id, now, elapsed, !pause && !motionPreference.matches);
}
function moveResident(actor, element, context, id, now, elapsed, walking, speed = 10) {
  const next = walking ? actor.route?.[0] : undefined;
  if (next) {
    const dx = next.x - actor.x, dy = next.y - actor.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.min(distance, elapsed * speed);
    if (distance <= step || distance < .05) {
      actor.x = next.x;
      actor.y = next.y;
      actor.route.shift();
      if (!actor.route.length) actor.waitUntil = now + 650 + Math.random() * 1800;
    } else {
      actor.x += dx / distance * step;
      actor.y += dy / distance * step;
    }
    if (dx) actor.direction = Math.sign(dx);
  }
  element.style.left = actor.x + '%';
  element.style.top = actor.y + '%';
  drawVillageSprite(context, id, next ? 'walking' : 'idle', actor.direction ?? 1, now);
}

function tick(now) {
  requestAnimationFrame(tick);
  const elapsed = Math.min(now - lastFrame, 40) / 1000;
  lastFrame = now;
  if (map.hidden || fountainRitual || document.querySelector('dialog[open]')) return;
  if (inDive) {
    updateDiveMotion(elapsed);
  } else if (state.scene === 'clearing' && homeLocation === 'front' && !chichiAtPlaza) {
    chichiButton.style.left = '31%';
    chichiButton.style.top = '68%';
    drawVillageSprite(chichiContext, 'chichi', 'idle', 1, now);
    chichiWaiting.hidden = now >= chichiSaveHintUntil;
    if (!chichiWaiting.hidden) {
      chichiWaiting.textContent = '침대에서 저장해 둬! 저장하지 않은 진행은 게임을 닫으면 사라져.';
      chichiWaiting.style.left = '31%';
      chichiWaiting.style.top = '55%';
    }
  } else if (activeVillageInterior || inCourtyard) {
    updateVisitingResidents(now, elapsed);
  } else if (!['dock', 'clearing'].includes(state.scene)) {
    if (chichiAtPlaza) walkVillageResident(chichi, chichiButton, chichiContext, 'chichi', now, elapsed, target === chichi);
    else if (!chichiButton.hidden) {
      const guiding = state.scene === 'follow-chichi' && Boolean(chichi.route?.length);
      moveResident(chichi, chichiButton, chichiContext, 'chichi', now, elapsed,
        guiding && distanceTo(chichi) <= 13, 17);
      const waiting = guiding && distanceTo(chichi) > 13;
      const inviting = guiding && now < chichiInvitationUntil;
      chichiWaiting.hidden = !waiting && !inviting;
      const guideLine = waiting ? '빨리 와!' : '나랑 같이 가자!';
      if (!chichiWaiting.hidden && chichiWaiting.textContent !== guideLine) chichiWaiting.textContent = guideLine;
      if (!chichiWaiting.hidden) {
        chichiWaiting.style.left = Math.min(90, chichi.x) + '%';
        chichiWaiting.style.top = (chichi.y - 11) + '%';
      }
    }
    if (afterLuluHomeGuide()) updateLuluDiveGuide(now, elapsed);
    walkVillageResident(coco, cocoSprite, cocoContext, 'coco', now, elapsed, false);
    updateNewResidents(now, elapsed);
    if (teaInvitationPending()) updateBoriTeaInvitation(now, elapsed);
    else {
      walkVillageResident(bori, boriButton, boriContext, 'bori', now, elapsed, target === bori || distanceTo(bori) < 10 || state.scene === 'tea-pick');
    }
    updateBoriHint(bori);
  }
  let dx = 0;
  let dy = 0;
  for (const key of keys) {
    dx += arrows[key][0];
    dy += arrows[key][1];
  }
  while (route.length && distanceTo(route[0]) < .06) route.shift();
  const waypoint = route[0];
  if (waypoint && !keys.size) {
    dx = waypoint.x - position.x;
    dy = waypoint.y - position.y;
  }
  const distance = Math.hypot(dx, dy);
  if (distance > 0) {
    const step = target && !keys.size ? Math.min(distance, elapsed * 39) : elapsed * 39;
    const nextX = waypoint && distance <= step ? waypoint.x : position.x + dx / distance * step;
    const nextY = waypoint && distance <= step ? waypoint.y : position.y + dy / distance * step;
    if (walkable({ x: nextX, y: nextY })) position = { x: nextX, y: nextY };
    else if (walkable({ x: nextX, y: position.y })) position.x = nextX;
    else if (walkable({ x: position.x, y: nextY })) position.y = nextY;
    if (dx) direction = Math.sign(dx);
    if (waypoint && distance <= step) route.shift();
  }
  updateNearbyBuildingLabel();
  plazaLabel.hidden = inDive || activeVillageInterior || inCourtyard || ['dock', 'clearing'].includes(state.scene) || distanceTo(plaza) > 17;
  const drawnPosition = inDive && hiddenInKelp ? { x: 57, y: 69 } : activeVillageSeat?.cushion ?? position;
  player.style.left = drawnPosition.x + '%';
  player.style.top = drawnPosition.y + '%';
  drawVillageSprite(playerContext, inDive ? 'diver' : 'manager', activeVillageSeat ? 'sitting' : distance && !motionPreference.matches ? 'walking' : 'idle', direction, now);
  if (finishSeatApproach()) return;
  if (inDive) { finishDiveApproach(); return; }
  if (finishPondApproach()) return;
  if (activeVillageInterior) {
    if (distanceTo(villageInteriorExit) <= 3) setVillageInterior(null);
    else updateResidentGreeting(now);
    if (!route.length) target = null;
    return;
  }
  if (inCourtyard) {
    if (state.scene === 'tea-pick' && target === teaPatch && distanceTo(teaPatch) <= 3) go('tea-return');
    if (distanceTo(courtyardExit) <= 2.8) setVillageCourtyard(false);
    else updateResidentGreeting(now);
    if (!route.length) target = null;
    return;
  }
  if (state.scene === 'clearing' && updateHomeTravel()) return;
  if (state.scene === 'clearing' && homeLocation === 'front' && position.x < 29 && position.y >= 90) {
    go('follow-chichi');
    return;
  }
  if (canAskChichiForGuide() && distanceTo(chichi) <= 5) beginChichiGuide();
  if (state.scene === 'follow-chichi' && distanceTo(clearingEntrance) <= 4 &&
      (chichiAtPlaza || !chichi.route?.length || Math.hypot(chichi.x - clearingEntrance.x, chichi.y - clearingEntrance.y) < 5)) go('clearing');
  if (state.scene === 'return-walk' && distanceTo(exit) < 5) go('dock');
  if (state.scene === 'dock' && distanceTo(dock) < 5) go('return');
  if (boriScenes.includes(state.scene) && distanceTo(bori) <= 5) talkToBori();
  if (target && !route.length) {
    activateVillageSpot(target);
    target = null;
  }
  updateResidentGreeting(now);
}
map.addEventListener('pointerup', event => {
  if (fountainRitual || !event.isPrimary || event.target.closest('button')) return;
  const bounds = map.getBoundingClientRect();
  walkTo({ x: Math.min(94, Math.max(6, (event.clientX - bounds.left) / bounds.width * 100)),
    y: Math.min(94, Math.max(17, (event.clientY - bounds.top) / bounds.height * 100)) });
});
function distanceTo(point) {
  return Math.hypot(position.x - point.x, position.y - point.y);
}
function talkToBori() {
  go(state.scene === 'tea-return' ? 'welcome' : 'introduction');
}
teaButton.style.left = teaPatch.x + '%';
teaButton.style.top = teaPatch.y + '%';
teaButton.onclick = () => walkTo(teaPatch);
const courtyardExitButton = document.querySelector('#courtyard-exit');
courtyardExitButton.style.left = courtyardExit.x + '%';
courtyardExitButton.style.top = courtyardExit.y + '%';
courtyardExitButton.onclick = () => walkTo(courtyardExit);
const boriButton = document.querySelector('#bori');
boriButton.style.left = bori.x + '%';
boriButton.style.top = bori.y + '%';
boriButton.onclick = () => walkTo(bori);
document.querySelector('#village-exit').onclick = () => walkTo(exit);
function canAskChichiForGuide() {
  return state.scene === 'find-chichi' && !returnedFromClearing;
}
function beginChichiGuide() {
  setChichiAtPlaza(false);
  go('follow-chichi', state.party, true);
  chichiInvitationUntil = performance.now() + 2600;
}
chichiButton.onclick = () => {
  if (canAskChichiForGuide() && distanceTo(chichi) <= 9) beginChichiGuide();
  else if (canAskChichiForGuide() || state.scene === 'follow-chichi' && !returnedFromClearing) walkTo(chichi);
};
document.querySelector('#boarding').onclick = () => walkTo(dock);
function dialogChoices(dialog) {
  return [...dialog.querySelectorAll('button:not(:disabled)')].filter(button => button.getClientRects().length);
}
const saveSlotsDialog = document.querySelector('#save-slots');
const slotActions = document.querySelector('#save-slots-actions');
const slotMessage = document.querySelector('#save-slots-message');
const slotDate = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });
function slotButton(label, action, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.onclick = action;
  slotActions.append(button);
}
function openSaveSlots(mode) {
  document.querySelector('#save-slots-title').textContent = mode === 'save' ? '저장하기' : '이어하기';
  slotMessage.hidden = true;
  slotActions.replaceChildren();
  function confirmAction(message, label, action) {
    slotMessage.textContent = message;
    slotMessage.hidden = false;
    slotActions.replaceChildren();
    slotButton('돌아가기', () => openSaveSlots(mode));
    slotButton(label, action);
    dialogChoices(saveSlotsDialog)[0]?.focus();
  }
  const newGame = () => confirmAction('저장하지 않은 진행은 사라져요. 새 게임을 시작할까요?', '새 게임 시작', () => location.reload());
  if (mode === 'new') {
    if (!saveSlotsDialog.open) saveSlotsDialog.showModal();
    newGame();
    return;
  }
  villageSave.slots().forEach((slot, index) => {
    const summary = slot ? (slot.savedAt ? slotDate.format(slot.savedAt) : '이전 저장') + ' · 집 ' + slot.data.repairs.level + '단계' : '빈 슬롯';
    const save = () => {
      if (!villageSave.saveAtBed(index)) {
        slotMessage.textContent = '저장하지 못했어요.';
        slotMessage.hidden = false;
        return;
      }
      saveSlotsDialog.close();
      document.querySelector('#furniture-text').textContent = (index + 1) + '번 슬롯에 저장했어요.';
      bedSaveButton.focus();
    };
    slotButton((index + 1) + '번 슬롯 · ' + summary, () => {
      if (mode === 'load') resumeSlot(index);
      else if (slot) confirmAction('이 슬롯의 진행을 덮어쓸까요?', '덮어쓰기', save);
      else save();
    }, mode === 'load' && !slot);
  });
  slotButton('새 게임', newGame);
  if (!saveSlotsDialog.open) saveSlotsDialog.showModal();
  dialogChoices(saveSlotsDialog)[0]?.focus();
}
const toolsButton = document.createElement('button');
toolsButton.id = 'village-tools-menu';
toolsButton.type = 'button';
toolsButton.textContent = '⚙️';
toolsButton.setAttribute('aria-label', '불러오기와 새 게임');
document.querySelector('.village-tool-buttons').append(toolsButton);
toolsButton.onclick = () => openSaveSlots('load');
function resumeSlot(index) {
  const restored = villageSave.resume(index);
  if (!restored) return;
  saveSlotsDialog.close();
  const saved = restored.story;
  returnedFromClearing = saved.returnedFromClearing;
  chichiAtPlaza = saved.chichiAtPlaza;
  chichiGuidedHome = saved.chichiGuided;
  homeLevel = restored.repairs.level;
  repairedRooms.clear();
  restored.repairs.rooms.forEach(id => repairedRooms.add(id));
  diveMastered = saved.diveComplete;
  luluBriefed = saved.luluBriefed;
  diveProgress = savedDiveProgress();
  diveMaterials = { ...restored.inventory };
  go(saved.scene, saved.party);
  if (restored.checkpoint === 'bed') {
    changeHomeLocation('home');
    position = { x: 34, y: 38 };
  }
}
const dialogFocus = new MutationObserver(changes => {
  for (const { target: dialog } of changes) {
    if (dialog.open) {
      keys.clear();
      dialogChoices(dialog)[0]?.focus({ preventScroll: true });
    }
  }
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialogFocus.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  dialog.addEventListener('keydown', event => {
    if (!Object.hasOwn(arrows, event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
    const buttons = dialogChoices(dialog);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const delta = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
    const next = current < 0 ? (delta > 0 ? 0 : buttons.length - 1) :
      (current + delta + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  });
}
window.addEventListener('keydown', event => {
  if (map.hidden || fountainRitual || document.querySelector('dialog[open]') || event.altKey || event.metaKey || event.ctrlKey) return;
  if (event.code === 'KeyD' && !event.repeat && !inDive && activateVillageSpot(fountain)) { event.preventDefault(); return; }
  if (event.code === 'KeyD' && !activeVillageInterior && !inCourtyard && !event.repeat && canAskChichiForGuide() && distanceTo(chichi) <= 9) {
    event.preventDefault();
    beginChichiGuide();
    return;
  }
  if (event.code === 'KeyD' && !activeVillageInterior && !inCourtyard && boriScenes.includes(state.scene) && distanceTo(bori) <= 12) {
    event.preventDefault();
    if (!event.repeat) talkToBori();
    return;
  }
  if (event.code === 'KeyD' && inCourtyard && state.scene === 'tea-pick' && distanceTo(teaPatch) <= 8) {
    event.preventDefault();
    if (!event.repeat) go('tea-return');
    return;
  }
  if (event.code === 'KeyD' && !event.repeat && (useToolShed() || useDiveInteraction() || useVillageSeat() || useHomeInteraction() || useNearbyVillageSpot())) { event.preventDefault(); return; }
  if (!Object.hasOwn(arrows, event.key)) return;
  event.preventDefault();
  target = null;
  route = [];
  standFromVillageSeat();
  wakeVillagePlayer();
  if (inDive) leaveKelp();
  keys.add(event.key);
});
window.addEventListener('keyup', event => keys.delete(event.key));
window.addEventListener('blur', () => keys.clear());
const cocoSprite = document.querySelector('#coco');
const cocoContext = cocoSprite.querySelector('canvas').getContext('2d');
const boriContext = boriButton.querySelector('canvas').getContext('2d');
let resumeAfterReplay;
function finishPrologue(reveal = false) {
  stopPrologue();
  if (resumeAfterReplay) {
    const previous = resumeAfterReplay;
    resumeAfterReplay = undefined;
    go(previous.scene, previous.party);
  } else {
    go('arrival');
    map.scrollIntoView({ block: 'nearest', behavior: motionPreference.matches ? 'instant' : 'smooth' });
  }
  if (reveal === true && !map.hidden) {
    map.animate(
      motionPreference.matches ? [{ opacity: 0 }, { opacity: 1 }] :
        [{ opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)' }],
      { duration: motionPreference.matches ? 550 : 1700, easing: 'ease-out' }
    );
  }
  if (audioContext?.state === 'running') void startVillageMusic();
}
skipPrologue.onclick = finishPrologue;
replay.onclick = () => {
  resumeAfterReplay = state;
  state = { scene: 0, party: null };
  keys.clear();
  target = null;
  render();

};
eventDialog.addEventListener('cancel', event => event.preventDefault());
render();
document.addEventListener('pointerdown', event => {
  document.body.classList.toggle('touch-input', event.pointerType === 'touch');
}, true);
document.addEventListener('keydown', () => document.body.classList.remove('touch-input'), true);
void startVillageMusic();
requestAnimationFrame(tick);
const villageBackdrops = [
  'village-map.webp', 'village-teahouse.webp', 'village-courtyard.webp', 'village-clearing.webp',
  'village-old-home.webp', 'village-cottage.webp', 'village-underwater.webp', 'village-hobby.webp',
  ...homeLevels.map(level => level.image), 'village-loft.webp', 'village-cinema.webp'
];
const villageImageCache = [];
async function warmVillageBackdrops() {
  const paths = [...new Set(villageBackdrops)];
  for (let offset = 0; offset < paths.length; offset += 3) {
    await Promise.allSettled(paths.slice(offset, offset + 3).map(path => {
      const image = new Image();
      image.src = path;
      villageImageCache.push(image);
      return image.decode();
    }));
  }
}
void warmVillageBackdrops();
