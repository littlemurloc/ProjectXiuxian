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

  TRIAL_MODES: [
    {
      id: "standard",
      name: "8分钟正式",
      duration: 480,
      schedule: [
        { time: 135, kind: "warning", text: "冲阵精英即将出现" },
        { time: 150, kind: "spawn", enemy: "charger_elite", text: "冲阵精英出现" },
        { time: 255, kind: "warning", text: "石心妖将即将现身" },
        { time: 270, kind: "spawn", enemy: "stone_boss", text: "小Boss 石心妖将出现" },
        { time: 405, kind: "warning", text: "劫雷妖君即将降临" },
        { time: 420, kind: "spawn", enemy: "storm_boss", text: "终局Boss 劫雷妖君出现" }
      ]
    },
    {
      id: "quick",
      name: "4分钟快测",
      duration: 240,
      schedule: [
        { time: 68, kind: "warning", text: "冲阵精英即将出现" },
        { time: 75, kind: "spawn", enemy: "charger_elite", text: "冲阵精英出现" },
        { time: 128, kind: "warning", text: "石心妖将即将现身" },
        { time: 135, kind: "spawn", enemy: "stone_boss", text: "小Boss 石心妖将出现" },
        { time: 203, kind: "warning", text: "劫雷妖君即将降临" },
        { time: 210, kind: "spawn", enemy: "storm_boss", text: "终局Boss 劫雷妖君出现" }
      ]
    }
  ],

  RELICS: [
    { id: "qf_box", name: "青锋匣", skillName: "匣中飞剑", type: "攻击法宝", trigger: "auto", cooldown: 5, tags: ["穿透", "暴击"] },
    { id: "thunder_pearl", name: "引雷珠", skillName: "珠引天雷", type: "攻击法宝", trigger: "auto", cooldown: 5.5, tags: ["雷击", "清怪"] },
    { id: "gourd", name: "回春葫芦", skillName: "回春护体", type: "生存法宝", trigger: "passive", cooldown: 22, tags: ["吸血", "生存"] },
    { id: "ice_mirror", name: "玄冰镜", skillName: "玄冰镜域", type: "控制法宝", trigger: "auto", cooldown: 8, tags: ["控制", "雷击"] },
    { id: "bell", name: "聚妖铃", skillName: "聚妖纳财", type: "资源法宝", trigger: "active", cooldown: 16, tags: ["掉落", "聚怪"] },
    { id: "fire_pearl", name: "炼火珠", skillName: "炼火印", type: "爆发法宝", trigger: "auto", cooldown: 7, tags: ["灵宝", "Boss"] }
  ],

  UPGRADES: [
    { id: "sword_pierce_base", name: "飞剑穿透", desc: "飞剑穿透 +1。", type: "basic", maxLevel: 3, classLock: "剑修", tags: ["剑修", "穿透"], effects: { pierce: 1 } },
    { id: "sword_crit_base", name: "剑心会意", desc: "暴击率 +6%，暴击伤害提升。", type: "basic", maxLevel: 3, classLock: "剑修", tags: ["剑修", "暴击"], effects: { critRate: 0.06, critDamage: 0.18 } },
    { id: "sword_speed_base", name: "御剑急行", desc: "攻击速度 +8%。", type: "basic", maxLevel: 3, classLock: "剑修", tags: ["剑修", "机动"], effects: { attackSpeedPct: 0.08 } },
    { id: "sword_boss_base", name: "破甲剑意", desc: "对精英和 Boss 伤害提升。", type: "basic", maxLevel: 3, classLock: "剑修", tags: ["剑修", "Boss"], effects: { bossDamage: 0.12 } },
    { id: "sword_field_base", name: "剑痕余势", desc: "飞剑路径伤害提升。", type: "basic", maxLevel: 3, classLock: "剑修", tags: ["剑修", "穿透"], effects: { fieldDamage: 1 } },
    { id: "sword_shadow_base", name: "剑影熟练", desc: "暴击剑影伤害与出现频率提升。", type: "basic", maxLevel: 3, classLock: "剑修", tags: ["剑修", "暴击"], effects: { shadow: 1 } },
    { id: "thunder_jump_base", name: "雷击跳跃", desc: "雷击跳跃 +1。", type: "basic", maxLevel: 3, classLock: "雷修", tags: ["雷修", "雷击"], effects: { chainJumps: 1 } },
    { id: "thunder_pool_base", name: "雷池熟练", desc: "雷池伤害与覆盖能力提升。", type: "basic", maxLevel: 3, classLock: "雷修", tags: ["雷修", "雷击"], effects: { thunderPool: 1 } },
    { id: "thunder_slow_base", name: "麻痹精通", desc: "雷击命中敌人短暂减速。", type: "basic", maxLevel: 3, classLock: "雷修", tags: ["雷修", "控制"], effects: { slowOnHit: 0.12 } },
    { id: "thunder_boss_base", name: "雷纹破魄", desc: "对精英和 Boss 伤害提升。", type: "basic", maxLevel: 3, classLock: "雷修", tags: ["雷修", "Boss"], effects: { bossDamage: 0.12 } },
    { id: "thunder_speed_base", name: "引雷急咒", desc: "攻击速度 +8%。", type: "basic", maxLevel: 3, classLock: "雷修", tags: ["雷修", "雷击"], effects: { attackSpeedPct: 0.08 } },
    { id: "thunder_burst_base", name: "雷暴蓄势", desc: "多次雷击同一敌人后更容易爆发。", type: "basic", maxLevel: 3, classLock: "雷修", tags: ["雷修", "雷击"], effects: { thunderBurst: 1 } },
    { id: "hp_base", name: "护体灵光", desc: "最大生命 +18。", type: "basic", maxLevel: 3, tags: ["生存", "通用"], effects: { maxHp: 18 } },
    { id: "leech_base", name: "血玉回流", desc: "吸血 +2%。", type: "basic", maxLevel: 3, tags: ["吸血", "生存"], effects: { leech: 0.02 } },
    { id: "move_base", name: "踏云步", desc: "移动速度与拾取范围提升。", type: "basic", maxLevel: 3, tags: ["机动", "通用"], effects: { moveSpeedPct: 0.08, pickup: 0.12 } },
    { id: "xp_base", name: "聚灵诀", desc: "经验获取提升。", type: "basic", maxLevel: 3, tags: ["经验", "通用"], effects: { xpGain: 0.12 } },
    { id: "drop_base", name: "探宝灵感", desc: "普通怪掉落期望提升。", type: "basic", maxLevel: 3, tags: ["掉落", "通用"], effects: { dropRate: 0.05 } },
    { id: "relic_haste_base", name: "灵宝充盈", desc: "法宝充能速度提升。", type: "basic", maxLevel: 3, tags: ["灵宝", "通用"], effects: { relicHaste: 0.12 } },
    { id: "sword_shadow", name: "追影", desc: "暴击时额外生成剑影。", type: "mechanic", classLock: "剑修", tags: ["剑修", "暴击"], effects: { shadow: 1 } },
    { id: "return_blade", name: "回锋", desc: "飞剑到达远端后折返一次。", type: "mechanic", classLock: "剑修", tags: ["剑修", "穿透"], effects: { returnBlade: 1 } },
    { id: "blade_field", name: "剑痕留场", desc: "飞剑路径留下短暂伤害区。", type: "mechanic", classLock: "剑修", tags: ["剑修", "穿透"], effects: { fieldDamage: 1 } },
    { id: "crit_clear", name: "连斩", desc: "连续暴击后释放范围斩击。", type: "mechanic", classLock: "剑修", tags: ["剑修", "暴击"], effects: { critCleave: 1 } },
    { id: "chain_thunder", name: "连环雷", desc: "雷击跳跃 +2。", type: "mechanic", classLock: "雷修", tags: ["雷修", "雷击"], effects: { chainJumps: 2 } },
    { id: "heaven_thunder", name: "天罚", desc: "周期性打击血量最高敌人。", type: "mechanic", classLock: "雷修", tags: ["雷修", "Boss"], effects: { judgement: 1 } },
    { id: "paralyze", name: "麻痹", desc: "雷击命中敌人短暂减速。", type: "mechanic", classLock: "雷修", tags: ["雷修", "控制"], effects: { slowOnHit: 0.25 } },
    { id: "conductive", name: "雷引", desc: "雷击优先跳向未命中过的敌人。", type: "mechanic", classLock: "雷修", tags: ["雷修", "雷击"], effects: { smartChain: 1 } },
    { id: "overflow_shield", name: "溢血成盾", desc: "溢出治疗转化为护盾。", type: "mechanic", tags: ["吸血", "生存"], effects: { overhealShield: 1 } },
    { id: "relic_echo", name: "灵宝回响", desc: "自动法宝有概率重复触发。", type: "mechanic", tags: ["灵宝"], effects: { relicEcho: 0.25 } },
    { id: "sword_mastery_adv", name: "剑影成阵", desc: "暴击击杀后强化下一次飞剑剑影。", type: "advanced", requiresTags: ["暴击"], classLock: "剑修", tags: ["剑修", "暴击"], effects: { shadow: 1, critRefund: 0.2 } },
    { id: "sword_pierce_adv", name: "万剑穿心", desc: "穿透爆点更频繁，飞剑更容易形成范围剑气。", type: "advanced", requiresTags: ["穿透"], classLock: "剑修", tags: ["剑修", "穿透"], effects: { pierce: 2, fieldDamage: 1 } },
    { id: "sword_blood_adv", name: "血剑不绝", desc: "低血时伤害和吸血提升。", type: "advanced", requiresTags: ["吸血"], classLock: "剑修", tags: ["剑修", "吸血"], effects: { lowHpDamage: 0.45, leech: 0.03 } },
    { id: "sword_relic_adv", name: "剑匣共鸣", desc: "法宝触发后飞剑强化更明显。", type: "advanced", requiresTags: ["灵宝"], classLock: "剑修", tags: ["剑修", "灵宝"], effects: { relicHaste: 0.18, pierce: 1 } },
    { id: "thunder_chain_adv", name: "万雷连锁", desc: "雷击最后一跳爆炸范围扩大。", type: "advanced", requiresTags: ["雷击"], classLock: "雷修", tags: ["雷修", "雷击"], effects: { chainJumps: 2, thunderBurst: 1 } },
    { id: "thunder_pool_adv", name: "雷池连域", desc: "雷池持续更久，并更容易覆盖战场。", type: "advanced", requiresTags: ["雷击"], classLock: "雷修", tags: ["雷修", "雷击"], effects: { thunderPool: 1, slowOnHit: 0.12 } },
    { id: "thunder_boss_adv", name: "天罚劫印", desc: "天罚和 Boss 补伤强化。", type: "advanced", requiresTags: ["Boss"], classLock: "雷修", tags: ["雷修", "Boss"], effects: { judgement: 1, bossDamage: 0.25 } },
    { id: "thunder_relic_adv", name: "雷珠共鸣", desc: "法宝触发后下一次雷击额外跳跃。", type: "advanced", requiresTags: ["灵宝"], classLock: "雷修", tags: ["雷修", "灵宝"], effects: { relicHaste: 0.18, chainJumps: 1 } },
    { id: "low_blood", name: "舍身剑", desc: "低血时伤害大幅提升。", type: "mechanic", tags: ["吸血", "暴击"], effects: { lowHpDamage: 0.5 } },
    { id: "bell_gain", name: "聚妖纳财", desc: "聚妖铃收益窗口提升。", type: "mechanic", tags: ["灵宝", "掉落"], effects: { bellBonus: 0.1 } },
    { id: "relic_charge", name: "灵宝出鞘", desc: "法宝充能速度提升。", type: "mechanic", tags: ["灵宝"], effects: { relicHaste: 0.25 } },
    { id: "stone_skin", name: "金身护脉", desc: "受伤降低，最大生命提升。", type: "basic", maxLevel: 3, tags: ["生存", "通用"], effects: { maxHp: 12, damageTaken: -0.06 } },
    { id: "edge", name: "锋芒", desc: "暴击击杀返还攻击冷却。", type: "mechanic", tags: ["暴击"], effects: { critRefund: 0.25 } },
    { id: "treasure_surge_adv", name: "福缘成势", desc: "刷宝流成型后，掉落和法宝灵息收益提升。", type: "advanced", requiresTags: ["掉落"], tags: ["掉落", "灵宝"], effects: { dropRate: 0.12, relicHaste: 0.12 } }
  ],

  EQUIPMENT_SLOTS: ["武器", "护符", "戒指", "法袍", "灵靴", "玉佩"],

  EQUIPMENT: [
    { id: "qf_sword", name: "青锋剑", skillName: "宽剑气", triggerText: "每第 5 次飞剑触发", slot: "武器", quality: "精良", main: "攻击 +12%", sub: ["飞剑穿透 +1"], special: "适合剑修穿透", mechanic: "飞剑基础穿透 +1；每第 5 次飞剑变为宽剑气。", tags: ["剑修", "穿透"], score: 42, stats: { attackPct: 0.12, pierce: 1, wideSwordEvery: 5 } },
    { id: "thunder_staff", name: "引雷杖", skillName: "余雷电弧", triggerText: "雷击最后一跳触发", slot: "武器", quality: "精良", main: "攻击 +10%", sub: ["雷击跳跃 +1"], special: "适合雷修连锁", mechanic: "雷击跳跃 +1；最后一跳造成微型电弧。", tags: ["雷修", "雷击"], score: 42, stats: { attackPct: 0.1, chainJumps: 1, thunderStaffArc: 1 } },
    { id: "spirit_charm", name: "聚灵符", skillName: "灵息回流", triggerText: "拾取法宝灵息触发", slot: "护符", quality: "普通", main: "经验 +10%", sub: ["法宝冷却 -15%"], special: "稳健成长", mechanic: "法宝冷却 -15%；拾取法宝灵息额外缩短法宝冷却。", tags: ["经验", "灵宝"], score: 28, stats: { xpGain: 0.1, relicHaste: 0.15, spiritCharmCharge: 1 } },
    { id: "ice_charm", name: "玄冰符", slot: "护符", quality: "精良", main: "受伤 -6%", sub: ["雷击减速"], special: "适合控场雷击", tags: ["控制", "雷击"], score: 38, stats: { damageTaken: -0.06, slowOnHit: 0.15 } },
    { id: "blood_ring", name: "血玉戒", slot: "戒指", quality: "精良", main: "吸血 +3%", sub: ["生命 +12"], special: "适合吸血生存", tags: ["吸血", "生存"], score: 40, stats: { leech: 0.03, maxHp: 12 } },
    { id: "sword_ring", name: "剑心戒", skillName: "剑心小影", triggerText: "暴击时触发，冷却 1 秒", slot: "戒指", quality: "稀有", main: "暴击 +8%", sub: ["暴击伤害 +25%"], special: "暴击剑影核心", mechanic: "暴击时额外生成 1 道小剑影，内置冷却 1 秒。", tags: ["剑修", "暴击"], score: 56, stats: { critRate: 0.08, critDamage: 0.25, swordRingShadow: 1 } },
    { id: "blood_robe", name: "血影法袍", slot: "法袍", quality: "精良", main: "生命 +24", sub: ["低血增伤"], special: "残血反打", tags: ["吸血", "生存"], score: 41, stats: { maxHp: 24, lowHpDamage: 0.18 } },
    { id: "storm_robe", name: "雷纹戒", skillName: "雷纹导引", triggerText: "雷击命中麻痹目标时生效", slot: "戒指", quality: "精良", main: "法宝充能 +12%", sub: ["麻痹增伤"], special: "雷修麻痹流", mechanic: "麻痹敌人受到伤害提高；雷击优先跳向麻痹目标。", tags: ["雷修", "雷击"], score: 43, stats: { relicHaste: 0.12, paralyzeDamage: 0.18, smartParalyze: 1 } },
    { id: "cloud_boots", name: "踏云靴", slot: "灵靴", quality: "普通", main: "移速 +10%", sub: ["拾取范围提升"], special: "通用机动", tags: ["机动", "通用"], score: 30, stats: { moveSpeedPct: 0.1, pickup: 0.15 } },
    { id: "treasure_boots", name: "探宝靴", slot: "灵靴", quality: "精良", main: "掉落 +8%", sub: ["移速 +6%"], special: "刷宝经济", tags: ["掉落", "机动"], score: 39, stats: { dropRate: 0.08, moveSpeedPct: 0.06 } },
    { id: "relic_jade", name: "灵宝玉", skillName: "灵宝共振", triggerText: "自动法宝触发后强化下次普攻", slot: "玉佩", quality: "稀有", main: "法宝充能 +18%", sub: ["法宝后强化普攻"], special: "灵宝爆发核心", mechanic: "自动法宝触发后，下次职业普攻强化。", tags: ["灵宝", "爆发"], score: 55, stats: { relicHaste: 0.18, attackPct: 0.08, relicJadeEmpower: 1 } },
    { id: "thunder_jade", name: "雷魄玉", slot: "玉佩", quality: "稀有", main: "Boss增伤 +18%", sub: ["雷击跳跃 +1"], special: "雷修补Boss", tags: ["雷修", "Boss"], score: 54, stats: { bossDamage: 0.18, chainJumps: 1 } }
  ],

  ENEMIES: [
    { id: "spirit", name: "游魂", role: "normal", behavior: "swarm", hp: 18, damage: 6, speed: 90, xp: 1, color: "#8b5e57" },
    { id: "runner", name: "疾妖", role: "normal", behavior: "runner", hp: 14, damage: 5, speed: 165, xp: 1, color: "#c46f55" },
    { id: "golem", name: "石甲傀", role: "normal", behavior: "tank", hp: 75, damage: 10, speed: 65, xp: 4, color: "#8b8170" },
    { id: "crow", name: "咒鸦", role: "normal", behavior: "ranged", hp: 22, damage: 5, speed: 80, xp: 2, color: "#5e6a87" },
    { id: "bomber", name: "爆灵", role: "normal", behavior: "bomber", hp: 20, damage: 18, speed: 130, xp: 2, color: "#d86854" },
    { id: "charger_elite", name: "冲阵精英", role: "elite", behavior: "charger", hp: 450, damage: 14, speed: 120, xp: 20, color: "#d8b45a" },
    { id: "stone_boss", name: "石心妖将", role: "boss", behavior: "stone_boss", hp: 1300, damage: 16, speed: 82, xp: 40, color: "#b95d4a" },
    { id: "storm_boss", name: "劫雷妖君", role: "boss", behavior: "storm_boss", hp: 2600, damage: 18, speed: 88, xp: 60, color: "#8062d6" }
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
