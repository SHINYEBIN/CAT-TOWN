let homeLocation = 'front';
let playerResting = false;
const sleeper = document.querySelector('#sleeping-player');
let chichiAtPlaza = villageSave.read().story.chichiAtPlaza;
function setChichiAtPlaza(atPlaza) {
  chichiAtPlaza = atPlaza;
  if (atPlaza) {
    Object.assign(chichi, { x: plaza.x - 5, y: plaza.y, route: [], waitUntil: 0 });
  }
  villageSave.update({ story: { chichiAtPlaza: atPlaza } });
}
const hobbyPath = { x: 8, y: 53 };
const homeDoor = { x: 62, y: 46 };
const hobbyExit = { x: 24, y: 90 };
const loftStairs = { x: 32, y: 71 };
const loftExit = { x: 50, y: 88 };
const loftEntry = document.querySelector('#loft-entry');
const indoorExit = { x: 27, y: 91 };
const homeLevels = [
  { name: '폐가', image: 'village-clearing.webp' },
  { name: '지낼 수 있는 집', image: 'village-house-level-2.webp', work: '현관과 돌계단 수리', cost: { wood: 20, stone: 20 }, bedroom: true },
  { name: '손질한 기와집', image: 'village-house-level-3.webp', work: '지붕과 창호 수리', cost: { wood: 40, stone: 40, abalone: 10 } },
  { name: '마루가 있는 집', image: 'village-house-level-4.webp', work: '넓은 마루 짓기', cost: { wood: 50, stone: 50, abalone: 10, seaweed: 15 } },
  { name: '복층 한옥', image: 'village-house-level-5.webp', work: '한옥에 위층 올리기', cost: { wood: 100 } }
];
let homeLevel = villageSave.read().repairs.level;
const shedUpgrade = document.querySelector('#shed-upgrade');
function currentHouseImage() { return homeLevels[homeLevel - 1].image; }
const toolShed = { x: 86, y: 46 };
const toolShedButton = document.querySelector('#tool-shed');
const toolShedDialog = document.querySelector('#tool-shed-dialog');
const homeRepairDialog = document.querySelector('#home-repair');
const homeRooms = document.querySelector('#home-rooms');
const repairAction = document.querySelector('#repair-action');
const homeRoomsData = [
  { id: 'bedroom', x: 28, y: 45, name: '방', repair: '낡은 침구를 정리한다', detail: '침구를 털고 새로 개어 두었어요.' },
  { id: 'bathroom', x: 75, y: 31, name: '화장실', repair: '깨진 타일을 손본다', detail: '빠져 있던 타일을 고정했어요.' },
  { id: 'kitchen', x: 75, y: 72, name: '부엌', repair: '부엌을 청소한다', detail: '조리대와 선반의 먼지를 닦았어요.' }
];
const furnitureDialog = document.querySelector('#furniture-dialog');
const furnitureControls = document.querySelector('#home-furniture');
const bedSaveButton = document.querySelector('#bed-save');
const furnitureAction = document.querySelector('#furniture-action');
const homeFurniture = [
  { x: 34, y: 38, name: '침대', isBed: true, action: '잠깐 쉬기', result: '낡은 침대에 누워 잠깐 눈을 붙였어요.' },
  { x: 85, y: 33, name: '욕조', action: '몸 담그기', result: '따뜻한 물에 몸을 담그니 긴장이 풀려요.' },
  { x: 66, y: 30, name: '세면대', action: '세수하기', result: '찬물로 세수하니 정신이 맑아졌어요.' }
];
const repairedRooms = new Set(villageSave.read().repairs.rooms);
const hobbyPathButton = document.querySelector('#hobby-path');
const homeDoorButton = document.querySelector('#home-door');
const homeExitButton = document.querySelector('#home-yard-exit');

function placeHomeButton(button, point) {
  button.style.left = point.x + '%';
  button.style.top = point.y + '%';
}
placeHomeButton(hobbyPathButton, hobbyPath);
placeHomeButton(toolShedButton, toolShed);
toolShedButton.onclick = () => { if (!useToolShed()) walkTo(toolShed); };
toolShedDialog.addEventListener('close', () => map.focus({ preventScroll: true }));
placeHomeButton(homeDoorButton, homeDoor);
hobbyPathButton.onclick = () => walkTo(hobbyPath);
homeDoorButton.onclick = () => {
  if (distanceTo(homeDoor) <= 8) changeHomeLocation('home');
  else walkTo(homeDoor);
};
function homeExitPoint() { return homeLocation === 'hobby' ? hobbyExit : homeLocation === 'loft' ? loftExit : indoorExit; }
homeExitButton.onclick = () => walkTo(homeExitPoint());
placeHomeButton(loftEntry, loftStairs);
loftEntry.onclick = () => walkTo(loftStairs);
for (const room of homeRoomsData) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-room';
  button.setAttribute('aria-label', room.name);
  placeHomeButton(button, room);
  button.onclick = () => {
    if (distanceTo(room) <= 9) inspectHomeRoom(room);
    else walkTo(room);
  };
  homeRooms.append(button);
}

for (const item of homeFurniture) {
  const button = document.createElement('button');
  button.className = 'home-furniture-spot';
  button.type = 'button';
  button.setAttribute('aria-label', item.name);
  placeHomeButton(button, item);
  button.onclick = () => {
    if (item.isBed ? isBesideBed() : distanceTo(item) <= 5) useFurniture(item);
    else walkTo(item);
  };
  furnitureControls.append(button);
}
function useFurniture(item) {
  keys.clear();
  route = [];
  target = null;
  document.querySelector('#furniture-title').textContent = item.name;
  const line = document.querySelector('#furniture-text');
  line.textContent = item.isBed ? '침대에서 저장하면 다음에 여기서 이어할 수 있어요.' : '';
  bedSaveButton.hidden = !item.isBed;
  furnitureAction.textContent = item.action;
  furnitureAction.hidden = false;
  furnitureAction.onclick = () => {
    if (item.isBed) {
      furnitureDialog.close();
      playerResting = true;
      drawSleepingPlayer();
      return;
    }
    line.textContent = item.result;
    furnitureAction.hidden = true;
    furnitureDialog.querySelector('form button').focus();
  };
  if (!furnitureDialog.open) furnitureDialog.showModal();
}
bedSaveButton.onclick = () => {
  if (homeLocation !== 'home' || !isBesideBed()) return;
  openSaveSlots('save');
};
furnitureDialog.addEventListener('close', () => map.focus({ preventScroll: true }));

function renderHomeLocation(atClearing) {
  const outsideHouse = atClearing && homeLocation === 'front';
  map.classList.toggle('clearing-map', outsideHouse);
  if (outsideHouse) map.style.setProperty('--clearing-art', 'url(' + currentHouseImage() + ')');
  else map.style.removeProperty('--clearing-art');
  map.classList.toggle('hobby-map', atClearing && homeLocation === 'hobby');
  map.classList.toggle('old-home-map', atClearing && homeLocation === 'home');
  map.classList.toggle('loft-map', atClearing && homeLocation === 'loft');
  loftEntry.hidden = !atClearing || homeLocation !== 'home' || homeLevel < 5;
  renderYardPlots(outsideHouse);
  toolShedButton.hidden = hobbyPathButton.hidden = homeDoorButton.hidden = !atClearing || homeLocation !== 'front';
  homeExitButton.hidden = !atClearing || homeLocation === 'front';
  if (!homeExitButton.hidden) {
    placeHomeButton(homeExitButton, homeExitPoint());
    homeExitButton.setAttribute('aria-label', homeLocation === 'loft' ? '아래층으로 내려가기' : '폐가 앞마당으로 돌아가기');
  }
  homeRooms.hidden = furnitureControls.hidden = !atClearing || homeLocation !== 'home';
  for (const [index, room] of homeRoomsData.entries()) {
    const done = repairedRooms.has(room.id);
    const button = homeRooms.children[index];
    button.dataset.repaired = String(done);
    button.setAttribute('aria-label', room.name + (done ? ' 수리 완료' : ''));
  }
}
function changeHomeLocation(location) {
  const previous = homeLocation;
  wakeVillagePlayer();
  if (previous === 'home' && location === 'front') setChichiAtPlaza(true);
  homeLocation = location;
  keys.clear();
  route = [];
  target = null;
  position = {
    front: previous === 'hobby' ? { x: 14, y: 55 } : { x: 61, y: 49 },
    hobby: { x: 19, y: 83 },
    home: previous === 'loft' ? { x: 32, y: 74 } : { x: 27, y: 83 },
    loft: { x: 50, y: 79 }
  }[location];
  render();
  map.focus({ preventScroll: true });
}
function writeHomeLocation() {
  if (homeLocation === 'loft') {
    write('한옥 위층', '아래의 계단을 내려가면 다시 1층으로 돌아가요.');
  } else if (homeLocation === 'hobby') {
    write('빈 터', '아직 비어 있는 공간이에요. 들어온 길을 따라 내려가면 폐가 앞마당으로 돌아가요.');
  } else {
    write('오래된 집', '안으로 들어가 둘러보세요. 수리할 곳 근처에서 D를 누를 수 있어요.');
  }
}
function walkableHomeArea(point) {
  if (homeLocation === 'front') {
    if (homeLevel >= 4) {
      const { x, y } = point;
      const steps = x >= 55 && x <= 66 && y >= 37 && y <= 49;
      const veranda = homeLevel === 4
        ? x >= 25 && x <= 79 && y >= 34 && y <= 39
        : x >= 33 && x <= 78 && y >= 37 && y <= 41;
      if (steps || veranda) return true;
      if (x >= (homeLevel === 4 ? 23 : 31) && x <= 83 && y >= 7 && y <= 45) return false;
    }
    return !clearingObstacles.some(vertices => insideObstacle(point, vertices));
  }
  if (homeLocation === 'hobby') return true;
  if (homeLocation === 'loft') return point.y >= 32 && (point.y < 80 ? point.x >= 10 && point.x <= 90 : point.x >= 43 && point.x <= 57);
  const { x, y } = point;
  if (y > 79) return x >= 22 && x <= 31 && y <= 92;
  if (x < 8 || x > 92 || y < 23) return false;
  const dividingWall = x >= 52 && x <= 55 && (y < 24 || y > 34 && y < 59 || y > 72);
  const bathroomWall = x > 55 && y >= 36 && y <= 41;
  const bed = x >= 36 && x <= 49 && y <= 40;
  const kitchenCounter = x >= 57 && y >= 43 && y <= 64;
  const bathroomFurniture = (x >= 61 && x <= 69 && y <= 26) || (x >= 78 && x <= 91 && y <= 30);
  const storedFurniture = (x <= 21 && y <= 31) || (x <= 18 && y >= 69) || (x >= 86 && y >= 71);
  return !dividingWall && !bathroomWall && !bed && !kitchenCounter && !bathroomFurniture && !storedFurniture;
}
function updateHomeTravel() {
  if (homeLocation === 'front') {
    if (yardPlots.includes(target) && distanceTo(target) <= 4) { useYardPlot(target); return true; }
    if (target === toolShed && useToolShed()) return true;
    if (distanceTo(hobbyPath) <= 3) { changeHomeLocation('hobby'); return true; }
    if (target === homeDoor && distanceTo(homeDoor) <= 3) { changeHomeLocation('home'); return true; }
  } else {
    if (distanceTo(homeExitPoint()) <= 2.8) { changeHomeLocation(homeLocation === 'loft' ? 'home' : 'front'); return true; }
    if (homeLocation === 'home' && homeLevel >= 5 && target === loftStairs && distanceTo(loftStairs) <= 3) { changeHomeLocation('loft'); return true; }
    if (homeLocation === 'home' && homeFurniture.includes(target) && distanceTo(target) <= 3) { useFurniture(target); return true; }
    if (homeLocation === 'home' && homeRoomsData.includes(target) && distanceTo(target) <= 3) {
      inspectHomeRoom(target);
      return true;
    }
  }
  return false;
}
function useHomeInteraction() {
  if (state.scene !== 'clearing') return false;
  if (homeLocation === 'front') {
    const plot = yardPlots.find(item => homeLevel >= item.level && distanceTo(item) <= 5);
    if (plot) { useYardPlot(plot); return true; }
  }
  if (homeLocation === 'home' && homeLevel >= 5 && distanceTo(loftStairs) <= 5) { changeHomeLocation('loft'); return true; }
  if (homeLocation === 'front' && distanceTo(homeDoor) <= 8) {
    changeHomeLocation('home');
    return true;
  }
  if (homeLocation !== 'home') return false;
  const furniture = homeFurniture.find(item => item.isBed ? isBesideBed() : distanceTo(item) <= 5);
  if (furniture) { useFurniture(furniture); return true; }
  const room = homeRoomsData.find(item => distanceTo(item) <= 9);
  if (!room) return false;
  inspectHomeRoom(room);
  return true;
}
function inspectHomeRoom(room) {
  keys.clear();
  route = [];
  target = null;
  const done = repairedRooms.has(room.id);
  document.querySelector('#repair-title').textContent = room.name;
  document.querySelector('#repair-description').textContent = done ? room.detail : '오랫동안 비어 있던 곳이에요. 오늘은 한 군데만 손봐도 충분해요.';
  repairAction.hidden = done;
  repairAction.textContent = room.repair;
  repairAction.onclick = () => {
    repairedRooms.add(room.id);
    villageSave.update({ repairs: { rooms: [...repairedRooms] } });
    document.querySelector('#repair-description').textContent = room.detail;
    repairAction.hidden = true;
    renderHomeLocation(true);
  };
  if (!homeRepairDialog.open) homeRepairDialog.showModal();
}
homeRepairDialog.addEventListener('close', () => map.focus({ preventScroll: true }));

function isBesideBed() {
  return position.y >= 25 && position.y <= 47 &&
    (position.x >= 31 && position.x < 36 ||
     position.x > 49 && position.x < 54 ||
     position.y > 40 && position.x >= 36 && position.x <= 49);
}
function drawSleepingPlayer() {
  const context = sleeper.getContext('2d');
  context.clearRect(0, 0, sleeper.width, sleeper.height);
  const blocks = [
    ['#53352d', 2, 0, 6, 1], ['#53352d', 1, 1, 8, 6],
    ['#75483b', 2, 1, 6, 2], ['#f3b889', 2, 4, 6, 4],
    ['#efaa7d', 3, 8, 4, 1], ['#663c33', 3, 5, 1, 1],
    ['#663c33', 6, 5, 1, 1]
  ];
  for (const [color, x, y, width, height] of blocks) {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }
  map.classList.add('is-resting');
  player.hidden = true;
  sleeper.hidden = false;
}
function wakeVillagePlayer() {
  if (!playerResting) return;
  playerResting = false;
  setTimeout(() => {
    if (!playerResting) map.classList.remove('is-resting');
  }, 150);
  sleeper.hidden = true;
  player.hidden = false;
}

function useToolShed() {
  if (state.scene !== 'clearing' || homeLocation !== 'front' || distanceTo(toolShed) > 6) return false;
  keys.clear();
  route = [];
  target = null;
  renderToolShed();
  if (!toolShedDialog.open) toolShedDialog.showModal();
  return true;
}

function renderToolShed(message) {
  const next = homeLevels[homeLevel];
  const inventory = villageSave.read().inventory;
  const cost = Object.entries(next?.cost ?? {});
  document.querySelector('#shed-level').textContent = homeLevel + '단계 · ' + homeLevels[homeLevel - 1].name;
  document.querySelector('#shed-next').textContent = next ? '다음 단계 · ' + next.name : '최종 단계 완성';
  const listItems = lines => lines.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  });
  const requirements = next ? [next.work] : [];
  const bedroomReady = !next?.bedroom || repairedRooms.has('bedroom');
  if (next?.bedroom) requirements.push('방 정리 · ' + (bedroomReady ? '완료' : '실내에서 침구 정리하기'));
  document.querySelector('#shed-prerequisites').replaceChildren(...listItems(requirements));
  document.querySelector('#shed-materials').textContent = (message ? message + ' · ' : '') +
    (next ? cost.map(([id, needed]) => diveItemNames[id] + ' ' + inventory[id] + '/' + needed).join(' · ')
      : '보유 재료 · 나무 ' + inventory.wood + ' · 돌 ' + inventory.stone);
  document.querySelector('#shed-rooms').replaceChildren(...listItems(homeRoomsData.map(room =>
    room.name + ' · ' + (repairedRooms.has(room.id) ? '수리 완료' : '실내에서 D로 수리')
  )));
  shedUpgrade.hidden = !next;
  shedUpgrade.disabled = !next || !bedroomReady || cost.some(([id, needed]) => inventory[id] < needed);
}
shedUpgrade.onclick = () => {
  const next = homeLevels[homeLevel];
  const inventory = villageSave.read().inventory;
  if (!next || Object.entries(next.cost).some(([id, needed]) => inventory[id] < needed) ||
      (next.bedroom && !repairedRooms.has('bedroom'))) return;
  for (const [id, needed] of Object.entries(next.cost)) inventory[id] -= needed;
  homeLevel++;
  Object.assign(diveMaterials, inventory);
  villageSave.update({ inventory, repairs: { level: homeLevel } });
  renderHomeLocation(true);
  renderToolShed('외관 수리 완료');
};

const yardPlots = [
  { id: 'flowers', level: 2, x: 39, y: 55, item: 'flowers', name: '꽃밭', icon: '🌼', yield: 1 },
  { id: 'crops', level: 3, x: 43, y: 62, item: 'crops', name: '텃밭', icon: '🥕', yield: 1 },
  { id: 'field', level: 4, x: 50, y: 70, item: 'crops', name: '넓은 밭', icon: '🌱', yield: 3 },
  { id: 'orchard', level: 5, x: 56, y: 60, item: 'fruit', name: '과수원', icon: '🍎', yield: 2 }
];
const yardPlotsPanel = document.querySelector('#yard-plots');
const plotGrowthMs = 60000;
function renderYardPlots(show) {
  yardPlotsPanel.hidden = !show || homeLevel < 2;
  if (yardPlotsPanel.hidden) return;
  yardPlotsPanel.replaceChildren();
  for (const plot of yardPlots.filter(item => homeLevel >= item.level)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'yard-plot';
    button.setAttribute('aria-label', plot.name);
    button.dataset.plot = plot.id;
    placeHomeButton(button, plot);
    button.onclick = () => distanceTo(plot) <= 5 ? useYardPlot(plot) : walkTo(plot);
    yardPlotsPanel.append(button);
  }
  refreshYardPlots();
}
function refreshYardPlots() {
  if (yardPlotsPanel.hidden) return;
  const garden = villageSave.read().garden;
  for (const button of yardPlotsPanel.children) {
    const plot = yardPlots.find(item => item.id === button.dataset.plot);
    const time = garden[plot.id];
    button.dataset.growth = !time ? 'empty' : time <= Date.now() ? 'ready' : 'planted';
    button.textContent = !time ? '' : time <= Date.now() ? plot.icon : '🌱';
    button.title = plot.name + (time && time <= Date.now() ? ' · 수확 가능' : '');
  }
}
function useYardPlot(plot) {
  if (homeLevel < plot.level || distanceTo(plot) > 5) return;
  target = null;
  route = [];
  keys.clear();
  const save = villageSave.read();
  const readyAt = save.garden[plot.id];
  if (!readyAt) {
    villageSave.update({ garden: { [plot.id]: Date.now() + plotGrowthMs } });
    showDiveDialog(plot.name, '심었어요. 약 1분 뒤에 수확할 수 있어요.');
  } else if (readyAt > Date.now()) {
    showDiveDialog(plot.name, '자라는 중이에요. 약 ' + Math.ceil((readyAt - Date.now()) / 1000) + '초 남았어요.');
  } else {
    villageSave.update({ garden: { [plot.id]: 0 }, inventory: {
      [plot.item]: Math.min(Number.MAX_SAFE_INTEGER, save.inventory[plot.item] + plot.yield)
    } });
    showDiveDialog(plot.name, diveItemNames[plot.item] + ' ' + plot.yield + '개를 가방에 넣었어요.');
  }
  refreshYardPlots();
}
setInterval(refreshYardPlots, 1000);
