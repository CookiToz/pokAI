// Dev-only: `?shell-preview=<scene>` shows shell windows without the world. Never imported in production builds.
import { db } from '../../data/db';
import { game } from '../../state/store';
import { createPokai } from '../../systems/pokai';
import { createRng } from '../../systems/rng';
import type { UiFacade } from '../facade';
import { startSession } from './chrome';

export function runPreview(ui: UiFacade): void {
  const scene = new URLSearchParams(location.search).get('shell-preview') || 'team';
  if (scene === 'title') {
    void ui.title().then(() => ui.toast('Session ouverte (aperçu).'));
    return;
  }
  game.newGame('Ada', 'vibe_coder');
  const rng = createRng(7);
  const mvp = db.allForms().filter((f) => db.lineOfForm(f.id).mvp);
  const picks = mvp.filter((_, i) => i % Math.max(1, Math.floor(mvp.length / 8)) === 0).slice(0, 8);
  picks.slice(0, 4).forEach((f, i) => {
    const p = createPokai(f.id, 8 + i * 5, rng);
    p.context = Math.max(1, Math.round(p.context * (1 - i * 0.22)));
    if (i === 1) p.status = 'hallucinating';
    game.state.party.push(p);
    game.markSeen(p.form);
    if (!game.state.caught.includes(p.form)) game.state.caught.push(p.form);
  });
  picks.slice(4).forEach((f) => game.markSeen(f.id));
  // Dev fixtures: ?ko=4 knocks out the 4th PokAI; ?p0=claude_haiku:19 replaces the first one (form:level).
  const q = new URLSearchParams(location.search);
  const p0 = q.get('p0')?.split(':');
  if (p0?.[0] && db.hasForm(p0[0])) game.state.party[0] = createPokai(p0[0], Number(p0[1] ?? 10), rng);
  const ko = Number(q.get('ko') ?? 0);
  const koMon = game.state.party[ko - 1];
  if (koMon) koMon.context = 0;
  game.state.badges.push('badge_commit');
  game.state.credits = 1240;
  game.addItem('red_bull', 2);
  game.addItem('hotfix', 1);
  game.addItem('api_key_pro', 1);
  game.addItem('dataset', 2);
  game.addItem('h100', 2);
  game.state.playTimeSec = 4260;
  game.state.achievements = ['hello_world', 'premier_commit', 'open_sourcerer', 'fine_tune', 'tout_refuser'];
  game.state.stats = { steps: 640, wins: 23, losses: 1, onboard_perfect: 0, evolutions: 1, credits_peak: 1240 };
  startSession();
  ui.mapBanner('Port 8080');
  setTimeout(() => {
    if (scene.startsWith('script:')) {
      const noop = async (): Promise<void> => undefined;
      const world = { warp: noop, moveNpc: noop, refreshNpcs: () => undefined, npcApproach: noop, npcLeave: noop, camera: noop, emote: noop, setCutscene: () => undefined };
      void import('../../story/script-runner').then((m) => m.runScript(scene.slice(7), world));
    } else if (scene === 'say') {
      void ui.say({ speaker: 'Satya Nadelta', text: 'Bienvenue au Benchmark HumanEval. Ici, on ne juge pas les discours, on juge le code qui passe les tests.' });
    } else if (scene === 'choice') {
      void ui.say({ speaker: 'Prof. LeCube', text: "Alors, {player}, tu as bien lu la documentation avant de partir ?".replace('{player}', 'Ada') }).then(() => undefined);
      void ui.choice(['Oui, tout lu.', 'Elle est longue.', 'Quelle documentation ?'], { speaker: 'Prof. LeCube', text: 'Alors Ada, tu as lu la documentation ?' });
    } else if (scene === 'store') void ui.store();
    else if (scene === 'repo') {
      mvp.forEach((f, i) => {
        const p = createPokai(f.id, 5 + ((i * 7) % 40), rng);
        if (i % 5 === 3) p.context = 0;
        game.state.repo.push(p);
        game.markSeen(f.id);
      });
      void ui.menu('repo');
    } else if (scene === 'vending') void ui.vending([
      { item: 'cafe', price: 60 }, { item: 'red_bull', price: 150 }, { item: 'full_restart', price: 400 },
      { item: 'hotfix', price: 90 }, { item: 'clear_cache', price: 220 }, { item: 'api_key_free', price: 1800 },
    ]);
    else if (scene === 'cutscene') {
      ui.cutscene(true);
      void ui.introCard({ name: 'Arthur Menschtral', title: 'Leader du Benchmark Open-Weights', portrait: 'player' })
        .then(() => ui.say({ speaker: 'Arthur Menschtral', text: 'Bonjour. Mes poids sont ouverts, mais mon agenda est complet.' }))
        .then(() => ui.cutscene(false));
    }
    else void ui.menu(scene === 'controls' ? 'controls' : (scene as 'team' | 'bag' | 'dex' | 'badges' | 'achievements' | 'save'));
  }, 400);
}
