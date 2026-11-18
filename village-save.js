const villageSave = (() => {
  const key = 'cat-village-slots';
  const version = 1;
  const scenes = ['arrival', 'introduction', 'tea-request', 'tea-pick', 'tea-return', 'welcome', 'morning', 'find-chichi', 'follow-chichi', 'clearing', 'gate', 'return-walk', 'dock', 'return', 'stay'];
  const parties = ['moon', 'morning', 'honest', 'lost', 'joke'];
  const repairIds = ['bedroom', 'bathroom', 'kitchen'];
  const read = name => {
    try { return localStorage.getItem(name); } catch { return null; }
  };
  const parse = value => {
    try { return JSON.parse(value); } catch { return null; }
  };
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function normalize(value) {
    const source = value?.story;
    const party = parties.includes(source?.party) ? source.party : null;
    const scene = source?.scene;
    const validScene = scenes.includes(scene) &&
      (scenes.indexOf(scene) < scenes.indexOf('morning') || party === 'moon' || party === 'morning');
    const rooms = value?.repairs?.rooms;
    return {
      version,
      checkpoint: value?.checkpoint === 'bed' && validScene && scene === 'clearing' ? 'bed' : null,
      story: { scene: validScene ? scene : 0, party: validScene ? party : null,
        chichiAtPlaza: source?.chichiAtPlaza === true, chichiGuided: source?.chichiGuided === true,
        returnedFromClearing: source?.returnedFromClearing === true ||
          (source?.returnedFromClearing == null && scene === 'follow-chichi' && (source?.chichiAtPlaza === true || source?.chichiGuided === true)),
        diveComplete: source?.diveComplete === true, luluBriefed: source?.luluBriefed === true,
        visitedTeaAfterDive: source?.visitedTeaAfterDive === true,
        lostScarf: ['draft', 'posted', 'returned'].includes(source?.lostScarf) ? source.lostScarf : null },
      inventory: { abalone: count(value?.inventory?.abalone), wood: count(value?.inventory?.wood), stone: count(value?.inventory?.stone), seaweed: count(value?.inventory?.seaweed),
        flowers: count(value?.inventory?.flowers), crops: count(value?.inventory?.crops), fruit: count(value?.inventory?.fruit) },
      garden: Object.fromEntries(['flowers', 'crops', 'field', 'orchard'].map(id => [id, count(value?.garden?.[id])])),
      repairs: { level: Math.min(5, Math.max(1, count(value?.repairs?.level))), rooms: repairIds.filter(id => Array.isArray(rooms) && rooms.includes(id)),
        steps: value?.repairs?.steps === true },
      preferences: { music: value?.preferences?.music !== false }
    };
  }
  function readLegacy() {
    const chichiAtPlaza = read('cat-village-chichi-plaza') === 'yes';
    const dive = parse(read('cat-village-pond-dive-v1'));
    return normalize({
      story: { ...parse(read('cat-village-playtest-v1')), chichiAtPlaza,
        chichiGuided: chichiAtPlaza || read('cat-village-chichi-guided-v1') === 'yes',
        diveComplete: dive?.complete === true },
      inventory: dive,
      repairs: { rooms: parse(read('cat-village-home-repairs-v1')), steps: dive?.steps },
      preferences: { music: read('cat-village-music') !== 'off' }
    });
  }
  const previous = parse(read('cat-village-save'));
  const legacy = previous?.version === version ? normalize(previous) : readLegacy();
  const migratedSlot = legacy.story.scene && legacy.story.scene !== 'arrival' ? { data: legacy, savedAt: null } : null;
  function readStore() {
    const store = parse(read(key));
    return store ?? { version, preferences: legacy.preferences, slots: [migratedSlot, null, null] };
  }
  const initial = readStore();
  let data = normalize({ preferences: initial.preferences });
  function persist(store) {
    let ok = false;
    const unsupported = store.version !== version;
    try {
      if (!unsupported) {
        localStorage.setItem(key, JSON.stringify(store));
        ok = true;
      }
    } catch {}
    document.dispatchEvent(new CustomEvent('village-save-status', { detail: { ok, unsupported } }));
    return ok;
  }
  function update(parts) {
    for (const [name, values] of Object.entries(parts)) data[name] = { ...data[name], ...values };
    data = normalize(data);
    if (parts.preferences) persist({ ...readStore(), preferences: data.preferences });
  }
  function slots() {
    const store = readStore();
    return Array.from({ length: 3 }, (_, index) => store.version === version ? store.slots?.[index] ?? null : null);
  }
  return {
    read: () => normalize(data),
    slots,
    resume(index) {
      const slot = slots()[index];
      if (!slot) return null;
      data = normalize({ ...slot.data, preferences: data.preferences });
      if (data.repairs.steps) {
        data.repairs.steps = false;
        for (const id of ['wood', 'stone']) data.inventory[id] = Math.min(Number.MAX_SAFE_INTEGER, data.inventory[id] + 1);
      }
      return normalize(data);
    },
    update,
    saveAtBed(index) {
      if (![0, 1, 2].includes(index) || data.story.scene !== 'clearing') return false;
      const store = readStore();
      const next = slots();
      next[index] = { data: normalize({ ...data, checkpoint: 'bed' }), savedAt: Date.now() };
      return persist({ ...store, slots: next });
    }
  };
})();
