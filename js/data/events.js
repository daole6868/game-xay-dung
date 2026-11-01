/* Sự kiện ngẫu nhiên mỗi bình minh: mỗi sự kiện có lựa chọn và hậu quả. */
(function (root) {
  'use strict';
  const G = root.G;
  const S = () => G.S;
  const E = () => G.Economy;
  const season = () => G.SEASONS[G.Time.seasonIndex()].id;

  G.EVENTS = [
    {
      id: 'refugees', title: 'Người tị nạn', portrait: 'villager',
      text: (d) => `${d.n} người dân Lam Quốc lưu lạc tìm tới, xin được ở lại. Họ đói và mệt, nhưng còn sức làm việc.`,
      weight: () => (S().day > 2 ? 1 : 0),
      init: (d) => { d.n = G.randInt(2, 4); },
      choices: [
        { label: (d) => `Đón nhận (+${d.n} dân, -10 lương thực)`, effect: (d) => { G.Village.addVillagers(d.n); E().consumeFood(10); G.Village.addMorale(3, 'Đón người tị nạn'); } },
        { label: () => 'Cho ít lương khô rồi tiễn đi (-5 lương thực)', effect: () => { E().consumeFood(5); } },
        { label: () => 'Đuổi đi', effect: () => { G.Village.addMorale(-5, 'Đuổi người tị nạn'); } },
      ],
    },
    {
      id: 'rain', title: 'Mưa rào', portrait: 'advisor',
      text: () => 'Mây đen kéo về từ biển. Một trận mưa lớn tưới đẫm đồng ruộng — hôm nay cây cối lớn nhanh gấp rưỡi.',
      weight: () => (season() === 'winter' ? 0 : 1.2),
      choices: [{ label: () => 'Tuyệt vời!', effect: () => { G.Time.setWeather('rain'); } }],
    },
    {
      id: 'drought', title: 'Hạn hán', portrait: 'advisor',
      text: () => 'Nắng như đổ lửa, đất ruộng nứt nẻ. Hôm nay cây trồng lớn chậm một nửa (ruộng gần giếng không sao).',
      weight: () => (season() === 'summer' ? 1.3 : 0),
      choices: [
        { label: () => 'Chịu vậy', effect: () => { G.Time.setWeather('drought'); } },
        { label: () => 'Thuê người gánh nước (-40 vàng)', cond: () => S().gold >= 40, effect: () => { E().spendGold(40); } },
      ],
    },
    {
      id: 'thief', title: 'Kẻ trộm!', portrait: 'stranger',
      text: () => 'Một bóng người lẻn vào kho bạc lúc rạng sáng rồi chạy về phía rừng! Bắt được hắn sẽ lấy lại vàng.',
      weight: () => (S().gold > 80 ? 0.9 : 0),
      choices: [{ label: () => 'Đuổi theo!', effect: () => { G.Military.spawnThief(); } }],
    },
    {
      id: 'tribute', title: 'Sứ giả Huyết Nha', portrait: 'scout',
      text: (d) => `Một tên sứ giả Huyết Nha cưỡi ngựa tới cổng: "Nộp ${d.gold} vàng, đêm nay các ngươi được ngủ yên. Không thì..."`,
      weight: () => (S().day >= 5 && S().camps.F && !S().camps.F.dead ? 0.8 : 0),
      init: (d) => { d.gold = 60 + S().day * 10; },
      choices: [
        { label: (d) => `Nộp ${d.gold} vàng`, cond: (d) => S().gold >= d.gold, effect: (d) => { E().spendGold(d.gold); S().raidSkip = S().day; G.Village.addMorale(-4, 'Cúi đầu nộp cống'); } },
        { label: () => 'Đuổi cổ hắn! (đêm nay giặc đông gấp rưỡi)', effect: () => { S().raidBoost = 1.5; G.Village.addMorale(4, 'Khí phách'); } },
      ],
    },
    {
      id: 'festival', title: 'Lễ hội mùa màng', portrait: 'villager',
      text: () => 'Dân làng muốn mở hội mừng mùa thu hoạch: múa hát, nướng bánh, đốt lửa thâu đêm.',
      weight: () => (season() === 'autumn' ? 1.5 : 0.3),
      choices: [
        { label: () => 'Mở hội lớn (-30 lương thực, -30 vàng, +18 lòng dân)', cond: () => S().gold >= 30 && E().foodPoints() >= 30, effect: () => { E().consumeFood(30); E().spendGold(30); G.Village.addMorale(18, 'Lễ hội'); } },
        { label: () => 'Hội nhỏ thôi (-10 lương thực, +6 lòng dân)', cond: () => E().foodPoints() >= 10, effect: () => { E().consumeFood(10); G.Village.addMorale(6, 'Hội nhỏ'); } },
        { label: () => 'Không có thời gian', effect: () => { G.Village.addMorale(-3, 'Không mở hội'); } },
      ],
    },
    {
      id: 'goldvein', title: 'Mạch vàng mới', portrait: 'villager',
      text: () => 'Một người tiều phu hớt hải chạy về: sạt lở đất đã làm lộ ra mạch quặng vàng gần làng!',
      weight: () => 0.6,
      choices: [{ label: () => 'Cho người tới khai thác', effect: () => { G.World.spawnGoldVein(); } }],
    },
    {
      id: 'wildsheep', title: 'Bầy cừu hoang', portrait: 'villager',
      text: () => 'Một bầy cừu hoang xuất hiện trên đồng cỏ gần làng. Dắt chúng về chuồng thì tốt biết mấy (đứng cạnh, bấm E, tốn 1 cà rốt).',
      weight: () => 0.7,
      choices: [{ label: () => 'Đi xem nào', effect: () => { G.World.spawnWildSheep(G.randInt(2, 4), true); } }],
    },
    {
      id: 'sickness', title: 'Dịch bệnh cừu', portrait: 'advisor',
      text: () => 'Đàn cừu ho khù khụ, vài con nằm bẹp. Không chữa, có thể mất vài con.',
      weight: () => (G.S.units.filter((u) => u.kind === 'sheep' && u.team === 0).length >= 3 ? 0.7 : 0),
      choices: [
        { label: () => 'Dùng 1 thuốc hồi phục', cond: () => S().stock.potion >= 1, effect: () => { S().stock.potion -= 1; } },
        { label: () => 'Mặc kệ (mất 1–2 cừu)', effect: () => { G.Village.loseSheep(G.randInt(1, 2)); } },
      ],
    },
    {
      id: 'storm', title: 'Bão biển', portrait: 'advisor',
      text: () => 'Bão đổ bộ trong đêm. Vài công trình hư hại, nhưng gió cũng quật đổ cây — dân nhặt được ít gỗ.',
      weight: () => (season() === 'autumn' || season() === 'summer' ? 0.6 : 0.2),
      choices: [{ label: () => 'Khắc phục hậu quả', effect: () => { G.Village.stormDamage(); } }],
    },
    {
      id: 'artisan', title: 'Người thợ lành nghề', portrait: 'stranger',
      text: () => 'Một người thợ cả từ kinh thành cũ tìm đến. Ông ta muốn ở lại nếu được trả công xứng đáng.',
      weight: () => (S().day > 4 ? 0.6 : 0),
      choices: [
        { label: () => 'Mời ở lại (-80 vàng): xưởng sản xuất nhanh hơn 20% vĩnh viễn', cond: () => S().gold >= 80 && !S().flags.artisan, effect: () => { E().spendGold(80); S().flags.artisan = true; G.Village.addVillagers(1); } },
        { label: () => 'Tiếc quá, không đủ tiền', effect: () => {} },
      ],
    },
    {
      id: 'stranger', title: 'Lữ khách áo choàng', portrait: 'stranger',
      text: () => '"Ta có một tấm bản đồ chỉ chỗ chôn kho báu của lũ cướp biển. 50 vàng thôi." Hắn cười nhạt.',
      weight: () => (S().day > 3 ? 0.5 : 0),
      choices: [
        { label: () => 'Mua bản đồ (-50 vàng)', cond: () => S().gold >= 50, effect: () => { E().spendGold(50); G.World.spawnTreasure(); } },
        { label: () => 'Không tin hắn', effect: () => {} },
      ],
    },
    {
      id: 'merchantdeal', title: 'Mối hàng lớn', portrait: 'merchant',
      text: (d) => `Kim Bảo gửi thư: "Thương hội cần gấp ${d.n} ${G.ITEMS[d.item].name}, trả gấp đôi giá chợ hôm nay!"`,
      weight: () => (S().flags.met_yellow ? 0.8 : 0),
      init: (d) => { d.item = G.pick(['bread', 'cloth', 'tools', 'meat', 'wool', 'stone']); d.n = G.randInt(5, 12); },
      choices: [
        { label: (d) => `Bán ngay ${d.n} ${G.ITEMS[d.item].name}`, cond: (d) => S().stock[d.item] >= d.n, effect: (d) => { S().stock[d.item] -= d.n; const g = Math.round(G.ITEMS[d.item].price * 2 * d.n); E().addGold(g); E().addRep('yellow', 4); G.UI.toast(`+${g} vàng`, 'good'); } },
        { label: () => 'Không có hàng', effect: () => {} },
      ],
    },
    {
      id: 'fire', title: 'Hoả hoạn!', portrait: 'villager',
      text: () => 'Một đốm lửa từ bếp đã bén sang mái nhà! Dân đang hô hoán dập lửa.',
      weight: () => (S().buildings.filter((b) => b.team === 0 && b.built && G.BUILDINGS[b.type].house).length >= 3 ? 0.4 : 0),
      choices: [{ label: () => 'Dập lửa mau!', effect: () => { G.Village.randomFire(); } }],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
