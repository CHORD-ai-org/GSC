/**
 * U4：Fish Audio TTS（官方 API：POST https://api.fish.audio/v1/tts，
 * Bearer key，JSON {text, model, reference_id?, format}，响应=音频二进制 mp3）。
 * key 缺省=功能未配置（调用方如实上报，不假装能说话）。
 */
import type { Config } from '../config.ts';

export function fishConfigured(config: Config): boolean {
  return Boolean(config.fishAudioKey);
}

export async function ttsSpeak(
  config: Config,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  if (!fishConfigured(config)) throw new Error('TTS 未配置（GSC_FISH_AUDIO_KEY 缺失）');
  const body: Record<string, unknown> = {
    text,
    model: config.fishModel,
    format: 'mp3',
    latency: 'balanced',
  };
  if (config.fishVoice) body.reference_id = config.fishVoice;
  const res = await fetchImpl('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.fishAudioKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Fish Audio HTTP ${res.status}: ${msg.slice(0, 120)}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
