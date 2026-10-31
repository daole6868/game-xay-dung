// "Người chơi máy" đơn giản: ra quyết định như người chơi để kiểm thử cả chuỗi cốt truyện.
import { run } from './harness.mjs';

export function botStep(G) {
  const S = G.S;
  const T = G.TILE;
  const c = G.byId(S.castleId);
  if (!c) return;
  const hero = G.Hero.unit();
  const npc = (role) => S.units.find((u) => u.role === role);
  const talk = (role) => { const n = npc(role); if (n) { hero.x = n.x + 40; hero.y = n.y; G.Hero.talk(n); } };
  const place = (type) => {
    const d = G.BUILDINGS[type];
    if (!G.Build.canAfford(d.cost) || (d.tier || 1) > S.tier) return null;
    for (let r = 3; r < 16; r++) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const tx = Math.round(c.tx + 2 + Math.cos(a) * r), ty = Math.round(c.ty + 1 + Math.sin(a) * r);
        if (!G.Build.canPlace(type, tx, ty)) return G.Build.place(type, tx, ty, true);
      }
    }
    return null;
  };
  const count = (t) => S.buildings.filter((b) => b.type === t && b.team === 0).length;
  const q = S.quests.active;
  if (!c) return;
  const foe = G.Units.nearest(c.x, c.y, 14 * T, (e) => e.team === 1);
  if (foe && hero && !hero.downed) { if (!S.hero.order) G.Hero.command(foe.x, foe.y - 10); return; }
  if (q.includes('q_advisor')) talk('advisor');
  if (!S.flags.castleRepaired && G.Economy.has({ wood: 40, stone: 20 })) G.Game.repairCastle();
  if (count('campfire') < 1) place('campfire');
  if (S.villagers >= G.Build.houseCap() - 1) place('house');
  if (count('plot') < Math.min(16, 4 + S.villagers)) { const p = place('plot'); if (p) p.crop = G.pick(['wheat', 'carrot']); }
  if (q.includes('q_port')) talk('merchant');
  if (q.includes('q_monastery')) talk('abbess');
  if (q.includes('q_bread') && S.stock.bread >= 15) talk('abbess');
  if (q.includes('q_chief')) talk('chief');
  if (S.tier < 4 && G.TIERS[S.tier + 1] && S.villagers >= G.TIERS[S.tier + 1].pop && G.Economy.has(G.TIERS[S.tier + 1].cost)) G.Game.upgradeTier();
  for (const t of ['market', 'smithy', 'barracks', 'tower', 'mill', 'bakery', 'pen', 'well', 'archery', 'monastery', 'weaver', 'kitchen']) if (!count(t)) place(t);
  // việc làm
  const n = S.villagers;
  G.Village.setJob('builder', Math.max(1, Math.round(n * 0.15)));
  G.Village.setJob('farmer', Math.max(1, Math.round(n * 0.25)));
  G.Village.setJob('woodcutter', Math.max(1, Math.round(n * 0.15)));
  G.Village.setJob('quarry', Math.max(1, Math.round(n * 0.1)));
  G.Village.setJob('miner', Math.round(n * 0.1));
  G.Village.setJob('forager', 1);
  G.Village.setJob('crafter', Math.round(n * 0.15));
  G.Village.setJob('shepherd', count('pen') ? 1 : 0);
  // quân
  const b = S.buildings.find((x) => x.type === 'barracks' && x.built);
  if (b && b.queue.length < 2) G.Military.train(b, S.tier >= 3 && Math.random() < 0.4 ? 'lancer' : 'warrior');
  // bán hàng thừa ở chợ
  if (G.Economy.canTradeAt('market')) for (const k of ['berry', 'wood', 'stone']) if (S.stock[k] > 120) G.Economy.sell(k, 20, 'market');
}

export function playDays(G, days, onDay) {
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 12; h++) { botStep(G); run(G, G.DAY_LEN / 12); }
    if (onDay) onDay(G);
  }
}
