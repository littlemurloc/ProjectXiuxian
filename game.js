const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const DATA = window.GAME_DATA;

const keys = new Set();

const state = {
  selectedClass: DATA.CLASSES[0],
  difficulty: DATA.TRIAL_TIERS[0],
  trialMode: DATA.TRIAL_MODES[0],
  running: false,
  paused: false,
  time: 0,
  level: 1,
  xp: 0,
  kills: 0,
  jade: 300,
  rerollStone: 8,
  starSand: 0,
  player: { x: 480, y: 270, radius: 16 },
  hp: 100,
  maxHp: 100,
  shield: 0,
  enemies: [],
  enemyProjectiles: [],
  hazards: [],
  projectiles: [],
  effects: [],
  loot: [],
  build: [],
  formedTags: [],
  pendingUpgrades: [],
  equippedGear: {},
  candidateGear: [],
  gearBank: [],
  currentCandidateId: null,
  runEvents: [],
  eventLog: [],
  result: null,
  equippedRelics: ["qf_box", "bell"],
  relicProgress: {},
  classProgress: {},
  stats: {},
  upgradeStats: {},
  gearStats: {},
  attackTimer: 0,
  spawnTimer: 0,
  relicTimers: {},
  activeRelicCooldowns: {},
  bellWindow: 0,
  gourdTimer: 0,
  scheduleFired: [],
  warningText: "",
  warningTimer: 0,
  judgementTimer: 0,
  attackSeq: 0
};

function createStats() {
  return {
    attackPct: 0,
    attackSpeedPct: 0,
    moveSpeedPct: 0,
    critRate: state.selectedClass.critRate || 0,
    critDamage: 1.5,
    pierce: state.selectedClass.pierce || 0,
    chainJumps: state.selectedClass.chainJumps || 0,
    chainFalloff: state.selectedClass.chainFalloff || 0,
    leech: 0,
    dropRate: 0,
    pickup: 1,
    xpGain: 0,
    bossDamage: 0,
    damageTaken: 0,
    relicHaste: 0,
    bellBonus: 0,
    shadow: 0,
    judgement: 0,
    slowOnHit: 0,
    critRefund: 0
  };
}

function emptyStats() {
  return {
    attackPct: 0,
    attackSpeedPct: 0,
    moveSpeedPct: 0,
    critRate: 0,
    critDamage: 0,
    pierce: 0,
    chainJumps: 0,
    leech: 0,
    dropRate: 0,
    pickup: 0,
    xpGain: 0,
    bossDamage: 0,
    damageTaken: 0,
    relicHaste: 0,
    bellBonus: 0,
    shadow: 0,
    judgement: 0,
    slowOnHit: 0,
    critRefund: 0,
    maxHp: 0,
    lowHpDamage: 0
  };
}

function combineStats() {
  const base = createStats();
  [state.upgradeStats || {}, state.gearStats || {}].forEach(source => {
    Object.entries(source).forEach(([key, value]) => {
      if (key === "maxHp") return;
      base[key] = (base[key] || 0) + value;
    });
  });
  state.stats = base;
}

function initMetaProgress() {
  DATA.RELICS.forEach(relic => {
    if (!state.relicProgress[relic.id]) state.relicProgress[relic.id] = { level: 1, star: 0 };
  });
  DATA.CLASSES.forEach(item => {
    if (!state.classProgress[item.id]) state.classProgress[item.id] = { level: 1, xp: 0, talents: 0 };
  });
}

function logEvent(name, detail) {
  const entry = { time: new Date().toLocaleTimeString(), name, detail };
  state.eventLog.unshift(entry);
  state.eventLog = state.eventLog.slice(0, 20);
  try {
    localStorage.setItem("lingbaoEventLog", JSON.stringify(state.eventLog));
  } catch (error) {
    // Local storage can be unavailable in some embedded contexts.
  }
  renderEventLog();
}

function loadEventLog() {
  try {
    state.eventLog = JSON.parse(localStorage.getItem("lingbaoEventLog") || "[]");
  } catch (error) {
    state.eventLog = [];
  }
}

function getRelic(id) {
  return DATA.RELICS.find(item => item.id === id);
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getClassDamage(target) {
  const bossBonus = target && target.role === "boss" ? state.stats.bossDamage : 0;
  const lowHpBonus = state.hp / state.maxHp < 0.4 ? state.stats.lowHpDamage || 0 : 0;
  return state.selectedClass.attack * (1 + state.stats.attackPct + bossBonus + lowHpBonus);
}

function resetRun() {
  state.running = true;
  state.paused = false;
  state.time = 0;
  state.level = 1;
  state.xp = 0;
  state.kills = 0;
  state.maxHp = state.selectedClass.maxHp;
  state.hp = state.maxHp;
  state.shield = 0;
  state.player = { x: canvas.width / 2, y: canvas.height / 2, radius: 16 };
  state.enemies = [];
  state.enemyProjectiles = [];
  state.hazards = [];
  state.projectiles = [];
  state.effects = [];
  state.loot = [];
  state.build = [];
  state.formedTags = [];
  state.pendingUpgrades = [];
  state.candidateGear = [];
  state.currentCandidateId = null;
  state.runEvents = [];
  state.result = null;
  state.upgradeStats = emptyStats();
  state.gearStats = emptyStats();
  recomputeGearStats();
  state.attackTimer = 0;
  state.spawnTimer = 0;
  state.relicTimers = {};
  state.activeRelicCooldowns = {};
  state.equippedRelics.forEach(id => {
    const relic = getRelic(id);
    if (relic?.trigger === "active") state.activeRelicCooldowns[id] = 0;
  });
  state.bellWindow = 0;
  state.gourdTimer = 0;
  state.scheduleFired = [];
  state.warningText = "";
  state.warningTimer = 0;
  state.judgementTimer = 0;
  clearUpgradeChoices();
  hideGearModal();
  hideSummaryModal();
  addLoot("试炼开始", `${state.selectedClass.name}进入${state.difficulty.name} · ${state.trialMode.name}。`, "good");
  recordRunEvent("开局", `${state.selectedClass.name} · ${state.difficulty.name} · ${state.trialMode.name}`);
  updateUi();
  renderEquipment();
  renderCandidateGear();
}

function endRun(reason = "manual") {
  if (!state.running && state.kills === 0) return;
  state.running = false;
  state.paused = false;
  hideUpgradeModal();
  hideGearModal();
  const reward = Math.floor((state.kills * 2 + state.level * 20) * state.difficulty.reward);
  state.jade += reward;
  state.rerollStone += Math.max(1, Math.floor(state.kills / 35));
  state.starSand += state.kills >= 80 ? 1 : 0;
  state.result = createRunResult(reason, reward);
  applyClassExperience(state.result.classXp);
  addLoot("结算奖励", `获得 ${reward} 灵石，${state.result.title}，主流派 ${getMainBuildTag()}。`, "good");
  logEvent("结算", `${state.result.title} · ${state.result.survival} · ${state.result.mainBuild}`);
  showSummaryModal();
  updateUi();
}

function applyClassExperience(amount) {
  const progress = state.classProgress[state.selectedClass.id];
  progress.xp += amount;
  while (progress.xp >= progress.level * 80) {
    progress.xp -= progress.level * 80;
    progress.level += 1;
    progress.talents = Math.min(4, progress.talents + 1);
  }
}

function chooseClass(id) {
  state.selectedClass = DATA.CLASSES.find(item => item.id === id) || DATA.CLASSES[0];
  state.equippedRelics = state.selectedClass.id === "thunder" ? ["thunder_pearl", "ice_mirror"] : ["qf_box", "bell"];
  state.upgradeStats = emptyStats();
  state.gearStats = emptyStats();
  combineStats();
  renderClassList();
  renderBuildSummary();
  renderRelicStatus();
}

function chooseDifficulty(id) {
  state.difficulty = DATA.TRIAL_TIERS.find(item => item.id === id) || DATA.TRIAL_TIERS[0];
  renderDifficultyList();
}

function chooseMode(id) {
  state.trialMode = DATA.TRIAL_MODES.find(item => item.id === id) || DATA.TRIAL_MODES[0];
  renderModeList();
}

function getMainBuildTag() {
  const counts = getTagCounts();
  return Object.entries(counts)
    .filter(([tag]) => ["暴击", "雷击", "吸血", "灵宝"].includes(tag))
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "未成型";
}

function getTagCounts() {
  return state.build.reduce((acc, item) => {
    item.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});
}

function weightedUpgrades() {
  const counts = getTagCounts();
  const classTag = state.selectedClass.name;
  return [...DATA.UPGRADES]
    .filter(item => !state.build.some(picked => picked.id === item.id))
    .map(item => {
      let weight = 1;
      if (item.tags.includes(classTag)) weight += 3;
      item.tags.forEach(tag => {
        weight += counts[tag] || 0;
      });
      if (state.equippedRelics.some(id => DATA.RELICS.find(relic => relic.id === id)?.tags.some(tag => item.tags.includes(tag)))) {
        weight += 1;
      }
      return { item, weight };
    });
}

function pickUpgrades() {
  const pool = weightedUpgrades();
  const picked = [];
  while (picked.length < 3 && pool.length) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    const index = pool.findIndex(entry => {
      roll -= entry.weight;
      return roll <= 0;
    });
    picked.push(pool.splice(Math.max(0, index), 1)[0].item);
  }
  return picked;
}

function clearUpgradeChoices() {
  state.pendingUpgrades = [];
  const container = document.getElementById("upgradeChoices");
  container.innerHTML = `<div class="choice-card"><strong>等待突破</strong><span>击杀怪物获得灵气，升级时战斗会暂停并弹出三选一。</span></div>`;
  hideUpgradeModal();
}

function offerUpgrades(options = {}) {
  state.pendingUpgrades = pickUpgrades();
  renderUpgradeChoices();
  if (options.pause) {
    state.paused = true;
    showUpgradeModal();
  }
}

function renderUpgradeChoices() {
  const container = document.getElementById("upgradeChoices");
  const modalContainer = document.getElementById("modalUpgradeChoices");
  container.innerHTML = "";
  modalContainer.innerHTML = "";
  state.pendingUpgrades.forEach(upgrade => {
    const card = createUpgradeButton(upgrade);
    const modalCard = createUpgradeButton(upgrade);
    container.appendChild(card);
    modalContainer.appendChild(modalCard);
  });
}

function createUpgradeButton(upgrade) {
  const card = document.createElement("button");
  card.className = "choice-card";
  card.innerHTML = `<strong>${upgrade.name}</strong><span>${upgrade.desc}</span><br>${upgrade.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}`;
  card.addEventListener("click", () => applyUpgrade(upgrade));
  return card;
}

function showUpgradeModal() {
  document.getElementById("upgradeModal").classList.remove("hidden");
}

function hideUpgradeModal() {
  document.getElementById("upgradeModal").classList.add("hidden");
}

function applyUpgrade(upgrade) {
  if (!state.pendingUpgrades.some(item => item.id === upgrade.id)) return;
  state.build.push(upgrade);
  Object.entries(upgrade.effects).forEach(([key, value]) => {
    if (key === "maxHp") {
      state.upgradeStats.maxHp = (state.upgradeStats.maxHp || 0) + value;
      state.maxHp += value;
      state.hp = Math.min(state.maxHp, state.hp + value);
    } else {
      state.upgradeStats[key] = (state.upgradeStats[key] || 0) + value;
    }
  });
  combineStats();

  const counts = getTagCounts();
  ["暴击", "雷击", "吸血", "灵宝"].forEach(tag => {
    if (counts[tag] >= 3 && !state.formedTags.includes(tag)) {
      state.formedTags.push(tag);
      addLoot("流派成型", `${tag}流已成型，后续选择将更偏向该方向。`, "good");
    }
  });
  state.paused = false;
  clearUpgradeChoices();
  renderBuildSummary();
  updateUi();
}

function rerollChoices() {
  if (state.rerollStone <= 0) {
    addLoot("洗练不足", "洗练石不足，记录为商业化验证点击。", "danger");
    return;
  }
  if (!state.paused || state.pendingUpgrades.length === 0) {
    addLoot("刷新保留", "升级弹出时可刷新三选一，本局仍有 1 次免费体验。");
    return;
  }
  state.rerollStone -= 1;
  offerUpgrades({ pause: true });
  addLoot("刷新选择", "本局升级选项已刷新。");
  updateUi();
}

function spawnEnemy(forceId) {
  const normalIds = getNormalEnemyPool();
  const id = forceId || normalIds[Math.floor(Math.random() * normalIds.length)];
  const config = DATA.ENEMIES.find(item => item.id === id) || DATA.ENEMIES[0];
  const side = Math.floor(Math.random() * 4);
  const positions = [
    { x: -20, y: Math.random() * canvas.height },
    { x: canvas.width + 20, y: Math.random() * canvas.height },
    { x: Math.random() * canvas.width, y: -20 },
    { x: Math.random() * canvas.width, y: canvas.height + 20 }
  ];
  const pos = positions[side];
  const phaseScale = 1 + (state.time / state.trialMode.duration) * 2;
  state.enemies.push({
    ...config,
    x: pos.x,
    y: pos.y,
    radius: config.role === "boss" ? 28 : config.role === "elite" ? 22 : 12 + Math.random() * 5,
    hp: config.hp * state.difficulty.enemyHp * phaseScale,
    maxHp: config.hp * state.difficulty.enemyHp * phaseScale,
    speed: config.speed,
    damage: config.damage * state.difficulty.enemyDamage,
    hitByThunder: 0,
    slow: 0,
    aiTimer: 0.8 + Math.random() * 1.2,
    chargeState: "idle",
    chargeTimer: 0,
    targetX: state.player.x,
    targetY: state.player.y
  });
}

function getNormalEnemyPool() {
  const ratio = state.time / state.trialMode.duration;
  if (ratio < 0.18) return ["spirit", "spirit", "runner"];
  if (ratio < 0.38) return ["spirit", "runner", "runner", "crow", "golem"];
  if (ratio < 0.7) return ["spirit", "runner", "golem", "crow", "bomber"];
  return ["runner", "golem", "crow", "bomber", "bomber"];
}

function spawnWarning(text) {
  state.warningText = text;
  state.warningTimer = 3.2;
  addLoot("危险预警", text, "danger");
  recordRunEvent("预警", text);
}

function addEffect(effect) {
  state.effects.push(effect);
}

function addHazard(hazard) {
  state.hazards.push({
    telegraph: 0.8,
    pulse: 0,
    ...hazard
  });
}

function fireAtNearest() {
  if (state.selectedClass.id === "thunder") {
    fireThunder();
    return;
  }
  fireSword();
}

function nearestEnemy(from = state.player, ignored = new Set()) {
  return state.enemies
    .filter(enemy => !ignored.has(enemy))
    .map(enemy => ({ enemy, dist: distance(enemy, from) }))
    .sort((a, b) => a.dist - b.dist)[0]?.enemy;
}

function fireSword() {
  const target = nearestEnemy();
  if (!target) return;
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const len = Math.hypot(dx, dy) || 1;
  const crit = Math.random() < state.stats.critRate;
  state.attackSeq += 1;
  state.projectiles.push({
    kind: "sword",
    x: state.player.x,
    y: state.player.y,
    vx: (dx / len) * 620,
    vy: (dy / len) * 620,
    life: 0.72,
    radius: crit ? 6 : 5,
    damage: getClassDamage(target) * (crit ? state.stats.critDamage : 1),
    color: crit ? "#fff0a6" : state.selectedClass.color,
    pierceLeft: state.stats.pierce,
    hit: new Set(),
    crit
  });
}

function fireThunder() {
  const first = nearestEnemy();
  if (!first) return;
  const hit = new Set();
  let source = state.player;
  let target = first;
  let damage = getClassDamage(target);
  const jumps = 1 + state.stats.chainJumps;
  for (let i = 0; i < jumps && target; i += 1) {
    damageEnemy(target, damage, "thunder");
    target.hitByThunder += 1;
    if (state.stats.slowOnHit) target.slow = Math.max(target.slow, 1.2);
    addEffect({ kind: "line", x1: source.x, y1: source.y, x2: target.x, y2: target.y, life: 0.16, color: "#60b6ff" });
    hit.add(target);
    source = target;
    damage *= Math.max(0.25, 1 - state.stats.chainFalloff);
    target = nearestEnemy(source, hit);
  }
}

function damageEnemy(enemy, amount, source) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    if (state.stats.thunderPool && source === "thunder") {
      addEffect({ kind: "zone", x: enemy.x, y: enemy.y, r: 62, damage: getClassDamage(enemy) * 0.18, life: 2.2, tick: 0, color: "#60b6ff" });
    }
    killEnemy(enemy, source);
  }
}

function killEnemy(enemy, source = "attack") {
  if (!state.enemies.includes(enemy)) return;
  state.kills += 1;
  if (enemy.id === "storm_boss") state.bossKilled = true;
  state.xp += enemy.xp * 6 * (1 + state.stats.xpGain);
  const heal = state.maxHp * state.stats.leech;
  if (heal > 0) {
    const missing = state.maxHp - state.hp;
    state.hp = Math.min(state.maxHp, state.hp + heal);
    if (heal > missing && state.stats.overhealShield) state.shield = Math.min(30, state.shield + heal - missing);
  }
  maybeDrop(enemy, source);
  if (enemy.role !== "normal") recordRunEvent("强敌", `击败 ${enemy.name}`);
  state.enemies = state.enemies.filter(item => item !== enemy);
  if (enemy.id === "storm_boss") {
    endRun("bossKilled");
    return;
  }
  if (state.xp >= xpNeeded()) {
    state.xp -= xpNeeded();
    state.level += 1;
    offerUpgrades({ pause: true });
    addLoot("境界提升", `达到 ${state.level} 级，获得新的构筑选择。`, "good");
  }
}

function recordRunEvent(type, text) {
  state.runEvents.unshift({ type, text, time: formatTime(state.time) });
  state.runEvents = state.runEvents.slice(0, 8);
}

function createRunResult(reason, reward) {
  let title = "试炼完成";
  if (reason === "death") title = "试炼失败";
  if (reason === "bossKilled") title = "斩妖成功";
  const gearHighlights = [...Object.values(state.equippedGear), ...state.candidateGear]
    .sort((a, b) => scoreFit(b) - scoreFit(a))
    .slice(0, 4);
  const nextStep = reason === "death"
    ? "建议强化装备或选择生存/吸血升级后再来一局。"
    : reason === "bossKilled"
      ? "建议挑战更高层级，保留高适配装备。"
      : "建议整理候选装备，继续冲击终局Boss。";
  return {
    title,
    reward,
    survival: formatTime(state.time),
    kills: state.kills,
    classXp: Math.max(10, Math.floor(state.kills * 0.8 + state.level * 6)),
    mainBuild: getMainBuildTag(),
    output: getMainBuildTag() === "未成型" ? state.selectedClass.name : getMainBuildTag(),
    gearHighlights,
    nextStep
  };
}

function xpNeeded() {
  return 24 + state.level * 16;
}

function maybeDrop(enemy) {
  const dropChance = enemy.role === "normal" ? 0.08 + state.stats.dropRate : 1;
  if (Math.random() > dropChance) return;
  const equipment = createEquipmentDrop(enemy);
  receiveEquipment(equipment);
}

function createEquipmentDrop(enemy) {
  const base = DATA.EQUIPMENT[Math.floor(Math.random() * DATA.EQUIPMENT.length)];
  const bonus = enemy.role === "boss" ? 10 : enemy.role === "elite" ? 5 : 0;
  return {
    ...base,
    uid: `${base.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    source: enemy.name,
    score: base.score + bonus
  };
}

function receiveEquipment(equipment) {
  if (!state.gearBank.some(item => item.uid === equipment.uid)) state.gearBank.unshift(equipment);
  const current = state.equippedGear[equipment.slot];
  if (!current) {
    state.equippedGear[equipment.slot] = equipment;
    recomputeGearStats();
    addLoot(equipment.name, `${equipment.quality}${equipment.slot}自动装备。`, "good");
    recordRunEvent("装备", `获得并装备 ${equipment.name}`);
  } else {
    state.candidateGear.unshift(equipment);
    state.candidateGear = state.candidateGear.slice(0, 8);
    state.currentCandidateId = equipment.uid;
    addLoot(equipment.name, `${equipment.quality}${equipment.slot}进入候选栏，等待对比。`);
    showGearModal(equipment.uid);
    recordRunEvent("装备", `${equipment.name} 进入候选栏`);
  }
  renderEquipment();
  renderCandidateGear();
  renderBuildSummary();
}

function recomputeGearStats() {
  const next = emptyStats();
  Object.values(state.equippedGear).forEach(item => {
    Object.entries(item.stats || {}).forEach(([key, value]) => {
      if (key === "maxHp") return;
      next[key] = (next[key] || 0) + value;
    });
  });
  const hpBonus = Object.values(state.equippedGear).reduce((sum, item) => sum + (item.stats?.maxHp || 0), 0);
  const previousMax = state.maxHp;
  state.gearStats = next;
  state.maxHp = state.selectedClass.maxHp + hpBonus + (state.upgradeStats.maxHp || 0);
  state.hp = Math.min(state.maxHp, state.hp + Math.max(0, state.maxHp - previousMax));
  combineStats();
}

function scoreFit(equipment) {
  const mainTag = getMainBuildTag();
  let fit = equipment.score;
  equipment.tags.forEach(tag => {
    if (state.selectedClass.tags.includes(tag)) fit += 10;
    if (tag === mainTag) fit += 12;
    if (state.equippedRelics.some(id => getRelic(id)?.tags.includes(tag))) fit += 6;
  });
  return fit;
}

function getGearRecommendation(candidate, current) {
  const candidateScore = scoreFit(candidate);
  const currentScore = current ? scoreFit(current) : 0;
  if (!current) return "空位，推荐装备";
  if (candidateScore >= currentScore + 8) return "推荐替换";
  if (candidateScore + 8 < currentScore) return "建议留到结算";
  return "各有侧重";
}

function replaceWithCandidate(uid = state.currentCandidateId) {
  const candidate = state.candidateGear.find(item => item.uid === uid);
  if (!candidate) return;
  const previous = state.equippedGear[candidate.slot];
  state.equippedGear[candidate.slot] = candidate;
  state.candidateGear = state.candidateGear.filter(item => item.uid !== uid);
  if (previous) state.candidateGear.unshift(previous);
  state.currentCandidateId = null;
  recomputeGearStats();
  hideGearModal();
  addLoot("装备替换", `${candidate.slot}替换为${candidate.name}。`, "good");
  recordRunEvent("装备", `替换 ${candidate.slot} 为 ${candidate.name}`);
  renderEquipment();
  renderCandidateGear();
  renderBuildSummary();
  updateUi();
}

function keepCandidate() {
  state.currentCandidateId = null;
  hideGearModal();
  addLoot("装备保留", "候选装备留到结算处理。");
}

function updateMovement(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  const speed = state.selectedClass.moveSpeed * (1 + state.stats.moveSpeedPct);
  state.player.x = Math.max(state.player.radius, Math.min(canvas.width - state.player.radius, state.player.x + (dx / len) * speed * dt));
  state.player.y = Math.max(state.player.radius, Math.min(canvas.height - state.player.radius, state.player.y + (dy / len) * speed * dt));
}

function updateEnemies(dt) {
  state.enemies.forEach(enemy => {
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.aiTimer -= dt;
    enemy.chargeTimer = Math.max(0, enemy.chargeTimer - dt);
    if (enemy.chargeState === "charging" && enemy.chargeTimer <= 0) enemy.chargeState = "idle";
    updateEnemyAbility(enemy);
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const slowFactor = enemy.slow > 0 ? 0.55 : 1;
    let moveSpeed = enemy.speed * slowFactor;
    if (enemy.behavior === "ranged" && distance(enemy, state.player) < 240) moveSpeed *= 0.2;
    if (enemy.chargeState === "charging") {
      const cdx = enemy.targetX - enemy.x;
      const cdy = enemy.targetY - enemy.y;
      const clen = Math.hypot(cdx, cdy) || 1;
      enemy.x += (cdx / clen) * enemy.speed * 3.4 * dt;
      enemy.y += (cdy / clen) * enemy.speed * 3.4 * dt;
    } else {
      enemy.x += (dx / len) * moveSpeed * dt;
      enemy.y += (dy / len) * moveSpeed * dt;
    }
    if (distance(enemy, state.player) < enemy.radius + state.player.radius) {
      takeDamage(enemy.damage * (1 + state.stats.damageTaken) * dt);
      enemy.x -= (dx / len) * 54 * dt;
      enemy.y -= (dy / len) * 54 * dt;
    }
  });
}

function updateEnemyAbility(enemy) {
  if (enemy.aiTimer > 0) return;
  if (enemy.behavior === "ranged") {
    fireEnemyProjectile(enemy);
    enemy.aiTimer = 2.6;
  }
  if (enemy.behavior === "bomber" && distance(enemy, state.player) < 115) {
    addHazard({ kind: "circle", x: enemy.x, y: enemy.y, r: 72, damage: enemy.damage * 1.2, life: 1.05, color: "#d86854" });
    enemy.hp = 0;
    killEnemy(enemy, "bomber");
    enemy.aiTimer = 99;
  }
  if (enemy.behavior === "charger") {
    enemy.targetX = state.player.x;
    enemy.targetY = state.player.y;
    enemy.chargeState = "charging";
    enemy.chargeTimer = 0.55;
    addHazard({ kind: "line", x1: enemy.x, y1: enemy.y, x2: enemy.targetX, y2: enemy.targetY, width: 46, damage: enemy.damage * 2.1, telegraph: 0.45, life: 0.95, color: "#d8b45a" });
    enemy.aiTimer = 3.2;
  }
  if (enemy.behavior === "stone_boss") {
    addHazard({ kind: "circle", x: state.player.x, y: state.player.y, r: 95, damage: enemy.damage * 2.2, life: 1.15, color: "#b95d4a" });
    enemy.aiTimer = 3.4;
  }
  if (enemy.behavior === "storm_boss") {
    for (let i = 0; i < 3; i += 1) {
      addHazard({
        kind: "circle",
        x: Math.max(70, Math.min(canvas.width - 70, state.player.x + (Math.random() - 0.5) * 260)),
        y: Math.max(70, Math.min(canvas.height - 70, state.player.y + (Math.random() - 0.5) * 220)),
        r: 72,
        damage: enemy.damage * 1.5,
        life: 1.05,
        color: "#8062d6"
      });
    }
    enemy.aiTimer = 3.0;
  }
}

function fireEnemyProjectile(enemy) {
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  state.enemyProjectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / len) * 220,
    vy: (dy / len) * 220,
    radius: 5,
    damage: enemy.damage * 1.1,
    life: 3,
    color: "#9aa7d9"
  });
}

function takeDamage(amount) {
  const shieldBlock = Math.min(state.shield, amount);
  state.shield -= shieldBlock;
  state.hp -= amount - shieldBlock;
}

function triggerActiveRelic(id) {
  const relic = getRelic(id);
  if (!relic || relic.trigger !== "active") return;
  if ((state.activeRelicCooldowns[id] || 0) > 0) {
    addLoot(relic.name, `冷却中，还需 ${Math.ceil(state.activeRelicCooldowns[id])} 秒。`);
    return;
  }
  if (id === "bell") {
    state.enemies.forEach(enemy => {
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      enemy.x += dx * 0.24;
      enemy.y += dy * 0.24;
    });
    state.bellWindow = 3;
    state.activeRelicCooldowns[id] = relic.cooldown;
    addEffect({ kind: "circle", x: state.player.x, y: state.player.y, r: 190, life: 0.35, color: "#d8b45a" });
    addLoot("聚妖铃", `3 秒聚怪收益窗口，普通掉落期望 +${15 + Math.round(state.stats.bellBonus * 100)}%。`, "good");
  }
}

function updateProjectiles(dt) {
  state.projectiles.forEach(projectile => {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    state.enemies.forEach(enemy => {
      if (projectile.dead || projectile.hit.has(enemy)) return;
      if (distance(projectile, enemy) > enemy.radius + projectile.radius) return;
      damageEnemy(enemy, projectile.damage, "sword");
      projectile.hit.add(enemy);
      projectile.pierceLeft -= 1;
      if (projectile.crit && state.stats.shadow) {
        addEffect({ kind: "line", x1: projectile.x, y1: projectile.y, x2: enemy.x, y2: enemy.y, life: 0.18, color: "#fff0a6" });
        const extra = nearestEnemy(enemy, new Set([enemy]));
        if (extra) damageEnemy(extra, projectile.damage * 0.45, "shadow");
      }
      if (projectile.pierceLeft < 0) projectile.dead = true;
    });
    if (projectile.life <= 0) projectile.dead = true;
  });
  state.projectiles = state.projectiles.filter(projectile => !projectile.dead);
}

function updateEnemyProjectiles(dt) {
  state.enemyProjectiles.forEach(projectile => {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (distance(projectile, state.player) < projectile.radius + state.player.radius) {
      takeDamage(projectile.damage);
      projectile.dead = true;
    }
  });
  state.enemyProjectiles = state.enemyProjectiles.filter(projectile => !projectile.dead && projectile.life > 0);
}

function pointLineDistance(point, line) {
  const ax = line.x1;
  const ay = line.y1;
  const bx = line.x2;
  const by = line.y2;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq));
  return Math.hypot(point.x - (ax + dx * t), point.y - (ay + dy * t));
}

function updateHazards(dt) {
  state.hazards.forEach(hazard => {
    hazard.life -= dt;
    hazard.telegraph -= dt;
    if (hazard.telegraph <= 0 && !hazard.triggered) {
      const hit = hazard.kind === "line"
        ? pointLineDistance(state.player, hazard) <= (hazard.width || 40) / 2 + state.player.radius
        : distance(hazard, state.player) <= hazard.r + state.player.radius;
      if (hit) takeDamage(hazard.damage);
      hazard.triggered = true;
    }
  });
  state.hazards = state.hazards.filter(hazard => hazard.life > 0);
}

function updateSchedule() {
  state.trialMode.schedule.forEach(item => {
    const key = `${item.kind}:${item.time}:${item.enemy || item.text}`;
    if (state.scheduleFired.includes(key) || state.time < item.time) return;
    state.scheduleFired.push(key);
    if (item.kind === "warning") spawnWarning(item.text);
    if (item.kind === "spawn") {
      spawnEnemy(item.enemy);
      addLoot("强敌登场", item.text, "danger");
      recordRunEvent("强敌", item.text);
    }
  });
}

function updateRelics(dt) {
  Object.keys(state.activeRelicCooldowns).forEach(id => {
    state.activeRelicCooldowns[id] = Math.max(0, state.activeRelicCooldowns[id] - dt);
  });
  state.bellWindow = Math.max(0, state.bellWindow - dt);
  if (state.equippedRelics.includes("gourd")) {
    state.gourdTimer = Math.max(0, state.gourdTimer - dt);
    if (state.hp / state.maxHp < 0.4 && state.gourdTimer <= 0) {
      state.hp = Math.min(state.maxHp, state.hp + state.maxHp * 0.25);
      state.gourdTimer = getRelic("gourd").cooldown;
      addEffect({ kind: "circle", x: state.player.x, y: state.player.y, r: 110, life: 0.45, color: "#7fc96d" });
      addLoot("回春葫芦", "低血触发回复。", "good");
    }
  }
  state.equippedRelics.forEach(id => {
    const relic = DATA.RELICS.find(item => item.id === id);
    if (!relic || relic.trigger !== "auto") return;
    state.relicTimers[id] = (state.relicTimers[id] || relic.cooldown) - dt * (1 + state.stats.relicHaste);
    if (state.relicTimers[id] > 0) return;
    state.relicTimers[id] = relic.cooldown;
    if (id === "qf_box") {
      for (let i = -1; i <= 1; i += 1) {
        const angle = Math.atan2((nearestEnemy()?.y || state.player.y) - state.player.y, (nearestEnemy()?.x || state.player.x + 1) - state.player.x) + i * 0.18;
        state.projectiles.push({
          kind: "sword",
          x: state.player.x,
          y: state.player.y,
          vx: Math.cos(angle) * 560,
          vy: Math.sin(angle) * 560,
          life: 0.65,
          radius: 4,
          damage: getClassDamage() * 0.6,
          color: "#9fd7ff",
          pierceLeft: 2,
          hit: new Set()
        });
      }
      addLoot("青锋匣", "法宝飞剑自动出鞘。");
    }
    if (id === "thunder_pearl") {
      fireThunder();
      addLoot("引雷珠", "法宝雷击补充清怪。");
    }
    if (id === "ice_mirror") {
      state.enemies.forEach(enemy => {
        if (distance(enemy, state.player) < 220) enemy.slow = Math.max(enemy.slow, 2.5);
      });
      addEffect({ kind: "circle", x: state.player.x, y: state.player.y, r: 220, life: 0.35, color: "#8fd8ff" });
      addLoot("玄冰镜", "附近敌人被减速。");
    }
    if (id === "fire_pearl") {
      const target = [...state.enemies].sort((a, b) => b.hp - a.hp)[0];
      if (target) {
        addEffect({ kind: "blast", x: target.x, y: target.y, r: 96, damage: getClassDamage(target) * 1.8, life: 0.22, color: "#d86854" });
        addLoot("炼火珠", "高血量目标附近发生爆燃。");
      }
    }
  });
}

function update(dt) {
  if (!state.running) return;
  if (state.paused) {
    updateUi();
    return;
  }
  state.time += dt;
  state.warningTimer = Math.max(0, state.warningTimer - dt);
  state.spawnTimer -= dt;
  state.attackTimer -= dt;
  state.judgementTimer -= dt;

  updateMovement(dt);
  updateSchedule();

  const spawnRate = Math.max(0.18, 0.85 - (state.time / state.trialMode.duration) * 0.65);
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    if (state.time > state.trialMode.duration * 0.2) spawnEnemy();
    state.spawnTimer = spawnRate;
  }

  const attackInterval = state.selectedClass.attackInterval / (1 + state.stats.attackSpeedPct);
  if (state.attackTimer <= 0) {
    fireAtNearest();
    state.attackTimer = attackInterval;
  }
  if (state.stats.judgement && state.judgementTimer <= 0) {
    const target = [...state.enemies].sort((a, b) => b.hp - a.hp)[0];
    if (target) {
      damageEnemy(target, getClassDamage(target) * 2.4, "judgement");
      addEffect({ kind: "line", x1: target.x, y1: 0, x2: target.x, y2: target.y, life: 0.22, color: "#d8e8ff" });
    }
    state.judgementTimer = 12;
  }

  updateRelics(dt);
  updateEnemies(dt);
  updateEnemyProjectiles(dt);
  updateHazards(dt);
  updateProjectiles(dt);
  state.effects.forEach(effect => {
    if ((effect.kind === "zone" || effect.kind === "blast") && effect.damage) {
      effect.tick = (effect.tick || 0) - dt;
      if (effect.kind === "blast" || effect.tick <= 0) {
        state.enemies.forEach(enemy => {
          if (distance(effect, enemy) <= effect.r + enemy.radius) damageEnemy(enemy, effect.damage, effect.kind);
        });
        effect.tick = 0.45;
        if (effect.kind === "blast") effect.damage = 0;
      }
    }
    effect.life -= dt;
  });
  state.effects = state.effects.filter(effect => effect.life > 0);

  if (state.hp <= 0) endRun("death");
  if (state.time >= state.trialMode.duration) endRun("time");
  updateUi();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0e1514";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(216,180,90,0.14)";
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  state.effects.forEach(effect => {
    ctx.globalAlpha = Math.max(0.1, effect.life * 5);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = effect.kind === "line" ? 4 : 2;
    ctx.beginPath();
    if (effect.kind === "line") {
      ctx.moveTo(effect.x1, effect.y1);
      ctx.lineTo(effect.x2, effect.y2);
    } else {
      ctx.arc(effect.x, effect.y, effect.r, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  state.hazards.forEach(hazard => {
    ctx.globalAlpha = hazard.telegraph > 0 ? 0.28 : 0.5;
    ctx.strokeStyle = hazard.color;
    ctx.fillStyle = hazard.color;
    ctx.lineWidth = hazard.kind === "line" ? hazard.width || 40 : 3;
    ctx.beginPath();
    if (hazard.kind === "line") {
      ctx.moveTo(hazard.x1, hazard.y1);
      ctx.lineTo(hazard.x2, hazard.y2);
      ctx.stroke();
    } else {
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  state.enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.role !== "normal") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(enemy.x - 28, enemy.y - enemy.radius - 12, 56, 5);
      ctx.fillStyle = "#d8b45a";
      ctx.fillRect(enemy.x - 28, enemy.y - enemy.radius - 12, 56 * Math.max(0, enemy.hp / enemy.maxHp), 5);
    }
  });

  state.projectiles.forEach(projectile => {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  state.enemyProjectiles.forEach(projectile => {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(216,180,90,0.12)";
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 84, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = state.selectedClass.color;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111315";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.selectedClass.name[0], state.player.x, state.player.y + 5);

  if (state.warningTimer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(canvas.width / 2 - 190, 18, 380, 38);
    ctx.fillStyle = "#d8b45a";
    ctx.font = "18px sans-serif";
    ctx.fillText(state.warningText, canvas.width / 2, 43);
  }
}

let lastFrame = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function addLoot(name, desc, tone = "") {
  state.loot.unshift({ name, desc, tone });
  state.loot = state.loot.slice(0, 6);
  renderLoot();
}

function renderClassList() {
  const container = document.getElementById("classList");
  container.innerHTML = "";
  DATA.CLASSES.forEach(item => {
    const button = document.createElement("button");
    button.className = `choice-card ${item.id === state.selectedClass.id ? "selected" : ""}`;
    button.innerHTML = `<strong>${item.name}</strong><span>${item.desc}</span><br>${item.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}`;
    button.addEventListener("click", () => chooseClass(item.id));
    container.appendChild(button);
  });
}

function renderDifficultyList() {
  const container = document.getElementById("difficultyList");
  container.innerHTML = "";
  DATA.TRIAL_TIERS.forEach(item => {
    const button = document.createElement("button");
    button.className = item.id === state.difficulty.id ? "active" : "";
    button.textContent = item.name;
    button.addEventListener("click", () => chooseDifficulty(item.id));
    container.appendChild(button);
  });
}

function renderModeList() {
  const container = document.getElementById("modeList");
  container.innerHTML = "";
  DATA.TRIAL_MODES.forEach(item => {
    const button = document.createElement("button");
    button.className = item.id === state.trialMode.id ? "active" : "";
    button.textContent = item.name;
    button.addEventListener("click", () => chooseMode(item.id));
    container.appendChild(button);
  });
}

function renderLoot() {
  const container = document.getElementById("lootList");
  container.innerHTML = "";
  state.loot.forEach(item => {
    const card = document.createElement("div");
    card.className = "loot-card";
    card.innerHTML = `<strong class="${item.tone}">${item.name}</strong><span>${item.desc}</span>`;
    container.appendChild(card);
  });
}

function renderBuildSummary() {
  const container = document.getElementById("buildSummary");
  const counts = getTagCounts();
  const relics = state.equippedRelics.map(id => DATA.RELICS.find(item => item.id === id)?.name).filter(Boolean).join(" / ");
  container.innerHTML = `
    <div class="choice-card selected"><strong>${state.selectedClass.name}</strong><span>${state.selectedClass.weapon} · ${state.selectedClass.desc}</span></div>
    <div class="choice-card"><strong>携带法宝</strong><span>${relics}</span></div>
    <div class="choice-card"><strong>构筑倾向</strong><span>${Object.entries(counts).map(([tag, count]) => `${tag} x${count}`).join(" / ") || "尚未形成BD"}</span></div>
    <div class="choice-card"><strong>付费验证点</strong><span>洗练次数、月卡、首充礼包、法宝养成包点击。免费路径保留完整掉落。</span></div>
  `;
}

function renderEquipment() {
  const container = document.getElementById("equipmentGrid");
  container.innerHTML = "";
  DATA.EQUIPMENT_SLOTS.forEach(slot => {
    const item = state.equippedGear[slot];
    const card = document.createElement("div");
    card.className = `equipment-card ${item ? "" : "empty"}`;
    card.innerHTML = item
      ? `<strong>${slot} · ${item.name}</strong><span>${item.quality} · 评分 ${scoreFit(item)} · ${item.main}</span><span>${item.special}</span>`
      : `<strong>${slot}</strong><span>空位，获得同部位装备后自动穿戴。</span>`;
    container.appendChild(card);
  });
}

function renderCandidateGear() {
  const container = document.getElementById("candidateGearList");
  container.innerHTML = "";
  if (!state.candidateGear.length) {
    container.innerHTML = `<div class="loot-card"><strong>暂无候选</strong><span>同部位掉落会进入这里，不会自动覆盖当前装备。</span></div>`;
    return;
  }
  state.candidateGear.forEach(item => {
    const current = state.equippedGear[item.slot];
    const card = document.createElement("button");
    card.className = "loot-card";
    card.innerHTML = `<strong>${item.name}</strong><span>${item.quality}${item.slot} · ${getGearRecommendation(item, current)} · 评分 ${scoreFit(item)}</span>`;
    card.addEventListener("click", () => showGearModal(item.uid));
    container.appendChild(card);
  });
}

function gearCardHtml(title, item) {
  if (!item) return `<div class="equipment-card empty"><strong>${title}</strong><span>空位</span></div>`;
  return `
    <div class="equipment-card">
      <strong>${title} · ${item.name}</strong>
      <span>${item.quality}${item.slot} · 适配评分 ${scoreFit(item)}</span>
      <span>${item.main}</span>
      <span>${(item.sub || []).join(" / ")}</span>
      <span>${item.special}</span>
    </div>
  `;
}

function showGearModal(uid) {
  const candidate = state.candidateGear.find(item => item.uid === uid);
  if (!candidate) return;
  state.currentCandidateId = uid;
  const current = state.equippedGear[candidate.slot];
  document.getElementById("gearHint").textContent = getGearRecommendation(candidate, current);
  document.getElementById("gearCompareBody").innerHTML = `
    ${gearCardHtml("当前", current)}
    ${gearCardHtml("候选", candidate)}
  `;
  document.getElementById("gearModal").classList.remove("hidden");
}

function hideGearModal() {
  document.getElementById("gearModal").classList.add("hidden");
}

function showSummaryModal() {
  if (!state.result) return;
  document.getElementById("summaryTitle").textContent = state.result.title;
  document.getElementById("summaryHint").textContent = state.result.nextStep;
  const gear = state.result.gearHighlights.length
    ? state.result.gearHighlights.map(item => `${item.name}(${item.slot}/${scoreFit(item)})`).join(" / ")
    : "本局未获得高价值装备";
  const events = state.runEvents.length
    ? state.runEvents.map(item => `${item.time} ${item.type}: ${item.text}`).join("<br>")
    : "暂无关键事件";
  document.getElementById("summaryBody").innerHTML = `
    <div class="equipment-card"><strong>战斗结果</strong><span>存活 ${state.result.survival} · 击杀 ${state.result.kills} · 职业经验 +${state.result.classXp}</span></div>
    <div class="equipment-card"><strong>构筑复盘</strong><span>主流派 ${state.result.mainBuild} · 最高输出来源 ${state.result.output}</span></div>
    <div class="equipment-card"><strong>装备亮点</strong><span>${gear}</span></div>
    <div class="equipment-card"><strong>关键节点</strong><span>${events}</span></div>
  `;
  document.getElementById("summaryModal").classList.remove("hidden");
}

function hideSummaryModal() {
  document.getElementById("summaryModal").classList.add("hidden");
}

function renderRelicStatus() {
  const container = document.getElementById("relicStatus");
  container.innerHTML = "";
  state.equippedRelics.forEach(id => {
    const relic = getRelic(id);
    if (!relic) return;
    const activeCd = state.activeRelicCooldowns[id] || 0;
    const autoCd = state.relicTimers[id] || 0;
    const cd = relic.trigger === "active" ? activeCd : autoCd;
    const label = relic.trigger === "active"
      ? cd > 0 ? `${Math.ceil(cd)} 秒` : "空格释放"
      : cd > 0 ? `${Math.ceil(cd)} 秒` : "即将触发";
    const card = document.createElement("div");
    card.className = `relic-card ${cd <= 0 ? "ready" : ""}`;
    card.innerHTML = `<strong>${relic.name}</strong><span>${relic.type} · ${label}</span>`;
    container.appendChild(card);
  });
}

function renderShop() {
  const container = document.getElementById("shopList");
  container.innerHTML = "";
  DATA.SHOP_ITEMS.forEach(([name, desc]) => {
    const card = document.createElement("div");
    card.className = "shop-card";
    card.innerHTML = `<strong>${name}</strong><span>${desc}</span><br><button data-shop="${name}">模拟点击</button>`;
    container.appendChild(card);
  });
  container.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      addLoot("商业化点击", `${button.dataset.shop} 被点击，记录为首测漏斗事件。`, "good");
      logEvent("商店点击", button.dataset.shop);
    });
  });
}

function renderEventLog() {
  const container = document.getElementById("eventLogList");
  if (!container) return;
  container.innerHTML = "";
  if (!state.eventLog.length) {
    container.innerHTML = `<div class="loot-card"><strong>暂无事件</strong><span>商店、资源不足、强化、洗练、法宝养成点击会记录在这里。</span></div>`;
    return;
  }
  state.eventLog.slice(0, 8).forEach(item => {
    const card = document.createElement("div");
    card.className = "loot-card";
    card.innerHTML = `<strong>${item.name}</strong><span>${item.time} · ${item.detail}</span>`;
    container.appendChild(card);
  });
}

function renderGearManagement() {
  const container = document.getElementById("gearManageList");
  container.innerHTML = "";
  const items = state.gearBank.length ? state.gearBank : Object.values(state.equippedGear);
  if (!items.length) {
    container.innerHTML = `<div class="equipment-card empty"><strong>装备库为空</strong><span>进入试炼击败精英或Boss获取装备。</span></div>`;
    return;
  }
  items.forEach(item => {
    const equipped = state.equippedGear[item.slot]?.uid === item.uid;
    const card = document.createElement("div");
    card.className = "equipment-card";
    card.innerHTML = `
      <strong>${item.name}${equipped ? " · 已穿戴" : ""}</strong>
      <span>${item.quality}${item.slot} · 评分 ${scoreFit(item)} · ${item.main}</span>
      <span>${item.special}</span>
      <div class="card-actions">
        <button data-action="equip" data-uid="${item.uid}">穿戴</button>
        <button data-action="forge" data-uid="${item.uid}">强化</button>
        <button data-action="wash" data-uid="${item.uid}">洗练</button>
        <button data-action="break" data-uid="${item.uid}">分解</button>
      </div>
    `;
    container.appendChild(card);
  });
  container.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => handleGearAction(button.dataset.action, button.dataset.uid));
  });
}

function findGear(uid) {
  return state.gearBank.find(item => item.uid === uid) || Object.values(state.equippedGear).find(item => item.uid === uid);
}

function handleGearAction(action, uid) {
  const item = findGear(uid);
  if (!item) return;
  if (action === "equip") {
    state.equippedGear[item.slot] = item;
    recomputeGearStats();
    logEvent("装备穿戴", item.name);
  }
  if (action === "forge") {
    if (state.jade < 60) return showCommerceModal("灵石不足", "强化装备需要灵石，可通过试炼结算获得，也可点击月卡或首充入口。", "月卡");
    state.jade -= 60;
    item.score += 4;
    item.main = `${item.main} · 强化+1`;
    logEvent("装备强化", `${item.name} 消耗60灵石`);
  }
  if (action === "wash") {
    if (state.rerollStone < 1 || state.jade < 30) return showCommerceModal("洗练石不足", "洗练词条需要洗练石和灵石，可继续试炼或点击洗练礼包入口。", "洗练礼包");
    state.rerollStone -= 1;
    state.jade -= 30;
    item.sub = ["洗练后副词条提升"];
    item.score += 2;
    logEvent("装备洗练", `${item.name} 消耗洗练石和灵石`);
  }
  if (action === "break") {
    if (state.equippedGear[item.slot]?.uid === uid) delete state.equippedGear[item.slot];
    state.gearBank = state.gearBank.filter(gear => gear.uid !== uid);
    state.candidateGear = state.candidateGear.filter(gear => gear.uid !== uid);
    state.jade += 25;
    recomputeGearStats();
    logEvent("装备分解", `${item.name} 获得25灵石`);
  }
  updateUi();
  renderGearManagement();
  renderBuildSummary();
}

function renderRelicManagement() {
  const container = document.getElementById("relicManageList");
  container.innerHTML = "";
  DATA.RELICS.forEach(relic => {
    const progress = state.relicProgress[relic.id];
    const selected = state.equippedRelics.includes(relic.id);
    const card = document.createElement("div");
    card.className = "equipment-card";
    card.innerHTML = `
      <strong>${relic.name}${selected ? " · 已带入" : ""}</strong>
      <span>${relic.type} · Lv.${progress.level} · ${progress.star}星</span>
      <span>${relic.tags.join(" / ")}</span>
      <div class="card-actions">
        <button data-action="select" data-id="${relic.id}">${selected ? "卸下" : "带入"}</button>
        <button data-action="level" data-id="${relic.id}">升级</button>
        <button data-action="star" data-id="${relic.id}">升星</button>
      </div>
    `;
    container.appendChild(card);
  });
  container.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => handleRelicAction(button.dataset.action, button.dataset.id));
  });
}

function handleRelicAction(action, id) {
  const progress = state.relicProgress[id];
  const relic = getRelic(id);
  if (action === "select") {
    if (state.equippedRelics.includes(id)) {
      if (state.equippedRelics.length > 1) state.equippedRelics = state.equippedRelics.filter(item => item !== id);
    } else if (state.equippedRelics.length < 2) {
      state.equippedRelics.push(id);
    } else {
      state.equippedRelics[1] = id;
    }
    logEvent("法宝选择", state.equippedRelics.map(item => getRelic(item)?.name).join(" / "));
  }
  if (action === "level") {
    if (state.jade < 80) return showCommerceModal("灵石不足", "法宝升级需要灵石，可通过试炼结算获得，也可点击法宝养成包。", "法宝养成包");
    state.jade -= 80;
    progress.level += 1;
    logEvent("法宝升级", `${relic.name} 升至 Lv.${progress.level}`);
  }
  if (action === "star") {
    if (state.starSand < 1 || state.jade < 120) return showCommerceModal("星砂不足", "法宝升星需要星砂和灵石，可继续挑战Boss或点击法宝养成包。", "法宝养成包");
    state.starSand -= 1;
    state.jade -= 120;
    progress.star += 1;
    logEvent("法宝升星", `${relic.name} 升至 ${progress.star}星`);
  }
  updateUi();
  renderRelicManagement();
  renderRelicStatus();
}

function renderClassProgress() {
  const container = document.getElementById("classProgressList");
  container.innerHTML = "";
  DATA.CLASSES.forEach(item => {
    const progress = state.classProgress[item.id];
    const talents = ["开局强化", "流派权重", "精英增伤", "高阶升级"].map((name, index) => `${index < progress.talents ? "已解锁" : "未解锁"}：${name}`).join("<br>");
    const card = document.createElement("div");
    card.className = "equipment-card";
    card.innerHTML = `
      <strong>${item.name} · Lv.${progress.level}</strong>
      <span>职业经验 ${progress.xp}/${progress.level * 80}</span>
      <span>${talents}</span>
      <span>等级5/10解锁高阶升级池提示</span>
    `;
    container.appendChild(card);
  });
}

function showCommerceModal(title, body, offer) {
  document.getElementById("commerceTitle").textContent = title;
  document.getElementById("commerceHint").textContent = body;
  document.getElementById("commerceBody").innerHTML = `
    <div class="equipment-card">
      <strong>${offer}</strong>
      <span>点击记录需求，不触发真实支付。所有资源保留免费获取路径。</span>
      <div class="card-actions"><button id="commerceOfferBtn">${offer}点击</button></div>
    </div>
  `;
  document.getElementById("commerceOfferBtn").addEventListener("click", () => {
    logEvent("资源不足入口", offer);
    addLoot("资源不足点击", `${offer} 入口被点击。`, "good");
  });
  document.getElementById("commerceModal").classList.remove("hidden");
  logEvent("资源不足", `${title} -> ${offer}`);
}

function hideCommerceModal() {
  document.getElementById("commerceModal").classList.add("hidden");
}

function renderMetrics() {
  const container = document.getElementById("metricsList");
  container.innerHTML = "";
  DATA.METRICS.forEach(([name, desc]) => {
    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
    container.appendChild(card);
  });
}

function updateUi() {
  document.getElementById("timeText").textContent = formatTime(state.time);
  document.getElementById("levelText").textContent = state.level;
  document.getElementById("killsText").textContent = state.kills;
  document.getElementById("hpText").textContent = Math.max(0, Math.ceil(state.hp + state.shield));
  document.getElementById("jadeText").textContent = state.jade;
  document.getElementById("rerollText").textContent = state.rerollStone;
  document.getElementById("starText").textContent = state.starSand;
  renderRelicStatus();
  renderEquipment();
  renderCandidateGear();
  renderGearManagement();
  renderRelicManagement();
  renderClassProgress();
  renderEventLog();
}

function setActivePanel(panel) {
  document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item.dataset.panel === panel));
  document.querySelectorAll(".page-panel").forEach(item => item.classList.remove("active"));
  document.getElementById(`${panel}Panel`).classList.add("active");
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      setActivePanel(tab.dataset.panel);
    });
  });
}

document.addEventListener("keydown", event => {
  keys.add(event.code);
  if (event.code === "Space") {
    if (event.preventDefault) event.preventDefault();
    if (state.running && !state.paused && state.equippedRelics.includes("bell")) triggerActiveRelic("bell");
  }
});
document.addEventListener("keyup", event => keys.delete(event.code));
document.getElementById("startBtn").addEventListener("click", resetRun);
document.getElementById("endBtn").addEventListener("click", () => endRun("manual"));
document.getElementById("rerollBtn").addEventListener("click", rerollChoices);
document.getElementById("upgradeRerollBtn").addEventListener("click", rerollChoices);
document.getElementById("equipCandidateBtn").addEventListener("click", () => replaceWithCandidate());
document.getElementById("keepCandidateBtn").addEventListener("click", keepCandidate);
document.getElementById("closeSummaryBtn").addEventListener("click", hideSummaryModal);
document.getElementById("summaryAgainBtn").addEventListener("click", resetRun);
document.getElementById("summaryForgeBtn").addEventListener("click", () => {
  hideSummaryModal();
  setActivePanel("gear");
  logEvent("结算按钮", "强化装备");
});
document.getElementById("summaryRerollBtn").addEventListener("click", () => {
  hideSummaryModal();
  setActivePanel("gear");
  logEvent("结算按钮", "洗练词条");
});
document.getElementById("summaryRelicBtn").addEventListener("click", () => {
  hideSummaryModal();
  setActivePanel("relics");
  logEvent("结算按钮", "升级法宝");
});
document.getElementById("closeCommerceBtn").addEventListener("click", hideCommerceModal);

initMetaProgress();
loadEventLog();
state.stats = createStats();
renderClassList();
renderDifficultyList();
renderModeList();
clearUpgradeChoices();
renderLoot();
renderBuildSummary();
renderRelicStatus();
renderEquipment();
renderCandidateGear();
renderGearManagement();
renderRelicManagement();
renderClassProgress();
renderShop();
renderMetrics();
renderEventLog();
bindTabs();
requestAnimationFrame(loop);
