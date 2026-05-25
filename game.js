const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const DATA = window.GAME_DATA;

const keys = new Set();

const state = {
  screen: "prep",
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
  mouseMove: { active: false, x: 480, y: 270 },
  playerFlash: 0,
  hp: 100,
  maxHp: 100,
  shield: 0,
  enemies: [],
  enemyProjectiles: [],
  hazards: [],
  projectiles: [],
  effects: [],
  floatTexts: [],
  pickups: [],
  rewardQueue: [],
  activeReward: null,
  gearPopupCount: 0,
  gearPopupWindows: { early: 0, mid: 0, late: 0 },
  gearNotice: null,
  loot: [],
  build: [],
  upgradeLevels: {},
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
  guaranteedShadowTimer: 0,
  relicBoostTimer: 0,
  relicThunderBoost: 0,
  relicEmpoweredAttack: 0,
  swordPierceHits: 0,
  swordCastCount: 0,
  swordRingTimer: 0,
  strengthSources: [],
  relicSkillStats: {},
  gearSkillStats: {},
  skillNotice: { relic: null, gear: [] },
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
    returnBlade: 0,
    fieldDamage: 0,
    judgement: 0,
    slowOnHit: 0,
    thunderBurst: 0,
    critCleave: 0,
    critRefund: 0,
    overhealShield: 0,
    wideSwordEvery: 0,
    thunderStaffArc: 0,
    swordRingShadow: 0,
    paralyzeDamage: 0,
    smartParalyze: 0,
    spiritCharmCharge: 0,
    relicJadeEmpower: 0
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
    returnBlade: 0,
    fieldDamage: 0,
    judgement: 0,
    slowOnHit: 0,
    thunderBurst: 0,
    critCleave: 0,
    critRefund: 0,
    overhealShield: 0,
    wideSwordEvery: 0,
    thunderStaffArc: 0,
    swordRingShadow: 0,
    paralyzeDamage: 0,
    smartParalyze: 0,
    spiritCharmCharge: 0,
    relicJadeEmpower: 0,
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

function addStrengthSource(text) {
  if (!text || state.strengthSources.includes(text)) return;
  state.strengthSources.unshift(text);
  state.strengthSources = state.strengthSources.slice(0, 10);
}

function trackSkillStat(kind, key, label, amount = 1) {
  const bucket = kind === "relic" ? state.relicSkillStats : state.gearSkillStats;
  if (!bucket[key]) bucket[key] = { label, count: 0, impact: 0 };
  bucket[key].count += 1;
  bucket[key].impact += amount;
}

function showSkillNotice(kind, key, text) {
  const now = state.time;
  if (kind === "relic") {
    state.skillNotice.relic = { key, text, count: (state.skillNotice.relic?.key === key ? state.skillNotice.relic.count + 1 : 1), life: 2.2, time: now };
    return;
  }
  const existing = state.skillNotice.gear.find(item => item.key === key);
  if (existing && now - existing.time < 3) {
    existing.count += 1;
    existing.life = 1.8;
    existing.time = now;
    return;
  }
  state.skillNotice.gear.unshift({ key, text, count: 1, life: 1.8, time: now });
  state.skillNotice.gear = state.skillNotice.gear.slice(0, 2);
}

function tickSkillNotice(dt) {
  if (state.skillNotice.relic) {
    state.skillNotice.relic.life -= dt;
    if (state.skillNotice.relic.life <= 0) state.skillNotice.relic = null;
  }
  state.skillNotice.gear.forEach(item => { item.life -= dt; });
  state.skillNotice.gear = state.skillNotice.gear.filter(item => item.life > 0).slice(0, 2);
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
  setScreen("battle");
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
  state.floatTexts = [];
  state.pickups = [];
  state.rewardQueue = [];
  state.activeReward = null;
  state.gearPopupCount = 0;
  state.gearPopupWindows = { early: 0, mid: 0, late: 0 };
  state.gearNotice = null;
  state.playerFlash = 0;
  state.mouseMove = { active: false, x: canvas.width / 2, y: canvas.height / 2 };
  state.loot = [];
  state.build = [];
  state.upgradeLevels = {};
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
  state.guaranteedShadowTimer = 0;
  state.relicBoostTimer = 0;
  state.relicThunderBoost = 0;
  state.relicEmpoweredAttack = 0;
  state.swordPierceHits = 0;
  state.swordCastCount = 0;
  state.swordRingTimer = 0;
  state.strengthSources = [];
  state.relicSkillStats = {};
  state.gearSkillStats = {};
  state.skillNotice = { relic: null, gear: [] };
  state.scheduleFired = [];
  state.warningText = "";
  state.warningTimer = 0;
  state.judgementTimer = 0;
  clearUpgradeChoices();
  hideGearModal();
  const candidate = {};
  if (candidate.mechanic) {
    addStrengthSource(`${candidate.name}：${candidate.mechanic}`);
    showGearNotice(`获得机制：${candidate.mechanic}`);
  }
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
  state.rewardQueue = [];
  state.activeReward = null;
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
    .filter(item => isUpgradeAvailable(item))
    .filter(item => isUpgradeAllowedForClass(item))
    .map(item => {
      let weight = item.type === "basic" ? 1.15 : item.type === "advanced" ? 0.85 : 1;
      if (item.tags.includes(classTag)) weight += 3;
      item.tags.forEach(tag => {
        weight += counts[tag] || 0;
        if ((counts[tag] || 0) >= 2) weight += 2;
      });
      if (state.equippedRelics.some(id => DATA.RELICS.find(relic => relic.id === id)?.tags.some(tag => item.tags.includes(tag)))) {
        weight += 1;
      }
      return { item, weight };
    });
}

function isUpgradeAvailable(upgrade) {
  const level = state.upgradeLevels[upgrade.id] || 0;
  const maxLevel = upgrade.maxLevel || 1;
  if (level >= maxLevel) return false;
  if (upgrade.type !== "basic" && level > 0) return false;
  if (upgrade.requiresTags?.length) {
    const counts = getTagCounts();
    return upgrade.requiresTags.some(tag => (counts[tag] || 0) >= 3);
  }
  return true;
}

function isUpgradeAllowedForClass(upgrade) {
  const classTags = DATA.CLASSES.map(item => item.name);
  const blockedClassTags = classTags.filter(tag => tag !== state.selectedClass.name);
  return !upgrade.tags.some(tag => blockedClassTags.includes(tag));
}

function pickUpgrades() {
  let pool = weightedUpgrades();
  const picked = [];
  const classPool = pool.filter(entry => entry.item.tags.includes(state.selectedClass.name));
  if (classPool.length) {
    const first = takeWeighted(classPool);
    picked.push(first.item);
    pool = pool.filter(entry => entry.item.id !== first.item.id);
  }
  while (picked.length < 3 && pool.length) {
    const next = takeWeighted(pool);
    picked.push(next.item);
    pool = pool.filter(entry => entry.item.id !== next.item.id);
  }
  return picked;
}

function takeWeighted(pool) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  const index = pool.findIndex(entry => {
    roll -= entry.weight;
    return roll <= 0;
  });
  return pool[Math.max(0, index)];
}

function clearUpgradeChoices() {
  state.pendingUpgrades = [];
  const container = document.getElementById("upgradeChoices");
  container.innerHTML = `<div class="choice-card"><strong>等待突破</strong><span>击杀怪物获得灵气，升级时战斗会暂停并弹出三选一。</span></div>`;
  hideUpgradeModal();
}

function enqueueReward(reward) {
  state.rewardQueue.push(reward);
  processRewardQueue();
}

function processRewardQueue() {
  if (!state.running || state.activeReward) return;
  const reward = state.rewardQueue.shift();
  if (!reward) {
    state.paused = false;
    updateUi();
    return;
  }
  state.activeReward = reward;
  state.paused = true;
  if (reward.type === "upgrade") {
    state.pendingUpgrades = pickUpgrades();
    if (!state.pendingUpgrades.length) {
      state.activeReward = null;
      addLoot("升级跳过", "本局可选升级已全部获得，继续试炼。");
      processRewardQueue();
      return;
    }
    renderUpgradeChoices();
    showUpgradeModal();
    updateUi();
    return;
  }
  if (reward.type === "gear") {
    state.currentCandidateId = null;
    showGearModal(reward.uid);
    if (!state.currentCandidateId) {
      state.activeReward = null;
      processRewardQueue();
      return;
    }
    updateUi();
  }
}

function completeReward(type) {
  if (state.activeReward?.type === type) {
    state.activeReward = null;
    processRewardQueue();
  } else if (!state.activeReward && state.rewardQueue.length === 0) {
    state.paused = false;
    updateUi();
  }
}

function offerUpgrades(options = {}) {
  if (options.pause) {
    enqueueReward({ type: "upgrade" });
    return;
  }
  state.pendingUpgrades = pickUpgrades();
  renderUpgradeChoices();
}

function renderUpgradeChoices() {
  const container = document.getElementById("upgradeChoices");
  const modalContainer = document.getElementById("modalUpgradeChoices");
  container.innerHTML = "";
  modalContainer.innerHTML = "";
  if (!state.pendingUpgrades.length) {
    const empty = document.createElement("div");
    empty.className = "choice-card";
    empty.innerHTML = `<strong>升级已满</strong><span>本局可选升级已全部获得。</span>`;
    container.appendChild(empty);
    modalContainer.appendChild(empty.cloneNode ? empty.cloneNode(true) : empty);
    return;
  }
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
  const nextLevel = (state.upgradeLevels[upgrade.id] || 0) + 1;
  const levelText = upgrade.maxLevel ? ` I/II/III`.split("/")[nextLevel - 1] || ` Lv.${nextLevel}` : "";
  const typeName = { basic: "基础强化", mechanic: "机制升级", advanced: "成型进阶" }[upgrade.type] || "升级";
  card.innerHTML = `<strong>${upgrade.name}${levelText}</strong><span>${typeName} · ${upgrade.desc}</span><br>${upgrade.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}`;
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
  const nextLevel = (state.upgradeLevels[upgrade.id] || 0) + 1;
  state.upgradeLevels[upgrade.id] = nextLevel;
  state.build.push({ ...upgrade, level: nextLevel });
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
  clearUpgradeChoices();
  renderBuildSummary();
  updateUi();
  completeReward("upgrade");
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
  state.pendingUpgrades = pickUpgrades();
  if (!state.pendingUpgrades.length) {
    clearUpgradeChoices();
    addLoot("升级跳过", "本局可选升级已全部获得，继续试炼。");
    completeReward("upgrade");
    updateUi();
    return;
  }
  renderUpgradeChoices();
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

function addSlashEffect(x, y, angle, color = "#fff0a6", label = "") {
  addEffect({
    kind: "slash",
    x,
    y,
    angle,
    r: 38,
    life: 0.26,
    color,
    label
  });
}

function addRelicPulse(id, x = state.player.x, y = state.player.y) {
  const visuals = {
    qf_box: { color: "#9fd7ff", r: 132, label: "剑匣" },
    thunder_pearl: { color: "#60b6ff", r: 150, label: "引雷" },
    gourd: { color: "#7fc96d", r: 118, label: "回春" },
    ice_mirror: { color: "#8fd8ff", r: 220, label: "玄冰" },
    bell: { color: "#d8b45a", r: 190, label: "聚妖" },
    fire_pearl: { color: "#d86854", r: 124, label: "炼火" }
  };
  const visual = visuals[id] || { color: "#f3efe1", r: 120, label: "法宝" };
  addEffect({ kind: "relic", x, y, r: visual.r, life: 0.58, color: visual.color, label: visual.label });
  const relic = getRelic(id);
  if (relic) {
    const label = `${relic.name}：${relic.skillName || visual.label}`;
    trackSkillStat("relic", id, label);
    showSkillNotice("relic", id, label);
    addStrengthSource(label);
  }
}

function activateRelicCombatBoost(id) {
  state.relicBoostTimer = 2;
  if (state.selectedClass.id === "thunder") state.relicThunderBoost = 1;
  if (state.stats.relicJadeEmpower) {
    state.relicEmpoweredAttack = 1;
    addStrengthSource("灵宝玉：自动法宝触发后强化下次职业普攻");
    trackSkillStat("gear", "relic_jade", "灵宝玉：灵宝共振");
    showSkillNotice("gear", "relic_jade", "灵宝玉：灵宝共振");
  }
  addFloatText(state.player.x, state.player.y - 46, state.selectedClass.id === "thunder" ? "雷击+1跳" : "穿透+1", "#9fd7ff");
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
  const guaranteedShadow = state.guaranteedShadowTimer > 0;
  const relicBoost = state.relicBoostTimer > 0 && state.selectedClass.id === "sword";
  const empowered = state.relicEmpoweredAttack > 0;
  state.swordCastCount += 1;
  const wideSword = (state.stats.wideSwordEvery > 0 && state.swordCastCount % state.stats.wideSwordEvery === 0) || empowered;
  if (guaranteedShadow) state.guaranteedShadowTimer = 0;
  if (empowered) state.relicEmpoweredAttack = 0;
  state.attackSeq += 1;
  state.projectiles.push({
    kind: "sword",
    x: state.player.x,
    y: state.player.y,
    vx: (dx / len) * 620,
    vy: (dy / len) * 620,
    life: 0.72,
    radius: wideSword ? 10 : crit ? 6 : 5,
    damage: getClassDamage(target) * (crit ? state.stats.critDamage : 1) * (empowered ? 1.35 : 1),
    color: crit ? "#fff0a6" : state.selectedClass.color,
    pierceLeft: state.stats.pierce + (relicBoost ? 1 : 0) + (wideSword ? 1 : 0),
    hit: new Set(),
    crit,
    forceShadow: guaranteedShadow,
    wideSword,
    returnBlade: state.stats.returnBlade > 0,
    returned: false,
    trailTimer: 0
  });
  if (relicBoost) addStrengthSource("法宝触发后飞剑穿透 +1");
  if (wideSword) {
    addStrengthSource("青锋剑：第 5 次飞剑变为宽剑气");
    trackSkillStat("gear", "qf_sword", "青锋剑：宽剑气");
    showSkillNotice("gear", "qf_sword", "青锋剑：宽剑气");
    addSlashEffect(target.x, target.y, Math.atan2(dy, dx), "#d8b45a", "宽剑气");
  }
  if (crit) {
    addSlashEffect(target.x, target.y, Math.atan2(dy, dx), "#fff0a6", "暴击剑影");
  }
}

function fireThunder() {
  const first = nearestEnemy();
  if (!first) return;
  const hit = new Set();
  let source = state.player;
  let target = first;
  let damage = getClassDamage(target);
  const boostedJump = state.relicThunderBoost > 0 || (state.relicBoostTimer > 0 && state.selectedClass.id === "thunder");
  const jumps = 1 + state.stats.chainJumps + (boostedJump ? 1 : 0);
  if (boostedJump) {
    state.relicThunderBoost = 0;
    addStrengthSource("法宝触发后雷击额外跳跃 +1");
  }
  for (let i = 0; i < jumps && target; i += 1) {
    damageEnemy(target, damage, "thunder");
    target.hitByThunder += 1;
    if (state.stats.slowOnHit) {
      target.slow = Math.max(target.slow, 1.2);
      addEffect({ kind: "ring", x: target.x, y: target.y, r: target.radius + 10, life: 0.35, color: "#8fd8ff", label: "麻痹" });
    }
    if (state.stats.thunderBurst && target.hitByThunder >= 3) {
      target.hitByThunder = 0;
      addEffect({ kind: "blast", x: target.x, y: target.y, r: 86, damage: getClassDamage(target) * 0.8, life: 0.28, color: "#b780ff", label: "雷暴" });
      addFloatText(target.x, target.y - 26, "雷暴", "#d8e8ff");
    }
    addEffect({ kind: "line", x1: source.x, y1: source.y, x2: target.x, y2: target.y, life: 0.16, color: "#60b6ff" });
    hit.add(target);
    source = target;
    damage *= Math.max(0.25, 1 - state.stats.chainFalloff);
    if (i === jumps - 1 || !nearestEnemy(source, hit)) {
      addEffect({ kind: "blast", x: source.x, y: source.y, r: state.stats.thunderStaffArc ? 72 : 58, damage: getClassDamage(source) * (state.stats.thunderStaffArc ? 0.35 : 0.22), life: 0.24, color: "#60b6ff", label: state.stats.thunderStaffArc ? "电弧" : "终跳" });
      addStrengthSource("雷击最后一跳小范围爆炸");
      if (state.stats.thunderStaffArc) {
        trackSkillStat("gear", "thunder_staff", "引雷杖：余雷电弧");
        showSkillNotice("gear", "thunder_staff", "引雷杖：余雷电弧");
      }
    }
    target = state.stats.smartParalyze
      ? nearestParalyzedEnemy(source, hit) || nearestEnemy(source, hit)
      : nearestEnemy(source, hit);
  }
}

function nearestParalyzedEnemy(from = state.player, ignored = new Set()) {
  return state.enemies
    .filter(enemy => !ignored.has(enemy) && enemy.slow > 0)
    .map(enemy => ({ enemy, dist: distance(enemy, from) }))
    .sort((a, b) => a.dist - b.dist)[0]?.enemy;
}

function damageEnemy(enemy, amount, source) {
  const paralyzeBonus = enemy.slow > 0 ? state.stats.paralyzeDamage || 0 : 0;
  if (paralyzeBonus > 0) {
    trackSkillStat("gear", "storm_robe", "雷纹戒：雷纹导引");
    showSkillNotice("gear", "storm_robe", "雷纹戒：雷纹导引");
  }
  enemy.hp -= amount * (1 + paralyzeBonus);
  if (enemy.hp <= 0) {
    if (state.stats.thunderPool && source === "thunder") {
      const activePools = state.effects.filter(effect => effect.kind === "zone" && effect.label === "雷池");
      if (activePools.length >= 2) activePools[0].life = 0;
      addEffect({ kind: "zone", x: enemy.x, y: enemy.y, r: 62, damage: getClassDamage(enemy) * 0.18, life: 3.2, tick: 0, color: "#60b6ff", label: "雷池" });
    }
    killEnemy(enemy, source);
  }
}

function killEnemy(enemy, source = "attack") {
  if (!state.enemies.includes(enemy)) return;
  state.kills += 1;
  if (source === "swordCrit") {
    state.guaranteedShadowTimer = 3;
    addStrengthSource("剑修暴击击杀：3 秒内下一次飞剑必定剑影");
    addFloatText(enemy.x, enemy.y - 28, "剑影预备", "#fff0a6");
  }
  if (enemy.id === "storm_boss") state.bossKilled = true;
  state.xp += enemy.xp * 6 * (1 + state.stats.xpGain);
  const heal = state.maxHp * state.stats.leech;
  if (heal > 0) {
    const missing = state.maxHp - state.hp;
    state.hp = Math.min(state.maxHp, state.hp + heal);
    if (heal > missing && state.stats.overhealShield) state.shield = Math.min(30, state.shield + heal - missing);
  }
  maybeDrop(enemy, source);
  spawnPickup(enemy.x, enemy.y, "xp");
  if (Math.random() < 0.16) spawnPickup(enemy.x + 10, enemy.y - 8, "jade");
  if (Math.random() < 0.08) spawnPickup(enemy.x - 10, enemy.y + 8, "hp");
  if (Math.random() < 0.08) spawnPickup(enemy.x + 8, enemy.y + 8, "relic");
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
    strengthSources: [...state.strengthSources],
    relicSkillStats: { ...state.relicSkillStats },
    gearSkillStats: { ...state.gearSkillStats },
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
  const current = state.equippedGear[equipment.slot];
  if (!current) {
    if (!state.gearBank.some(item => item.uid === equipment.uid)) state.gearBank.unshift(equipment);
    state.equippedGear[equipment.slot] = equipment;
    recomputeGearStats();
    if (equipment.mechanic) {
      addStrengthSource(`${equipment.name}：${equipment.mechanic}`);
      showGearNotice(`获得机制：${equipment.mechanic}`);
    }
    addLoot(equipment.name, `${equipment.quality}${equipment.slot}自动装备。`, "good");
    recordRunEvent("装备", `获得并装备 ${equipment.name}`);
  } else {
    const forcePopup = shouldForceGearPopup(equipment, current);
    const highValue = isHighValueGear(equipment, current);
    if (!forcePopup && !highValue) {
      convertLowValueGear(equipment);
      renderBuildSummary();
      updateUi();
      return;
    }
    if (!state.gearBank.some(item => item.uid === equipment.uid)) state.gearBank.unshift(equipment);
    state.candidateGear.unshift(equipment);
    state.candidateGear = state.candidateGear.slice(0, 8);
    state.currentCandidateId = equipment.uid;
    addLoot(equipment.name, `${equipment.quality}${equipment.slot}进入候选栏，等待对比。`);
    if (forcePopup) {
      markGearPopupUsed();
      enqueueReward({ type: "gear", uid: equipment.uid });
    } else {
      showGearNotice(`发现高价值装备：${equipment.name}，按 E 查看。`);
    }
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

function getGearPopupWindow() {
  if (state.time < 120) return { key: "early", cap: 1 };
  if (state.time < 300) return { key: "mid", cap: 2 };
  return { key: "late", cap: 2 };
}

function isRareGear(equipment) {
  return scoreFit(equipment) >= 50;
}

function isGearBuildFit(equipment) {
  const mainTag = getMainBuildTag();
  return equipment.tags.some(tag => (
    state.selectedClass.tags.includes(tag)
    || tag === mainTag
    || state.equippedRelics.some(id => getRelic(id)?.tags.includes(tag))
  ));
}

function isHighValueGear(equipment, current) {
  const scoreDelta = scoreFit(equipment) - (current ? scoreFit(current) : 0);
  return scoreDelta >= 15 || (isRareGear(equipment) && isGearBuildFit(equipment));
}

function shouldForceGearPopup(equipment, current) {
  if (state.gearPopupCount >= 5) return false;
  const window = getGearPopupWindow();
  if ((state.gearPopupWindows[window.key] || 0) < window.cap) return true;
  return isHighValueGear(equipment, current);
}

function markGearPopupUsed() {
  const window = getGearPopupWindow();
  state.gearPopupCount += 1;
  state.gearPopupWindows[window.key] = (state.gearPopupWindows[window.key] || 0) + 1;
}

function showGearNotice(text) {
  state.gearNotice = text;
  renderGearNotice();
}

function clearGearNotice() {
  state.gearNotice = null;
  renderGearNotice();
}

function convertLowValueGear(equipment) {
  const value = Math.max(2, Math.floor(scoreFit(equipment) / 18));
  state.jade += value;
  addLoot(equipment.name, `低价值候选已转化为 ${value} 灵石。`, "good");
  addFloatText(state.player.x, state.player.y - 36, `+${value} 灵石`, "#d8b45a");
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
  if (candidate.mechanic) {
    addStrengthSource(`${candidate.name}：${candidate.mechanic}`);
    showGearNotice(`获得机制：${candidate.mechanic}`);
  }
  hideGearModal();
  addLoot("装备替换", `${candidate.slot}替换为${candidate.name}。`, "good");
  recordRunEvent("装备", `替换 ${candidate.slot} 为 ${candidate.name}`);
  renderEquipment();
  renderCandidateGear();
  renderBuildSummary();
  updateUi();
  completeReward("gear");
}

function keepCandidate() {
  state.currentCandidateId = null;
  hideGearModal();
  addLoot("装备保留", "候选装备留到结算处理。");
  completeReward("gear");
}

function updateMovement(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  const keyboardActive = dx !== 0 || dy !== 0;
  if (!keyboardActive && state.mouseMove.active) {
    dx = state.mouseMove.x - state.player.x;
    dy = state.mouseMove.y - state.player.y;
    if (Math.hypot(dx, dy) < 10) {
      dx = 0;
      dy = 0;
    }
  }
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
  state.playerFlash = 0.18;
  if (amount > 1) addFloatText(state.player.x, state.player.y - 24, `-${Math.ceil(amount)}`, "#d86854");
}

function addFloatText(x, y, text, color = "#f3efe1") {
  state.floatTexts.push({ x, y, text, color, life: 0.9 });
}

function spawnPickup(x, y, type) {
  const config = {
    xp: { label: "灵", color: "#60b6a9", value: 1 },
    hp: { label: "血", color: "#d86854", value: 1 },
    relic: { label: "息", color: "#9fd7ff", value: 1 },
    jade: { label: "石", color: "#d8b45a", value: 1 }
  }[type];
  state.pickups.push({
    x,
    y,
    type,
    label: config.label,
    color: config.color,
    value: config.value,
    radius: 7,
    magnet: false
  });
}

function triggerActiveRelic(id) {
  const relic = getRelic(id);
  if (!relic || relic.trigger !== "active") return;
  if ((state.activeRelicCooldowns[id] || 0) > 0) {
    addLoot(relic.name, `冷却中，还需 ${Math.ceil(state.activeRelicCooldowns[id])} 秒。`);
    return;
  }
  if (id === "bell") {
    addRelicPulse("bell");
    activateRelicCombatBoost("bell");
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
    projectile.trailTimer = (projectile.trailTimer || 0) - dt;
    if (projectile.kind === "sword" && state.stats.fieldDamage && projectile.trailTimer <= 0) {
      projectile.trailTimer = 0.11;
      addEffect({
        kind: "zone",
        x: projectile.x,
        y: projectile.y,
        r: 26,
        damage: projectile.damage * 0.12,
        life: 0.72,
        tick: 0,
        color: "rgba(216,180,90,0.78)",
        label: "剑痕"
      });
    }
    state.enemies.forEach(enemy => {
      if (projectile.dead || projectile.hit.has(enemy)) return;
      if (distance(projectile, enemy) > enemy.radius + projectile.radius) return;
      damageEnemy(enemy, projectile.damage, projectile.crit ? "swordCrit" : "sword");
      projectile.hit.add(enemy);
      projectile.pierceLeft -= 1;
      if (projectile.kind === "sword") {
        state.swordPierceHits += 1;
        if (state.swordPierceHits % 3 === 0) {
          addEffect({ kind: "blast", x: enemy.x, y: enemy.y, r: 70, damage: projectile.damage * 0.38, life: 0.22, color: "#d8b45a", label: "剑气" });
          addStrengthSource("剑修穿透成型：每穿透 3 个敌人释放小范围剑气");
        }
      }
      if ((projectile.crit && state.stats.shadow) || projectile.forceShadow) {
        const angle = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
        addSlashEffect(enemy.x, enemy.y, angle, "#fff0a6", projectile.forceShadow ? "必定剑影" : "追影");
        const extra = nearestEnemy(enemy, new Set([enemy]));
        if (extra) {
          addEffect({ kind: "line", x1: enemy.x, y1: enemy.y, x2: extra.x, y2: extra.y, life: 0.2, color: "#fff0a6" });
          damageEnemy(extra, projectile.damage * 0.45, "shadow");
        }
      }
      if (projectile.crit && state.stats.swordRingShadow && state.swordRingTimer <= 0) {
        const extra = nearestEnemy(enemy, new Set([enemy]));
        if (extra) {
          addSlashEffect(extra.x, extra.y, Math.atan2(extra.y - enemy.y, extra.x - enemy.x), "#f3efe1", "剑心戒");
          damageEnemy(extra, projectile.damage * 0.32, "swordRing");
          addStrengthSource("剑心戒：暴击额外生成小剑影");
          trackSkillStat("gear", "sword_ring", "剑心戒：剑心小影");
          showSkillNotice("gear", "sword_ring", "剑心戒：剑心小影");
          state.swordRingTimer = 1;
        }
      }
      if (projectile.crit && state.stats.critCleave) {
        addSlashEffect(enemy.x, enemy.y, Math.atan2(projectile.vy, projectile.vx), "#f3efe1", "连斩");
        state.enemies.forEach(target => {
          if (target !== enemy && distance(target, enemy) < 76) damageEnemy(target, projectile.damage * 0.32, "cleave");
        });
      }
      if (projectile.pierceLeft < 0) projectile.dead = true;
    });
    if (projectile.life <= 0) {
      if (projectile.returnBlade && !projectile.returned) {
        const dx = state.player.x - projectile.x;
        const dy = state.player.y - projectile.y;
        const len = Math.hypot(dx, dy) || 1;
        projectile.vx = (dx / len) * 680;
        projectile.vy = (dy / len) * 680;
        projectile.life = 0.46;
        projectile.returned = true;
        projectile.pierceLeft = Math.max(projectile.pierceLeft, 1);
        projectile.hit = new Set();
        projectile.color = "#f3efe1";
        addSlashEffect(projectile.x, projectile.y, Math.atan2(projectile.vy, projectile.vx), "#f3efe1", "回锋");
      } else {
        projectile.dead = true;
      }
    }
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

function updatePickups(dt) {
  state.pickups.forEach(item => {
    const dist = distance(item, state.player);
    if (dist < 120) item.magnet = true;
    if (item.magnet) {
      const dx = state.player.x - item.x;
      const dy = state.player.y - item.y;
      const len = Math.hypot(dx, dy) || 1;
      item.x += (dx / len) * 420 * dt;
      item.y += (dy / len) * 420 * dt;
    }
    if (dist < state.player.radius + item.radius) {
      if (item.type === "hp") {
        state.hp = Math.min(state.maxHp, state.hp + 8);
        addFloatText(state.player.x, state.player.y - 30, "+血", "#7fc96d");
      }
      if (item.type === "jade") {
        state.jade += 1;
        addFloatText(state.player.x, state.player.y - 30, "+灵石", "#d8b45a");
      }
      if (item.type === "relic") {
        Object.keys(state.relicTimers).forEach(id => {
          state.relicTimers[id] = Math.max(0, state.relicTimers[id] - (state.stats.spiritCharmCharge ? 2.4 : 1.2));
        });
        if (state.stats.spiritCharmCharge) {
          addStrengthSource("聚灵符：拾取法宝灵息额外缩短法宝冷却");
          trackSkillStat("gear", "spirit_charm", "聚灵符：灵息回流");
          showSkillNotice("gear", "spirit_charm", "聚灵符：灵息回流");
        }
        addFloatText(state.player.x, state.player.y - 30, "+灵息", "#9fd7ff");
      }
      item.dead = true;
    }
  });
  state.pickups = state.pickups.filter(item => !item.dead);
}

function updateFloatTexts(dt) {
  state.floatTexts.forEach(item => {
    item.y -= 28 * dt;
    item.life -= dt;
  });
  state.floatTexts = state.floatTexts.filter(item => item.life > 0);
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
      addRelicPulse("gourd");
      activateRelicCombatBoost("gourd");
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
      addRelicPulse("qf_box");
      activateRelicCombatBoost("qf_box");
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
      addRelicPulse("thunder_pearl");
      activateRelicCombatBoost("thunder_pearl");
      fireThunder();
      addLoot("引雷珠", "法宝雷击补充清怪。");
    }
    if (id === "ice_mirror") {
      addRelicPulse("ice_mirror");
      activateRelicCombatBoost("ice_mirror");
      state.enemies.forEach(enemy => {
        if (distance(enemy, state.player) < 220) enemy.slow = Math.max(enemy.slow, 2.5);
      });
      addEffect({ kind: "circle", x: state.player.x, y: state.player.y, r: 220, life: 0.35, color: "#8fd8ff" });
      addLoot("玄冰镜", "附近敌人被减速。");
    }
    if (id === "fire_pearl") {
      const target = [...state.enemies].sort((a, b) => b.hp - a.hp)[0];
      if (target) {
        addRelicPulse("fire_pearl", target.x, target.y);
        activateRelicCombatBoost("fire_pearl");
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
  state.guaranteedShadowTimer = Math.max(0, state.guaranteedShadowTimer - dt);
  state.relicBoostTimer = Math.max(0, state.relicBoostTimer - dt);
  state.swordRingTimer = Math.max(0, state.swordRingTimer - dt);

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
  updatePickups(dt);
  updateProjectiles(dt);
  updateFloatTexts(dt);
  tickSkillNotice(dt);
  state.playerFlash = Math.max(0, state.playerFlash - dt);
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
    ctx.fillStyle = effect.color;
    ctx.lineWidth = effect.kind === "line" ? 4 : effect.kind === "slash" ? 6 : 2;
    ctx.beginPath();
    if (effect.kind === "line") {
      ctx.moveTo(effect.x1, effect.y1);
      ctx.lineTo(effect.x2, effect.y2);
    } else if (effect.kind === "slash") {
      ctx.arc(effect.x, effect.y, effect.r, effect.angle - 0.85, effect.angle + 0.85);
    } else if (effect.kind === "relic") {
      ctx.arc(effect.x, effect.y, effect.r * (1.15 - effect.life), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0.08, effect.life * 1.6);
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.r * 0.45, 0, Math.PI * 2);
    } else {
      ctx.arc(effect.x, effect.y, effect.r, 0, Math.PI * 2);
    }
    ctx.stroke();
    if (effect.label) {
      ctx.globalAlpha = Math.max(0.18, effect.life * 2.2);
      ctx.fillStyle = effect.color;
      ctx.font = effect.kind === "relic" ? "16px sans-serif" : "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(effect.label, effect.x, effect.y - (effect.r || 24) - 8);
    }
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
    if (enemy.behavior === "runner") {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x - (state.player.x - enemy.x) * 0.05, enemy.y - (state.player.y - enemy.y) * 0.05, enemy.radius * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.role !== "normal") {
      ctx.strokeStyle = enemy.role === "boss" ? "#d86854" : "#d8b45a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.role !== "normal") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(enemy.x - 28, enemy.y - enemy.radius - 12, 56, 5);
      ctx.fillStyle = "#d8b45a";
      ctx.fillRect(enemy.x - 28, enemy.y - enemy.radius - 12, 56 * Math.max(0, enemy.hp / enemy.maxHp), 5);
    }
    if (enemy.behavior === "bomber") {
      ctx.strokeStyle = "#d86854";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 72, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#f3efe1";
    ctx.font = enemy.role === "boss" ? "13px sans-serif" : "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(enemy.name, enemy.x, enemy.y - enemy.radius - 16);
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

  state.pickups.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    if (item.type === "jade") {
      ctx.rect(item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
    } else {
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = "#111315";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.label, item.x, item.y + 3);
  });

  ctx.fillStyle = "rgba(216,180,90,0.12)";
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 84, 0, Math.PI * 2);
  ctx.fill();

  if (state.shield > 0) {
    ctx.strokeStyle = "#9fd7ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.hp / state.maxHp < 0.35) {
    ctx.strokeStyle = "rgba(216, 104, 84, 0.8)";
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  }

  ctx.fillStyle = state.playerFlash > 0 ? "#f06b5d" : state.selectedClass.color;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111315";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.selectedClass.name[0], state.player.x, state.player.y + 5);

  if (state.mouseMove.active) {
    ctx.strokeStyle = "#60b6a9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y);
    ctx.lineTo(state.mouseMove.x, state.mouseMove.y);
    ctx.stroke();
    ctx.fillStyle = "#60b6a9";
    ctx.beginPath();
    ctx.arc(state.mouseMove.x, state.mouseMove.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  state.floatTexts.forEach(item => {
    ctx.globalAlpha = Math.max(0, item.life);
    ctx.fillStyle = item.color;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.text, item.x, item.y);
    ctx.globalAlpha = 1;
  });

  if (state.warningTimer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(canvas.width / 2 - 190, 18, 380, 38);
    ctx.fillStyle = "#d8b45a";
    ctx.font = "18px sans-serif";
    ctx.fillText(state.warningText, canvas.width / 2, 43);
  }

  const notices = [
    ...(state.skillNotice.relic ? [{ ...state.skillNotice.relic, type: "relic" }] : []),
    ...state.skillNotice.gear.map(item => ({ ...item, type: "gear" }))
  ];
  notices.forEach((item, index) => {
    const y = canvas.height - 92 + index * 30;
    ctx.globalAlpha = Math.min(1, item.life);
    ctx.fillStyle = item.type === "relic" ? "rgba(96,182,255,0.2)" : "rgba(216,180,90,0.18)";
    ctx.fillRect(canvas.width / 2 - 180, y - 18, 360, 24);
    ctx.strokeStyle = item.type === "relic" ? "#60b6ff" : "#d8b45a";
    ctx.strokeRect(canvas.width / 2 - 180, y - 18, 360, 24);
    ctx.fillStyle = "#f3efe1";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${item.text}${item.count > 1 ? ` x${item.count}` : ""}`, canvas.width / 2, y - 2);
    ctx.globalAlpha = 1;
  });
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

function renderPrepSummary() {
  const container = document.getElementById("prepSummary");
  if (!container) return;
  const relics = state.equippedRelics.map(id => getRelic(id)?.name).filter(Boolean).join(" / ");
  const gearCount = Object.keys(state.equippedGear).length;
  container.innerHTML = `
    <div class="equipment-card"><strong>职业</strong><span>${state.selectedClass.name} · ${state.selectedClass.desc}</span></div>
    <div class="equipment-card"><strong>试炼</strong><span>${state.difficulty.name} · ${state.trialMode.name}</span></div>
    <div class="equipment-card"><strong>法宝</strong><span>${relics || "未选择"}</span></div>
    <div class="equipment-card"><strong>装备</strong><span>${gearCount}/6 件已穿戴</span></div>
  `;
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
    if (item?.skillName) card.insertAdjacentHTML("beforeend", `<span>装备技：${item.skillName} · ${item.triggerText || "条件触发"}</span>`);
    if (item?.mechanic) card.insertAdjacentHTML("beforeend", `<span>机制：${item.mechanic}</span>`);
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
    if (item.skillName) card.insertAdjacentHTML("beforeend", `<span>装备技：${item.skillName} · ${item.triggerText || "条件触发"}</span>`);
    if (item.mechanic) card.insertAdjacentHTML("beforeend", `<span>机制：${item.mechanic}</span>`);
    card.addEventListener("click", () => openCandidateGear(item.uid));
    container.appendChild(card);
  });
}

function renderGearNotice() {
  const notice = document.getElementById("gearNotice");
  if (!notice) return;
  notice.textContent = state.gearNotice || "";
  notice.classList.toggle("hidden", !state.gearNotice);
}

function gearCardHtml(title, item) {
  if (!item) return `<div class="equipment-card empty"><strong>${title}</strong><span>空位</span></div>`;
  return `
    <div class="equipment-card">
      <strong>${title} · ${item.name}</strong>
      <span>${item.quality}${item.slot} · 适配评分 ${scoreFit(item)}</span>
      <span>${item.main}</span>
      <span>${(item.sub || []).join(" / ")}</span>
      ${item.skillName ? `<span>装备技：${item.skillName} · ${item.triggerText || "条件触发"}</span>` : ""}
      ${item.mechanic ? `<span>机制：${item.mechanic}</span>` : ""}
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

function openCandidateGear(uid) {
  if (state.activeReward) return;
  const candidate = state.candidateGear.find(item => item.uid === uid);
  if (!candidate) return;
  state.activeReward = { type: "gear", uid, manual: true };
  if (state.running) state.paused = true;
  clearGearNotice();
  showGearModal(uid);
  updateUi();
}

function openBestCandidateGear() {
  if (state.activeReward || !state.candidateGear.length) return;
  const best = [...state.candidateGear].sort((a, b) => scoreFit(b) - scoreFit(a))[0];
  if (best) openCandidateGear(best.uid);
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
  const strengthSources = state.result.strengthSources?.length
    ? state.result.strengthSources.map(item => `• ${item}`).join("<br>")
    : "暂无明确机制来源";
  const relicStats = Object.values(state.result.relicSkillStats || {}).length
    ? Object.values(state.result.relicSkillStats).map(item => `${item.label}：触发 ${item.count} 次`).join("<br>")
    : "本局暂无法宝技统计";
  const gearStats = Object.values(state.result.gearSkillStats || {}).length
    ? Object.values(state.result.gearSkillStats).map(item => `${item.label}：触发 ${item.count} 次`).join("<br>")
    : "本局暂无装备技统计";
  document.getElementById("summaryBody").innerHTML = `
    <div class="equipment-card"><strong>战斗结果</strong><span>存活 ${state.result.survival} · 击杀 ${state.result.kills} · 职业经验 +${state.result.classXp}</span></div>
    <div class="equipment-card"><strong>构筑复盘</strong><span>主流派 ${state.result.mainBuild} · 最高输出来源 ${state.result.output}</span></div>
    <div class="equipment-card"><strong>本局变强来源</strong><span>${strengthSources}</span></div>
    <div class="equipment-card"><strong>法宝技统计</strong><span>${relicStats}</span></div>
    <div class="equipment-card"><strong>装备技统计</strong><span>${gearStats}</span></div>
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
    card.innerHTML = `<strong>${relic.name}</strong><span>${relic.skillName || relic.type} · ${label}</span>`;
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
  renderPrepSummary();
  renderEquipment();
  renderCandidateGear();
  renderGearNotice();
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

function setScreen(screen) {
  state.screen = screen;
  const layout = document.querySelector(".layout");
  if (layout) layout.dataset.screen = screen;
  document.querySelectorAll(".flow-tab").forEach(item => item.classList.toggle("active", item.dataset.screen === screen));
  if (screen === "battle") setActivePanel("play");
  if (screen === "growth") setActivePanel("build");
  if (screen === "shop") setActivePanel("shop");
  renderPrepSummary();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      setActivePanel(tab.dataset.panel);
    });
  });
  document.querySelectorAll(".flow-tab").forEach(tab => {
    tab.addEventListener("click", () => setScreen(tab.dataset.screen));
  });
}

document.addEventListener("keydown", event => {
  keys.add(event.code);
  if (event.code === "Space") {
    if (event.preventDefault) event.preventDefault();
    if (state.running && !state.paused && state.equippedRelics.includes("bell")) triggerActiveRelic("bell");
  }
  if (event.code === "KeyE") {
    if (event.preventDefault) event.preventDefault();
    openBestCandidateGear();
  }
});
document.addEventListener("keyup", event => keys.delete(event.code));
document.getElementById("startBtn").addEventListener("click", resetRun);
document.getElementById("prepStartBtn").addEventListener("click", resetRun);
document.getElementById("prepGrowthBtn").addEventListener("click", () => setScreen("growth"));
document.getElementById("prepShopBtn").addEventListener("click", () => setScreen("shop"));
document.getElementById("endBtn").addEventListener("click", () => endRun("manual"));
document.getElementById("rerollBtn").addEventListener("click", rerollChoices);
document.getElementById("upgradeRerollBtn").addEventListener("click", rerollChoices);
document.getElementById("equipCandidateBtn").addEventListener("click", () => replaceWithCandidate());
document.getElementById("keepCandidateBtn").addEventListener("click", keepCandidate);
document.getElementById("closeSummaryBtn").addEventListener("click", hideSummaryModal);
document.getElementById("summaryAgainBtn").addEventListener("click", resetRun);
document.getElementById("summaryForgeBtn").addEventListener("click", () => {
  hideSummaryModal();
  setScreen("growth");
  setActivePanel("gear");
  logEvent("结算按钮", "强化装备");
});
document.getElementById("summaryRerollBtn").addEventListener("click", () => {
  hideSummaryModal();
  setScreen("growth");
  setActivePanel("gear");
  logEvent("结算按钮", "洗练词条");
});
document.getElementById("summaryRelicBtn").addEventListener("click", () => {
  hideSummaryModal();
  setScreen("growth");
  setActivePanel("relics");
  logEvent("结算按钮", "升级法宝");
});
document.getElementById("closeCommerceBtn").addEventListener("click", hideCommerceModal);

canvas.addEventListener("mousedown", event => {
  if (event.button !== 0) return;
  const point = canvasPoint(event);
  state.mouseMove = { active: true, x: point.x, y: point.y };
});
canvas.addEventListener("mousemove", event => {
  if (!state.mouseMove.active) return;
  const point = canvasPoint(event);
  state.mouseMove.x = point.x;
  state.mouseMove.y = point.y;
});
document.addEventListener("mouseup", () => {
  state.mouseMove.active = false;
});

initMetaProgress();
loadEventLog();
state.stats = createStats();
renderClassList();
renderDifficultyList();
renderModeList();
setScreen("prep");
clearUpgradeChoices();
renderLoot();
renderBuildSummary();
renderRelicStatus();
renderPrepSummary();
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
