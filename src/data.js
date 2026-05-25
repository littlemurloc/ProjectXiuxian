window.GAME_DATA = {
  CLASSES: [
    {
      id: "sword",
      name: "剑修",
      desc: "飞剑穿刺，暴击后触发剑影追击。",
      color: "#d8b45a",
      weapon: "飞剑",
      maxHp: 100,
      attack: 12,
      attackInterval: 0.85,
      moveSpeed: 310,
      critRate: 0.05,
      pierce: 2,
      tags: ["剑修", "暴击", "穿透"]
    },
    {
      id: "thunder",
      name: "雷修",
      desc: "连锁雷击，清密集怪更强。",
      color: "#60b6ff",
      weapon: "引雷诀",
      maxHp: 90,
      attack: 10,
      attackInterval: 0.95,
      moveSpeed: 320,
      critRate: 0,
      chainJumps: 2,
      chainFalloff: 0.25,
      tags: ["雷修", "雷击", "连锁"]
    }
  ],

  TRIAL_TIERS: [
    { id: "fan1", name: "凡境1", power: 120, enemyHp: 1, enemyDamage: 1, reward: 1 },
    { id: "fan2", name: "凡境2", power: 180, enemyHp: 1.18, enemyDamage: 1.12, reward: 1.1 },
    { id: "fan3", name: "凡境3", power: 260, enemyHp: 1.38, enemyDamage: 1.25, reward: 1.2 }
  ],

  RELICS: [
    { id: "qf_box", name: "青锋匣", type: "攻击法宝", trigger: "auto", cooldown: 6, tags: ["穿透", "暴击"] },
    { id: "thunder_pearl", name: "引雷珠", type: "攻击法宝", trigger: "auto", cooldown: 7, tags: ["雷击", "清怪"] },
    { id: "gourd", name: "回春葫芦", type: "生存法宝", trigger: "passive", cooldown: 25, tags: ["吸血", "生存"] },
    { id: "ice_mirror", name: "玄冰镜", type: "控制法宝", trigger: "auto", cooldown: 10, tags: ["控制", "雷击"] },
    { id: "bell", name: "聚妖铃", type: "资源法宝", trigger: "active", cooldown: 18, tags: ["掉落", "聚怪"] },
    { id: "fire_pearl", name: "炼火珠", type: "爆发法宝", trigger: "auto", cooldown: 9, tags: ["灵宝", "Boss"] }
  ],

  UPGRADES: [
    { id: "sword_pierce", name: "剑气纵横", desc: "飞剑穿透 +1。", tags: ["剑修", "暴击"], effects: { pierce: 1 } },
    { id: "sword_heart", name: "剑心", desc: "暴击率 +8%，暴击伤害提升。", tags: ["剑修", "暴击"], effects: { critRate: 0.08, critDamage: 0.35 } },
    { id: "shadow_chase", name: "追影", desc: "暴击时额外生成剑影。", tags: ["剑修", "暴击"], effects: { shadow: 1 } },
    { id: "armor_break", name: "破甲剑意", desc: "对精英和Boss伤害提升。", tags: ["剑修", "Boss"], effects: { bossDamage: 0.25 } },
    { id: "return_blade", name: "回锋", desc: "飞剑到达远端后折返一次。", tags: ["剑修", "穿透"], effects: { returnBlade: 1 } },
    { id: "blade_field", name: "剑痕留场", desc: "飞剑路径留下短暂伤害区。", tags: ["剑修", "灵宝"], effects: { fieldDamage: 1 } },
    { id: "chain_thunder", name: "连环雷", desc: "雷击跳跃 +2。", tags: ["雷修", "雷击"], effects: { chainJumps: 2 } },
    { id: "thunder_pool", name: "雷池", desc: "雷击击杀后留下伤害区。", tags: ["雷修", "雷击"], effects: { thunderPool: 1 } },
    { id: "heaven_thunder", name: "天罚", desc: "周期性打击血量最高敌人。", tags: ["雷修", "Boss"], effects: { judgement: 1 } },
    { id: "paralyze", name: "麻痹", desc: "雷击命中敌人短暂减速。", tags: ["雷修", "生存"], effects: { slowOnHit: 0.25 } },
    { id: "thunder_burst", name: "雷暴", desc: "同一敌人多次受雷击后爆炸。", tags: ["雷修", "雷击"], effects: { thunderBurst: 1 } },
    { id: "conductive", name: "雷引", desc: "雷击优先跳向未命中过的敌人。", tags: ["雷修", "雷击"], effects: { smartChain: 1 } },
    { id: "crit_clear", name: "连斩", desc: "连续暴击后释放范围斩击。", tags: ["暴击"], effects: { critCleave: 1 } },
    { id: "edge", name: "锋芒", desc: "暴击击杀返还攻击冷却。", tags: ["暴击"], effects: { critRefund: 0.25 } },
    { id: "blood_guard", name: "血玉护身", desc: "吸血 +3%，最大生命 +15。", tags: ["吸血", "生存"], effects: { leech: 0.03, maxHp: 15 } },
    { id: "overflow_shield", name: "溢血成盾", desc: "溢出治疗转化为护盾。", tags: ["吸血", "生存"], effects: { overhealShield: 1 } },
    { id: "low_blood", name: "舍身剑", desc: "低血时伤害大幅提升。", tags: ["吸血", "暴击"], effects: { lowHpDamage: 0.5 } },
    { id: "relic_charge", name: "灵宝出鞘", desc: "法宝充能速度提升。", tags: ["灵宝"], effects: { relicHaste: 0.25 } },
    { id: "relic_echo", name: "灵宝回响", desc: "自动法宝有概率重复触发。", tags: ["灵宝"], effects: { relicEcho: 0.25 } },
    { id: "bell_gain", name: "聚妖纳财", desc: "聚妖铃收益窗口提升。", tags: ["灵宝", "掉落"], effects: { bellBonus: 0.1 } },
    { id: "steps", name: "踏云步", desc: "移动速度 +12%，拾取范围提升。", tags: ["机动", "通用"], effects: { moveSpeedPct: 0.12, pickup: 0.2 } },
    { id: "focus", name: "聚灵诀", desc: "经验获取提升。", tags: ["经验", "通用"], effects: { xpGain: 0.18 } },
    { id: "stone_skin", name: "护体灵光", desc: "最大生命 +25，受伤降低。", tags: ["生存", "通用"], effects: { maxHp: 25, damageTaken: -0.1 } },
    { id: "treasure_sense", name: "探宝灵感", desc: "普通怪掉落期望提升。", tags: ["掉落", "通用"], effects: { dropRate: 0.08 } }
  ],

  EQUIPMENT_SLOTS: ["武器", "护符", "戒指", "法袍", "灵靴", "玉佩"],

  EQUIPMENT: [
    { id: "qf_sword", name: "青锋剑", slot: "武器", quality: "精良", tags: ["剑修", "穿透"], score: 42 },
    { id: "thunder_staff", name: "引雷杖", slot: "武器", quality: "精良", tags: ["雷修", "雷击"], score: 42 },
    { id: "spirit_charm", name: "聚灵符", slot: "护符", quality: "普通", tags: ["经验", "灵宝"], score: 28 },
    { id: "ice_charm", name: "玄冰符", slot: "护符", quality: "精良", tags: ["控制", "雷击"], score: 38 },
    { id: "blood_ring", name: "血玉戒", slot: "戒指", quality: "精良", tags: ["吸血", "生存"], score: 40 },
    { id: "sword_ring", name: "剑心戒", slot: "戒指", quality: "稀有", tags: ["剑修", "暴击"], score: 56 },
    { id: "blood_robe", name: "血影法袍", slot: "法袍", quality: "精良", tags: ["吸血", "生存"], score: 41 },
    { id: "storm_robe", name: "雷纹法袍", slot: "法袍", quality: "精良", tags: ["雷修", "灵宝"], score: 43 },
    { id: "cloud_boots", name: "踏云靴", slot: "灵靴", quality: "普通", tags: ["机动", "通用"], score: 30 },
    { id: "treasure_boots", name: "探宝靴", slot: "灵靴", quality: "精良", tags: ["掉落", "机动"], score: 39 },
    { id: "relic_jade", name: "灵宝玉", slot: "玉佩", quality: "稀有", tags: ["灵宝", "爆发"], score: 55 },
    { id: "thunder_jade", name: "雷魄玉", slot: "玉佩", quality: "稀有", tags: ["雷修", "Boss"], score: 54 }
  ],

  ENEMIES: [
    { id: "spirit", name: "游魂", role: "normal", hp: 18, damage: 6, speed: 90, xp: 1, color: "#8b5e57" },
    { id: "runner", name: "疾妖", role: "normal", hp: 14, damage: 5, speed: 165, xp: 1, color: "#c46f55" },
    { id: "golem", name: "石甲傀", role: "normal", hp: 75, damage: 10, speed: 65, xp: 4, color: "#8b8170" },
    { id: "crow", name: "咒鸦", role: "normal", hp: 22, damage: 5, speed: 80, xp: 2, color: "#5e6a87" },
    { id: "bomber", name: "爆灵", role: "normal", hp: 20, damage: 18, speed: 130, xp: 2, color: "#d86854" },
    { id: "charger_elite", name: "冲阵精英", role: "elite", hp: 450, damage: 14, speed: 120, xp: 20, color: "#d8b45a" },
    { id: "stone_boss", name: "石心妖将", role: "boss", hp: 1300, damage: 16, speed: 82, xp: 40, color: "#b95d4a" },
    { id: "storm_boss", name: "劫雷妖君", role: "boss", hp: 2600, damage: 18, speed: 88, xp: 60, color: "#8062d6" }
  ],

  EVENTS: [
    { id: "rift", name: "魔气裂隙", reward: "本局掉落率 +25%", cost: "怪物生命 +20%" },
    { id: "furnace", name: "失控灵炉", reward: "立即获得精良装备", cost: "下一波刷出精英" },
    { id: "memory", name: "古修残念", reward: "获得强力祝福", cost: "当前生命 -30%" },
    { id: "greed_box", name: "贪婪宝匣", reward: "获得稀有装备", cost: "Boss提前出现" },
    { id: "blood_oath", name: "血契祭坛", reward: "随机流派强化", cost: "最大生命 -15%" },
    { id: "sky_fire", name: "淬宝天火", reward: "装备品质提升", cost: "之后精英伤害 +20%" }
  ],

  SHOP_ITEMS: [
    ["月卡", "每日灵石、少量洗练石、每周少量星砂。"],
    ["首充礼包", "职业皮肤、灵石、少量洗练石和星砂。"],
    ["洗练礼包", "补充洗练石和灵石，增加副词条尝试次数。"],
    ["法宝养成包", "提供灵石和少量星砂，用于法宝升级/升星。"]
  ],

  METRICS: [
    ["首局完成率", "目标 70% 以上，验证新手理解和战斗压力。"],
    ["平均游玩局数", "目标 3 局以上，验证刷宝反馈。"],
    ["第5局达成率", "目标 20% 以上，观察复玩动机。"],
    ["次日留存", "目标 25%，判断局外成长是否成立。"],
    ["7日留存", "目标 8%-12%，决定是否扩展内容。"],
    ["商店点击率", "目标 15% 以上，验证入口自然度。"]
  ]
};
