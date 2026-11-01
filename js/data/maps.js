/* 10 bản đồ: kích thước, địa hình, khí hậu và cấp độ khó 1–10. */
(function (root) {
  'use strict';
  const G = root.G;

  // shape: island (đảo), continent (lục địa), archipelago (quần đảo), river (sông), lakes (nhiều hồ)
  G.MAPS = [
    { id: 'tanthu', name: 'Bãi Tân Thủ', level: 1, W: 64, H: 48, biome: 'grass', shape: 'island', desc: 'Đảo nhỏ yên bình, hợp để làm quen.' },
    { id: 'binhminh', name: 'Đảo Bình Minh', level: 2, W: 96, H: 72, biome: 'grass', shape: 'classic', desc: 'Bản đồ cốt truyện gốc.' },
    { id: 'songxanh', name: 'Thung Lũng Sông Xanh', level: 3, W: 104, H: 78, biome: 'grass', shape: 'river', desc: 'Dòng sông chia đôi thung lũng, chỉ qua được ở vài khúc cạn.' },
    { id: 'quandao', name: 'Quần Đảo Ngọc', level: 4, W: 112, H: 84, biome: 'grass', shape: 'archipelago', desc: 'Nhiều đảo nối nhau bằng doi cát hẹp — dễ thủ, khó công.' },
    { id: 'rungco', name: 'Rừng Cổ Thụ', level: 5, W: 120, H: 90, biome: 'forest', shape: 'continent', desc: 'Rừng rậm bạt ngàn, gỗ nhiều nhưng đường đi chật hẹp.' },
    { id: 'samac', name: 'Sa Mạc Lửa', level: 6, W: 132, H: 96, biome: 'desert', shape: 'continent', desc: 'Nắng cháy, ít cây, ruộng chỉ tốt quanh giếng. Nhiều vàng.' },
    { id: 'caonguyen', name: 'Cao Nguyên Tuyết', level: 7, W: 144, H: 104, biome: 'snow', shape: 'island', desc: 'Lạnh quanh năm: cây lớn chậm, cần nhiều gỗ sưởi.' },
    { id: 'damlay', name: 'Đầm Lầy Sương', level: 8, W: 156, H: 112, biome: 'swamp', shape: 'lakes', desc: 'Đầm lầy chằng chịt, cá nhiều, giặc ẩn nấp khắp nơi.' },
    { id: 'dailuc', name: 'Đại Lục Chiến Tranh', level: 9, W: 176, H: 124, biome: 'autumn', shape: 'continent', desc: 'Lục địa rộng lớn với vô số trại giặc.' },
    { id: 'tanthe', name: 'Vùng Đất Tận Thế', level: 10, W: 200, H: 140, biome: 'ash', shape: 'continent', desc: 'Đất tro núi lửa, giặc mạnh nhất. Chỉ dành cho bậc thầy.' },
  ];
  G.mapById = (id) => G.MAPS.find((m) => m.id === id) || G.MAPS[1];

  /*
   * Khí hậu: màu đất, cây cối, hệ số cây trồng.
   * trees: danh sách sprite cây theo biến thể; grow: hệ số lớn của ruộng; cold: luôn cần gỗ sưởi.
   */
  G.BIOMES = {
    grass: { name: 'Đồng cỏ', ground: '#96b950', lip: '#6c8f39', speck: ['rgba(255,255,230,0.10)', 'rgba(40,70,20,0.10)'], water: '#47aba9', trees: ['n.tree1', 'n.tree2', 'n.tree3', 'n.tree4'], tree: 1, rock: 1, bush: 1, gold: 1, grow: 1 },
    forest: { name: 'Rừng', ground: '#7fae4a', lip: '#5c8634', speck: ['rgba(255,255,230,0.08)', 'rgba(30,60,20,0.14)'], water: '#3f9fa0', trees: ['n.tree1', 'n.tree2', 'n.tree3', 'n.tree4'], tree: 1.8, rock: 0.8, bush: 1.4, gold: 0.9, grow: 1 },
    desert: { name: 'Sa mạc', ground: '#e2c27e', lip: '#c19a57', speck: ['rgba(255,250,220,0.18)', 'rgba(150,100,40,0.12)'], water: '#3fa7b5', trees: ['n.cactus1', 'n.cactus2', 'n.palm1', 'n.palm2'], tree: 0.35, rock: 1.3, bush: 0.3, gold: 1.8, grow: 0.8, desertWell: true },
    snow: { name: 'Tuyết', ground: '#e6eef3', lip: '#b3c5d3', speck: ['rgba(255,255,255,0.5)', 'rgba(120,150,180,0.12)'], water: '#5aa3c4', trees: ['n.snowpine1', 'n.snowpine2', 'n.snowpine1', 'n.snowpine2'], tree: 1.1, rock: 1.2, bush: 0.4, gold: 1, grow: 0.7, cold: true },
    swamp: { name: 'Đầm lầy', ground: '#6f9446', lip: '#4f6e33', speck: ['rgba(200,230,150,0.10)', 'rgba(20,50,20,0.16)'], water: '#4b8a72', trees: ['n.deadtree1', 'n.tree3', 'n.deadtree2', 'n.tree4'], tree: 1.2, rock: 0.6, bush: 1.2, gold: 0.8, grow: 1.05 },
    autumn: { name: 'Mùa thu', ground: '#b5b552', lip: '#8d8a3a', speck: ['rgba(255,220,150,0.14)', 'rgba(120,70,20,0.12)'], water: '#47a2a9', trees: ['n.tree1', 'n.tree2', 'n.tree3', 'n.tree4'], tree: 1, rock: 1, bush: 1, gold: 1.1, grow: 0.95 },
    ash: { name: 'Đất tro', ground: '#8f8a7c', lip: '#625e55', speck: ['rgba(255,200,150,0.08)', 'rgba(30,25,25,0.18)'], water: '#3e7f86', trees: ['n.deadtree1', 'n.deadtree2', 'n.deadtree1', 'n.cactus2'], tree: 0.5, rock: 1.6, bush: 0.3, gold: 2, grow: 0.75 },
  };

  // Tên các trại giặc thêm (bản đồ lớn có nhiều trại hơn)
  G.CAMP_NAMES = {
    A: 'Tiền đồn Đông', B: 'Trại Sói Đỏ', C: 'Trại Rèn Máu', D: 'Trại Nanh Lửa', E: 'Pháo đài Răng Cưa',
    H: 'Trại Đầu Lâu', I: 'Đồn Gió Đen', J: 'Trại Mắt Đỏ', F: 'Thành Huyết Nha',
  };

  /** Số trại thường (không kể thành chính F) theo cấp bản đồ. */
  G.campCount = (map) => Math.max(1, Math.min(8, 1 + Math.floor(map.level * 0.75)));
})(typeof window !== 'undefined' ? window : globalThis);
