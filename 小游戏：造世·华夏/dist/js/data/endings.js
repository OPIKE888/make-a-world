(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  Z.STAT_LABELS = {
    pop: '人口', food: '粮储', morale: '民心', craft: '技艺',
    K: '交融', W: '武功', R: '礼制'
  };

  Z.ROUTE_LABELS = {
    '农': '农耕', '治水': '治水', '工': '百工', '礼': '礼制',
    '商': '货殖', '战': '征伐', '祭': '祭祀', '迁': '迁徙'
  };

  /* 行动卡 → 成就。结局判定与终章图鉴都读这张表 */
  Z.CARD_ACHIEVEMENTS = {
    'knotted-cords': ['record'],
    'observe-sky': ['calendar'],
    'dig-well': ['water'], 'build-dike': ['water'],
    'dam-reservoir': ['water'], 'dredge-nine': ['water'],
    'pottery': ['kiln'],
    'rammed-wall': ['wall'], 'garrison': ['wall'],
    'jade-cong': ['rites', 'jade'], 'mound-altar': ['rites'],
    'rank-order': ['rites', 'rank'],
    'carve-signs': ['writing'], 'oracle-bone': ['writing'],
    'hundred-schools': ['writing', 'schools'],
    'cast-ding': ['bronze'], 'bronze-arms': ['bronze', 'war'],
    'bronze-plow': ['bronze'], 'iron-mine': ['iron'], 'iron-plow': ['iron'],
    'ancestor-temple': ['rites'], 'enfeoff': ['rites', 'rank'],
    'rites-music': ['rites', 'bronze'], 'lineage-law': ['rites', 'rank'],
    'bell-set': ['rites', 'bronze'], 'keep-rites': ['rites'],
    'barter': ['trade'], 'far-exchange': ['trade'], 'fish-salt': ['trade'],
    'city-market': ['trade'], 'mint-coin': ['trade'], 'open-road': ['trade'],
    'levy-allies': ['war'], 'annex': ['war'], 'hu-fu': ['war'],
    'vassal-court': ['rank'], 'grand-alliance': ['rank'],
    'county': ['rank'], 'reform': ['rank'], 'tax-acre': ['rank'],
    'paddy-field': ['rice'], 'well-field': ['rice'],
    'raise-pigs': ['herd'], 'raise-granary': ['granary']
  };

  Z.ACHIEVEMENT_LABELS = {
    record: '结绳记事', calendar: '观象授时', water: '水利', kiln: '陶窑',
    wall: '城垣', rites: '礼制', jade: '玉礼', rank: '阶层与官制',
    writing: '文字', schools: '百家之学', bronze: '青铜', iron: '铁器',
    trade: '商路', war: '兵戈', rice: '稻作', herd: '畜群', granary: '仓廪',
    irrigation: '外来水利工匠', chariot: '车马', cavalry: '骑兵',
    salt: '鱼盐', searoute: '海路', stone: '石材'
  };

  Z.COLLAPSE = {
    food: {
      id: 'famine', tier: 'X', title: '饥 · 粮尽',
      subtitle: '仓廪见底',
      quote: '仓廪见底，最后一把粟种也被分食。',
      text: '先是借粮，再是借种，最后连种也没有了。族人扶老携幼四散而去，另寻活路。这片土地上的第一座聚落，没能熬过这个荒年；后来的人在同样的河滩上重新点火，却不知道脚下埋着谁。',
      cause: '粮储归零',
      callback: '对应第 4 问「瓶颈」：环境能提供的资源有上限，上限之外必须靠技术或交换。',
      image: 'assets/web/ending-collapse-abandoned.jpg', tint: '#6b5a3a'
    },
    morale: {
      id: 'revolt', tier: 'X', title: '叛 · 人心散尽',
      subtitle: '火塘熄了',
      quote: '劳役无度，族人不再听命。火塘熄了，聚落散了。',
      text: '夯土的号子停了，堤上的缺口没人去补。没有谁再愿意为别人家的粮仓出力。你成了最后一个留在村里的人，看着自己修了一半的城墙，在雨里一寸寸塌回泥土。',
      cause: '民心归零',
      callback: '对应第 6 问「多元一体」：合的前提是人愿意合，不是把谁压服。',
      image: 'assets/web/ending-collapse-abandoned.jpg', tint: '#7a4438'
    },
    pop: {
      id: 'extinct', tier: 'X', title: '绝 · 族灭',
      subtitle: '风把屋架吹散',
      quote: '最后一个人也倒在了这片土地上。',
      text: '疫气、白灾、刀兵，一年接着一年。屋架空了，田垄荒了，风把草顶吹散，像这里从未来过人。史书里不会留下这一页——因为再没有人能把它讲给别人听。',
      cause: '人口归零',
      callback: '对应第 4 问「瓶颈」：人口既是资源也是负担，越过上限便反噬。',
      image: 'assets/web/ending-collapse-abandoned.jpg', tint: '#4a4a52'
    },
    craft: {
      id: 'stagnate', tier: 'X', title: '怠 · 技穷',
      subtitle: '旧艺失传',
      quote: '石斧钝了，无人再磨；陶窑冷了，无人再烧。',
      text: '会烧陶的老人死了，会琢玉的匠人被征去戍边。族人退回采集，旧艺一样样失传。此后若有人路过，只看见几处塌了的土穴，和窑址上一层再没被翻开过的灰。',
      cause: '技艺归零',
      callback: '对应第 4 问「瓶颈」：技术是打破上限的唯一内生手段，停一步就退一代。',
      image: 'assets/web/ending-collapse-abandoned.jpg', tint: '#5a5340'
    }
  };

  function route(s) { return s.route || '农'; }
  function has(s, k) { return !!s.ach[k]; }
  function topHidden(s) {
    var m = Math.max(s.K, s.W, s.R);
    return s.R === m ? 'R' : (s.W === m ? 'W' : 'K');
  }

  /* gap = 0 表示条件已满足；否则为「差多少」，用于兜底选最近的结局 */
  Z.ENDINGS = [
    {
      id: 'huaxia', tier: 'A', title: '华夏 · 多元一体',
      subtitle: '你的族号，成了「诸夏」的一部分',
      quote: '不是一个族吞掉了别的族，是许多个族，长成了同一个天下。',
      text: '你的粟与他们的稻同仓，你的字与他们的符同版，你的神与他们的祖同庙。会盟那天，六地的旗号都还在，只是旗下的人开始用同一种话记事。后来「诸夏」这个词出现时，没有人再问它原本属于谁。',
      callback: '对应第 6 问「多元一体」：一体不是抹平多元，而是多元共构一体。',
      image: 'assets/web/ending-01-huaxia-many-in-one.jpg', tint: '#c8a86b',
      need: '交融 ≥ 82、民心 ≥ 62、主导路线不是征伐，且两处瓶颈都由邦交补齐',
      gap: function (s) {
        var short = (s.covered || []).filter(function (c) { return !c.covered; }).length;
        return Math.max(0, 82 - s.K) + Math.max(0, 62 - s.morale) +
          (route(s) === '战' ? 20 : 0) + short * 18;
      }
    },
    {
      id: 'liyue', tier: 'A', title: '礼乐正统',
      subtitle: '天下用你的历法与文字',
      quote: '你未必最强，但诸侯会盟，坐次要按你的规矩排。',
      text: '你的编钟定音，你的历谱定农时，你的称谓定了谁该站在哪一级台阶上。别人的兵马比你多，别人的仓廪比你满，可他们铸鼎要照你的形制，记事要用你的笔画。千年之后，人们仍以你这一套为「正」。',
      callback: '对应第 6 问「多元一体」：礼乐是越过地理限制、把「合」维系下去的软性纽带。',
      image: 'assets/web/ending-tier-A-flourishing.jpg', tint: '#b8935a',
      need: '主导路线为礼制，礼制高于交融与武功，民心 ≥ 55，并已立礼制成就',
      gap: function (s) {
        var g = Math.max(0, 55 - s.morale) + Math.max(0, s.K + 1 - s.R) + Math.max(0, s.W + 1 - s.R);
        return g + (has(s, 'rites') ? 0 : 25) + (route(s) === '礼' ? 0 : 22);
      }
    },
    {
      id: 'huozhi', tier: 'A', title: '货殖通天下',
      subtitle: '血脉与文字散在四海',
      quote: '你失去了土地，却把日子过到了别人的城里。',
      text: '盐、贝、铜、玉，从你的市集流向六地；你的秤码成了通行的准头，你的商队认得每一条渡口。族地几经兵燹，族人却散在四海，说着两三种话，写着同一种字。谁也没能灭掉你——因为你早已不只在一片地上。',
      callback: '对应第 5 问「交融」：交换比征服更快，也更深地把不同环境的人连在一起。',
      image: 'assets/web/ending-tier-A-flourishing.jpg', tint: '#c9a24a',
      need: '主导路线为货殖，且交融 ≥ 80',
      gap: function (s) { return Math.max(0, 80 - s.K) + (route(s) === '商' ? 0 : 22); }
    },
    {
      id: 'baye', tier: 'B', title: '霸业 · 其兴也勃',
      subtitle: '兼并六地，二世而亡',
      quote: '你做到了前无古人，也没能做到后有来者。',
      text: '铁骑所至，六地的城垣尽数拆平，度量衡归一，道路笔直。你活着的时候没有人敢反；你闭眼的第二年，烽烟从每一条你修的驰道上烧回来。史家用了六个字写你：其兴也勃，其亡也忽。',
      callback: '对应第 6 问「多元一体」：以力合者，力尽则散——统一与一体并不是一回事。',
      image: 'assets/web/ending-tier-B-bright-and-brief.jpg', tint: '#a8503c',
      need: '武功 ≥ 78，且民心 ≤ 45',
      gap: function (s) { return Math.max(0, 78 - s.W) + Math.max(0, s.morale - 45); }
    },
    {
      id: 'shenquan', tier: 'B', title: '神权古国 · 一夜退场',
      subtitle: '极精的玉器，庞大的水利，然后无疾而终',
      quote: '神像还在，抬神的人已经走空了。',
      text: '你把最好的玉给了神，把最多的人给了土台与水坝。祭坑越埋越深，城墙越夯越高，四方却一个使者也没来过。某一年水改了道，某一年稻没有熟，举族在一夜之间散尽。三千年后，人们挖出你的面具，惊为天人，却读不懂一个字。',
      callback: '对应第 5 问「交融」：不与他族往来者，纵有极盛之技，亦在时代更替中被淘汰。',
      image: 'assets/web/ending-tier-B-bright-and-brief.jpg', tint: '#6f8a7a',
      need: '拒绝邦交、已琢玉礼立宗庙，交融 < 55，且地处南方水网或山地盆地',
      gap: function (s) {
        var g = Math.max(0, s.K - 54) + (has(s, 'jade') ? 0 : 24) + (has(s, 'rites') ? 0 : 12);
        return g + (s.isolated ? 0 : 20) + ((s.land === 'C' || s.land === 'F') ? 0 : 18);
      }
    },
    {
      id: 'nongmu', tier: 'B', title: '农牧融合 · 胡汉一家',
      subtitle: '你成了后来北方王朝的骨架',
      quote: '你的马、你的弓、你的姓，一起进了中原。',
      text: '你在交错带上既种粟也放羊，既筑城也逐水草。南下时你带着骑兵，定居后你学会了纳赋；北归时你带着谷种，扎帐后你仍祭着中原的祖。两百年后，人们分不清哪一半是胡、哪一半是汉——因为早已是一家人。',
      callback: '对应第 6 问「多元一体」：农牧交错带是「多元」熔成「一体」最关键的接缝。',
      image: 'assets/web/ending-tier-B-bright-and-brief.jpg', tint: '#9a8a4a',
      need: '地处北方草原交错带，且交融 ≥ 60',
      gap: function (s) { return Math.max(0, 60 - s.K) + (s.land === 'D' ? 0 : 30); }
    },
    {
      id: 'duandai', tier: 'C', title: '断代',
      subtitle: '史书里没有你',
      quote: '你活过，你没有被写下来。',
      text: '聚落还在，田还在，人还在生养。只是没有刻符，没有卜辞，没有一套能把事传给隔代人的规矩。三代之后的子孙记得住祖父的名字，再往上便一片空白。考古队会从你的灰坑里筛出陶片，却给不出一个族名。',
      callback: '对应第 6 问「多元一体」：文字与礼制，是把「多元」记住并整合为「一体」的载体。',
      image: 'assets/web/ending-tier-C-quiet-margin.jpg', tint: '#7a7466',
      need: '终局仍未建立任何文字或礼制成就',
      gap: function (s) { return (has(s, 'writing') || has(s, 'rites')) ? 40 : 0; }
    },
    {
      id: 'pianan', tier: 'C', title: '偏安一隅',
      subtitle: '活成了地方志里的传说',
      quote: '中原的鼎换了几轮，你的山口还是那个山口。',
      text: '你迁过三次，每次都往更难走的地方去。兵戈到不了这里，历法也传不进来。族人在坝子里种着祖上传下的谷，唱着没人记谱的歌。县志修到你这一条，只有八个字：其地险远，其民自守。',
      callback: '对应第 5 问「交融」：避开了淘汰，也避开了参与——存续与主导是两条路。',
      image: 'assets/web/ending-tier-C-quiet-margin.jpg', tint: '#8a9a7a',
      need: '两度迁徙以避祸，且民心 ≥ 50',
      gap: function (s) { return Math.max(0, 50 - s.morale) + Math.max(0, 2 - (s.moved || 0)) * 12; }
    },
    {
      id: 'yinshan', tier: 'C', title: '隐于山林',
      subtitle: '沉入巫、歌、匠的民间',
      quote: '国没了，手艺和调子还在。',
      text: '城垣被别族的旗盖住，神庙改成了别人的仓。可你的傩面还在跳，你的鼓点还在响，你的匠人还在别人的作坊里琢着同样的纹。王朝谱系里找不到你，山歌、木作与巫辞里，处处都是你。',
      callback: '对应第 6 问「多元一体」：文化可以不以政权的形式存续，却仍参与了一体的构成。',
      image: 'assets/web/ending-tier-C-quiet-margin.jpg', tint: '#6a8272',
      need: '地处山地盆地或沿海半岛，且走封闭线（拒绝邦交或交融 < 55）',
      gap: function (s) {
        var g = (s.land === 'F' || s.land === 'E') ? 0 : 26;
        return g + ((s.isolated || s.K < 55) ? 0 : Math.max(0, s.K - 54));
      }
    },
    {
      id: 'xiaorong', tier: 'C', title: '消融于他族',
      subtitle: '族名消失，稻、玉、字留下了',
      quote: '没有人再自称你的族人，人人都在用你留下的东西。',
      text: '通婚、纳贡、内徙，一代一代，你的话只剩几个词，你的神只剩一个节。族名最后一次出现在别人的册书上，是作为「某地旧民」。可他们碗里的稻、腕上的玉、笔下的偏旁，都还是从你这里来的。',
      callback: '对应第 6 问「多元一体」：消融也是融合的一种代价——一体之中，未必每个多元都留得下名字。',
      image: 'assets/web/ending-tier-C-quiet-margin.jpg', tint: '#7d6a86',
      need: '拒绝邦交，交融 < 55，且民心 ≤ 45',
      gap: function (s) { return Math.max(0, s.K - 54) + Math.max(0, s.morale - 45) + (s.isolated ? 0 : 20); }
    }
  ];

  Z.ENDING_BY_ID = {};
  Z.ENDINGS.forEach(function (e) { Z.ENDING_BY_ID[e.id] = e; });
  Object.keys(Z.COLLAPSE).forEach(function (k) {
    Z.ENDING_BY_ID[Z.COLLAPSE[k].id] = Z.COLLAPSE[k];
  });

  Z.TIER_LABEL = { A: '存续并主导', B: '辉煌而短促', C: '存续但边缘', X: '中途崩盘' };

  /* 终局判定：越具体的结局越先判，免得被通用结局吞掉。全不满足则取「差得最少」的并标注 near */
  Z.JUDGE_ORDER = ['shenquan', 'baye', 'huaxia', 'liyue', 'huozhi',
    'nongmu', 'duandai', 'pianan', 'xiaorong', 'yinshan'];

  Z.judgeEnding = function (s) {
    if (s.collapse) {
      return { ending: Z.COLLAPSE[s.collapse] || Z.COLLAPSE.food, near: false, gap: 0 };
    }
    for (var i = 0; i < Z.JUDGE_ORDER.length; i++) {
      var e = Z.ENDING_BY_ID[Z.JUDGE_ORDER[i]];
      if (e.gap(s) === 0) return { ending: e, near: false, gap: 0 };
    }
    var best = Z.ENDINGS[0], bestGap = Infinity;
    Z.ENDINGS.forEach(function (e) {
      var g = e.gap(s);
      if (g < bestGap) { bestGap = g; best = e; }
    });
    return { ending: best, near: true, gap: bestGap };
  };

  /* 主导路线：全程标签众数，并列时看最后一幕 */
  Z.dominantRoute = function (played) {
    var all = {}, last = {};
    played.forEach(function (p) {
      var tag = p.tag || (Z.CARD_BY_ID[p.cardId] || {}).tag;
      if (!tag) return;
      all[tag] = (all[tag] || 0) + 1;
      if (p.act === 5) last[tag] = (last[tag] || 0) + 1;
    });
    var best = '农', bestN = -1;
    Object.keys(all).forEach(function (t) {
      var n = all[t], tie = last[t] || 0;
      if (n > bestN || (n === bestN && tie > (last[best] || 0))) { best = t; bestN = n; }
    });
    return best === '治水' ? '农' : best;
  };

  Z.GRADES = [
    { min: 17, word: '盛', line: '五幕俱兴，仓廪充实，四方来同。' },
    { min: 14, word: '安', line: '根基已稳，礼乐初成，足以自立于天下。' },
    { min: 10, word: '平', line: '日子过得下去，却经不起太大的风浪。' },
    { min: 6, word: '危', line: '族人勉强熬了过来，根基还浅。' },
    { min: 0, word: '散', line: '聚落几度将散，勉力撑到了最后。' }
  ];

  Z.gradeFor = function (stars) {
    for (var i = 0; i < Z.GRADES.length; i++) {
      if (stars >= Z.GRADES[i].min) return Z.GRADES[i];
    }
    return Z.GRADES[Z.GRADES.length - 1];
  };

  /* 终章揭晓：化名 → 真实考古文化 */
  Z.REVEAL_INTRO = {
    kicker: '终章 · 揭晓',
    title: '现在，可以叫出它的名字了',
    lines: [
      '整局游戏中，你的土地只有一个代号，你的族人只有一个自称。',
      '这不是虚构。你走过的每一幕，都在真实的土地上真实地发生过。'
    ],
    partnerHead: '与你通好的那些「他族」，也有名字',
    foot: '多元一体，从来不是一句话。它是六块地、几千年、无数人，各自把长板交出来的结果。'
  };
})();