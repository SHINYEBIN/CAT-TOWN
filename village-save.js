const villageSave = (() => {
  const key = 'cat-village-save';
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
        visitedTeaAfterDive: source?.visitedTeaAfterDive === true },
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
  const raw = read(key);
  const existing = parse(raw);
  const unsupported = existing?.version != null && existing.version !== version;
  let data = raw === null ? readLegacy() : normalize(existing);
  let checkpoint = normalize(data);
  let migrated = raw === null;
  function persist(snapshot) {
    let ok = false;
    try {
      if (!unsupported) {
        localStorage.setItem(key, JSON.stringify(snapshot));
        checkpoint = snapshot;
        ok = true;
      }
    } catch {}
    document.dispatchEvent(new CustomEvent('village-save-status', { detail: { ok, unsupported } }));
    return ok;
  }
  function update(parts) {
    for (const [name, values] of Object.entries(parts)) data[name] = { ...data[name], ...values };
    data = normalize(data);
    if (parts.preferences) persist(normalize({ ...checkpoint, preferences: data.preferences }));
  }
  if (!unsupported && data.repairs.steps) {
    data.repairs.steps = false;
    data.inventory.wood = Math.min(Number.MAX_SAFE_INTEGER, data.inventory.wood + 1);
    data.inventory.stone = Math.min(Number.MAX_SAFE_INTEGER, data.inventory.stone + 1);
    migrated = true;
  }
  if (migrated) persist(normalize(data));
  data = normalize({ preferences: checkpoint.preferences });
  return {
    read: () => normalize(data),
    saved: () => normalize(checkpoint),
    resume: () => { data = normalize(checkpoint); },
    update,
    saveAtBed: () => persist(normalize({ ...data, checkpoint: 'bed' }))
  };
})();
