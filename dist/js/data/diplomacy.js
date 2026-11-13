(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  Z.DIPLO_PICK = 3;

  Z.DIPLO_INTRO = {
    kicker: '结算 · 交融',
    title: '相邻区域出现了其他文明的踪迹',
    lines: [
      '你的文明已点亮了很多成就，但因本环境能够提供的资源已接近上限，相邻区域出现了其他文明的踪迹。',
      '警告：若长期不与其他文明接触，你的文明将在时代更替中逐渐落后，甚至被淘汰。'
    ],
    ask: '是否与他们建立联系？',
    accept: '遣使通好 · 择三地',
    refuse: '闭关自守 · 不与他族往来',
    refuseWarn: '拒绝后，五幕所有产出 −20%，且交融不再增长。',
    pickHint: '从未选择的五块地中挑三块。补给会直接补在你的瓶颈上。',
    confirm: '立盟 · 通商',
    back: '重选'
  };

  /*
   * gain    立盟即刻结算
   * perTurn 五幕每回合被动
   * pay     立盟即刻付出（C 减半 / F 翻倍）
   * delay   收益延后回合数（F 开辟蜀道）
   * relieves 能解的硬瓶颈 id，用于面板高亮
   * grants  解锁的成就 / 能力
   */
  Z.DIPLOMACY = {
    A: {
      code: 'A',
      short: '冲积平原',
      name: '大河下游冲积平原',
      icon: '禾',
      supply: '粟麦（粮 +15/回合）、水利工匠',
      cost: '让渡治水劳役人口',
      goods: '船队顺流而下，舱底是粟，甲板上站着会看水势的人。',
      gain: { food: 15 },
      perTurn: { food: 4 },
      pay: { pop: -6 },
      delay: 0,
      relieves: ['dry', 'terrace', 'narrow'],
      grants: ['irrigation'],
      relief: '粟麦岁输，不必再靠本地那点薄田；水利工匠会导水，也会掘井。',
      pact: '每岁输粟，共修河渠。'
    },
    B: {
      code: 'B',
      short: '黄土台地',
      name: '黄土台地与河谷阶地',
      icon: '鼎',
      supply: '马匹与车、正统名分（礼制 +12）',
      cost: '承认宗主权',
      goods: '车马自塬上来，同来的还有一册历谱、一套称谓。',
      gain: { R: 12, W: 5, K: 6 },
      perTurn: { R: 2 },
      pay: { morale: -6 },
      delay: 0,
      relieves: ['closed', 'variance'],
      grants: ['chariot', 'calendar'],
      relief: '车马能走的路，就不再是封闭的路；用他们的历法，你的农时便有了准信。',
      pact: '奉其正朔，岁时朝聘。'
    },
    C: {
      code: 'C',
      short: '南方水网',
      name: '南方湿热丘陵水网',
      icon: '玉',
      supply: '稻、玉石与刻符（技艺 +12）',
      cost: '通婚与纳贡',
      goods: '稻种装在陶瓮里，玉料裹在麻布中，还有几个会刻符的人。',
      gain: { craft: 12, K: 8 },
      perTurn: { food: 3, craft: 1 },
      pay: { food: -8 },
      delay: 0,
      relieves: ['white', 'variance', 'fatigue'],
      grants: ['writing', 'rice'],
      relief: '稻可久储，冬荒有据；两种作物轮着种，地力也能歇一歇。',
      pact: '世为婚姻，岁纳方物。'
    },
    D: {
      code: 'D',
      short: '草原交错',
      name: '北方草原与农牧交错带',
      icon: '马',
      supply: '骑兵与畜群（武功 +15）、皮毛',
      cost: '和亲或互市',
      goods: '马群踏过河滩，后面跟着羊；牧民带着弓，也带着奶酪。',
      gain: { W: 15, K: 8, food: 6 },
      perTurn: { pop: 1, W: 2 },
      pay: { food: -6, morale: -3 },
      delay: 0,
      relieves: ['terrace', 'acid'],
      grants: ['cavalry', 'herd'],
      relief: '畜群把草变成肉，不占地；畜粪壅田，黏土也能松开来。',
      pact: '约为兄弟，关市不禁。'
    },
    E: {
      code: 'E',
      short: '海岸半岛',
      name: '沿海半岛与近海岛屿',
      icon: '贝',
      supply: '鱼盐之利（财源）、远方物产（交融 +15）',
      cost: '出海风险，人口 −5',
      goods: '盐包压着舱，贝串挂在桅；水手说的地名，你一个也没听过。',
      gain: { K: 15, food: 8 },
      perTurn: { food: 3, K: 2 },
      pay: { pop: -5 },
      delay: 0,
      relieves: ['terrace', 'narrow', 'plague'],
      grants: ['salt', 'searoute'],
      relief: '煮海为盐，可易远方之粮；海船带来的药草，能压住湿热之疫。',
      pact: '共舟共济，盐粮相易。'
    },
    F: {
      code: 'F',
      short: '山地盆地',
      name: '山地与盆地',
      icon: '铜',
      supply: '铜锡与良材（解锁青铜/铁器）、石材',
      cost: '开辟蜀道，耗时 2 回合',
      goods: '栈道凿了两年才通。第一批铜锭出山时，押运的人瘦了一半。',
      gain: { craft: 14 },
      perTurn: { craft: 3 },
      pay: { craft: -6, pop: -3 },
      delay: 2,
      relieves: ['flood', 'silt', 'freshwater'],
      grants: ['bronze', 'stone'],
      relief: '铜凿可穿石，深井可及泉；铜锸掘河，淤沙才挖得动。',
      pact: '凿栈道，输铜锡。'
    }
  };

  /* 拒绝邦交：题目里那句「警告」的兑现 */
  Z.ISOLATION = {
    id: 'isolated',
    name: '孤立线',
    outputScale: 0.8,
    line: '你关上了门。此后所有产出 −20%，交融不再增长。',
    historian: '不与他族往来者，纵有精玉坚城，亦在时代更替中渐渐落后。'
  };

  Z.ALLIANCE = {
    name: '三地之盟',
    baseK: 6,
    line: '三地既通，物产、工匠与说法都流了进来。',
    historian: '合，不是谁吞掉谁；是各自的长板，补上了别人的短板。'
  };

  /* 立盟后按伙伴数量给的交融基础值 */
  Z.diploCostScale = function (landCode) {
    if (landCode === 'C') return 0.5;
    if (landCode === 'F') return 2;
    return 1;
  };

  Z.diploGainScale = function (landCode) {
    return landCode === 'F' ? 0.5 : 1;
  };

  /* 面板上「正好补你的瓶颈」的说明 */
  Z.diploCoverage = function (landCode, partners) {
    var land = Z.LANDS[landCode];
    if (!land) return [];
    return land.bottlenecks.map(function (b) {
      var by = partners.filter(function (p) {
        return Z.DIPLOMACY[p] && Z.DIPLOMACY[p].relieves.indexOf(b.id) >= 0;
      });
      return { id: b.id, name: b.name, covered: by.length > 0, by: by };
    });
  };
})();