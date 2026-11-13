(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  /* ============ 行动卡：五幕共 48 张 ============ */
  /* build 会在聚落里真的立起一座建筑；field / livestock 长出田垄与畜群 */

  Z.ACTIONS = [
    /* ---------- 一幕 · 定居 ---------- */
    {
      id: 'slash-burn', act: 1, name: '刀耕火种', tag: '农',
      desc: '烧去荒草作肥，以石耜破土下种。',
      effects: { food: 10, craft: -2, pop: 2 }, field: true,
      narrative: '烧荒为肥，石耜破土。秋来粟穗低垂，族中第一次有了余粮。',
      anchor: '《周易·系辞》：斫木为耜，揉木为耒，耒耨之利，以教天下。'
    },
    {
      id: 'raise-pigs', act: 1, name: '驯养猪犬', tag: '农',
      desc: '圈起猎来的幼豕，留犬守夜。',
      effects: { food: 6, pop: 5, morale: 2 }, livestock: true,
      narrative: '幼豕进了围栏，犬卧在门口。栏中有豕，人心便安。',
      anchor: '《诗经·公刘》：执豕于牢，酌之用匏。'
    },
    {
      id: 'pottery', act: 1, name: '烧制陶器', tag: '工',
      desc: '泥条盘筑，入窑烧硬，盛水存粮。',
      effects: { craft: 8, food: 2, morale: 2 }, build: 'kiln',
      narrative: '泥条盘筑，入火成陶。第一次，水有了盛处，粮有了存处。',
      anchor: '《礼记·礼运》：后圣有作……范金合土。'
    },
    {
      id: 'ground-stone', act: 1, name: '磨制石器', tag: '工',
      desc: '砺石上磨出斧、锛、铲，伐木垦土。',
      effects: { craft: 6, food: 5, pop: -1 },
      narrative: '砺石声声，斧锛成形。伐木垦土，比从前快了一倍。',
      anchor: '《越绝书》：神农、赫胥之时，以石为兵。'
    },
    {
      id: 'dig-well', act: 1, name: '掘井而饮', tag: '治水',
      desc: '掘地及泉，离河而居也能得水。',
      effects: { pop: 4, morale: 6, craft: 3 }, build: 'well',
      synergy: { crisis: 'drought', bonus: { food: 6, morale: 3 }, note: '旱年得泉，一族不渴' },
      narrative: '掘地及泉，水清而甘。从此不必逐河而居，也能度旱年。',
      anchor: '《击壤歌》：凿井而饮，耕田而食。'
    },
    {
      id: 'build-dike', act: 1, name: '筑堤护田', tag: '治水',
      desc: '夯土成堤，导水入渠，护住低田。',
      effects: { food: 6, morale: 3, pop: -2 }, build: 'dam',
      synergy: { crisis: 'flood', bonus: { food: 7, morale: 4 }, note: '洪水当前，堤成则低田可保' },
      narrative: '夯土成堤，导水入渠。洪来时，低田第一次保住了。',
      anchor: '《尚书·禹贡》：九河既道，雷夏既泽。'
    },
    {
      id: 'knotted-cords', act: 1, name: '结绳记事', tag: '礼',
      desc: '大事打大结，小事打小结，记住季节与约定。',
      effects: { R: 8, craft: 4, morale: -1 },
      narrative: '大事打大结，小事打小结。族人开始记得住季节与约定。',
      anchor: '《周易·系辞》：上古结绳而治，后世圣人易之以书契。'
    },
    {
      id: 'observe-sky', act: 1, name: '观象授时', tag: '礼',
      desc: '夜观大火星，昼察日影，定播种之期。',
      effects: { food: 8, craft: 4, R: 4 },
      synergy: { crisis: 'ceiling', bonus: { food: 5, craft: 3 }, note: '产量见顶时，重测地力与农时' },
      narrative: '夜观大火星，昼察日影。播种有了准信，不再全靠天猜。',
      anchor: '《尚书·尧典》：乃命羲和，钦若昊天，历象日月星辰，敬授民时。'
    },
    {
      id: 'barter', act: 1, name: '以物易物', tag: '商',
      desc: '在河湾设市，以粟易盐，以陶易皮。',
      effects: { food: 5, K: 6, morale: 2 }, build: 'market',
      narrative: '河湾边上，以粟易盐，以陶易皮。他族的名字第一次被记住。',
      anchor: '《周易·系辞》：日中为市，致天下之民，聚天下之货，交易而退。'
    },
    {
      id: 'migrate', act: 1, name: '迁徙逐水', tag: '迁',
      desc: '弃旧屋，逐水而上，另择高地。',
      effects: { food: 12, morale: -8, pop: -3 }, clearsFlag: 'flood', special: 'migrate',
      narrative: '弃了旧屋，逐水而上。新地更肥，只是老人不肯回头。',
      anchor: '《诗经·公刘》：陟则在巘，复降在原。'
    },

    /* ---------- 二幕 · 古国 ---------- */
    {
      id: 'dam-reservoir', act: 2, name: '筑坝蓄水', tag: '治水',
      desc: '拦谷为塘，旱可灌、涝可蓄。',
      effects: { food: 12, craft: 6, pop: -4 }, build: 'dam',
      synergy: { crisis: 'flood', bonus: { food: 8, morale: 4 }, note: '坝成则洪水有去处' },
      narrative: '草裹泥、泥压石，长坝横过谷口。水第一次听人的话。',
      anchor: '《管子·度地》：令甲士作堤大水之旁。'
    },
    {
      id: 'dredge-nine', act: 2, name: '疏九河', tag: '治水',
      desc: '导壅塞、分众流，三年劳役不歇。',
      effects: { food: 14, pop: 6, morale: -7 }, clearsFlag: 'silt', build: 'dam',
      narrative: '分九道以杀水势。三年劳役，河终于不再年年改道。',
      anchor: '《尚书·禹贡》：九河既道。'
    },
    {
      id: 'rammed-wall', act: 2, name: '夯土为城', tag: '工',
      desc: '版筑层夯，围出一座城来。',
      effects: { craft: 8, R: 8, morale: -4, food: -4 }, build: 'wall',
      narrative: '版筑相和，一层一层夯上去。墙内墙外，从此是两种人。',
      anchor: '《诗经·绵》：捄之陾陾，度之薨薨，筑之登登。'
    },
    {
      id: 'jade-cong', act: 2, name: '琢玉为琮', tag: '祭',
      desc: '以砂绳解玉，刻神人兽面于四角。',
      effects: { craft: 12, R: 10, food: -8 }, build: 'altar',
      narrative: '砂绳拉了半年，玉琮成形。神人的眼睛，从此看着这一族。',
      anchor: '《周礼·春官》：以黄琮礼地。'
    },
    {
      id: 'carve-signs', act: 2, name: '刻符记事', tag: '礼',
      desc: '在陶口刻下族记与数，不再只靠脑子记。',
      effects: { R: 12, craft: 6, K: 4 },
      narrative: '陶口上多了几道刻痕。谁交了多少粮，从此有据可查。',
      anchor: '《周易·系辞》：后世圣人易之以书契。'
    },
    {
      id: 'raise-granary', act: 2, name: '立廪实仓', tag: '农',
      desc: '架木离地，防潮防鼠，把余粮存起来。',
      effects: { food: 10, morale: 6, craft: 3 }, build: 'granary',
      narrative: '仓底架空三尺，鼠上不来。余粮第一次熬过了梅雨。',
      anchor: '《礼记·月令》：命有司发仓廪。'
    },
    {
      id: 'paddy-field', act: 2, name: '辟田为塘', tag: '农',
      desc: '围埂蓄水，把漫滩改成能种的水田。',
      effects: { food: 14, craft: 4, pop: 4 }, field: true,
      narrative: '埂成塘就，水面下插了秧。同样的地，多养一倍的人。',
      anchor: '《周礼·地官》：稻人掌稼下地。'
    },
    {
      id: 'rank-order', act: 2, name: '分等立序', tag: '礼',
      desc: '按墓坑大小与随葬多寡，定族中尊卑。',
      effects: { R: 14, morale: -8, craft: 4 },
      narrative: '大墓深九尺，小墓浅三尺。秩序有了，怨气也有了。',
      anchor: '《左传·桓公二年》：名以制义，义以出礼。'
    },
    {
      id: 'mound-altar', act: 2, name: '筑台祭天', tag: '祭',
      desc: '堆土三成，燔柴于上，举族望拜。',
      effects: { R: 10, morale: 10, food: -6 }, build: 'altar',
      narrative: '土台三成，燔柴的烟直上天去。全族第一次在同一刻跪下。',
      anchor: '《礼记·祭法》：燔柴于泰坛，祭天也。'
    },
    {
      id: 'far-exchange', act: 2, name: '远物互市', tag: '商',
      desc: '以本地之玉，易远方之盐与铜。',
      effects: { K: 12, food: 6, craft: 4 }, build: 'market',
      narrative: '玉走了三百里，换回来的盐够吃一年。远方的名字进了族语。',
      anchor: '《周易·系辞》：致远以利天下。'
    },

    /* ---------- 三幕 · 王国 ---------- */
    {
      id: 'cast-ding', act: 3, name: '铸鼎', tag: '工',
      desc: '合范浇铜，铸一尊能传世的鼎。',
      effects: { craft: 12, R: 12, food: -10 }, build: 'foundry',
      narrative: '铜液入范，鼎成三足。谁问鼎的轻重，就是问天下的归属。',
      anchor: '《左传·宣公三年》：楚子问鼎之大小轻重焉。'
    },
    {
      id: 'bronze-arms', act: 3, name: '铜兵成列', tag: '战',
      desc: '把铜料先给戈矛，而不是给礼器。',
      effects: { W: 16, craft: 6, R: -6, food: -6 }, build: 'foundry',
      narrative: '铜戈列成两行。邻族来朝的次数，忽然多了起来。',
      anchor: '《尚书·牧誓》：称尔戈，比尔干，立尔矛。'
    },
    {
      id: 'oracle-bone', act: 3, name: '契文卜辞', tag: '礼',
      desc: '灼龟观兆，把问与答刻在骨上。',
      effects: { R: 16, craft: 8, morale: 4 },
      narrative: '龟甲灼出裂纹，辞刻在旁边。这一族开始有了能读的历史。',
      anchor: '《尚书·多士》：惟殷先人，有册有典。'
    },
    {
      id: 'vassal-court', act: 3, name: '方国来朝', tag: '礼',
      desc: '受其贡，还其赐，把远方绑进礼里。',
      effects: { K: 14, R: 10, food: -5 },
      narrative: '四方之国带着龟贝玉帛来了。走的时候，车上多了历法。',
      anchor: '《诗经·殷武》：自彼氐羌，莫敢不来王。'
    },
    {
      id: 'fish-salt', act: 3, name: '通鱼盐之利', tag: '商',
      desc: '煮海为盐，舟车转输四方。',
      effects: { food: 10, K: 12, morale: 6 }, build: 'market',
      narrative: '盐车压出两道深辙。四方之货，都从这条路上过。',
      anchor: '《史记·货殖列传》：通鱼盐之货，其民多贾。'
    },
    {
      id: 'move-capital', act: 3, name: '迁都', tag: '迁',
      desc: '弃旧邑，另卜新址，重置一次瓶颈。',
      effects: { morale: -15, food: -8, craft: 4 }, special: 'migrate',
      narrative: '五迁而后定。旧城的火塘熄了，新城的夯声起来了。',
      anchor: '《尚书·盘庚》：盘庚迁于殷，民不适有居。'
    },
    {
      id: 'bronze-plow', act: 3, name: '铜耒深耕', tag: '农',
      desc: '以铜为耒刃，翻起从前翻不动的生土。',
      effects: { food: 14, craft: 4, pop: 4 }, field: true,
      narrative: '铜刃入土三寸，生土翻上来了。地力像新的一样。',
      anchor: '《国语·齐语》：美金以铸剑戟，恶金以铸鉏夷斤。'
    },
    {
      id: 'ancestor-temple', act: 3, name: '立庙祭祖', tag: '祭',
      desc: '为始迁之祖立庙，四时享祀。',
      effects: { R: 14, morale: 10, food: -6 }, build: 'altar',
      narrative: '庙成，始祖的牌位有了归处。族人知道自己从哪里来。',
      anchor: '《诗经·閟宫》：閟宫有侐，实实枚枚。'
    },
    {
      id: 'levy-allies', act: 3, name: '征方国之师', tag: '战',
      desc: '合诸侯之众，讨不庭之国。',
      effects: { W: 18, K: -6, pop: -6, food: -8 },
      narrative: '三月而还，俘获以千计。只是回来的路上，少了很多人。',
      anchor: '《左传·僖公四年》：五侯九伯，女实征之。'
    },
    {
      id: 'city-market', act: 3, name: '立市于城', tag: '商',
      desc: '前朝后市，日中开市，日昃而散。',
      effects: { food: 8, K: 10, morale: 6, craft: 3 }, build: 'market',
      narrative: '面朝后市，市列三肆。城里第一次有了不做农活的人。',
      anchor: '《周礼·考工记》：匠人营国，左祖右社，面朝后市。'
    },

    /* ---------- 四幕 · 封邦 ---------- */
    {
      id: 'enfeoff', act: 4, name: '分封子弟', tag: '礼',
      desc: '授民授疆土，让亲族替你去守远方。',
      effects: { R: 16, K: 12, pop: -6, food: -6 },
      narrative: '册命一下，子弟带着族人往四方去了。山川之外，也有了同姓。',
      anchor: '《左传·僖公二十四年》：封建亲戚，以蕃屏周。'
    },
    {
      id: 'rites-music', act: 4, name: '制礼作乐', tag: '礼',
      desc: '定钟鼓之数、揖让之节，使人各安其位。',
      effects: { R: 18, morale: 12, food: -8 }, build: 'foundry',
      narrative: '钟磬一响，尊卑自明。不用刀兵，也能让人站好位置。',
      anchor: '《礼记·乐记》：乐者为同，礼者为异。'
    },
    {
      id: 'lineage-law', act: 4, name: '立宗法', tag: '礼',
      desc: '嫡庶长幼有序，百世不迁之宗。',
      effects: { R: 16, morale: 6, K: -4 },
      narrative: '大宗百世不迁，小宗五世则迁。血脉成了一张网。',
      anchor: '《礼记·大传》：别子为祖，继别为宗。'
    },
    {
      id: 'well-field', act: 4, name: '划井田', tag: '农',
      desc: '九夫为井，中一为公，八家共耕。',
      effects: { food: 14, R: 8, morale: -4 }, field: true,
      narrative: '阡陌纵横如井字。公田先熟，私田后收，谁也不敢偷懒。',
      anchor: '《孟子·滕文公上》：方里而井，井九百亩。'
    },
    {
      id: 'bell-set', act: 4, name: '铸编钟', tag: '工',
      desc: '一虡十六钟，音律各别，可以奏雅。',
      effects: { craft: 14, R: 10, food: -10 }, build: 'foundry',
      narrative: '十六钟悬起，一敲之下满城皆闻。礼从此有了声音。',
      anchor: '《周礼·春官》：钟师掌金奏。'
    },
    {
      id: 'grand-alliance', act: 4, name: '会盟诸侯', tag: '礼',
      desc: '歃血为盟，共尊一王。',
      effects: { K: 16, R: 12, morale: 6, food: -6 },
      narrative: '牲血涂在唇上，盟书埋进坑里。不同的族，认了同一个天。',
      anchor: '《左传·僖公九年》：葵丘之会，陈牲而不杀。'
    },
    {
      id: 'garrison', act: 4, name: '戍边', tag: '战',
      desc: '屯兵于险，护住新封的疆土。',
      effects: { W: 14, R: 6, food: -10, pop: -4 }, build: 'wall',
      narrative: '烽燧沿山脊排开。夜里一有火光，半日之内皆知。',
      anchor: '《诗经·采薇》：王事靡盬，不遑启处。'
    },
    {
      id: 'open-road', act: 4, name: '辟山道', tag: '商',
      desc: '凿石架栈，把闭塞的山口打开。',
      effects: { K: 16, craft: 8, food: -6, pop: -3 }, build: 'market', special: 'openroad',
      narrative: '栈道悬在绝壁上。山那头的铜，第一次走到了山这头。',
      anchor: '《战国策·秦策》：栈道千里，通于蜀汉。'
    },
    {
      id: 'rotate-field', act: 4, name: '作爰田', tag: '农',
      desc: '三岁更耕，易地换居，让薄田得以歇息。',
      effects: { food: 13, pop: 4, R: 6, morale: -3 }, field: true,
      narrative: '今年种这一畛，明年换那一畛。地力回来了，族人也跟着挪了窝。',
      anchor: '《左传·僖公十五年》：晋于是乎作爰田。'
    },
    {
      id: 'ease-trade', act: 4, name: '通商惠工', tag: '商',
      desc: '轻关市之征，招四方之匠。',
      effects: { food: 10, K: 12, craft: 5, morale: 4 }, build: 'market',
      narrative: '关口的税减了，市上的秤准了。外乡人带着粮和手艺住了下来。',
      anchor: '《左传·闵公二年》：务材训农，通商惠工。'
    },

    /* ---------- 五幕 · 变局 ---------- */
    {
      id: 'iron-plow', act: 5, name: '铁犁牛耕', tag: '农',
      desc: '铁刃配牛力，一人可耕从前十人的地。',
      effects: { food: 20, pop: 8, craft: 6 }, field: true, special: 'breakceiling',
      narrative: '铁犁破土，牛曳而行。困了千年的产量之顶，裂开了一道缝。',
      anchor: '《国语·晋语》：宗庙之牺，为畎亩之勤。'
    },
    {
      id: 'tax-acre', act: 5, name: '初税亩', tag: '农',
      desc: '不论公田私田，履亩而税。',
      effects: { food: 16, R: 8, morale: -10 },
      narrative: '私田也要纳粮了。仓廪充实，旧族的脸却沉了下来。',
      anchor: '《左传·宣公十五年》：初税亩，非礼也。'
    },
    {
      id: 'reform', act: 5, name: '变法', tag: '礼',
      desc: '废世卿、行军功，一切以法为断。',
      effects: { craft: 12, R: 14, W: 8, morale: -12 },
      narrative: '法立木于南门。旧贵族的封邑，一夜之间成了县。',
      anchor: '《史记·商君列传》：治世不一道，便国不法古。'
    },
    {
      id: 'hu-fu', act: 5, name: '胡服骑射', tag: '战',
      desc: '改短衣窄袖，弃车战而学骑射。',
      effects: { W: 20, K: 10, food: -6, R: -12 },
      narrative: '宽袍换了短褐，战车换了快马。中原第一次学会了草原的打法。',
      anchor: '《史记·赵世家》：今吾将胡服骑射以教百姓。'
    },
    {
      id: 'hundred-schools', act: 5, name: '百家争鸣', tag: '礼',
      desc: '开稷下之馆，容各家之说。',
      effects: { R: 14, K: 14, craft: 10, morale: 8, food: -8 },
      narrative: '儒墨名法各执一词，吵了百年。吵出来的东西，后来叫中国。',
      anchor: '《史记·孟子荀卿列传》：自如淳于髡以下，皆命曰列大夫。'
    },
    {
      id: 'mint-coin', act: 5, name: '铸币通商', tag: '商',
      desc: '铸刀布圜钱，以代币帛。',
      effects: { food: 12, K: 16, craft: 6, morale: 4 }, build: 'market',
      narrative: '铜钱串成贯，行商不再赶着牛车换粮。天下之货，一日千里。',
      anchor: '《汉书·食货志》：太公为周立九府圜法。'
    },
    {
      id: 'county', act: 5, name: '置县', tag: '礼',
      desc: '收封邑为县，令由中央出。',
      effects: { R: 18, W: 6, morale: -8, K: 4 },
      narrative: '县令的印从都城发下来。封君的子孙，从此只是富户。',
      anchor: '《史记·秦本纪》：并诸小乡聚，集为大县。'
    },
    {
      id: 'keep-rites', act: 5, name: '守礼', tag: '礼',
      desc: '诸侯虽强，仍守宗周之旧。',
      effects: { morale: 14, R: 12, W: -6 },
      narrative: '钟鼓照旧，揖让照旧。乱世里，这一族成了别人参照的尺。',
      anchor: '《左传·昭公二十六年》：礼之可以为国也久矣。'
    },
    {
      id: 'annex', act: 5, name: '兼并', tag: '战',
      desc: '取邻邦之地，徙其民以实己。',
      effects: { W: 22, pop: 10, food: 8, K: -14, morale: -10 },
      narrative: '邻邦的社稷坛被推平了。地图上少了一个名字，多了一片田。',
      anchor: '《史记·秦本纪》：稍蚕食诸侯。'
    },
    {
      id: 'iron-mine', act: 5, name: '开铁山', tag: '工',
      desc: '凿山取矿，鼓橐成炉，铁水日夜不歇。',
      effects: { craft: 18, food: 6, pop: -4, morale: -4 }, build: 'foundry',
      narrative: '山谷里亮起彻夜的红光。铁比铜贱，从此农具人人可得。',
      anchor: '《管子·地数》：山上有赭者，其下有铁。'
    }
  ];

  Z.CARD_BY_ID = {};
  Z.ACTIONS.forEach(function (c) { Z.CARD_BY_ID[c.id] = c; });
  Z.ACT_ACTIONS = {};
  Z.ACTIONS.forEach(function (c) {
    (Z.ACT_ACTIONS[c.act] = Z.ACT_ACTIONS[c.act] || []).push(c);
  });
  Z.ACT1_ACTIONS = Z.ACT_ACTIONS[1];

  /* ============ 危机卡：14 张 ============ */
  /* weather 交给渲染层，acts 限定可出现的幕 */

  Z.CRISES = {
    flood: {
      id: 'flood', kicker: '天时 · 水旱无常', title: '水旱无常', acts: [1, 2, 3, 4, 5],
      quote: '春汛早至，低田尽没；水退之后，屋脚还泡在泥里。',
      effects: { food: -8, morale: -2 }, weather: 'flood',
      flag: { id: 'flood', name: '水患未平', turns: 2, effects: { food: -3 } },
      hint: '修堤、掘井或迁徙，可减其害。治水之策在本回合格外有力。'
    },
    drought: {
      id: 'drought', kicker: '天时 · 亢旱', title: '亢旱不雨', acts: [1, 2, 3, 4, 5],
      quote: '入夏百日无雨，河床龟裂，井绳一日比一日放得长。',
      effects: { food: -10 }, weather: 'drought', special: 'foodFreeze',
      hint: '本回合土地不再自然增产。掘井、蓄水或开仓，都能救急。'
    },
    land: {
      id: 'land', kicker: '人事 · 人地失衡', title: '人地失衡', acts: [1, 2, 3, 4, 5],
      quote: '人口渐繁，近处的野兽捕尽，林中的果实也不够分了。',
      effects: { pop: 6, food: -6 }, weather: 'dry',
      flag: { id: 'land-pressure', name: '地力渐薄', turns: 2, effects: { pop: 3, food: -3 } },
      hint: '人多了，地却开始喊饿。此后两回合，人口仍增，粮耗亦增。'
    },
    ceiling: {
      id: 'ceiling', kicker: '瓶颈 · 产量见顶', title: '产量见顶', acts: [1, 2, 3, 4, 5],
      quote: '今年的穗与去年一般长。再多的人手，也换不来更多的粮。',
      effects: {}, weather: 'heat', special: 'foodFreeze',
      hint: '本回合土地不再自然增产。或改良农时，或另寻他路。'
    },
    plague: {
      id: 'plague', kicker: '天时 · 疾疫', title: '湿热疾疫', acts: [2, 3, 4, 5],
      quote: '暑气蒸腾，族人接连发热。巫者跳了三夜，仍有人没能起来。',
      effects: { pop: -10, morale: -6 }, weather: 'mist',
      flag: { id: 'plague', name: '疫气未散', turns: 2, effects: { morale: -3 } },
      hint: '医药、迁高或巫祭。人口折损已成，此后一回合民心仍受压。'
    },
    white: {
      id: 'white', kicker: '天时 · 白灾', title: '白灾压境', acts: [2, 3, 4, 5],
      quote: '大雪三日，草场尽白。畜群刨不开雪，一头头卧了下去。',
      effects: { food: -14, pop: -5 }, weather: 'snow',
      flag: { id: 'white', name: '畜群未复', turns: 2, effects: { food: -3 } },
      hint: '南下就食、结盟求粮，或杀畜存人。此灾之后粮储仍紧。'
    },
    locust: {
      id: 'locust', kicker: '天时 · 蝗', title: '飞蝗蔽日', acts: [2, 3, 4, 5],
      quote: '云自东来，落地有声。半日之后，青苗只剩秆子。',
      effects: { food: -13, morale: -5 }, weather: 'locust',
      hint: '捕蝗为食、开仓赈济，或祭天驱蝗。粮损已定，人心可救。'
    },
    envoy: {
      id: 'envoy', kicker: '人事 · 远方来客', title: '方国来使', acts: [2, 3, 4, 5],
      quote: '使者带着从未见过的器物立在门外，说愿以所有，易你所余。',
      effects: { K: 4 }, weather: 'clear',
      hint: '纳贡、联姻或拒之门外。这一步决定此后百年是独行还是同行。'
    },
    raid: {
      id: 'raid', kicker: '人事 · 边患', title: '邻族寇边', acts: [2, 3, 4, 5],
      quote: '夜里北边起火。牲畜被驱走了一半，仓廪也开了口。',
      effects: { food: -8, pop: -4, morale: -5 }, weather: 'ember',
      hint: '筑城、出击或纳币求和。武功与交融，此消彼长。'
    },
    quake: {
      id: 'quake', kicker: '地动 · 山崩', title: '山崩地裂', acts: [2, 3, 4, 5],
      quote: '地忽动如筛，山崖塌了半边，新筑的台基裂开一道口子。',
      effects: { craft: -8, pop: -5, morale: -6 }, weather: 'dust',
      hint: '重修、迁址或祭地。技艺受损，须以工补之。'
    },
    storm: {
      id: 'storm', kicker: '天时 · 海溢', title: '风涛毁岸', acts: [2, 3, 4, 5],
      quote: '飓风自海上来，潮头漫过沙脊，舟与屋一同不见了。',
      effects: { food: -10, craft: -5, pop: -4 }, weather: 'storm',
      hint: '避风、修舟或内迁。海给了你财源，也随时收回去。'
    },
    bronze: {
      id: 'bronze', kicker: '抉择 · 铜料何用', title: '铜料之争', acts: [3, 4],
      quote: '今年只得了这些铜。铸礼器，还是铸戈矛？两边的人都在等。',
      effects: {}, weather: 'clear',
      hint: '给礼器则礼制涨，给兵戈则武功涨。铜只有这么多。'
    },
    revolt: {
      id: 'revolt', kicker: '人事 · 国人暴动', title: '国人暴动', acts: [4, 5],
      quote: '劳役无度，国人围了宫门。王出奔，城中三日无主。',
      effects: { morale: -11, R: -6, food: -5 }, weather: 'ember',
      flag: { id: 'unrest', name: '人心浮动', turns: 2, effects: { morale: -3 } },
      hint: '共和行政、下罪己之诏，或镇压。民心已伤，须缓过来。'
    },
    rites: {
      id: 'rites', kicker: '变局 · 礼崩乐坏', title: '礼崩乐坏', acts: [5],
      quote: '诸侯僭用天子之乐，大夫祭泰山。旧秩序，一夜之间不管用了。',
      effects: { R: -14, morale: -5 }, weather: 'wind',
      hint: '变法以立新序，或守礼以存旧统。两条路，两种文明。'
    }
  };

  Z.ACT1_EVENTS = ['flood', 'land', 'ceiling'];

  /* ============ 勘察：每块地四处，位置落在真实地形上 ============ */
  /* x,y 为 480×270 画布坐标 */

  Z.SCOUT_BY_LAND = {
    A: [
      { id: 'water', char: '河', x: 236, y: 92, resource: '水', effect: { food: 1 }, text: '河水年年泛滥，退后留下一层肥泥。近水，也近险。' },
      { id: 'soil', char: '土', x: 336, y: 162, resource: '土', effect: { food: 1 }, text: '抓一把土，松而黑，攥得成团。这是能长庄稼的土。' },
      { id: 'wood', char: '林', x: 62, y: 132, resource: '木', effect: { craft: 1 }, text: '岸边芦苇与林木丰茂，可伐木、可渔猎、可采果。' },
      { id: 'stone', char: '石', x: 424, y: 186, resource: '石', scarce: true, effect: {}, text: '翻遍河滩，少见大石。垒石为基，怕是难。' }
    ],
    B: [
      { id: 'water', char: '河', x: 62, y: 112, resource: '水', scarce: true, effect: {}, text: '河在塬底，深数十丈。挑水上塬，一日两趟已是极限。' },
      { id: 'soil', char: '土', x: 300, y: 152, resource: '土', effect: { food: 2 }, text: '黄土直立不塌，木耒一插就开。此地垦殖，比别处快一倍。' },
      { id: 'wood', char: '林', x: 156, y: 130, resource: '木', scarce: true, effect: {}, text: '沟坡上只有稀疏灌木。要立柱架屋，木料得从远处运。' },
      { id: 'stone', char: '石', x: 430, y: 178, resource: '石', effect: { craft: 1 }, text: '崖脚有礓石层，可作砺石，也可垒基。' }
    ],
    C: [
      { id: 'water', char: '泽', x: 238, y: 84, resource: '水', effect: { food: 2 }, text: '河湖相通，水静而浅。围埂成塘，便是能插秧的水田。' },
      { id: 'soil', char: '土', x: 252, y: 166, resource: '土', effect: { food: 1 }, text: '土黏而重，色偏青灰，尝之微酸。能种稻，旱作却难。' },
      { id: 'wood', char: '林', x: 62, y: 104, resource: '木', effect: { craft: 2 }, text: '丘陵上皆是巨木与竹。立柱架屋、刳木为舟，材料尽有。' },
      { id: 'stone', char: '玉', x: 430, y: 182, resource: '石', effect: { craft: 1 }, text: '溪床里捡到透闪石的籽料，温润可琢。此地的石，是玉。' }
    ],
    D: [
      { id: 'water', char: '泉', x: 200, y: 86, resource: '水', effect: { food: 1 }, text: '草原上的水泡子，夏盈冬涸。逐水而牧，是这里唯一的活法。' },
      { id: 'soil', char: '土', x: 306, y: 160, resource: '土', effect: { food: 1 }, text: '草皮下是薄薄一层黑土，翻上来能种粟，只是霜期太短。' },
      { id: 'wood', char: '林', x: 92, y: 122, resource: '木', scarce: true, effect: {}, text: '一望无际都是草，乔木只在远山河湾。架屋的木料很金贵。' },
      { id: 'stone', char: '石', x: 420, y: 180, resource: '石', effect: { craft: 1 }, text: '草间散着大石，可垒石冢、可作砺。此地不缺石头，缺的是粮。' }
    ],
    E: [
      { id: 'water', char: '海', x: 240, y: 78, resource: '水', scarce: true, effect: {}, text: '四面皆咸水，煮之得盐，饮之不得。淡水只靠山后一线泉。' },
      { id: 'soil', char: '土', x: 252, y: 172, resource: '土', scarce: true, effect: {}, text: '沙脊之下尽是贝壳与砾。能种的地，只有薄薄几片。' },
      { id: 'wood', char: '林', x: 62, y: 150, resource: '木', effect: { craft: 1 }, text: '岬角背风处有矮林，够造船、够立柱，不够烧炭。' },
      { id: 'stone', char: '贝', x: 420, y: 166, resource: '石', effect: { K: 2 }, text: '潮间带的贝取之不竭。贝可食、可饰、可作交换的凭据。' }
    ],
    F: [
      { id: 'water', char: '溪', x: 240, y: 106, resource: '水', effect: { food: 1 }, text: '雪水汇成清溪，终年不竭。盆地里的坝子，靠它灌溉。' },
      { id: 'soil', char: '土', x: 252, y: 172, resource: '土', scarce: true, effect: {}, text: '可耕之土零零散散嵌在石缝间。加起来，也养不了太多人。' },
      { id: 'wood', char: '林', x: 82, y: 132, resource: '木', effect: { craft: 1 }, text: '阴坡皆是良材，直而巨。造屋、造棺、造神树，都够用。' },
      { id: 'stone', char: '矿', x: 402, y: 142, resource: '石', effect: { craft: 2 }, text: '崖壁上露出青绿矿脉，铜锡与玉料俱在。别处求不到的，这里有。' }
    ]
  };

  /* ============ 聚落形态：三选一，必须与地块相宜 ============ */

  Z.SETTLEMENTS = [
    {
      id: 'earth', name: '半地穴 · 窑洞',
      desc: '向下挖穴或向崖掏洞，覆草为顶。就地取土，冬暖夏凉。',
      fit: ['A', 'B', 'D'], need: '土',
      effects: { morale: 6, food: 4 }, popCap: 8,
      tag: '防寒 · 就地取土',
      mismatch: { id: 'damp', name: '穴居潮湿', turns: 99, effects: { morale: -6 } },
      mismatchText: '此地湿热，穴壁渗水，草顶生霉。此后每回合民心 −6，直到迁居。',
      narrative: '穴壁夯实，草顶压土。风从外面来，屋里却是暖的。',
      spriteBy: { B: 'yaodong', D: 'hide', _: 'pit' }
    },
    {
      id: 'stilt', name: '干栏 · 架空',
      desc: '伐木立柱，架屋离地。防潮避水，临水而居。',
      fit: ['A', 'C', 'E'], need: '木',
      effects: { craft: 6, food: 2, morale: 3 }, popCap: 4,
      tag: '防潮 · 临水而居',
      mismatch: { id: 'nolimber', name: '木料不继', turns: 99, effects: { craft: -5 } },
      mismatchText: '此地无巨木，柱料须远运。此后每回合技艺 −5，直到迁居。',
      narrative: '木柱扎进泥里，屋板离地三尺。汛水漫上来，也只湿了柱脚。',
      spriteBy: { _: 'stilt' }
    },
    {
      id: 'stone', name: '石砌台居',
      desc: '垒石为基，依山而居。坚固耐久，不畏风雨。',
      fit: ['C', 'F'], need: '石',
      effects: { craft: 4, morale: 4, R: 4 }, popCap: 6,
      tag: '坚固 · 依山为固',
      mismatch: { id: 'nostone', name: '石材不敷', turns: 99, effects: { morale: -4, craft: -3 } },
      mismatchText: '此地少石，石基垒到一半便塌。族人退回简易窝棚，此后民心 −4、技艺 −3。',
      narrative: '石基一层层垒上去，缝里塞进碎砾。这座屋，能住很久。',
      spriteBy: { _: 'stone' }
    }
  ];

  Z.SETTLEMENT_BY_ID = {};
  Z.SETTLEMENTS.forEach(function (s) { Z.SETTLEMENT_BY_ID[s.id] = s; });

  Z.dwellingKey = function (settlementId, landId) {
    var s = Z.SETTLEMENT_BY_ID[settlementId];
    if (!s) return 'pit';
    return s.spriteBy[landId] || s.spriteBy._;
  };
})();