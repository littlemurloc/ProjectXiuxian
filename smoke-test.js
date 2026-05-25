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
  "classList",
  "difficultyList",
  "modeList",
  "gameCanvas",
  "upgradeChoices",
  "lootList",
  "shopList",
  "metricsList"
].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing DOM mount: ${id}`);
});

["relicStatus", "upgradeModal", "modalUpgradeChoices", "upgradeRerollBtn"].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing slice 2 DOM mount: ${id}`);
});

["equipmentGrid", "candidateGearList", "gearModal", "gearCompareBody", "summaryModal", "summaryBody"].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing slice 4 DOM mount: ${id}`);
});

["gearManageList", "relicManageList", "classProgressList", "eventLogList", "commerceModal", "commerceBody"].forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing slice 5 DOM mount: ${id}`);
});

["src/data.js", "game.js"].forEach(text => {
  assert(html.includes(text), `Missing script load: ${text}`);
});

["GAME_DATA", "CLASSES", "RELICS", "UPGRADES", "EQUIPMENT", "ENEMIES", "EVENTS", "SHOP_ITEMS", "TRIAL_MODES"].forEach(text => {
  assert(dataJs.includes(text), `Missing data table: ${text}`);
});

["剑修", "雷修", "月卡", "首充礼包", "洗练礼包", "法宝养成包"].forEach(text => {
  assert(dataJs.includes(text), `Missing gameplay or monetization content: ${text}`);
});

const dataJson = dataJs
  .replace(/^window\.GAME_DATA\s*=\s*/, "")
  .replace(/;\s*$/, "");
const data = Function(`"use strict"; return (${dataJson});`)();

assert(data.CLASSES.length >= 2, "Expected at least 2 classes");
assert(data.TRIAL_MODES.length >= 2, "Expected standard and quick trial modes");
assert(data.RELICS.length >= 6, "Expected at least 6 relics");
assert(data.UPGRADES.length >= 24, "Expected at least 24 upgrades");
assert(data.EQUIPMENT_SLOTS.length >= 6, "Expected at least 6 equipment slots");
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

["updateMovement", "fireSword", "fireThunder", "spawnEnemy", "triggerActiveRelic", "showUpgradeModal", "updateSchedule", "spawnWarning", "enemyProjectiles", "hazards", "receiveEquipment", "showGearModal", "showSummaryModal", "createRunResult", "renderGearManagement", "renderRelicManagement", "renderClassProgress", "logEvent", "showCommerceModal", "KeyW", "ArrowUp"].forEach(text => {
  assert(js.includes(text), `Missing combat implementation marker: ${text}`);
});

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
    querySelectorAll() {
      return [];
    },
    classList: {
      add() {},
      remove() {}
    },
    click() {
      (listeners.click || []).forEach(handler => handler({}));
    },
    listeners
  };
}

const elementIds = [
  "gameCanvas",
  "classList",
  "difficultyList",
  "modeList",
  "upgradeChoices",
  "lootList",
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
  "upgradeModal",
  "upgradeHint",
  "modalUpgradeChoices",
  "gearModal",
  "gearHint",
  "gearCompareBody",
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
  "jadeText",
  "rerollText",
  "starText",
  "startBtn",
  "endBtn",
  "rerollBtn",
  "upgradeRerollBtn",
  "equipCandidateBtn",
  "keepCandidateBtn",
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
const panels = ["playPanel", "buildPanel", "gearPanel", "relicsPanel", "classesPanel", "shopPanel", "metricsPanel"].map(id => elements[id]);

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
      if (selector === ".page-panel") return panels;
      return [];
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
sandbox.receiveEquipment({ ...data.EQUIPMENT[0], uid: "test-gear-1", source: "smoke" });
sandbox.receiveEquipment({ ...data.EQUIPMENT[1], uid: "test-gear-2", source: "smoke" });
assert(elements.equipmentGrid.children.some(child => child.innerHTML.includes("青锋剑")), "Runtime smoke did not render equipped gear");
sandbox.endRun("manual");
assert(elements.summaryBody.innerHTML.includes("战斗结果"), "Runtime smoke did not render summary");

console.log("Smoke test passed: data tables, DOM mounts, JS syntax, and runtime boot are valid.");
