(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  Z.COLLAPSE = {
    food: {
      id: 'famine',
      title: '饥 · 粮尽',
      quote: '仓廪见底，最后一把粟种也被分食。',
      text: '族人四散，另寻活路。这片河滩上的第一座聚落，没能熬过荒年。',
      image: 'assets/web/ending-collapse-abandoned.jpg',
      cause: '粮储归零'
    },
    morale: {
      id: 'revolt',
      title: '叛 · 人心散尽',
      quote: '劳役无度，族人不再听命。火塘熄了，聚落散了。',
      text: '没有谁再愿意为别人家的粮仓出力。你成了最后一个留在村里的人。',
      image: 'assets/web/ending-collapse-abandoned.jpg',
      cause: '民心归零'
    },
    pop: {
      id: 'extinct',
      title: '绝 · 族灭',
      quote: '最后一个人也倒在了河滩上。',
      text: '风把屋架吹散，像这里从未来过人。史书里，不会留下这一页。',
      image: 'assets/web/ending-collapse-abandoned.jpg',
      cause: '人口归零'
    },
    craft: {
      id: 'stagnate',
      title: '怠 · 技穷',
      quote: '石斧钝了，无人再磨；陶窑冷了，无人再烧。',
      text: '族人退回采集，旧艺失传。此后若有人路过，只看见几处塌了的土穴。',
      image: 'assets/web/ending-collapse-abandoned.jpg',
      cause: '技艺归零'
    }
  };

  Z.GRADES = [
    { min: 5, word: '盛', line: '仓廪充实，族人和睦，技艺初成。' },
    { min: 4, word: '安', line: '有粮可食，有屋可居，聚落站稳了脚。' },
    { min: 3, word: '平', line: '日子过得下去，但经不起太大的风浪。' },
    { min: 2, word: '危', line: '族人勉强熬了过来，根基却还浅。' },
    { min: 0, word: '散', line: '聚落尚未成形，族人各怀去意。' }
  ];

  Z.STAT_LABELS = {
    pop: '人口',
    food: '粮储',
    morale: '民心',
    craft: '技艺',
    K: '交融',
    W: '武功',
    R: '礼制'
  };
})();
