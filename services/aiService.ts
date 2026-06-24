import type { AudioProfile, EffectPreset, EffectParameters, EffectLayer } from '../types';

// AI Remix is disabled in this build. Gemini integration was removed.
// The exported function preserves the previous signature so existing
// callers continue to compile; it throws a friendly error so the UI
// can surface the disabled state to the user.

export type TunedPresetBody = { layers: EffectLayer[]; parameters: EffectParameters };

export const tunePresetsWithAI = async (
    _profile: AudioProfile,
    _presetA: EffectPreset,
    _presetB: EffectPreset,
    _creativeDirection?: string
): Promise<{ tunedPresetBodyA: TunedPresetBody; tunedPresetBodyB: TunedPresetBody }> => {
    throw new Error('AI Remix is disabled in this build. Set VITE_GEMINI_API_KEY and re-enable aiService to use this feature.');
};