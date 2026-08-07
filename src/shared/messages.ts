import { browser } from 'wxt/browser';
import type { BackgroundRequest, BackgroundResponse } from './types';

export async function sendBackgroundRequest(request: BackgroundRequest): Promise<BackgroundResponse> {
  try {
    const response = (await browser.runtime.sendMessage(request)) as BackgroundResponse | undefined;
    return response ?? { ok: false, error: 'CleanTab did not receive a response.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'CleanTab could not complete the request.' };
  }
}
