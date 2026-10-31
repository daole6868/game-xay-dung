/* Cốt truyện: nhân vật, lời dẫn, chuỗi nhiệm vụ theo chương. */
(function (root) {
  'use strict';
  const G = root.G;

  G.CHARACTERS = {
    hero: { name: () => G.S.heroName, portrait: 'hero' },
    advisor: { name: 'Quân sư Mạc Tùng', portrait: 'advisor' },
    merchant: { name: 'Kim Bảo', portrait: 'merchant' },
    abbess: { name: 'Sư cô Tịnh Nguyệt', portrait: 'abbess' },
    chief: { name: 'Tộc trưởng Hắc Sơn', portrait: 'chief' },
    warlord: { name: 'Bạo chúa Xích Hoả', portrait: 'warlord' },
    villager: { name: 'Dân làng', portrait: 'villager' },
    scout: { name: 'Thám báo', portrait: 'scout' },
    stranger: { name: 'Lữ khách áo choàng', portrait: 'stranger' },
  };

  G.INTRO = [
    'Năm thứ ba mươi của triều Lam, đạo quân Huyết Nha tràn qua biển như lửa cháy rừng khô.',
    'Kinh thành Lam Quốc thất thủ chỉ trong một đêm. Nhà vua tử trận, cờ Lam bị giẫm xuống bùn.',
    'Hiệp sĩ cuối cùng của đội cận vệ đưa một nhóm dân sống sót vượt biển về phía tây, tới hòn đảo hoang người xưa gọi là Đất Bình Minh.',
    'Giữa tàn tích một pháo đài cổ, ngọn lửa của Lam Quốc sẽ được thắp lại… hoặc tắt hẳn.',
  ];

  /*
   * Mỗi nhiệm vụ: id, chương, tên, mô tả, progress(S) → [hiện tại, mục tiêu],
   * talk: lời thoại khi nhận, done: lời thoại khi xong, reward, next: nhiệm vụ kế tiếp.
   * hint: chỉ đường (toạ độ ô) để hiện mũi tên.
   */
  const st = (k) => G.S.stats[k] || 0;
  const countB = (type, built = true) => G.S.buildings.filter((b) => b.type === type && b.team === 0 && (!built || b.built)).length;
  const soldiers = () => G.S.units.filter((u) => u.team === 0 && u.soldier && !u.merc).length;

  G.CHAPTERS = [
    null,
    { name: 'Chương I · Tro Tàn' },
    { name: 'Chương II · Hạt Giống' },
    { name: 'Chương III · Lưỡi Gươm Lam' },
    { name: 'Chương IV · Liên Minh' },
    { name: 'Chương V · Bình Minh' },
  ];

  G.QUESTS = {
    q_advisor: {
      ch: 1, name: 'Lời quân sư', desc: 'Nói chuyện với Quân sư Mạc Tùng (đến gần và bấm E).',
      progress: () => [G.S.flags.metAdvisor ? 1 : 0, 1], hint: () => G.npcTile('advisor'),
      done: [
        ['advisor', 'Ngài tỉnh rồi! Thuyền vỡ cả, nhưng ba mươi mạng người vẫn còn — giờ chỉ còn ba người đủ sức lao động, những người khác đang dưỡng thương.'],
        ['advisor', 'Đây là tàn tích pháo đài Bình Minh. Đêm xuống, gió biển lạnh cắt da. Ta cần gỗ để nhóm lửa trước đã.'],
        ['hero', 'Ta hiểu. Việc đầu tiên: gỗ và lửa.'],
        ['advisor', 'Ngài có thể tự tay chặt cây (đứng cạnh cây, bấm E), hoặc giao việc cho dân trong bảng Dân làng.'],
      ],
      next: ['q_wood'], reward: { xp: 20 },
    },
    q_wood: {
      ch: 1, name: 'Củi cho đêm lạnh', desc: 'Thu thập 20 gỗ.',
      progress: () => [st('got_wood'), 20], next: ['q_fire'], reward: { xp: 30 },
    },
    q_fire: {
      ch: 1, name: 'Ngọn lửa đầu tiên', desc: 'Xây một Lửa trại (bấm B để mở bảng xây dựng).',
      progress: () => [countB('campfire'), 1],
      done: [['advisor', 'Ánh lửa đã giữ chân lũ sói và giữ ấm lòng người. Giờ hãy phục dựng lâu đài — nó sẽ là trái tim của vương quốc mới.']],
      next: ['q_castle'], reward: { xp: 30, gold: 20 },
    },
    q_castle: {
      ch: 1, name: 'Phục dựng Lâu đài', desc: 'Bấm vào tàn tích Lâu đài và chọn "Phục dựng" (40 gỗ, 20 đá). Đá: Hiệp sĩ đập các tảng đá xám (E) hoặc giao nghề Thợ đá.',
      progress: () => [G.S.flags.castleRepaired ? 1 : 0, 1], hint: () => G.castleTile(),
      done: [['advisor', 'Lâu đài đứng vững trở lại! Cờ Lam tung bay rồi. Dân cần mái nhà — xây nhà dân để đón thêm người.']],
      next: ['q_house'], reward: { xp: 50 },
    },
    q_house: {
      ch: 1, name: 'Mái nhà', desc: 'Xây 1 Nhà dân.',
      progress: () => [countB('house'), 1], next: ['q_farm'], reward: { xp: 30, gold: 20 },
      done: [['advisor', 'Mỗi sáng, nếu còn chỗ ở, đủ lương thực và lòng dân không quá thấp, người tị nạn sẽ tìm đến.']],
    },
    q_farm: {
      ch: 1, name: 'Khai hoang', desc: 'Có 4 Ruộng đã gieo hạt. Bấm vào ruộng để chọn cây trồng; giao việc Nông dân.',
      progress: () => [G.S.buildings.filter((b) => b.type === 'plot' && b.built && b.crop && b.stage >= 0).length, 4],
      done: [
        ['advisor', 'Ruộng đã xanh. Nhưng thám báo vừa báo tin: có kẻ lạ lảng vảng phía đông. Huyết Nha đã đánh hơi thấy ta.'],
        ['hero', 'Để chúng tới. Ta sẽ đứng đây.'],
      ],
      next: ['q_night'], reward: { xp: 40 }, onDone: () => { G.S.flags.firstRaid = true; },
    },
    q_night: {
      ch: 1, name: 'Đêm đầu tiên', desc: 'Sống sót và đánh lui toán cướp đầu tiên đêm nay.',
      progress: () => [G.S.flags.firstRaidBeaten ? 1 : 0, 1],
      done: [
        ['advisor', 'Thắng rồi! Lũ cướp này chỉ là tiền trạm, nhưng dân đã tin vào ngài.'],
        ['advisor', 'Từ nay đêm nào cũng có thể có giặc. Mỗi 8 đêm lại có Trăng Máu — đêm đó chúng kéo đến rất đông.'],
      ],
      next: ['q_harvest', 'q_pop8'], reward: { xp: 80, gold: 40 }, chapterEnd: 1,
    },
    // ---------- Chương II ----------
    q_harvest: {
      ch: 2, name: 'Mùa gặt đầu', desc: 'Thu hoạch 15 nông sản.',
      progress: () => [st('harvested'), 15], next: ['q_port'], reward: { xp: 50, gold: 30 },
      done: [['advisor', 'Kho lúa đầy dần. Ở cảng phía nam có Thương hội Kim Sa — người của họ buôn bán khắp các đảo. Ngài nên ghé thăm.']],
    },
    q_pop8: {
      ch: 2, name: 'Làng mạc', desc: 'Đạt 8 dân.', progress: () => [G.S.villagers, 8], reward: { xp: 60, gold: 40 },
    },
    q_port: {
      ch: 2, name: 'Thương nhân phương Nam', desc: 'Đến Cảng Kim Sa (phía nam) và gặp Kim Bảo.',
      progress: () => [G.S.flags.met_yellow ? 1 : 0, 1], hint: () => G.townTile('yellow'),
      done: [
        ['merchant', 'Ố ồ, cờ Lam! Tưởng Lam Quốc mất rồi chứ? Ha ha, người sống thì còn buôn bán được!'],
        ['merchant', 'Ở đây ta mua bán đủ thứ. Cứ 5 ngày có thương thuyền từ phương xa ghé — hàng hiếm lắm đấy.'],
        ['merchant', 'Muốn buôn lớn thì dựng một cái Chợ ở làng ngài. Ta sẽ cử người tới, và ngài có thể mở tuyến buôn chạy đều.'],
      ],
      next: ['q_tier2'], reward: { xp: 60, rep: { yellow: 10 } },
    },
    q_tier2: {
      ch: 2, name: 'Thành lập Làng', desc: 'Nâng Lâu đài lên bậc Làng (bấm vào Lâu đài).',
      progress: () => [G.S.tier >= 2 ? 1 : 0, 1], next: ['q_market', 'q_sheep'], reward: { xp: 100 },
      done: [['advisor', 'Trại tị nạn nay đã thành Làng! Nhiều công trình mới đã mở: cối xay, lò bánh, lò rèn, chợ, doanh trại, tháp canh…']],
    },
    q_market: {
      ch: 2, name: 'Chợ phiên', desc: 'Xây Chợ và bán hàng thu về 150 vàng.',
      progress: () => [countB('market') ? Math.min(150, st('sold_gold')) : 0, 150], next: ['q_smith'], reward: { xp: 80, rep: { yellow: 5 } },
      done: [['merchant', 'Làm ăn khá đấy! Nhớ nhé: bán dồn một món thì giá tụt; mỗi mùa giá mỗi khác. Ai nhanh tay thì giàu!']],
    },
    q_sheep: {
      ch: 2, name: 'Đàn cừu', desc: 'Nuôi 3 cừu trong chuồng. Dắt cừu hoang về (đứng cạnh, bấm E, cần 1 cà rốt) hoặc mua ở cảng.',
      progress: () => [G.S.units.filter((u) => u.kind === 'sheep' && u.team === 0).length, 3], reward: { xp: 50, gold: 30 },
    },
    // ---------- Chương III ----------
    q_smith: {
      ch: 3, name: 'Rèn gươm', desc: 'Xây Lò rèn và có 6 Vũ khí trong kho.',
      progress: () => [countB('smithy') ? Math.min(6, G.S.stock.weapons) : 0, 6], next: ['q_army', 'q_tower'], reward: { xp: 80 },
      done: [['advisor', 'Thép đã có. Giờ cần người cầm gươm — dựng Doanh trại và luyện binh.']],
    },
    q_army: {
      ch: 3, name: 'Đội quân đầu tiên', desc: 'Có 4 binh sĩ.', progress: () => [soldiers(), 4], next: ['q_campA'], reward: { xp: 100, gold: 50 },
      done: [
        ['scout', 'Bẩm tướng quân! Tiền đồn Đông của Huyết Nha nằm cách đây chưa đầy một ngày đường về phía đông.'],
        ['advisor', 'Mỗi trại của chúng là một ổ cướp. Phá được trại nào, đêm của ta yên hơn trại ấy. Hãy dẫn quân đi — bảng Quân đội cho phép ra lệnh tấn công.'],
      ],
    },
    q_tower: {
      ch: 3, name: 'Mắt canh đêm', desc: 'Xây 1 Tháp canh.', progress: () => [countB('tower'), 1], reward: { xp: 60, gold: 30 },
    },
    q_campA: {
      ch: 3, name: 'Nhổ cỏ tận gốc', desc: 'Phá huỷ Tiền đồn Đông của Huyết Nha.',
      progress: () => [G.campDead('A') ? 1 : 0, 1], hint: () => G.campTile('A'), next: ['q_monastery', 'q_tier3'], reward: { xp: 200, gold: 100 },
      done: [
        ['advisor', 'Tiền đồn đã cháy rụi! Tin này sẽ lan khắp đảo.'],
        ['advisor', 'Phía bắc có Tử Nguyệt Tự — các tu sĩ ở đó trung lập, nhưng y thuật của họ sẽ cứu được nhiều binh sĩ của ta.'],
      ],
    },
    q_monastery: {
      ch: 3, name: 'Tiếng chuông Tử Nguyệt', desc: 'Đến Tử Nguyệt Tự (phía bắc) gặp Sư cô Tịnh Nguyệt.',
      progress: () => [G.S.flags.met_purple ? 1 : 0, 1], hint: () => G.townTile('purple'), next: ['q_bread'], reward: { xp: 60 },
      done: [
        ['abbess', 'Chiến tranh lấy đi quá nhiều. Các tu sĩ ở đây không cầm gươm, nhưng chúng ta có thể chữa lành.'],
        ['abbess', 'Mùa đông này tự viện thiếu bánh. Nếu thí chủ mang tới 15 bánh mì, ta sẽ cho các tu sĩ trẻ theo giúp và truyền y thuật cho Tu viện của thí chủ.'],
      ],
    },
    q_bread: {
      ch: 3, name: 'Bánh cho tự viện', desc: 'Mang 15 Bánh mì tới Tử Nguyệt Tự (nói chuyện với Sư cô khi có đủ bánh trong kho).',
      progress: () => [G.S.flags.breadGiven ? 15 : Math.min(15, G.S.stock.bread), 15], hint: () => G.townTile('purple'), reward: { xp: 120, rep: { purple: 25 }, items: { potion: 5 } },
      done: [['abbess', 'A Di Đà… Tấm lòng thí chủ, Tử Nguyệt Tự ghi nhớ. Từ nay Tu viện của thí chủ có thể luyện Tu sĩ, và giá thuốc ở đây sẽ rẻ hơn.']],
      next: ['q_chief'],
    },
    // ---------- Chương IV ----------
    q_tier3: {
      ch: 4, name: 'Thị trấn', desc: 'Nâng Lâu đài lên bậc Thị trấn.', progress: () => [G.S.tier >= 3 ? 1 : 0, 1], next: ['q_route'], reward: { xp: 150, gold: 100 },
      done: [['advisor', 'Thị trấn Bình Minh! Trường bắn, Tu viện, Tường đá và Kỵ thương đã sẵn sàng.']],
    },
    q_chief: {
      ch: 4, name: 'Lời mời từ Hắc Thạch', desc: 'Đến Hắc Thạch Trại (phía đông bắc) gặp Tộc trưởng Hắc Sơn.',
      progress: () => [G.S.flags.met_black ? 1 : 0, 1], hint: () => G.townTile('black'), reward: { xp: 80 },
      done: [
        ['chief', 'Ngươi là kẻ đã đốt Tiền đồn Đông? Hừm. Ta không ưa người Lam, nhưng ta ghét Huyết Nha hơn.'],
        ['chief', 'Xích Hoả bắt con trai ta — Hắc Lang — giam ở Trại Rèn Máu phía đông. Chừng nào nó còn trong tay hắn, Hắc Thạch phải cúi đầu.'],
        ['chief', 'Cứu nó ra, Hắc Thạch sẽ sát cánh với ngươi trong trận cuối. Bằng không… đừng trách ta đứng ngoài.'],
      ],
      choice: {
        text: 'Ngài trả lời Tộc trưởng thế nào?',
        options: [
          { label: 'Ta hứa sẽ cứu Hắc Lang.', effect: () => { G.S.flags.promisedRescue = true; G.Quests.start('q_rescue'); } },
          { label: 'Việc nhà ngươi, tự lo lấy.', effect: () => { G.S.flags.refusedChief = true; G.Economy.addRep('black', -30); G.UI.toast('Hắc Thạch phật ý. Uy tín -30.', 'bad'); } },
        ],
      },
    },
    q_rescue: {
      ch: 4, name: 'Giải cứu Hắc Lang', desc: 'Phá Trại Rèn Máu và giải cứu con trai Tộc trưởng.',
      progress: () => [G.campDead('C') ? 1 : 0, 1], hint: () => G.campTile('C'), reward: { xp: 250, gold: 150, rep: { black: 50 } },
      done: [
        ['chief', 'Hắc Lang về rồi… Người Lam, ta nợ ngươi. Hắc Thạch giữ lời: trong trận cuối, kỵ binh của ta sẽ theo cờ ngươi.'],
        ['chief', 'Và từ nay ngươi muốn thuê quân hay mua thép ở chỗ ta, giá sẽ khác.'],
      ],
      onDone: () => { G.S.flags.blackAlly = true; },
    },
    q_route: {
      ch: 4, name: 'Đường buôn', desc: 'Hoàn thành 3 chuyến buôn bằng tuyến thương mại (mở ở Chợ).',
      progress: () => [st('trips'), 3], next: ['q_campB'], reward: { xp: 120, gold: 80 },
    },
    q_campB: {
      ch: 4, name: 'Bẻ nanh sói', desc: 'Phá Trại Sói Đỏ ở phía đông nam.',
      progress: () => [G.campDead('B') ? 1 : 0, 1], hint: () => G.campTile('B'), next: ['q_host'], reward: { xp: 250, gold: 150 },
      done: [
        ['advisor', 'Chỉ còn lại Thành Huyết Nha. Xích Hoả sẽ dốc toàn lực. Ta cần một đại quân.'],
      ],
    },
    // ---------- Chương V ----------
    q_host: {
      ch: 5, name: 'Tập hợp đại quân', desc: 'Có 14 binh sĩ.', progress: () => [soldiers(), 14], next: ['q_final'], reward: { xp: 200 },
      done: [
        ['advisor', 'Đại quân đã sẵn sàng. Cờ Lam sẽ lại tung bay trên biển.'],
        ['hero', 'Bình minh đến rồi. Xuất quân!'],
      ],
      onDone: () => G.Military.allyArrives(),
    },
    q_final: {
      ch: 5, name: 'Bình Minh Lam Quốc', desc: 'Công phá Thành Huyết Nha và đánh bại Bạo chúa Xích Hoả.',
      progress: () => [G.S.flags.bossDead ? 1 : 0, 1], hint: () => G.campTile('F'),
      done: [
        ['warlord', 'Không… thể nào… Lũ người Lam… đáng lẽ đã chết hết…'],
        ['advisor', 'Xích Hoả đã ngã! Huyết Nha tan rã rồi!'],
        ['hero', 'Vương quốc này không xây bằng gươm. Nó được xây bằng từng hạt lúa, từng viên đá, từng con người.'],
      ],
      reward: { xp: 500, gold: 500 }, onDone: () => G.Game.victory(),
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
