(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  /*
   * plate  = 无建筑的净地形底图，聚落长在上面
   * reveal = 终章才揭晓的真实考古文化（游戏全程化名）
   * skyEnd / groundStart 为底图上的归一化高度，skyY / groundY 为映射到画布后的高度。
   * 三段纵向映射把天空压扁、把近景地面拉开，聚落才有地方站。
   * ground 是画布坐标下的梯形可建区：y0 远边 / y1 近边 / cx 中心 / w0,w1 半宽。
   */
  var LANDS = {
    A: {
      code: 'A',
      name: '大河下游冲积平原',
      short: '冲积平原',
      env: '地势低平，河网密布',
      desc: '大河年年泛滥，泥沙沉积成沃土。近水可灌溉，草木丰茂可渔猎采集；只是石材稀少，水患难测。',
      food: '粟麦为主，兼渔猎采集',
      foodWhy: '河退留淤，土松而肥，宜旱作粟麦；河湾鱼贝四时可得。',
      longboard: '粮 +3/回合 · 人口上限最高',
      routes: '农 · 治水 · 集权',
      bottlenecks: [
        { id: 'flood', name: '水患', desc: '水旱危机权重加倍，洪来则低田尽没。' },
        { id: 'silt', name: '泥淤', desc: '河床年年抬高。每三回合未兴治水，粮储上限 −8。' }
      ],
      plate: 'assets/web/plate-A-river-floodplain.jpg',
      reveal: {
        culture: '裴李岗 · 磁山 · 大地湾',
        line: '你在这片河滩上种下的粟，后来长成了整个北方的口粮。',
        relics: ['石磨盘与石磨棒', '半地穴房址与窖穴', '炭化粟黍与家猪骨']
      },
      palette: {
        sky: '#e8dfc4', far: '#c2b489', near: '#b08a4e', ground: '#a8763f',
        groundAlt: '#8d6234', water: '#5f7d9c', crop: '#8fae6a', accent: '#c8a86b',
        night: '#1b2740', dusk: '#c07a4a'
      },
      view: { skyEnd: 0.205, skyY: 46, groundStart: 0.545, groundY: 116 },
      ground: { y0: 122, y1: 190, cx: 240, w0: 110, w1: 175 },
      water: { x0: 0, x1: 480, y0: 52, y1: 118 },
      passive: { food: 3 },
      caps: { pop: 100, food: 100 },
      start: { K: 5 },
      crisisWeight: { flood: 3, drought: 2, land: 2, ceiling: 2, locust: 1 },
      dwelling: 'pit'
    },
    B: {
      code: 'B',
      name: '黄土台地与河谷阶地',
      short: '黄土台地',
      env: '土厚疏松，沟壑纵横',
      desc: '黄土疏松易垦，一幕垦殖最快；但十年九旱，地力也会一年年薄下去。',
      food: '粟黍为主，兼牧羊',
      foodWhy: '黄土垂直节理发育，木耒即可破土；台地高处不受河患。',
      longboard: '前期最顺 · 民心 +1/回合',
      routes: '农 · 礼 · 正统',
      bottlenecks: [
        { id: 'dry', name: '缺水', desc: '枯水之年土地自然增产归零。' },
        { id: 'fatigue', name: '地力衰减', desc: '三幕起粮产出 −40%，除非轮休或施肥。' }
      ],
      plate: 'assets/web/plate-B-loess-terraces.jpg',
      reveal: {
        culture: '大地湾 · 仰韶 · 龙山',
        line: '你在塬上挖的窑洞，四千年后仍有人在同一面崖壁上掏窗。',
        relics: ['窑洞式房址与白灰面', '彩陶盆与人面鱼纹', '大型夯土宫殿基址']
      },
      palette: {
        sky: '#f0e2bd', far: '#d9b071', near: '#c69a55', ground: '#c08f4c',
        groundAlt: '#a8763f', water: '#7fa3b8', crop: '#c2b45c', accent: '#d9b071',
        night: '#241f33', dusk: '#c9713c'
      },
      view: { skyEnd: 0.14, skyY: 38, groundStart: 0.50, groundY: 114 },
      ground: { y0: 122, y1: 190, cx: 262, w0: 104, w1: 166 },
      water: { x0: 0, x1: 120, y0: 96, y1: 158 },
      passive: { food: 2, morale: 1 },
      caps: { pop: 80, food: 90 },
      start: { K: 5 },
      crisisWeight: { drought: 3, land: 2, ceiling: 3, flood: 1, revolt: 1 },
      dwelling: 'yaodong'
    },
    C: {
      code: 'C',
      name: '南方湿热丘陵水网',
      short: '南方水网',
      env: '气候炎热多雨，河湖密布',
      desc: '稻作丰足，水运便捷，玉料与刻符之技出众；土壤黏重偏酸，湿热多疫。',
      food: '稻米为主，兼渔菱',
      foodWhy: '河湖漫滩可蓄水成田，稻需静水，此地正合；菱芡鱼虾补其不足。',
      longboard: '稻 +3 · 邦交成本减半 · 技艺 +1/回合',
      routes: '稻 · 玉礼 · 神权',
      bottlenecks: [
        { id: 'acid', name: '黏酸之土', desc: '二幕起粮储上限锁在 78，产量见顶更早。' },
        { id: 'plague', name: '湿热疾疫', desc: '每幕之初人口 −12，除非已行医药或迁高。' }
      ],
      plate: 'assets/web/plate-C-southern-wetland.jpg',
      reveal: {
        culture: '上山 · 跨湖桥 · 河姆渡 · 良渚',
        line: '你筑的水城、你琢的玉琮，四千年后有个名字叫良渚。',
        relics: ['炭化稻谷与骨耜', '干栏式木构榫卯', '玉琮王与神人兽面纹', '大型水坝与人工土台']
      },
      palette: {
        sky: '#dfeae0', far: '#7fa890', near: '#4f8a6b', ground: '#4a6b4a',
        groundAlt: '#3b573c', water: '#7fb0a2', crop: '#9fc46a', accent: '#cfe3d8',
        night: '#132a2c', dusk: '#a8763f'
      },
      view: { skyEnd: 0.12, skyY: 32, groundStart: 0.46, groundY: 116 },
      ground: { y0: 124, y1: 190, cx: 244, w0: 112, w1: 178 },
      water: { x0: 0, x1: 480, y0: 40, y1: 120 },
      passive: { food: 3, craft: 1 },
      caps: { pop: 80, food: 90 },
      start: { K: 10 },
      crisisWeight: { plague: 3, flood: 2, ceiling: 3, land: 1, envoy: 1 },
      dwelling: 'stilt'
    },
    D: {
      code: 'D',
      name: '北方草原与农牧交错带',
      short: '草原交错',
      env: '草原辽阔，冬寒而降水无常',
      desc: '牧草养马畜，族人骁勇，人口滋长快；白灾与旱涝轮番而来。',
      food: '畜牧乳肉为主，兼种粟',
      foodWhy: '草场广而霜期长，谷作难稳；牛羊马能自行觅草，把草变成肉。',
      longboard: '武功成长最快 · 人口 +1/回合',
      routes: '牧 · 战 · 融合',
      bottlenecks: [
        { id: 'white', name: '冬寒白灾', desc: '每三回合入冬，粮储 −12、人口 −4。' },
        { id: 'variance', name: '降水剧变', desc: '土地自然增产在 0–5 之间剧烈波动。' }
      ],
      plate: 'assets/web/plate-D-steppe-margin.jpg',
      reveal: {
        culture: '红山 · 朱开沟 · 夏家店',
        line: '你的马与你的弓，后来成了每一个北方王朝的骨架。',
        relics: ['玉猪龙与积石冢', '青铜短剑与马具', '农牧交错的石城址']
      },
      palette: {
        sky: '#e6e3cb', far: '#8e9a86', near: '#a8a45c', ground: '#8f9448',
        groundAlt: '#7a8a4a', water: '#6f93a8', crop: '#c2b45c', accent: '#c2b45c',
        night: '#1a2130', dusk: '#b06a44'
      },
      view: { skyEnd: 0.22, skyY: 48, groundStart: 0.34, groundY: 106 },
      ground: { y0: 114, y1: 190, cx: 240, w0: 120, w1: 188 },
      water: { x0: 96, x1: 330, y0: 88, y1: 106 },
      passive: { food: 2, pop: 1 },
      caps: { pop: 90, food: 90 },
      start: { K: 5 },
      crisisWeight: { white: 3, drought: 2, land: 2, raid: 2, envoy: 1 },
      dwelling: 'hide'
    },
    E: {
      code: 'E',
      name: '沿海半岛与近海岛屿',
      short: '海岸半岛',
      env: '海岸曲折，地狭而鱼盐丰',
      desc: '渔盐贝为财源，海路通远方；淡水和耕地都有限，陆地难以扩张。',
      food: '鱼贝为主，兼稻作',
      foodWhy: '潮间带贝类取之不竭，煮海为盐可易远方之粮；滩涂狭小，稻作有限。',
      longboard: '财源广 · 交融 +1/回合 · 起始交融 +10',
      routes: '商 · 渔盐 · 外缘',
      bottlenecks: [
        { id: 'freshwater', name: '淡水有限', desc: '人口上限锁 60，建筑也无法抬高。' },
        { id: 'narrow', name: '陆地狭小', desc: '垦荒类行动收益减半，不可扩张。' }
      ],
      plate: 'assets/web/plate-E-coast-peninsula.jpg',
      reveal: {
        culture: '后李 · 北辛 · 大汶口 · 龙山沿海',
        line: '你的贝丘与你的黑陶，一路堆到了海岱之间的城邦。',
        relics: ['贝丘遗址与鱼骨堆', '蛋壳黑陶高柄杯', '海盐煎煮器具']
      },
      palette: {
        sky: '#f2f0e6', far: '#9fc0cc', near: '#cfc9b4', ground: '#d8d2be',
        groundAlt: '#bdb6a0', water: '#4a86a8', crop: '#9fb46a', accent: '#e8e4d8',
        night: '#122232', dusk: '#c98a5a'
      },
      view: { skyEnd: 0.13, skyY: 34, groundStart: 0.47, groundY: 120 },
      ground: { y0: 138, y1: 190, cx: 238, w0: 108, w1: 166 },
      water: { x0: 0, x1: 480, y0: 36, y1: 132 },
      passive: { food: 2, K: 1 },
      caps: { pop: 60, food: 80 },
      start: { K: 15 },
      crisisWeight: { storm: 3, plague: 2, ceiling: 2, envoy: 2, land: 1 },
      dwelling: 'stilt'
    },
    F: {
      code: 'F',
      name: '山地与盆地',
      short: '山地盆地',
      env: '群山环抱，矿脉与玉石深藏',
      desc: '玉石铜锡与良材俱全，易守难攻；耕地零散，山路闭塞。',
      food: '山地杂粮为主，兼猎',
      foodWhy: '盆地坝子零散可耕，山中橡实野兽可补；铜锡玉料是别处没有的。',
      longboard: '技艺 +2/回合 · 易守难攻',
      routes: '工 · 祭 · 独立',
      bottlenecks: [
        { id: 'terrace', name: '耕地零散', desc: '粮储上限硬锁 60，垦荒再多也涨不上去。' },
        { id: 'closed', name: '群山封闭', desc: '邦交代价翻倍，交融增长减半。' }
      ],
      plate: 'assets/web/plate-F-mountain-basin.jpg',
      reveal: {
        culture: '三星堆 · 宝墩 · 盘龙城山系',
        line: '你的青铜面具埋进了土坑，三千年后才有人把它抬起来。',
        relics: ['青铜纵目面具与神树', '玉璋与金杖', '盆地中心的大型城垣']
      },
      palette: {
        sky: '#dfe4e2', far: '#8b9aa2', near: '#6e7a86', ground: '#7d8478',
        groundAlt: '#61695f', water: '#8fb0b8', crop: '#9ab06a', accent: '#b8d0c8',
        night: '#161d26', dusk: '#a87a5c'
      },
      view: { skyEnd: 0.10, skyY: 28, groundStart: 0.50, groundY: 118 },
      ground: { y0: 126, y1: 190, cx: 240, w0: 104, w1: 166 },
      water: { x0: 200, x1: 280, y0: 44, y1: 110 },
      passive: { food: 1, craft: 2 },
      caps: { pop: 80, food: 60 },
      start: { K: 5 },
      crisisWeight: { quake: 2, ceiling: 3, land: 2, envoy: 1, bronze: 1 },
      dwelling: 'stone'
    }
  };

  Object.keys(LANDS).forEach(function (k) { LANDS[k].playable = true; });

  Z.LANDS = LANDS;
  Z.LAND_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
})();