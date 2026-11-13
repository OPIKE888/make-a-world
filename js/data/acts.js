(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  /* sky 逐回合指定天时，让近万年在光影上真的走过去 */
  Z.ACTS = [
    {
      no: 1,
      name: '定居',
      range: '约 10000–5000 年前',
      turns: 3,
      dates: ['约 10000 年前', '约 7500 年前', '约 5000 年前'],
      spans: ['约两千年', '约两千五百年', '约两千五百年'],
      theme: '从游徙到聚落，农业与家畜出现',
      sky: ['dawn', 'noon', 'dusk'],
      goal: { pop: 50, food: 40 },
      goalText: '人口 ≥ 50、粮储 ≥ 40',
      unlock: '聚落成形：解锁夯筑与陶窑，二幕可起城墙。',
      historian: '定居、农耕、家畜——聚落由此而生。居住形式，随环境而定。'
    },
    {
      no: 2,
      name: '古国',
      range: '约 5000–4000 年前',
      turns: 4,
      dates: ['约 5000 年前', '约 4700 年前', '约 4400 年前', '约 4000 年前'],
      spans: ['约三百年', '约三百年', '约三百年', '约四百年'],
      theme: '城墙、水利、玉礼、阶层',
      sky: ['morning', 'noon', 'storm', 'night'],
      goal: { food: 55, craft: 45 },
      goalText: '粮储 ≥ 55、技艺 ≥ 45',
      unlock: '余粮养出不耕之人：解锁玉礼与阶层，三幕可铸铜。',
      historian: '水利既兴，余粮渐多；有余粮，便有阶层，有阶层，便有古国。'
    },
    {
      no: 3,
      name: '王国',
      range: '约 2070–1046 BCE',
      turns: 4,
      dates: ['约前 2070 年', '约前 1800 年', '约前 1500 年', '约前 1046 年'],
      spans: ['约二百七十年', '约三百年', '约四百五十年', '约四百五十年'],
      theme: '青铜、文字、方国',
      sky: ['dawn', 'noon', 'dusk', 'night'],
      goal: { craft: 55, morale: 45 },
      goalText: '技艺 ≥ 55、民心 ≥ 45',
      unlock: '青铜与文字在手：四幕可分封，邦交面板将开。',
      historian: '青铜与文字，是王国黏合方国的两件工具。'
    },
    {
      no: 4,
      name: '封邦',
      range: '1046–771 BCE',
      turns: 4,
      dates: ['前 1046 年', '前 1000 年', '前 900 年', '前 771 年'],
      spans: ['约四十六年', '约一百年', '约一百三十年', '约一百三十年'],
      theme: '分封、礼乐、宗法',
      sky: ['morning', 'noon', 'dusk', 'storm'],
      goal: { morale: 55, R: 45 },
      goalText: '民心 ≥ 55、礼制 ≥ 45',
      unlock: '礼乐越过山川：幕末开邦交面板，从此不再独行。',
      historian: '分封与礼乐，让「合」越过了山川地理的限制。'
    },
    {
      no: 5,
      name: '变局',
      range: '770–256 BCE',
      turns: 4,
      dates: ['前 770 年', '前 600 年', '前 450 年', '前 256 年'],
      spans: ['约一百七十年', '约一百五十年', '约一百五十年', '约二百年'],
      theme: '铁器、兼并、百家',
      sky: ['dawn', 'noon', 'storm', 'night'],
      goal: { pop: 60, K: 55 },
      goalText: '人口 ≥ 60、交融 ≥ 55',
      unlock: '铁器牛耕解了人地瓶颈，也拉开了兼并的序幕。',
      historian: '铁器牛耕解了人地瓶颈，也拉开了兼并的序幕。'
    }
  ];

  Z.TOTAL_TURNS = Z.ACTS.reduce(function (n, a) { return n + a.turns; }, 0);

  Z.globalTurnIndex = function (act, turn) {
    var n = 0;
    for (var i = 0; i < act; i++) n += Z.ACTS[i].turns;
    return n + turn;
  };

  Z.SKY_LABEL = {
    dawn: '晨光初起', morning: '日上东天', noon: '日正当中',
    dusk: '日暮西山', night: '夜色四合', storm: '阴云压野'
  };
})();