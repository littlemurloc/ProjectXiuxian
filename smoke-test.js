const fs = require("fs");
const { execFileSync } = require("child_process");
const vm = require("vm");

const requiredFiles = [
  "index.html",
  "styles.css",
  "game.js",
  "src/data.js",
  "DESIGN.md",
  "CONTENT_SPEC.md",
  "IMPLEMENTATION_PLAN.md",
  "PROJECT_CONVENTIONS.md",
  "ROLE_COMMUNICATION.md"
];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of requiredFiles) {
  assert(fs.existsSync(file), `Missing required file: ${file}`);
}

const html = read("index.html");
const js = read("game.js");
const dataJs = read("src/data.js");
const design = read("DESIGN.md");
const contentSpec = read("CONTENT_SPEC.md");
const implementationPlan = read("IMPLEMENTATION_PLAN.md");
const projectConventions = read("PROJECT_CONVENTIONS.md");
const roleCommunication = read("ROLE_COMMUNICATION.md");

[
  "prepSummary",
  "classList",
  "difficultyList",
  "modeList",
  "gameCanvas",
  "upgradeChoices",
  "lootList",
  "gearNotice",
  "shopList",
  "metricsList"
].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing DOM mount: ${id}`);
});

["relicStatus", "vesselStatus", "upgradeModal", "modalUpgradeChoices", "upgradeRerollBtn", "lockedUpgradeHint", "spiritText", "relicLoadProgressText", "openChestBtn"].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing slice 2 DOM mount: ${id}`);
});

["equipmentGrid", "candidateGearList", "gearModal", "gearCompareBody", "merchantModal", "merchantGoods", "merchantConfirmModal", "merchantConfirmBody", "coinText", "summaryModal", "summaryBody"].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing slice 4 DOM mount: ${id}`);
});

["gearManageList", "relicManageList", "classProgressList", "eventLogList", "commerceModal", "commerceBody", "pactModal", "pactChoices", "skipPactBtn", "relicLoadModal", "relicLoadChoices", "chestModal", "chestChoices"].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing slice 5 DOM mount: ${id}`);
});

["src/data.js", "game.js"].forEach(text => {
  assert(html.includes(text), `Missing script load: ${text}`);
});

["GAME_DATA", "CLASSES", "RELICS", "UPGRADES", "EQUIPMENT", "SYNERGIES", "PACT_OPTIONS", "SPIRIT_CHEST", "RELIC_LOAD_CONFIG", "ENEMIES", "EVENTS", "SHOP_ITEMS", "TRIAL_MODES"].forEach(text => {
  assert(dataJs.includes(text), `Missing data table: ${text}`);
});

["剑修", "雷修", "月卡", "首充礼包", "灵石补给包", "法宝养成包"].forEach(text => {
  assert(dataJs.includes(text), `Missing gameplay or monetization content: ${text}`);
});

assert(html.includes("可花费 1 灵机锁定一个未选择升级，下次升级必出"), "Missing upgrade lock explanation");

const dataJson = dataJs
  .replace(/^window\.GAME_DATA\s*=\s*/, "")
  .replace(/;\s*$/, "");
const data = Function(`"use strict"; return (${dataJson});`)();

assert(data.CLASSES.length >= 2, "Expected at least 2 classes");
assert(data.TRIAL_MODES.length >= 2, "Expected standard and quick trial modes");
assert(data.RELICS.length >= 6, "Expected at least 6 relics");
assert(data.UPGRADES.length >= 42, "Expected at least 42 upgrades after pool expansion");
assert(data.EQUIPMENT_SLOTS.length >= 3, "Expected at least 3 equipment slots");
assert(data.EQUIPMENT.length >= 12, "Expected at least 12 equipment samples");
assert(data.EVENTS.length >= 6, "Expected at least 6 events");
assert(data.ENEMIES.filter(item => item.role === "normal").length >= 5, "Expected at least 5 normal enemies");
assert(data.ENEMIES.some(item => item.behavior === "ranged"), "Expected a ranged enemy behavior");
assert(data.ENEMIES.some(item => item.behavior === "bomber"), "Expected a bomber enemy behavior");
assert(data.ENEMIES.some(item => item.behavior === "charger"), "Expected an elite charger behavior");

const relicClassTags = new Set(data.CLASSES.map(item => item.name));
data.RELICS.forEach(relic => {
  assert(!relic.tags.every(tag => relicClassTags.has(tag)), `Relic must not bind to a single class: ${relic.name}`);
});

["updateMovement", "fireSword", "fireThunder", "spawnEnemy", "triggerActiveRelic", "showUpgradeModal", "updateSchedule", "spawnWarning", "enemyProjectiles", "hazards", "receiveEquipment", "showGearModal", "showPactModal", "acceptPact", "rejectPact", "offerPacts", "offerRelicLoad", "pickRelicLoadChoices", "showRelicLoadModal", "chooseRelicLoad", "loadRelic", "openSpiritChest", "showChestModal", "chooseChestReward", "lockUpgrade", "gainSpirit", "spendSpirit", "showSummaryModal", "createRunResult", "renderGearManagement", "renderRelicManagement", "renderClassProgress", "logEvent", "showCommerceModal", "setScreen", "canvasPoint", "mouseMove", "spawnPickup", "floatTexts", "rewardQueue", "gearPopupCount", "shouldForceGearPopup", "isUpgradeAllowedForClass", "isUpgradeAvailable", "upgradeLevels", "skillNotice", "trackSkillStat", "showSkillNotice", "relicSkillStats", "gearSkillStats", "activeSynergies", "evaluateSynergies", "getNearSynergies", "getEquipmentSynergyImpact", "gearSynergyImpactHtml", "triggerSynergy", "addSynergyBlast", "nearestEnemyInRadius", "getThunderSourceRadius", "THUNDER_SOURCE_RADIUS", "getNextRelicLoadProgress", "isRelicGear", "getEquipmentDropPool", "thunderChainRadius", "relicLoadProgressText", "PACT_OPTIONS", "SPIRIT_CHEST", "RELIC_LOAD_CONFIG", "acceptedPacts", "pactStats", "pactRuntime", "spiritStats", "freeUpgradeRerolls", "lockedUpgrade", "relicLoadOffered", "preferredRelic", "等待装填", "下一法宝", "法宝已满", "适合法宝路线，装填相关法宝后价值提高", "飞剑贯穿 +1", "法宝装填", "本局法宝将在试炼中逐步装填", "已锁定，下次升级出现", "本次不能直接选择", "灵机统计", "灵匣开启", "反噬雷", "契约收益与代价", "bellFirePending", "bloodRelicLeech", "swordRainTimer", "九霄雷狱", "血葫护体", "灵契觉醒", "升级跳过", "openBestCandidateGear", "guaranteedShadowTimer", "relicEmpoweredAttack", "strengthSources", "wideSwordEvery", "thunderStaffArc", "KeyE", "KeyW", "ArrowUp"].forEach(text => {
  assert(js.includes(text), `Missing combat implementation marker: ${text}`);
});

assert(data.RELICS.every(item => item.skillName), "Every relic should expose a skillName");
assert(data.EQUIPMENT.filter(item => item.skillName).length >= 6, "Expected at least 6 named equipment skills");
assert(data.UPGRADES.some(item => item.type === "basic" && item.maxLevel === 3), "Expected stackable basic upgrades");
assert(data.UPGRADES.some(item => item.type === "advanced" && item.requiresTags), "Expected tag-gated advanced upgrades");
assert(data.SYNERGIES.filter(item => item.tier === "light").length >= 12, "Expected 12 light synergies");
assert(data.SYNERGIES.filter(item => item.tier === "core").length >= 6, "Expected 6 core synergies");
assert(data.SYNERGIES.filter(item => item.tier === "mutation").length >= 3, "Expected 3 mutation synergies");
data.SYNERGIES.forEach(item => {
  assert(item.id && item.name && item.tier && Array.isArray(item.conditions) && item.effect && item.track, `Invalid synergy config: ${item.id || item.name}`);
});
assert(data.PACT_OPTIONS.filter(item => item.type === "邪契").length >= 6, "Expected 6 dark pact options");
assert(data.PACT_OPTIONS.filter(item => item.type === "劫契").length >= 3, "Expected 3 tribulation pact options");
data.PACT_OPTIONS.forEach(item => {
  assert(item.id && item.type && item.name && item.gain && item.cost && item.fit && item.entrance && item.stats && item.costStats && item.track, `Invalid pact config: ${item.id || item.name}`);
});
assert(data.SPIRIT_CHEST.rareUpgrades.length >= 4, "Expected 4 spirit chest rare upgrades");
assert(data.SPIRIT_CHEST.pacts.length >= 4, "Expected 4 spirit chest pacts");
assert(data.SPIRIT_CHEST.gear.length >= 4, "Expected 4 spirit chest gear rewards");
assert(data.SPIRIT_CHEST.relicBoosts.length >= 4, "Expected 4 spirit chest relic boosts");
assert(data.RELIC_LOAD_CONFIG.slots === 2, "Expected 2 relic load slots");
assert(data.RELIC_LOAD_CONFIG.thresholds[0] === 50, "Expected first relic load at 50 kills");
assert(data.RELIC_LOAD_CONFIG.thresholds[1] === 150, "Expected second relic load at 150 kills");
assert(data.RELIC_LOAD_CONFIG.thresholds[2] === 300, "Expected third future relic load threshold");
assert(data.RELIC_LOAD_CONFIG.thresholds[3] === 600, "Expected fourth future relic load threshold");

["不再沿用塔防", "刷宝BD", "职业能力提升触发途径", "8 分钟固定节奏", "MVP数据目标", "下一版网页原型验收标准", "4 分钟快速测试模式"].forEach(text => {
  assert(design.includes(text), `Missing design note: ${text}`);
});

["法宝规格", "可携带法宝", "三选一规则", "法宝联动升级", "24 个局内升级", "装备部位", "特殊词条", "局内拾取规则", "局外装备带入规则", "装备推荐评分", "试炼层级", "风险事件", "首测数值框架"].forEach(text => {
  assert(contentSpec.includes(text), `Missing content spec note: ${text}`);
});

["数据化", "战斗手感", "装备与掉落", "局外成长与商业化验证", "实现切片", "切片1：核心战斗可移动"].forEach(text => {
  assert(implementationPlan.includes(text), `Missing implementation plan note: ${text}`);
});

["主策划", "UI/UX", "主程序", "讨论与落档规则"].forEach(text => {
  assert(projectConventions.includes(text), `Missing project convention note: ${text}`);
});

["职务总表", "写入边界", "跨职务需求记录"].forEach(text => {
  assert(roleCommunication.includes(text), `Missing role communication note: ${text}`);
});

execFileSync("node", ["--check", "game.js"], { stdio: "pipe" });
execFileSync("node", ["--check", "src/data.js"], { stdio: "pipe" });

function createElement(tagName = "div") {
  const listeners = {};
  return {
    tagName,
    children: [],
    dataset: {},
    style: {},
    className: "",
    textContent: "",
    innerHTML: "",
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    insertAdjacentHTML(position, html) {
      this.innerHTML += html;
    },
    querySelectorAll() {
      return [];
    },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    click() {
      (listeners.click || []).forEach(handler => handler({}));
    },
    listeners
  };
}

const elementIds = [
  "gameCanvas",
  "prepSummary",
  "classList",
  "difficultyList",
  "modeList",
  "upgradeChoices",
  "lootList",
  "gearNotice",
  "shopList",
  "metricsList",
  "buildSummary",
  "equipmentGrid",
  "candidateGearList",
  "gearManageList",
  "relicManageList",
  "classProgressList",
  "eventLogList",
  "relicStatus",
  "vesselStatus",
  "upgradeModal",
  "upgradeHint",
  "lockedUpgradeHint",
  "modalUpgradeChoices",
  "gearModal",
  "gearHint",
  "gearCompareBody",
  "merchantModal",
  "merchantTitle",
  "merchantHint",
  "merchantGoods",
  "merchantRefreshBtn",
  "merchantConfirmModal",
  "merchantConfirmTitle",
  "merchantConfirmHint",
  "merchantConfirmBody",
  "pactModal",
  "pactTitle",
  "pactHint",
  "pactChoices",
  "relicLoadModal",
  "relicLoadTitle",
  "relicLoadHint",
  "relicLoadChoices",
  "chestModal",
  "chestTitle",
  "chestHint",
  "chestChoices",
  "summaryModal",
  "summaryTitle",
  "summaryHint",
  "summaryBody",
  "commerceModal",
  "commerceTitle",
  "commerceHint",
  "commerceBody",
  "timeText",
  "levelText",
  "killsText",
  "hpText",
  "coinText",
  "spiritText",
  "relicLoadProgressText",
  "jadeText",
  "rerollText",
  "starText",
  "startBtn",
  "prepStartBtn",
  "prepGrowthBtn",
  "prepShopBtn",
  "endBtn",
  "rerollBtn",
  "openChestBtn",
  "upgradeRerollBtn",
  "equipCandidateBtn",
  "keepCandidateBtn",
  "closeMerchantBtn",
  "confirmMerchantBuyBtn",
  "cancelMerchantBuyBtn",
  "skipPactBtn",
  "closeSummaryBtn",
  "summaryAgainBtn",
  "summaryForgeBtn",
  "summaryRerollBtn",
  "summaryRelicBtn",
  "closeCommerceBtn",
  "playPanel",
  "buildPanel",
  "gearPanel",
  "relicsPanel",
  "classesPanel",
  "shopPanel",
  "metricsPanel"
];
const elements = Object.fromEntries(elementIds.map(id => [id, createElement()]));
elements.gameCanvas.width = 960;
elements.gameCanvas.height = 540;
elements.gameCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 540 });
elements.gameCanvas.getContext = () => ({
  clearRect() {},
  fillRect() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  fillText() {},
  strokeStyle: "",
  fillStyle: "",
  lineWidth: 1,
  globalAlpha: 1,
  font: "",
  textAlign: ""
});

const documentListeners = {};
const tabs = ["play", "build", "gear", "relics", "classes", "shop", "metrics"].map(panel => {
  const tab = createElement("button");
  tab.dataset.panel = panel;
  return tab;
});
const flowTabs = ["prep", "battle", "growth", "shop"].map(screen => {
  const tab = createElement("button");
  tab.dataset.screen = screen;
  return tab;
});
const panels = ["playPanel", "buildPanel", "gearPanel", "relicsPanel", "classesPanel", "shopPanel", "metricsPanel"].map(id => elements[id]);
const layout = createElement("section");
layout.dataset = { screen: "prep" };

const sandbox = {
  window: {},
  console,
  performance: { now: () => 0 },
  requestAnimationFrame() {},
  localStorage: {
    store: {},
    getItem(key) {
      return this.store[key] || null;
    },
    setItem(key, value) {
      this.store[key] = String(value);
    }
  },
  document: {
    getElementById(id) {
      assert(elements[id], `Runtime requested missing element: ${id}`);
      return elements[id];
    },
    createElement,
    querySelectorAll(selector) {
      if (selector === ".tab") return tabs;
      if (selector === ".flow-tab") return flowTabs;
      if (selector === ".page-panel") return panels;
      return [];
    },
    querySelector(selector) {
      if (selector === ".layout") return layout;
      return null;
    },
    addEventListener(type, handler) {
      documentListeners[type] = documentListeners[type] || [];
      documentListeners[type].push(handler);
    }
  }
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(dataJs, sandbox, { filename: "src/data.js" });
vm.runInContext(js, sandbox, { filename: "game.js" });
elements.startBtn.click();
(documentListeners.keydown || []).forEach(handler => handler({ code: "KeyD" }));
sandbox.update(1.1);
assert(elements.timeText.textContent !== "00:00", "Runtime smoke did not advance the run timer");
assert(Number(elements.hpText.textContent) > 0, "Runtime smoke did not render player HP");
const runtimeEquipment = sandbox.GAME_DATA.EQUIPMENT;
sandbox.receiveEquipment({ ...runtimeEquipment[0], uid: "test-gear-1", source: "smoke" });
sandbox.receiveEquipment({ ...runtimeEquipment.find(item => item.slot !== runtimeEquipment[0].slot), uid: "test-gear-2", source: "smoke" });
assert(elements.equipmentGrid.children.some(child => child.innerHTML.includes("青锋剑")), "Runtime smoke did not render equipped gear");
const merchantFlow = vm.runInContext(`
  state.coins = 999;
  function runMerchantCycle(kills, time, staleReward = null) {
    state.kills = kills;
    state.time = time;
    updateMerchantEncounter();
    if (staleReward) state.activeReward = staleReward;
    const onlyUnlocked = state.merchantState.offers.every(item => state.unlockedBlueprintIds.has(item.id));
    const uid = state.merchantState.offers[0]?.uid;
    openMerchant();
    const opened = state.paused && state.merchantState.active && state.merchantState.offers.length === 4 && !!uid;
    buyMerchantOffer(uid);
    if (state.pendingMerchantPurchase) confirmMerchantPurchase();
    return {
      onlyUnlocked,
      opened,
      purchased: !state.paused && !state.merchantState.active && !state.pendingMerchantPurchase,
      noticeCleared: !state.gearNotice,
      count: state.merchantState.count
    };
  }
  const first = runMerchantCycle(80, 105);
  const second = runMerchantCycle(220, 240);
  const third = runMerchantCycle(420, 390, { type: "upgrade", stale: true });
  ({
    first,
    second,
    third,
    vesselCount: Object.keys(state.runVessels).length
  });
`, sandbox);
assert(merchantFlow.first.onlyUnlocked, "First merchant offered locked blueprint items");
assert(merchantFlow.first.opened, "First merchant did not open");
assert(merchantFlow.first.purchased, "First merchant purchase did not resume the run");
assert(merchantFlow.first.noticeCleared, "First merchant notice was not cleared after purchase");
assert(merchantFlow.second.onlyUnlocked, "Second merchant offered locked blueprint items");
assert(merchantFlow.second.opened, "Second merchant did not open after first purchase");
assert(merchantFlow.second.purchased, "Second merchant purchase did not resume the run");
assert(merchantFlow.second.noticeCleared, "Second merchant notice was not cleared after purchase");
assert(merchantFlow.third.onlyUnlocked, "Third merchant offered locked blueprint items");
assert(merchantFlow.third.opened, "Third merchant did not open after second purchase");
assert(merchantFlow.third.purchased, "Third merchant purchase did not resume the run");
assert(merchantFlow.third.noticeCleared, "Third merchant notice was not cleared after purchase");
assert(merchantFlow.vesselCount > 0, "Merchant purchases did not leave any run vessels equipped");
sandbox.endRun("manual");
assert(elements.summaryBody.innerHTML.includes("战斗结果"), "Runtime smoke did not render summary");

console.log("Smoke test passed: data tables, DOM mounts, JS syntax, and runtime boot are valid.");
