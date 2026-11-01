// Dev-only: open /src/ui-dom/intro/preview.html?view=sprites|intro|creator|shot&n=3
import { DEFAULT_APPEARANCE, HAIR_COLORS, HAIR_STYLES, OUTFIT_COLORS, SKIN_TONES, graduateSvg, playerEntries, playerPortraitSvg } from '../../world/art/characters';
import { uiRoot } from '../dom';
import { runIntro } from './intro';
import { runCreator } from './creator';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'sprites';

function sprites(): void {
  const body = document.createElement('div');
  body.style.cssText = 'position:fixed;inset:0;background:#f4efe4;overflow:auto;pointer-events:auto';
  const sz = 'style="width:96px;height:136px"';
  const V = [
    { ...DEFAULT_APPEARANCE },
    { ...DEFAULT_APPEARANCE, body: 'fem' as const, hairStyle: 'long', top: OUTFIT_COLORS[1]!, accessory: 'none' },
    { ...DEFAULT_APPEARANCE, body: 'fem' as const, hairStyle: 'bun', skin: SKIN_TONES[4]!, hairColor: HAIR_COLORS[0]!, top: OUTFIT_COLORS[3]!, bottom: OUTFIT_COLORS[0]!, accessory: 'glasses' },
    { ...DEFAULT_APPEARANCE, hairStyle: 'spiky', skin: SKIN_TONES[3]!, hairColor: HAIR_COLORS[6]!, top: OUTFIT_COLORS[4]!, accessory: 'cap' },
    { ...DEFAULT_APPEARANCE, hairStyle: 'afro', skin: SKIN_TONES[5]!, accessory: 'bandana', top: OUTFIT_COLORS[5]! },
    { ...DEFAULT_APPEARANCE, body: 'fem' as const, hairStyle: 'pigtails', hairColor: HAIR_COLORS[5]!, accessory: 'beanie', top: OUTFIT_COLORS[2]! },
    ...HAIR_STYLES.map((h, i) => ({ ...DEFAULT_APPEARANCE, body: h.body ?? (i % 2 ? 'fem' as const : 'masc' as const), hairStyle: h.id, hairColor: HAIR_COLORS[i % 8]!, accessory: 'none' })),
  ];
  for (const v of V) {
    const e = playerEntries(v);
    const g = (view_: string, f: number): string => e.find((x) => x.key === `char:player:${view_}:${f}`)!.svg.replace('<svg ', `<svg ${sz} `);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:end;gap:4px;margin:2px 8px;float:left';
    row.innerHTML = g('front', 0) + g('side', 1) + g('back', 0) + g('front', 2) + `<div style="width:112px">${playerPortraitSvg(v)}</div>`;
    body.append(row);
  }
  const grad = document.createElement('div');
  grad.style.cssText = 'display:flex;gap:4px;margin:2px 8px;float:left';
  grad.innerHTML = [graduateSvg('front'), graduateSvg('side', 1), graduateSvg('back')].map((s) => s.replace('<svg ', `<svg ${sz} `)).join('');
  body.append(grad);
  uiRoot().append(body);
}

if (view === 'sprites') sprites();
else if (view === 'intro') void runIntro();
else if (view === 'creator') void runCreator({ name: 'Vibeur', appearance: DEFAULT_APPEARANCE }).then((r) => console.warn('creator done', JSON.stringify(r)));
