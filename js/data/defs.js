/* Dữ liệu cân bằng game: vật phẩm, công trình, đơn vị, kỹ thuật, phe phái. */
(function (root) {
  'use strict';
  const G = root.G;

  G.DAY_LEN = 300; // giây thực cho một ngày ở tốc độ 1x
  G.SEASON_DAYS = 5;
  G.SEASONS = [
    { id: 'spring', name: 'Xuân', grow: 1.1, color: '#9be07a' },
    { id: 'summer', name: 'Hạ', grow: 1.25, color: '#ffd166' },
    { id: 'autumn', name: 'Thu', grow: 0.9, color: '#f4a261' },
    { id: 'winter', name: 'Đông', grow: 0, color: '#a8dadc' },
  ];

  // food: điểm no khi dân ăn; price: giá gốc (vàng)
  G.ITEMS = {
    wood: { name: 'Gỗ', price: 2, icon: 'i.wood', cat: 'raw' },
    stone: { name: 'Đá', price: 3, icon: 'i.stone', cat: 'raw' },
    ore: { name: 'Quặng vàng', price: 6, icon: 'i.ore', cat: 'raw' },
    berry: { name: 'Quả mọng', price: 1, icon: 'i.berry', cat: 'food', food: 1 },
    wheat: { name: 'Lúa mì', price: 2, icon: 'i.wheat', cat: 'food', food: 1 },
    carrot: { name: 'Cà rốt', price: 2, icon: 'i.carrot', cat: 'food', food: 1 },
    pumpkin: { name: 'Bí ngô', price: 5, icon: 'i.pumpkin', cat: 'food', food: 3 },
    meat: { name: 'Thịt', price: 5, icon: 'i.meat', cat: 'food', food: 3 },
    fish: { name: 'Cá', price: 4, icon: 'i.fish', cat: 'food', food: 2 },
    wool: { name: 'Len', price: 6, icon: 'i.wool', cat: 'raw' },
    flour: { name: 'Bột mì', price: 5, icon: 'i.flour', cat: 'goods' },
    bread: { name: 'Bánh mì', price: 8, icon: 'i.bread', cat: 'food', food: 3 },
    cloth: { name: 'Vải', price: 16, icon: 'i.cloth', cat: 'goods' },
    tools: { name: 'Công cụ', price: 25, icon: 'i.tools', cat: 'goods' },
    weapons: { name: 'Vũ khí', price: 30, icon: 'i.weapons', cat: 'goods' },
    potion: { name: 'Thuốc hồi phục', price: 20, icon: 'i.potion', cat: 'goods' },
    stew: { name: 'Món hầm', price: 18, icon: 'i.stew', cat: 'food', food: 7 },
  };
  G.ITEM_ORDER = Object.keys(G.ITEMS);
  G.FOOD_ORDER = ['berry', 'wheat', 'carrot', 'fish', 'pumpkin', 'meat', 'bread', 'stew'];

  G.CROPS = {
    wheat: { name: 'Lúa mì', days: 1.6, yield: 4, item: 'wheat', seasons: ['spring', 'summer', 'autumn'] },
    carrot: { name: 'Cà rốt', days: 1.2, yield: 3, item: 'carrot', seasons: ['spring', 'summer', 'autumn'] },
    pumpkin: { name: 'Bí ngô', days: 2.4, yield: 3, item: 'pumpkin', seasons: ['summer', 'autumn'], locked: true },
  };

  // Bậc phát triển của vương quốc
  G.TIERS = [
    null,
    { name: 'Trại tị nạn' },
    { name: 'Làng', cost: { wood: 80, stone: 40, gold: 100 }, pop: 6 },
    { name: 'Thị trấn', cost: { wood: 150, stone: 120, gold: 400, tools: 15 }, pop: 14 },
    { name: 'Kinh thành', cost: { stone: 250, gold: 1000, tools: 30, cloth: 20 }, pop: 24 },
  ];

  /*
   * Công trình. w,h = số ô; work = công xây; ground = không chặn đường đi;
   * recipes = dây chuyền sản xuất (mỗi thợ một lượt, t giây);
   * trains = đơn vị huấn luyện được.
   */
  G.BUILDINGS = {
    castle: { name: 'Lâu đài', w: 5, h: 3, hp: 2200, house: 6, dropoff: true, sprite: 'b.blue.castle', unique: true, light: 7, shoot: { range: 6.5, dmg: 8, cd: 1.5, tier: 1 }, desc: 'Trung tâm vương quốc. Mất lâu đài là thua.' },
    house: { name: 'Nhà dân', w: 2, h: 2, hp: 320, cost: { wood: 20, stone: 5 }, work: 30, tier: 1, house: 4, variants: ['b.blue.house1', 'b.blue.house2', 'b.blue.house3'], desc: '+4 chỗ ở. Dân mới chỉ đến khi còn chỗ ở và đủ ăn.' },
    plot: { name: 'Ruộng', w: 1, h: 1, hp: 60, cost: { wood: 3 }, work: 5, tier: 1, ground: true, drag: true, sprite: 'p.plot', noLabel: true, desc: 'Trồng lúa mì, cà rốt, bí ngô. Nông dân tự gieo và gặt.' },
    campfire: { name: 'Lửa trại', w: 1, h: 1, hp: 80, cost: { wood: 8 }, work: 4, tier: 1, sprite: 'p.campfire', light: 5, morale: 0.5, noLabel: true, desc: 'Chiếu sáng ban đêm, sưởi ấm mùa đông (+lòng dân).' },
    well: { name: 'Giếng', w: 1, h: 1, hp: 250, cost: { stone: 15, wood: 5 }, work: 12, tier: 1, sprite: 'p.well', radius: 4, desc: 'Ruộng trong bán kính 4 ô lớn nhanh hơn 25%. Dập lửa nhanh.' },
    storage: { name: 'Nhà kho', w: 2, h: 2, hp: 350, cost: { wood: 30, stone: 10 }, work: 25, tier: 1, dropoff: true, sprite: 'p.storage', desc: 'Điểm gom hàng: dân đỡ phải đi xa.' },
    pen: { name: 'Chuồng cừu', w: 3, h: 3, hp: 250, cost: { wood: 35 }, work: 22, tier: 1, ground: true, sprite: 'p.pen', sheepCap: 6, desc: 'Nuôi tối đa 6 cừu. Cừu cho len, sinh sản vào mùa xuân.' },
    road: { name: 'Đường đất', w: 1, h: 1, hp: 1, cost: { stone: 1 }, work: 1.5, tier: 1, ground: true, drag: true, road: true, noLabel: true, desc: 'Đi nhanh hơn 35% trên đường.' },
    fence: { name: 'Hàng rào', w: 1, h: 1, hp: 160, cost: { wood: 3 }, work: 2.5, tier: 1, drag: true, wall: true, sprite: 'p.fence', noLabel: true, desc: 'Chặn bước quân giặc.' },
    gate: { name: 'Cổng gỗ', w: 1, h: 1, hp: 380, cost: { wood: 12 }, work: 6, tier: 1, gate: true, wall: true, sprite: 'p.gate', noLabel: true, desc: 'Quân ta đi qua được, giặc thì không.' },
    mill: { name: 'Cối xay gió', w: 2, h: 2, hp: 350, cost: { wood: 40, stone: 20 }, work: 40, tier: 2, sprite: 'p.mill', slots: 2, recipes: [{ in: { wheat: 2 }, out: { flour: 1 }, t: 9 }], desc: '2 lúa mì → 1 bột mì.' },
    bakery: { name: 'Lò bánh', w: 2, h: 2, hp: 320, cost: { wood: 30, stone: 30 }, work: 35, tier: 2, sprite: 'b.blue.house2', badge: 'i.bread', smoke: true, slots: 2, recipes: [{ in: { flour: 1 }, out: { bread: 1 }, t: 9 }], desc: '1 bột mì → 1 bánh mì (3 điểm no).' },
    market: { name: 'Chợ', w: 3, h: 2, hp: 420, cost: { wood: 50, stone: 20, gold: 50 }, work: 45, tier: 2, sprite: 'p.stall', market: true, desc: 'Mua bán, hợp đồng, tuyến thương mại, hàng hiếm.' },
    smithy: { name: 'Lò rèn', w: 2, h: 2, hp: 420, cost: { wood: 40, stone: 50 }, work: 45, tier: 2, sprite: 'b.blue.house1', badge: 'i.weapons', smoke: true, slots: 2, recipes: [{ id: 'weapons', in: { ore: 2, wood: 1 }, out: { weapons: 1 }, t: 14 }, { id: 'tools', in: { ore: 1, wood: 2 }, out: { tools: 1 }, t: 12 }], desc: 'Rèn vũ khí (2 quặng + 1 gỗ) hoặc công cụ (1 quặng + 2 gỗ).' },
    weaver: { name: 'Xưởng dệt', w: 2, h: 2, hp: 320, cost: { wood: 40, stone: 10 }, work: 35, tier: 2, sprite: 'b.blue.house3', badge: 'i.cloth', slots: 2, recipes: [{ in: { wool: 2 }, out: { cloth: 1 }, t: 12 }], desc: '2 len → 1 vải.' },
    kitchen: { name: 'Nhà bếp', w: 2, h: 2, hp: 320, cost: { wood: 30, stone: 20 }, work: 35, tier: 2, sprite: 'b.blue.house1', badge: 'i.stew', smoke: true, slots: 2, recipes: [{ in: { meat: 1, carrot: 2 }, out: { stew: 1 }, t: 12 }], desc: '1 thịt + 2 cà rốt → 1 món hầm (7 điểm no).' },
    dock: { name: 'Bến cá', w: 2, h: 2, hp: 260, cost: { wood: 40 }, work: 35, tier: 2, sprite: 'p.dock', coastal: true, ground: false, slots: 2, recipes: [{ in: {}, out: { fish: 1 }, t: 14 }], desc: 'Phải đặt sát bờ nước. Ngư dân bắt cá.' },
    barracks: { name: 'Doanh trại', w: 3, h: 2, hp: 700, cost: { wood: 60, stone: 40 }, work: 55, tier: 2, sprite: 'b.blue.barracks', trains: ['warrior', 'lancer'], desc: 'Huấn luyện Kiếm sĩ (và Kỵ thương từ bậc Thị trấn).' },
    tower: { name: 'Tháp canh', w: 2, h: 2, hp: 650, cost: { wood: 30, stone: 50 }, work: 45, tier: 2, sprite: 'b.blue.tower', shoot: { range: 7, dmg: 12, cd: 1.25 }, light: 4, desc: 'Tự bắn tên vào giặc trong tầm 7 ô.' },
    archery: { name: 'Trường bắn', w: 3, h: 2, hp: 560, cost: { wood: 60, stone: 30, cloth: 10 }, work: 55, tier: 3, sprite: 'b.blue.archery', trains: ['archer'], desc: 'Huấn luyện Cung thủ.' },
    monastery: { name: 'Tu viện', w: 3, h: 2, hp: 560, cost: { stone: 80, wood: 40, gold: 100 }, work: 60, tier: 3, sprite: 'b.blue.monastery', trains: ['monk'], slots: 2, recipes: [{ in: { carrot: 2, pumpkin: 1 }, out: { potion: 1 }, t: 16 }], morale: 2, desc: 'Luyện Tu sĩ chữa thương, chế thuốc. +2 lòng dân mỗi ngày.' },
    wall: { name: 'Tường đá', w: 1, h: 1, hp: 600, cost: { stone: 4 }, work: 4, tier: 3, drag: true, wall: true, sprite: 'p.wall', noLabel: true, desc: 'Tường vững chắc.' },
    statue: { name: 'Tượng đài', w: 2, h: 2, hp: 500, cost: { stone: 60, gold: 150 }, work: 40, tier: 3, sprite: 'p.statue', morale: 3, desc: '+3 lòng dân mỗi ngày.' },
  };
  G.BUILD_MENU = [
    { name: 'Cơ bản', items: ['house', 'plot', 'campfire', 'well', 'storage', 'pen', 'road'] },
    { name: 'Sản xuất', items: ['mill', 'bakery', 'smithy', 'weaver', 'kitchen', 'dock', 'market'] },
    { name: 'Quân sự', items: ['barracks', 'archery', 'monastery', 'tower', 'fence', 'gate', 'wall', 'statue'] },
  ];

  /*
   * Đơn vị. dmg: sát thương; range: tầm (px); cd: hồi chiêu (s); speed: px/s.
   * bonus: hệ số khắc chế; cost: chi phí luyện; upkeep: vàng/ngày; eat: điểm no/ngày.
   */
  G.UNITS = {
    hero: { name: 'Hiệp sĩ', kind: 'warrior', hp: 320, dmg: 22, range: 64, cd: 0.55, speed: 205, armor: 4 },
    pawn: { name: 'Dân làng', kind: 'pawn', hp: 45, dmg: 4, range: 42, cd: 1.2, speed: 140, armor: 0, eat: 2 },
    warrior: { name: 'Kiếm sĩ', kind: 'warrior', hp: 150, dmg: 14, range: 58, cd: 1.0, speed: 145, armor: 3, cost: { gold: 30, weapons: 2 }, train: 18, upkeep: 2, eat: 3, bonus: { lancer: 1.5 } },
    archer: { name: 'Cung thủ', kind: 'archer', hp: 85, dmg: 11, range: 320, cd: 1.5, speed: 145, armor: 1, cost: { gold: 35, weapons: 1, cloth: 2 }, train: 20, upkeep: 2, eat: 3, ranged: true, bonus: { warrior: 1.3 } },
    lancer: { name: 'Kỵ thương', kind: 'lancer', hp: 200, dmg: 22, range: 82, cd: 1.6, speed: 180, armor: 4, cost: { gold: 60, weapons: 3 }, train: 26, upkeep: 3, eat: 3, tier: 3, bonus: { archer: 1.6, monk: 1.6 } },
    monk: { name: 'Tu sĩ', kind: 'monk', hp: 75, dmg: 0, heal: 16, range: 230, cd: 2.2, speed: 135, armor: 0, cost: { gold: 50, potion: 2 }, train: 22, upkeep: 2, eat: 2, healer: true },
    // Quân Huyết Nha
    raider: { name: 'Cướp Huyết Nha', kind: 'pawn', anim: 'knife', hp: 55, dmg: 7, range: 44, cd: 1.0, speed: 150, armor: 0, loot: 4 },
    torch: { name: 'Kẻ phóng hoả', kind: 'pawn', anim: 'hammer', hp: 50, dmg: 5, range: 44, cd: 1.2, speed: 150, armor: 0, loot: 5, arson: true },
    redwarrior: { name: 'Đao binh Huyết Nha', kind: 'warrior', hp: 140, dmg: 13, range: 58, cd: 1.05, speed: 140, armor: 3, loot: 9, bonus: { lancer: 1.5 } },
    redarcher: { name: 'Xạ thủ Huyết Nha', kind: 'archer', hp: 80, dmg: 10, range: 300, cd: 1.6, speed: 140, armor: 1, loot: 9, ranged: true, bonus: { warrior: 1.3 } },
    redlancer: { name: 'Thiết kỵ Huyết Nha', kind: 'lancer', hp: 190, dmg: 20, range: 80, cd: 1.7, speed: 170, armor: 4, loot: 14, bonus: { archer: 1.6, monk: 1.6 } },
    redmonk: { name: 'Pháp sư Huyết Nha', kind: 'monk', hp: 70, dmg: 0, heal: 14, range: 220, cd: 2.4, speed: 130, armor: 0, loot: 12, healer: true },
    boss: { name: 'Bạo chúa Xích Hoả', kind: 'warrior', hp: 2400, dmg: 34, range: 80, cd: 1.3, speed: 150, armor: 8, loot: 400, boss: true, scale: 1.7 },
    // Lính đánh thuê Hắc Thạch
    merc: { name: 'Lính đánh thuê Hắc Thạch', kind: 'warrior', hp: 170, dmg: 16, range: 58, cd: 1.0, speed: 145, armor: 4, upkeep: 0, eat: 0, bonus: { lancer: 1.5 } },
    blacklancer: { name: 'Kỵ thương Hắc Thạch', kind: 'lancer', hp: 210, dmg: 23, range: 82, cd: 1.6, speed: 180, armor: 5, upkeep: 0, eat: 0, bonus: { archer: 1.6, monk: 1.6 } },
  };
  G.RAID_COST = { raider: 1, torch: 1.5, redwarrior: 2, redarcher: 2, redlancer: 3.2, redmonk: 3 };

  // Kỹ thuật nghiên cứu tại Lâu đài
  G.TECHS = {
    axe: { name: 'Rìu thép', branch: 'Kinh tế', tier: 2, cost: { tools: 5, gold: 60 }, time: 50, desc: 'Dân khai thác gỗ, đá, quặng nhanh hơn 30%.' },
    wheel: { name: 'Bánh xe', branch: 'Kinh tế', tier: 2, cost: { wood: 60, gold: 120 }, time: 60, desc: 'Dân mang được gấp đôi; đoàn buôn đi nhanh hơn 50%.' },
    guild: { name: 'Hội buôn', branch: 'Kinh tế', tier: 3, cost: { gold: 250, cloth: 10 }, time: 80, req: 'wheel', desc: 'Chênh lệch giá mua/bán giảm một nửa; hợp đồng thưởng thêm 25%.' },
    treasury: { name: 'Ngân khố', branch: 'Kinh tế', tier: 3, cost: { gold: 350, stone: 60 }, time: 90, desc: 'Thuế thu thêm 50%.' },
    hoe: { name: 'Cuốc sắt', branch: 'Nông nghiệp', tier: 2, cost: { tools: 6, gold: 80 }, time: 50, desc: 'Mỗi lần gặt được thêm 1 nông sản.' },
    irrigation: { name: 'Thuỷ lợi', branch: 'Nông nghiệp', tier: 2, cost: { stone: 40, gold: 150 }, time: 70, req: 'hoe', desc: 'Cây trồng lớn nhanh hơn 30%, chịu hạn.' },
    husbandry: { name: 'Chăn nuôi', branch: 'Nông nghiệp', tier: 2, cost: { wheat: 30, gold: 120 }, time: 60, desc: 'Cừu sinh sản cả năm (trừ mùa đông), len nhiều hơn 50%.' },
    greenhouse: { name: 'Nhà kính', branch: 'Nông nghiệp', tier: 3, cost: { wood: 120, cloth: 15, gold: 200 }, time: 90, req: 'irrigation', desc: 'Ruộng vẫn lớn (chậm) trong mùa đông.' },
    mail: { name: 'Giáp xích', branch: 'Quân sự', tier: 2, cost: { weapons: 8, gold: 150 }, time: 70, desc: '+2 giáp cho quân ta và Hiệp sĩ.' },
    masonry: { name: 'Kiến trúc đá', branch: 'Quân sự', tier: 2, cost: { stone: 80, gold: 150 }, time: 70, desc: 'Công trình +40% độ bền, tháp bắn mạnh hơn 25%.' },
    longbow: { name: 'Cung dài', branch: 'Quân sự', tier: 3, cost: { cloth: 10, gold: 120 }, time: 70, desc: 'Cung thủ và tháp: +20% tầm bắn, +20% sát thương.' },
    discipline: { name: 'Kỷ luật', branch: 'Quân sự', tier: 3, cost: { gold: 220, weapons: 10 }, time: 90, req: 'mail', desc: 'Lương lính giảm 30%, máu lính +15%.' },
  };

  // Các thế lực có thể giao thương
  G.FACTIONS = {
    yellow: {
      name: 'Thương hội Kim Sa', town: 'Cảng Kim Sa', leader: 'Kim Bảo', portrait: 'merchant', color: 'yellow',
      sell: { wood: 1.15, stone: 1.15, ore: 1.2, wheat: 1.1, carrot: 1.1, pumpkin: 1.15, meat: 1.15, fish: 1.1, wool: 1.15, flour: 1.15, bread: 1.15, cloth: 1.2, tools: 1.15, weapons: 1.25, potion: 1.3 },
      buy: { wood: 0.85, stone: 0.85, ore: 0.9, berry: 0.8, wheat: 0.85, carrot: 0.85, pumpkin: 0.9, meat: 0.9, fish: 0.9, wool: 0.9, flour: 0.9, bread: 0.9, cloth: 0.95, tools: 0.9, weapons: 0.9, potion: 0.85, stew: 0.9 },
      desc: 'Buôn đủ thứ. Bán cừu giống, hạt giống quý.',
    },
    purple: {
      name: 'Tử Nguyệt Tự', town: 'Tử Nguyệt Tự', leader: 'Sư cô Tịnh Nguyệt', portrait: 'abbess', color: 'purple',
      sell: { potion: 0.7, carrot: 1.0, wool: 1.1 },
      buy: { bread: 1.45, wool: 1.35, pumpkin: 1.4, fish: 1.3, berry: 1.5, cloth: 1.1 },
      desc: 'Các tu sĩ cần bánh, len và bí ngô. Bán thuốc rất rẻ.',
    },
    black: {
      name: 'Hắc Thạch Trại', town: 'Hắc Thạch Trại', leader: 'Tộc trưởng Hắc Sơn', portrait: 'chief', color: 'black',
      sell: { stone: 0.6, ore: 0.7, weapons: 0.85, tools: 0.9 },
      buy: { meat: 1.5, stew: 1.6, bread: 1.3, cloth: 1.3, fish: 1.25 },
      desc: 'Thợ mỏ miền núi: đá, quặng, vũ khí giá rẻ. Thèm thịt và món hầm.',
    },
  };

  // Hàng hiếm (thương thuyền ghé Cảng Kim Sa mỗi 5 ngày)
  G.RARE_GOODS = [
    { id: 'pumpkinseed', name: 'Hạt giống bí ngô', icon: 'i.seed', price: 60, once: true, desc: 'Mở khoá trồng bí ngô.' },
    { id: 'sheep2', name: 'Cặp cừu giống', icon: 'i.sheep', price: 90, desc: 'Thêm 2 cừu vào chuồng còn chỗ.' },
    { id: 'sword', name: 'Kiếm thép Lam', icon: 'i.sword', price: 280, once: true, desc: 'Hiệp sĩ +8 sát thương.' },
    { id: 'armor', name: 'Giáp vảy rồng', icon: 'i.shield', price: 300, once: true, desc: 'Hiệp sĩ +3 giáp, +60 máu.' },
    { id: 'goldwheat', name: 'Giống lúa vàng', icon: 'i.wheat', price: 180, once: true, desc: 'Lúa mì cho thêm 2 hạt mỗi lần gặt.' },
    { id: 'horn', name: 'Tù và chiến', icon: 'i.flag', price: 160, once: true, desc: 'Kỹ năng Hiệu triệu hồi nhanh gấp đôi.' },
    { id: 'potions', name: 'Hòm thuốc (5)', icon: 'i.potion', price: 75, desc: '+5 thuốc hồi phục.' },
    { id: 'refugees', name: 'Đón dân di cư (3)', icon: 'i.pop', price: 120, desc: '3 người thợ giỏi tới làng (cần chỗ ở).' },
  ];

  G.DIFFICULTY = {
    easy: { name: 'Dễ', raid: 0.6, enemyDmg: 0.75, start: 1.5, upkeep: 0.7 },
    normal: { name: 'Thường', raid: 1, enemyDmg: 1, start: 1, upkeep: 1 },
    hard: { name: 'Khó', raid: 1.45, enemyDmg: 1.2, start: 0.8, upkeep: 1.2 },
  };

  G.TAX = [
    { name: 'Miễn thuế', gold: 0, morale: 6 },
    { name: 'Nhẹ', gold: 1, morale: 2 },
    { name: 'Vừa', gold: 2, morale: 0 },
    { name: 'Nặng', gold: 3, morale: -5 },
    { name: 'Hà khắc', gold: 4, morale: -11 },
  ];

  G.JOBS = {
    woodcutter: { name: 'Tiều phu', icon: 'i.wood', desc: 'Chặt cây lấy gỗ' },
    quarry: { name: 'Thợ đá', icon: 'i.stone', desc: 'Đập đá' },
    miner: { name: 'Thợ mỏ', icon: 'i.ore', desc: 'Đào quặng vàng' },
    forager: { name: 'Hái lượm', icon: 'i.berry', desc: 'Hái quả mọng' },
    farmer: { name: 'Nông dân', icon: 'i.wheat', desc: 'Gieo, gặt ruộng' },
    shepherd: { name: 'Mục đồng', icon: 'i.sheep', desc: 'Xén len, chăm cừu' },
    builder: { name: 'Thợ xây', icon: 'i.hammer', desc: 'Xây và sửa công trình' },
    crafter: { name: 'Thợ xưởng', icon: 'i.gear', desc: 'Làm việc trong xưởng sản xuất' },
    trader: { name: 'Thương lái', icon: 'i.trade', desc: 'Chạy tuyến thương mại' },
  };
  G.JOB_ORDER = Object.keys(G.JOBS);
})(typeof window !== 'undefined' ? window : globalThis);
