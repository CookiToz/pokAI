// Optional sync with the Go server. Offline-first: every failure resolves to a neutral value.
import type { SaveData } from '../state/types';
import { game } from '../state/store';

export const API_BASE = '/api';
const TIMEOUT_MS = 2500;

async function request(path: string, init: RequestInit = {}): Promise<Response | null> {
  if (typeof fetch === 'undefined') return null;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      ...(ctrl ? { signal: ctrl.signal } : {}),
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    return res;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function json<T>(res: Response | null): Promise<T | null> {
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  async health(): Promise<{ ok: boolean; version?: string }> {
    return (await json<{ ok: boolean; version?: string }>(await request('/health'))) ?? { ok: false };
  },

  async pushSave(save: SaveData = game.state, playerId: string = game.playerId): Promise<boolean> {
    const res = await request(`/save/${encodeURIComponent(playerId)}`, { method: 'PUT', body: JSON.stringify(save) });
    return !!res && res.ok;
  },

  async pullSave(playerId: string = game.playerId): Promise<SaveData | null> {
    return json<SaveData>(await request(`/save/${encodeURIComponent(playerId)}`));
  },

  /** Returns { first } when the server answered, null when offline. */
  async reportCatch(formId: string): Promise<{ first: boolean } | null> {
    const body = { playerId: game.playerId, playerName: game.state.playerName, form: formId };
    return json<{ first: boolean }>(await request('/dex/catch', { method: 'POST', body: JSON.stringify(body) }));
  },

  /** formId -> name of the first player who onboarded it. Empty when offline. */
  async globalDex(): Promise<Record<string, string>> {
    const data = await json<Record<string, { playerName: string; at?: string }>>(await request('/dex/global'));
    const out: Record<string, string> = {};
    if (!data || typeof data !== 'object') return out;
    for (const [form, v] of Object.entries(data)) {
      if (v && typeof v.playerName === 'string') out[form] = v.playerName;
    }
    return out;
  },
};
