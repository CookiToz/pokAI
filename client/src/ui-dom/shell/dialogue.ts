// Messaging-app dialogue: avatar, "en ligne" status, typing dots, token-by-token bubbles, reply chips.
import { audio } from '../../audio/audio';
import { h } from '../dom';
import { input, type Action } from '../../input/input';
import { portraitOrPlayer } from '../intro/appearance';
import type { SayLine } from '../facade';
import { icon } from './icons';
import { FocusGroup, isDir } from './focus';
import { pushHints, type HintHandle } from './hints';
import { osRoot } from './os-window';
import { initials, sleep } from './widgets';

const WORD_MS = 30;
const TYPING_MS = 340;
const KEEP_ROWS = 3;
const CLOSE_GRACE_MS = 90;

interface Chat {
  el: HTMLElement;
  avatar: HTMLElement;
  nameEl: HTMLElement;
  statusEl: HTMLElement;
  list: HTMLElement;
  replies: HTMLElement;
  popLayer: () => void;
  hints: HintHandle;
  closeTimer: number;
  onAction: ((a: Action) => void) | null;
}

let chat: Chat | null = null;
let lastKey = '';

function ensureChat(): Chat {
  if (chat) {
    clearTimeout(chat.closeTimer);
    return chat;
  }
  const avatar = h('div.chat-avatar');
  const nameEl = h('div.chat-name');
  const statusEl = h('div.chat-status');
  const list = h('div.chat-list', { 'aria-live': 'polite' });
  const replies = h('div.chat-replies');
  const el = h(
    'section.chat',
    { role: 'dialog', 'aria-label': 'Messagerie' },
    h('header.chat-head', null, avatar, h('div.chat-who', null, nameEl, statusEl), h('span.chat-app', null, icon('chat'), 'Messages')),
    list,
    replies,
  );
  osRoot().append(el);
  audio.sfx('ui_open');
  const c: Chat = {
    el, avatar, nameEl, statusEl, list, replies, closeTimer: 0, onAction: null,
    popLayer: input.push('shell:dialogue', (a) => {
      c.onAction?.(a);
      return true;
    }),
    hints: pushHints([['confirm', 'Suite']]),
  };
  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.reply')) return;
    if (c.onAction) c.onAction('confirm');
  });
  chat = c;
  requestAnimationFrame(() => el.classList.add('is-open'));
  lastKey = '';
  return c;
}

function scheduleClose(): void {
  const c = chat;
  if (!c) return;
  c.onAction = null;
  clearTimeout(c.closeTimer);
  c.closeTimer = window.setTimeout(() => {
    if (chat !== c) return;
    chat = null;
    c.popLayer();
    c.hints.pop();
    c.el.classList.remove('is-open');
    setTimeout(() => c.el.remove(), 150);
  }, CLOSE_GRACE_MS);
}

function setSpeaker(c: Chat, line: SayLine): void {
  const name = line.speaker?.trim() || 'LatentOS';
  const system = !line.speaker;
  const key = `${name}|${line.portrait ?? ''}`;
  if (key === lastKey) return;
  lastKey = key;
  c.el.classList.toggle('is-system', system);
  c.nameEl.textContent = name;
  c.statusEl.replaceChildren(h('i.dot'), system ? 'notification système' : 'en ligne');
  const svg = portraitOrPlayer(line.portrait);
  c.avatar.className = 'chat-avatar' + (svg ? ' has-art' : '');
  if (svg) c.avatar.innerHTML = svg;
  else if (system) c.avatar.replaceChildren(icon('logo'));
  else c.avatar.replaceChildren(h('span.chat-initials', null, initials(name)));
}

function pushRow(c: Chat, row: HTMLElement): void {
  c.list.append(row);
  while (c.list.children.length > KEEP_ROWS) c.list.firstElementChild?.remove();
  [...c.list.children].forEach((r, i, all) => {
    r.classList.toggle('is-old', i < all.length - 1);
  });
}

/** Shows `line` as a typed message. Resolves when fully revealed; `waitConfirm` also waits for the player. */
async function typeLine(c: Chat, line: SayLine, waitConfirm: boolean): Promise<void> {
  c.replies.replaceChildren();
  c.replies.classList.remove('is-on');
  setSpeaker(c, line);
  const bubble = h('div.bubble.is-typing', null, h('i.dots', null, h('b'), h('b'), h('b')));
  const who = h('div.msg-who', null, line.speaker ?? 'LatentOS');
  pushRow(c, h('div.msg', null, who, bubble));
  c.hints.set([['confirm', 'Passer']]);

  let skip = false;
  c.onAction = (a) => {
    if (a === 'confirm') skip = true;
  };
  if (!skip) await sleep(TYPING_MS);

  bubble.classList.remove('is-typing');
  bubble.replaceChildren();
  const caret = h('span.caret', null, '▌');
  const parts = line.text.split(/(\s+)/);
  const words: HTMLElement[] = [];
  for (const p of parts) {
    if (p === '') continue;
    if (/^\s+$/.test(p)) bubble.append(p);
    else {
      const w = h('span.w', null, p);
      words.push(w);
      bubble.append(w);
    }
  }
  bubble.append(caret);
  for (let i = 0; i < words.length && !skip; i++) {
    const w = words[i]!;
    w.classList.add('on');
    w.after(caret);
    if (i % 3 === 0) audio.sfx('type_tick');
    await sleep(WORD_MS + (/[.!?…:]$/.test(w.textContent ?? '') ? 140 : 0));
  }
  words.forEach((w) => w.classList.add('on'));
  if (words.length > 0) words[words.length - 1]!.after(caret);

  if (!waitConfirm) {
    c.onAction = null;
    return;
  }
  c.hints.set([['confirm', 'Suite']]);
  await new Promise<void>((resolve) => {
    // The confirm that skipped the typing must not also advance: wait for a fresh press.
    let armed = !skip;
    if (!armed) setTimeout(() => (armed = true), 120);
    c.onAction = (a) => {
      if (a === 'confirm' && armed) resolve();
    };
  });
  c.onAction = null;
}

export async function say(line: SayLine): Promise<void> {
  const c = ensureChat();
  await typeLine(c, line, true);
  scheduleClose();
}

export async function choice(options: string[], line?: SayLine): Promise<number> {
  const c = ensureChat();
  if (line) await typeLine(c, line, false);
  else if (c.list.children.length === 0) setSpeaker(c, { text: '' });

  const group = new FocusGroup(c.replies, '.reply');
  const picked = await new Promise<number>((resolve) => {
    c.replies.replaceChildren(
      ...options.map((label, i) => h('button.reply.fx', { type: 'button', onclick: () => resolve(i) }, h('span.reply-arrow', null, '▸'), h('span', null, label))),
    );
    c.replies.classList.add('is-on');
    group.reset();
    c.hints.set([['up', 'Choisir'], ['confirm', 'Répondre']]);
    let armed = false;
    setTimeout(() => (armed = true), 120);
    c.onAction = (a) => {
      if (!armed) return;
      if (isDir(a)) {
        // Vertical list: left/right behave like up/down so every direction does something useful.
        group.move(a === 'left' ? 'up' : a === 'right' ? 'down' : a);
      } else if (a === 'confirm') group.activate();
    };
  });
  c.onAction = null;
  c.replies.classList.remove('is-on');
  c.replies.replaceChildren();
  const me = h('div.msg.is-me', null, h('div.msg-who', null, 'Toi'), h('div.bubble', null, options[picked] ?? ''));
  pushRow(c, me);
  scheduleClose();
  return picked;
}
