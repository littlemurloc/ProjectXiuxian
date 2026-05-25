const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const DATA = window.GAME_DATA;

const keys = new Set();

const state = {
  selectedClass: DATA.CLASSES[0],
  difficulty: DATA.TRIAL_TIERS[0],
  running: false,
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
  projectiles: [],
  effects: [],
  loot: [],
  build: [],
  equippedRelics: ["qf_box", "bell"],
  stats: {},
  attackTimer: 0,
  spawnTimer: 0,
  relicTimers: {},
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
  state.time = 0;
  state.level = 1;
  state.xp = 0;
  state.kills = 0;
  state.maxHp = state.selectedClass.maxHp;
  state.hp = state.maxHp;
  state.shield = 0;
  state.player = { x: canvas.width / 2, y: canvas.height / 2, radius: 16 };
  state.enemies = [];
  state.projectiles = [];
  state.effects = [];
  state.loot = [];
  state.build = [];
  state.stats = createStats();
  state.attackTimer = 0;
  state.spawnTimer = 0;
  state.relicTimers = {};
  state.judgementTimer = 0;
  offerUpgrades();
  addLoot("试炼开始", `${state.selectedClass.name}进入${state.difficulty.name}。`, "good");
  updateUi();
}

function endRun() {
  if (!state.running && state.kills === 0) return;
  state.running = false;
  const reward = Math.floor((state.kills * 2 + state.level * 20) * state.difficulty.reward);
  state.jade += reward;
  state.rerollStone += Math.max(1, Math.floor(state.kills / 35));
  state.starSand += state.kills >= 80 ? 1 : 0;
  addLoot("结算奖励", `获得 ${reward} 灵石，击杀 ${state.kills}，主流派 ${getMainBuildTag()}。`, "good");
  updateUi();
}

function chooseClass(id) {
  state.selectedClass = DATA.CLASSES.find(item => item.id === id) || DATA.CLASSES[0];
  state.equippedRelics = state.selectedClass.id === "thunder" ? ["thunder_pearl", "ice_mirror"] : ["qf_box", "bell"];
  state.stats = createStats();
  renderClassList();
  renderBuildSummary();
}

function chooseDifficulty(id) {
  state.difficulty = DATA.TRIAL_TIERS.find(item => item.id === id) || DATA.TRIAL_TIERS[0];
  renderDifficultyList();
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

function offerUpgrades() {
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

  const container = document.getElementById("upgradeChoices");
  container.innerHTML = "";
  picked.forEach(upgrade => {
    const card = document.createElement("button");
    card.className = "choice-card";
    card.innerHTML = `<strong>${upgrade.name}</strong><span>${upgrade.desc}</span><br>${upgrade.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}`;
    card.addEventListener("click", () => applyUpgrade(upgrade));
    container.appendChild(card);
  });
}

function applyUpgrade(upgrade) {
  state.build.push(upgrade);
  Object.entries(upgrade.effects).forEach(([key, value]) => {
    if (key === "maxHp") {
      state.maxHp += value;
      state.hp = Math.min(state.maxHp, state.hp + value);
    } else {
      state.stats[key] = (state.stats[key] || 0) + value;
    }
  });

  const counts = getTagCounts();
  ["暴击", "雷击", "吸血", "灵宝"].forEach(tag => {
    if (counts[tag] === 3) addLoot("流派成型", `${tag}流已成型，后续选择将更偏向该方向。`, "good");
  });
  offerUpgrades();
  renderBuildSummary();
  updateUi();
}

function rerollChoices() {
  if (state.rerollStone <= 0) {
    addLoot("洗练不足", "洗练石不足，记录为商业化验证点击。", "danger");
    return;
  }
  state.rerollStone -= 1;
  offerUpgrades();
  addLoot("刷新选择", "本局升级选项已刷新。");
  updateUi();
}

function spawnEnemy(forceId) {
  const normalIds = state.time < 80 ? ["spirit", "runner"] : ["spirit", "runner", "golem", "crow", "bomber"];
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
  const phaseScale = 1 + state.time / 240;
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
    slow: 0
  });
}

function addEffect(effect) {
  state.effects.push(effect);
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
  if (enemy.hp <= 0) killEnemy(enemy, source);
}

function killEnemy(enemy, source = "attack") {
  if (!state.enemies.includes(enemy)) return;
  state.kills += 1;
  state.xp += enemy.xp * 6 * (1 + state.stats.xpGain);
  const heal = state.maxHp * state.stats.leech;
  if (heal > 0) {
    const missing = state.maxHp - state.hp;
    state.hp = Math.min(state.maxHp, state.hp + heal);
    if (heal > missing && state.stats.overhealShield) state.shield = Math.min(30, state.shield + heal - missing);
  }
  maybeDrop(enemy, source);
  state.enemies = state.enemies.filter(item => item !== enemy);
  if (state.xp >= xpNeeded()) {
    state.xp -= xpNeeded();
    state.level += 1;
    offerUpgrades();
    addLoot("境界提升", `达到 ${state.level} 级，获得新的构筑选择。`, "good");
  }
}

function xpNeeded() {
  return 24 + state.level * 16;
}

function maybeDrop(enemy) {
  const dropChance = (enemy.role === "normal" ? 0.08 : 0.95) + state.stats.dropRate;
  if (Math.random() > dropChance) return;
  const equipment = DATA.EQUIPMENT[Math.floor(Math.random() * DATA.EQUIPMENT.length)];
  const fit = equipment.tags.some(tag => state.selectedClass.tags.includes(tag) || getMainBuildTag() === tag);
  addLoot(equipment.name, `${equipment.quality}${equipment.slot}，${fit ? "适配当前构筑" : "可留到结算判断"}。`);
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
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const slowFactor = enemy.slow > 0 ? 0.55 : 1;
    enemy.x += (dx / len) * enemy.speed * slowFactor * dt;
    enemy.y += (dy / len) * enemy.speed * slowFactor * dt;
    if (distance(enemy, state.player) < enemy.radius + state.player.radius) {
      takeDamage(enemy.damage * (1 + state.stats.damageTaken) * dt);
      enemy.x -= (dx / len) * 54 * dt;
      enemy.y -= (dy / len) * 54 * dt;
    }
  });
}

function takeDamage(amount) {
  const shieldBlock = Math.min(state.shield, amount);
  state.shield -= shieldBlock;
  state.hp -= amount - shieldBlock;
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

function updateRelics(dt) {
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
  });
}

function update(dt) {
  if (!state.running) return;
  state.time += dt;
  state.spawnTimer -= dt;
  state.attackTimer -= dt;
  state.judgementTimer -= dt;

  updateMovement(dt);

  const spawnRate = Math.max(0.18, 0.85 - state.time * 0.006);
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    if (state.time > 95) spawnEnemy();
    state.spawnTimer = spawnRate;
  }
  if (Math.abs(state.time - 150) < dt) spawnEnemy("charger_elite");
  if (Math.abs(state.time - 270) < dt) spawnEnemy("stone_boss");
  if (Math.abs(state.time - 420) < dt) spawnEnemy("storm_boss");

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
  updateProjectiles(dt);
  state.effects.forEach(effect => {
    effect.life -= dt;
  });
  state.effects = state.effects.filter(effect => effect.life > 0);

  if (state.hp <= 0 || state.time >= 8 * 60) endRun();
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
    button.addEventListener("click", () => addLoot("商业化点击", `${button.dataset.shop} 被点击，记录为首测漏斗事件。`, "good"));
  });
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
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".page-panel").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tab.dataset.panel}Panel`).classList.add("active");
    });
  });
}

document.addEventListener("keydown", event => {
  keys.add(event.code);
  if (event.code === "Space" && state.running && state.equippedRelics.includes("bell")) {
    state.enemies.forEach(enemy => {
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      enemy.x += dx * 0.18;
      enemy.y += dy * 0.18;
    });
    addEffect({ kind: "circle", x: state.player.x, y: state.player.y, r: 190, life: 0.35, color: "#d8b45a" });
    addLoot("聚妖铃", `聚怪并提高普通掉落期望 ${15 + Math.round(state.stats.bellBonus * 100)}%。`);
  }
});
document.addEventListener("keyup", event => keys.delete(event.code));
document.getElementById("startBtn").addEventListener("click", resetRun);
document.getElementById("endBtn").addEventListener("click", endRun);
document.getElementById("rerollBtn").addEventListener("click", rerollChoices);

state.stats = createStats();
renderClassList();
renderDifficultyList();
offerUpgrades();
renderLoot();
renderBuildSummary();
renderShop();
renderMetrics();
bindTabs();
requestAnimationFrame(loop);
