(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  var LANDS = {
    A: {
      code: 'A',
      name: '大河下游冲积平原',
      short: '冲积平原',
      env: '地势低平，河网密布',
      desc: '大河年年泛滥，泥沙沉积成沃土。近水可灌溉，草木丰茂可渔猎采集；只是石材稀少，水患难测。',
      longboard: '粮 +3/回合 · 人口上限最高',
      bottlenecks: ['水患', '泥淤'],
      routes: '农 · 水利 · 集权',
      scene: 'assets/web/scene-A-river-floodplain.jpg',
      passive: { food: 3 },
      caps: { pop: 100, food: 100 },
      start: { K: 5 },
      playable: true
    },
    B: {
      code: 'B',
      name: '黄土台地与河谷阶地',
      short: '黄土台地',
      env: '土厚疏松，沟壑纵横',
      desc: '黄土疏松易垦，一幕垦殖最快；但十年九旱，地力也会一年年薄下去。',
      longboard: '一幕最快 · 民心 +1/回合',
      bottlenecks: ['缺水', '地力衰减'],
      routes: '农 · 礼制 · 正统',
      scene: 'assets/web/scene-B-loess-terraces.jpg',
      passive: { food: 2, morale: 1 },
      caps: { pop: 80, food: 90 },
      start: { K: 5 },
      playable: false
    },
    C: {
      code: 'C',
      name: '南方湿热丘陵水网',
      short: '南方水网',
      env: '气候炎热多雨，河湖密布',
      desc: '稻作丰足，水运便捷，玉料与刻符之技出众；土壤黏重偏酸，湿热多疫。',
      longboard: '稻 +3 · 邦交成本减半 · 技艺 +1/回合',
      bottlenecks: ['黏酸之土', '湿热疾疫'],
      routes: '稻 · 玉礼 · 神权',
      scene: 'assets/web/scene-C-southern-wetland.jpg',
      passive: { food: 3, craft: 1 },
      caps: { pop: 80, food: 90 },
      start: { K: 10 },
      playable: false
    },
    D: {
      code: 'D',
      name: '北方草原与农牧交错带',
      short: '草原交错',
      env: '草原辽阔，冬寒而降水无常',
      desc: '牧草养马畜，族人骁勇，人口滋长快；白灾与旱涝轮番而来。',
      longboard: '军力最强 · 人口成长快',
      bottlenecks: ['冬寒白灾', '降水剧变'],
      routes: '牧 · 战 · 融合',
      scene: 'assets/web/scene-D-steppe-margin.jpg',
      passive: { food: 2, pop: 1 },
      caps: { pop: 90, food: 90 },
      start: { K: 5 },
      playable: false
    },
    E: {
      code: 'E',
      name: '沿海半岛与近海岛屿',
      short: '海岸半岛',
      env: '海岸曲折，地狭而鱼盐丰',
      desc: '渔盐贝为财源，海路通远方；淡水和耕地都有限，陆地难以扩张。',
      longboard: '财源 · 交融 +10',
      bottlenecks: ['淡水有限', '陆地狭小'],
      routes: '商 · 渔盐 · 外缘',
      scene: 'assets/web/scene-E-coast-peninsula.jpg',
      passive: { food: 2, K: 1 },
      caps: { pop: 60, food: 80 },
      start: { K: 15 },
      playable: false
    },
    F: {
      code: 'F',
      name: '山地与盆地',
      short: '山地盆地',
      env: '群山环抱，矿脉与玉石深藏',
      desc: '玉石铜锡与良材俱全，易守难攻；耕地零散，山路闭塞。',
      longboard: '技艺 +2/回合 · 易守难攻',
      bottlenecks: ['耕地零散', '群山封闭'],
      routes: '工 · 祭 · 独立',
      scene: 'assets/web/scene-F-mountain-basin.jpg',
      passive: { food: 1, craft: 2 },
      caps: { pop: 80, food: 60 },
      start: { K: 5 },
      playable: false
    }
  };

  Z.LANDS = LANDS;
  Z.LAND_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
})();
