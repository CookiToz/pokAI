// Dev-only previews so the battle screens can be opened without the world (see index.ts).
import { game } from '../../state/store';
import { createPokai } from '../../systems/pokai';
import { createRng } from '../../systems/rng';
import { maxContext } from '../../systems/pokai';
import { xpForLevel } from '../../systems/stats';
import type { UiFacade } from '../facade';
import { runFxPreview } from './fx-preview';
import { previewOnboardingEnding, runOnboarding } from './onboarding';

function seed(): void {
  game.newGame('Preview', 'prompt_engineer');
  const rng = createRng(42);
  const s = game.state;
  s.party = [createPokai('claude_haiku', Number(new URLSearchParams(location.search).get('plv') ?? 14), rng), createPokai('phi_1', 9, rng), createPokai('gemma', 7, rng)];
  s.bag = { api_key_free: 2, api_key_pro: 1, api_key_enterprise: 1, cafe: 3, red_bull: 1, hotfix: 1 };
  s.credits = 1200;
  const p0 = s.party[0];
  if (p0 && new URLSearchParams(location.search).has('levelup')) p0.xp = xpForLevel(p0.level + 1) - 5;
}

export async function runPreview(search: string, ui: UiFacade): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
  seed();
  const q = new URLSearchParams(search);
  if (q.has('map')) game.state.map = q.get('map') ?? game.state.map;
  const rng = createRng(7);
  let out: unknown;
  if (q.has('battle-preview')) {
    out = await ui.battle({ kind: 'wild', wild: { form: q.get('form') ?? 'gpt_4o', level: Number(q.get('lv') ?? 9) }, canFlee: true });
  } else if (q.has('fx-preview')) {
    await runFxPreview(q);
  } else if (q.has('trainer-preview')) {
    out = await ui.battle({ kind: 'trainer', trainerId: q.get('t') ?? 'aiact_grunt_port_1', canFlee: false });
  } else if (q.has('onboard-preview')) {
    const target = createPokai(q.get('form') ?? 'deepseek_v3', 20, rng);
    target.context = Math.floor(maxContext(target) * 0.2);
    const end = q.get('end');
    out = end === 'success' || end === 'fled' ? await previewOnboardingEnding(target, end) : await runOnboarding(target, q.get('key') ?? 'api_key_pro');
  } else if (q.has('evo-preview')) {
    const p = createPokai('claude_haiku', 16, rng);
    game.addPokai(p);
    out = await ui.evolution(p.uid, ['claude_sonnet']);
  } else if (q.has('evo2-preview')) {
    const p = createPokai('deepseek_v3', 36, rng);
    game.addPokai(p);
    out = await ui.evolution(p.uid, ['deepseek_r1', 'deepseek_v4']);
  } else if (q.has('starter-preview')) {
    game.state.party = [];
    out = await ui.starter();
  }
  console.warn('[preview done]', JSON.stringify(out));
}
