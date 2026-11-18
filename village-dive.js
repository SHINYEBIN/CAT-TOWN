const diveDialog = document.querySelector('#dive-dialog');
const diveLine = document.querySelector('#dive-guide-line');
const luluElement = document.querySelector('#lulu');
const luluContext = luluElement.querySelector('canvas').getContext('2d');
const lulu = { x: 87, y: 37 };
const diveControls = document.querySelector('#dive-controls');
const diveShark = document.querySelector('#dive-shark');
const haulNotice = document.querySelector('#dive-haul');
const bagButton = document.querySelector('#village-bag');
const bagDialog = document.querySelector('#village-bag-dialog');
const diveItemNames = { abalone: '전복', wood: '나무', stone: '돌', seaweed: '해초', flowers: '꽃', crops: '작물', fruit: '과일' };
const diveItemIcons = { abalone: '🐚', seaweed: '🌿', flowers: '🌼', crops: '🥕', fruit: '🍎' };
let haulTimer;
const pond = { x: 77, y: 70 };
let diveEntryPoint = pond;
function nearPondShore() {
  return walkable(position) && !withinVillageSpot(cottage) &&
    ((position.x - 77) / 18) ** 2 + ((position.y - 82) / 19) ** 2 <= 1;
}
const surface = { x: 17, y: 22, id: 'surface', label: '수면으로 올라가기' };
const kelp = { x: 52, y: 67, id: 'kelp', label: '해초 뒤에 숨기' };
let hiddenInKelp = false;
function leaveKelp() { hiddenInKelp = false; map.classList.remove('hiding-in-kelp'); }
function hideInKelp() {
  hiddenInKelp = true;
  keys.clear();
  target = null;
  route = [];
  map.classList.add('hiding-in-kelp');
}
const diveResources = [
  { id: 'abalone', label: '전복 캐기', icon: '●' },
  { id: 'wood', label: '나무 줍기', icon: '◆' },
  { id: 'stone', label: '돌 줍기', icon: '●' },
  { id: 'seaweed', label: '해초 채집', icon: '✦' }
];
const tutorialPickupSpots = [{ x: 31, y: 47 }, { x: 36, y: 42 }, { x: 28, y: 52 }];
const cavePickupSpots = [...tutorialPickupSpots, { x: 76, y: 73 }, { x: 77, y: 45 },
  { x: 64, y: 77 }, { x: 39, y: 75 }, { x: 87, y: 57 }, { x: 59, y: 40 }];
let pickups = [];
function drawRandomItem(pool) {
  return pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
}
function makeDivePickups() {
  if (diveProgress !== 'complete') {
    return [{ ...diveResources[0], ...drawRandomItem([...tutorialPickupSpots]) }];
  }
  const resources = [...diveResources];
  const spots = [...cavePickupSpots];
  return Array.from({ length: 3 + Math.floor(Math.random() * 2) }, () =>
    ({ ...drawRandomItem(resources), ...drawRandomItem(spots) }));
}
const savedDive = villageSave.read();
let diveMastered = savedDive.story.diveComplete;
let luluBriefed = savedDive.story.luluBriefed;
let diveProgress = savedDiveProgress();
function savedDiveProgress() {
  if (diveMastered) return 'complete';
  return luluBriefed ? 'ready' : 'none';
}
let diveMaterials = { ...savedDive.inventory };
let inDive = false;
let sharkChasing = false;
let sharkWaypoint = 0;
const sharkPatrol = [{ x: 90, y: 65 }, { x: 78, y: 41 }, { x: 37, y: 56 }, { x: 26, y: 77 }, { x: 65, y: 79 }];
let haul = new Set();
let sharkPosition;
function saveDive() {
  villageSave.update({ story: { diveComplete: diveMastered, luluBriefed }, inventory: Object.fromEntries(diveResources.map(({ id }) => [id, diveMaterials[id]])) });
}
function resetDive() {
  inDive = false;
  diveProgress = 'none';
  diveMastered = false;
  luluBriefed = false;
  diveMaterials = { abalone: 0, wood: 0, stone: 0, seaweed: 0 };
  saveDive();
}
function prepareLuluDiveGuide(onReturn = false) {
  if (diveMastered || luluBriefed) {
    diveProgress = savedDiveProgress();
    return;
  }
  if (!onReturn && ['waiting', 'leading', 'ready'].includes(diveProgress)) return;
  diveProgress = 'waiting';
  if (lulu.visit) restoreResidentToVillage(lulu, performance.now());
  Object.assign(lulu, { x: 87, y: 37, route: [], visitDoor: null });
}
function showDiveDialog(title, text) {
  document.querySelector('#dive-title').textContent = title;
  document.querySelector('#dive-line').textContent = text;
  if (!diveDialog.open) diveDialog.showModal();
}
document.querySelector('#dive-ok').onclick = () => diveDialog.close();
diveDialog.addEventListener('close', () => map.focus({ preventScroll: true }));
function updateLuluDiveGuide(now, elapsed) {
  if (diveProgress === 'complete') {
    walkVillageResident(lulu, luluElement, luluContext, 'lulu', now, elapsed, false);
    return;
  }
  if (!['waiting', 'leading', 'ready'].includes(diveProgress) || !afterLuluHomeGuide()) return;
  luluElement.hidden = false;
  if (diveProgress === 'waiting' && distanceTo(lulu) <= 6) {
    lulu.route = findRoute(pond, { x: lulu.x, y: lulu.y });
    diveProgress = 'leading';
  }
  const leading = diveProgress === 'leading';
  moveResident(lulu, luluElement, luluContext, 'lulu', now, elapsed, leading && distanceTo(lulu) <= 13, 17);
  diveLine.hidden = diveProgress === 'ready';
  if (diveProgress !== 'ready') {
    const line = diveProgress === 'waiting' ? '잠깐, 이리 와 봐!' : distanceTo(lulu) > 13 ? '여기서 기다릴게!' : '연못에 보여줄 게 있어.';
    if (diveLine.textContent !== line) diveLine.textContent = line;
    diveLine.dataset.edge = String(lulu.x > 80);
    diveLine.style.left = lulu.x + '%';
    diveLine.style.top = (lulu.y - 12) + '%';
  }
  if (leading && !lulu.route.length && distanceTo(lulu) <= 8) {
    diveProgress = diveMastered ? 'complete' : 'ready';
    luluBriefed = true;
    saveDive();
    renderDiveArea();
    showDiveDialog(diveMastered ? '루루의 잠수 안내' : '루루와 첫 잠수', diveMastered ? '여기가 잠수 입구야. 물가에서 D를 누르면 들어갈 수 있어.' : '연잎 아래로 내려가면 바다로 이어져. 입구 옆 바위에서 전복 하나만 캐 와. 상어가 보이면 해초 가까이에서 D를 눌러 숨어.');
  }
  return true;
}
function makeDiveControl(point, text = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dive-spot';
  button.dataset.spot = point.id;
  button.textContent = text;
  button.setAttribute('aria-label', point.label);
  button.style.left = point.x + '%';
  button.style.top = point.y + '%';
  button.onclick = () => walkTo(point);
  diveControls.append(button);
}
const pondControl = { ...pond, id: 'pond', label: '연못에서 잠수하기' };
function renderDiveArea() {
  map.classList.toggle('dive-map', inDive);
  bagButton.hidden = inDive || map.hidden;
  if (!inDive) leaveKelp();
  diveControls.replaceChildren();
  diveControls.hidden = true;
  diveLine.hidden = true;
  diveShark.hidden = !inDive;
  luluElement.hidden = inDive || !afterLuluHomeGuide() || Boolean(activeVillageInterior) || inCourtyard;
  if (inDive) {
    for (const id of ['bori', 'coco', 'lulu', 'chichi']) document.getElementById(id).hidden = true;
    makeDiveControl(surface, '↑');
    makeDiveControl(kelp);
    for (const item of pickups) if (!haul.has(item.id)) {
      makeDiveControl(item, item.icon);
    }

  } else if (canDiveHere()) {
    makeDiveControl(pondControl);
  }
  diveControls.hidden = !diveControls.children.length;
}
function afterLuluHomeGuide() {
  return (state.scene === 'follow-chichi' && returnedFromClearing) || ['gate', 'return-walk', 'stay'].includes(state.scene);
}
function canDiveHere() {
  return afterLuluHomeGuide() && !inDive && !map.hidden && !inCourtyard && !activeVillageInterior &&
    ['ready', 'complete'].includes(diveProgress);
}
function enterDive() {
  if (!canDiveHere()) return;
  diveEntryPoint = { ...position };
  inDive = true;
  haul = new Set();
  pickups = makeDivePickups();
  sharkPosition = { ...sharkPatrol[0] };
  sharkWaypoint = 1;
  sharkChasing = false;
  diveShark.dataset.chasing = 'false';
  clearTimeout(haulTimer);
  haulNotice.hidden = true;
  target = null;
  route = [];
  keys.clear();
  leaveKelp();
  position = { x: 23, y: 32 };
  render();
  map.focus({ preventScroll: true });
}
function writeDiveStatus() {
  write('연못 아래 동굴', '바위나 물건 가까이에서 D로 줍고, 왼쪽 위 빛이 드는 출구까지 헤엄치면 수면으로 올라가요. 해초 근처에서 D를 누르면 숨을 수 있어요.');
}
function finishDive(caught = false) {
  inDive = false;
  clearTimeout(haulTimer);
  haulNotice.hidden = true;
  target = null;
  route = [];
  keys.clear();
  position = { ...diveEntryPoint };
  const lost = caught ? [...haul].at(-1) : undefined;
  if (lost) haul.delete(lost);
  for (const id of haul) diveMaterials[id] = Math.min(Number.MAX_SAFE_INTEGER, (diveMaterials[id] ?? 0) + 1);
  const learned = diveProgress === 'ready' && haul.has('abalone');
  if (learned) {
    diveMastered = true;
    diveProgress = 'complete';
    const meetingPoint = [-8, 8, -5, 5].map(offset => ({ x: position.x + offset, y: position.y }))
      .find(walkable);
    Object.assign(bori, meetingPoint, { route: [], visit: null, visitDoor: null });
  }
  saveDive();
  render();
  if (learned) showDiveDialog('루루', '전복 가져왔네! 이젠 혼자 내려가도 돼. 동굴 안쪽에서 나무랑 돌도 주울 수 있어.');
  else if (caught) showDiveDialog('수면으로 돌아왔다', '상어를 피하다 급히 올라왔어요. 다음에는 해초 가까이에서 기다려 보세요.' + (lost ? ' 놓친 물건은 ' + diveItemNames[lost] + '이에요.' : ''));
  else map.focus({ preventScroll: true });
}
function updateDiveMotion(elapsed) {
  const gap = distanceTo(sharkPosition);
  sharkChasing = !hiddenInKelp && gap < (sharkChasing ? 30 : 18);
  if (!sharkChasing && Math.hypot(sharkPosition.x - sharkPatrol[sharkWaypoint].x, sharkPosition.y - sharkPatrol[sharkWaypoint].y) < 1) {
    sharkWaypoint = (sharkWaypoint + 1) % sharkPatrol.length;
  }
  const destination = sharkChasing ? position : sharkPatrol[sharkWaypoint];
  const dx = destination.x - sharkPosition.x;
  const dy = destination.y - sharkPosition.y;
  const distance = Math.hypot(dx, dy);
  if (distance) {
    const step = Math.min(distance, elapsed * (sharkChasing ? 14 : 12));
    sharkPosition.x += dx / distance * step;
    sharkPosition.y += dy / distance * step;
    if (Math.abs(dx) > .01) diveShark.style.scale = dx < 0 ? '-1 1' : '1 1';
  }
  diveShark.dataset.chasing = String(sharkChasing);
  diveShark.style.left = sharkPosition.x + '%';
  diveShark.style.top = sharkPosition.y + '%';
}
function collectDivePoint(point) {
  if (haul.has(point.id) || (diveProgress !== 'complete' && point.id !== 'abalone')) return;
  haul.add(point.id);
  showDiveHaul();
  target = null;
  route = [];
  renderDiveArea();
  writeDiveStatus();
}
function finishDiveApproach() {
  if (position.y <= 24 && Math.abs(position.x - surface.x) <= 4) { finishDive(); return; }
  if (!hiddenInKelp && sharkPosition && distanceTo(sharkPosition) < 5) {
    finishDive(true);
  } else if (target === kelp && distanceTo(kelp) <= 3) {
    hideInKelp();
  } else if (pickups.includes(target) && distanceTo(target) <= 3) {
    collectDivePoint(target);
  }
}
function finishPondApproach() {
  if (target === pondControl && canDiveHere() && distanceTo(pond) <= 3) { enterDive(); return true; }
  return false;
}
function useDiveInteraction() {
  if (inDive) {
    if (hiddenInKelp) { leaveKelp(); return true; }
    if (distanceTo(kelp) <= 8) { hideInKelp(); return true; }
    const point = pickups.filter(item => !haul.has(item.id) && distanceTo(item) <= 6)
      .sort((first, second) => distanceTo(first) - distanceTo(second))[0];
    if (point) collectDivePoint(point);
    return true;
  }
  if (canDiveHere() && nearPondShore()) { enterDive(); return true; }
  return false;
}

function showDiveHaul() {
  clearTimeout(haulTimer);
  haulNotice.textContent = '이번 잠수 · ' + [...haul].map(id => diveItemNames[id] + ' 1').join(' · ');
  haulNotice.hidden = false;
  haulTimer = setTimeout(() => { haulNotice.hidden = true; }, 2800);
}
bagButton.onclick = () => {
  if (inDive || bagDialog.open) return;
  const list = document.querySelector('#bag-items');
  list.replaceChildren();
  const inventory = villageSave.read().inventory;
  const available = new Set(yardPlots.filter(plot => homeLevel >= plot.level).map(plot => plot.item));
  if (luluBriefed || diveMastered) available.add('abalone');
  if (diveMastered) for (const { id } of diveResources) available.add(id);
  for (const [id, name] of Object.entries(diveItemNames)) {
    if (!available.has(id) && !inventory[id]) continue;
    const label = document.createElement('dt');
    const icon = document.createElement('span');
    icon.className = 'bag-item-icon';
    icon.dataset.item = id;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = diveItemIcons[id] ?? '';
    label.append(icon, name);
    const quantity = document.createElement('dd');
    quantity.textContent = String(inventory[id]);
    list.append(label, quantity);
  }
  document.querySelector('#bag-empty').hidden = list.childElementCount > 0;
  bagDialog.showModal();
};
bagDialog.addEventListener('close', () => map.focus({ preventScroll: true }));
