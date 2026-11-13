(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  /* 一幕行动池：10 张 */
  Z.ACT1_ACTIONS = [
    {
      id: 'slash-burn',
      name: '刀耕火种',
      tag: '农',
      desc: '烧去荒草作肥，以石耜破土下种。',
      effects: { food: 10, craft: -2, pop: 2 },
      narrative: '烧荒为肥，石耜破土。秋来粟穗低垂，族中第一次有了余粮。',
      anchor: '《周易·系辞》：斫木为耜，揉木为耒，耒耨之利，以教天下。'
    },
    {
      id: 'raise-pigs',
      name: '驯养猪犬',
      tag: '农',
      desc: '圈起猎来的幼豕，留犬守夜。',
      effects: { food: 6, pop: 5, morale: 2 },
      narrative: '幼豕进了围栏，犬卧在门口。栏中有豕，人心便安。',
      anchor: '《诗经·公刘》：执豕于牢，酌之用匏。'
    },
    {
      id: 'pottery',
      name: '烧制陶器',
      tag: '工',
      desc: '泥条盘筑，入窑烧硬，盛水存粮。',
      effects: { craft: 8, food: 2, morale: 2 },
      narrative: '泥条盘筑，入火成陶。第一次，水有了盛处，粮有了存处。',
      anchor: '《礼记·礼运》：后圣有作……范金合土。'
    },
    {
      id: 'ground-stone',
      name: '磨制石器',
      tag: '工',
      desc: '砺石上磨出斧、锛、铲，伐木垦土。',
      effects: { craft: 6, food: 5, pop: -1 },
      narrative: '砺石声声，斧锛成形。伐木垦土，比从前快了一倍。',
      anchor: '《越绝书》：神农、赫胥之时，以石为兵。'
    },
    {
      id: 'dig-well',
      name: '掘井而饮',
      tag: '治水',
      desc: '掘地及泉，离河而居也能得水。',
      effects: { pop: 4, morale: 6, craft: 3 },
      synergy: { crisis: 'flood', bonus: { food: 5, morale: 3 }, note: '旱时得泉，水患之年亦能保田' },
      narrative: '掘地及泉，水清而甘。从此不必逐河而居，也能度旱年。',
      anchor: '《击壤歌》：凿井而饮，耕田而食。'
    },
    {
      id: 'build-dike',
      name: '筑堤护田',
      tag: '治水',
      desc: '夯土成堤，导水入渠，护住低田。',
      effects: { food: 6, morale: 3, pop: -2 },
      synergy: { crisis: 'flood', bonus: { food: 7, morale: 4 }, note: '洪水当前，堤成则低田可保' },
      narrative: '夯土成堤，导水入渠。洪来时，低田第一次保住了。',
      anchor: '《尚书·禹贡》：九河既道，雷夏既泽。'
    },
    {
      id: 'knotted-cords',
      name: '结绳记事',
      tag: '礼',
      desc: '大事打大结，小事打小结，记住季节与约定。',
      effects: { R: 8, craft: 4, morale: -1 },
      narrative: '大事打大结，小事打小结。族人开始记得住季节与约定。',
      anchor: '《周易·系辞》：上古结绳而治，后世圣人易之以书契。'
    },
    {
      id: 'observe-sky',
      name: '观象授时',
      tag: '礼',
      desc: '夜观大火星，昼察日影，定播种之期。',
      effects: { food: 8, craft: 4, R: 4 },
      synergy: { crisis: 'ceiling', bonus: { food: 5, craft: 3 }, note: '产量见顶时，重测地力与农时' },
      narrative: '夜观大火星，昼察日影。播种有了准信，不再全靠天猜。',
      anchor: '《尚书·尧典》：乃命羲和，钦若昊天，历象日月星辰，敬授民时。'
    },
    {
      id: 'barter',
      name: '以物易物',
      tag: '商',
      desc: '在河湾设市，以粟易盐，以陶易皮。',
      effects: { food: 5, K: 6, morale: 2 },
      narrative: '河湾边上，以粟易盐，以陶易皮。他族的名字第一次被记住。',
      anchor: '《周易·系辞》：日中为市，致天下之民，聚天下之货，交易而退。'
    },
    {
      id: 'migrate',
      name: '迁徙逐水',
      tag: '迁',
      desc: '弃旧屋，逐水而上，另择高地。',
      effects: { food: 12, morale: -8, pop: -3 },
      clearsFlag: 'flood',
      narrative: '弃了旧屋，逐水而上。新地更肥，只是老人不肯回头。',
      anchor: '《诗经·公刘》：陟则在巘，复降在原。'
    }
  ];

  /* 一幕三张核心危机卡，按回合依次而至 */
  Z.ACT1_EVENTS = ['flood', 'land', 'ceiling'];

  Z.CRISES = {
    flood: {
      id: 'flood',
      kicker: '天时 · 水旱无常',
      title: '水旱无常',
      quote: '春汛早至，低田尽没；入夏又久不雨，河床龟裂。',
      effects: { food: -10 },
      flag: { id: 'flood', name: '水患未平', turns: 1, effects: { food: -6 } },
      hint: '修堤、掘井或迁徙，可减其害。治水之策在本回合格外有力。'
    },
    land: {
      id: 'land',
      kicker: '人事 · 人地失衡',
      title: '人地失衡',
      quote: '人口渐繁，近处的野兽捕尽，林中的果实也不够分了。',
      effects: { pop: 6, food: -8 },
      flag: { id: 'land-pressure', name: '地力渐薄', turns: 2, effects: { pop: 3, food: -4 } },
      hint: '人多了，地却开始喊饿。此后两回合，人口仍增，粮耗亦增。'
    },
    ceiling: {
      id: 'ceiling',
      kicker: '瓶颈 · 产量见顶',
      title: '产量见顶',
      quote: '今年的粟穗与去年一般长。再多的人手，也换不来更多的粮。',
      effects: {},
      special: 'foodFreeze',
      hint: '本回合土地不再自然增产。或改良农时，或另寻他路。'
    }
  };

  /* 开局勘察热点：点击场景直接察看，不做选择题 */
  Z.SCOUT = [
    {
      id: 'river',
      char: '河',
      x: 52, y: 30,
      resource: '水',
      text: '河水年年泛滥，退后留下一层肥泥。近水，也近险。',
      effect: { food: 1 }
    },
    {
      id: 'soil',
      char: '土',
      x: 66, y: 52,
      resource: '土',
      text: '抓一把土，松而黑，攥得成团。这是能长庄稼的土。',
      effect: { food: 1 }
    },
    {
      id: 'forest',
      char: '林',
      x: 10, y: 26,
      resource: '木',
      text: '岸边林木丰茂，可伐木、可渔猎、可采果。',
      effect: { craft: 1 }
    },
    {
      id: 'stone',
      char: '石',
      x: 88, y: 76,
      resource: '石',
      scarce: true,
      text: '翻遍河滩，少见大石。垒石为基，怕是难。',
      effect: {}
    }
  ];

  /* 聚落形态：真实取舍，需对应资源 */
  Z.SETTLEMENTS = [
    {
      id: 'pit',
      name: '半地穴 · 窑洞',
      desc: '向下挖穴，覆草为顶。就地取土，冬暖夏凉。',
      sprite: 'assets/sprites/sprite-01-pit-house.png',
      fit: ['A', 'B', 'D'],
      need: '土',
      effects: { morale: 5, food: 4 },
      popCap: 5,
      tag: '防寒 · 就地取土',
      narrative: '穴壁夯实，草顶压土。风从河上来，屋里却是暖的。'
    },
    {
      id: 'stilt',
      name: '干栏 · 架空',
      desc: '伐木立柱，架屋离地。防潮避水，临水而居。',
      sprite: 'assets/sprites/sprite-03-stilt-house.png',
      fit: ['A', 'C', 'E'],
      need: '木',
      effects: { craft: 6, food: 2, morale: 2 },
      popCap: 0,
      tag: '防潮 · 临水而居',
      narrative: '木柱扎进泥里，屋板离地三尺。汛水漫上来，也只湿了柱脚。'
    },
    {
      id: 'stone',
      name: '石砌台居',
      desc: '垒石为基，依山而居。坚固耐久，不畏风雨。',
      sprite: 'assets/sprites/sprite-04-stone-timber-house.png',
      fit: ['C', 'F'],
      need: '石',
      effects: { craft: -6, morale: -10 },
      popCap: 0,
      tag: '坚固 · 依山为固',
      narrative: '石基垒到一半便塌了。此地少石，族人只能退回穴居。'
    }
  ];

  Z.CARD_BY_ID = {};
  Z.ACT1_ACTIONS.forEach(function (card) { Z.CARD_BY_ID[card.id] = card; });
})();
