import { GoogleGenAI, Type } from "@google/genai";
// FIX: Corrected import path for AudioProfile. It is defined in ../types.ts.
import type { AudioProfile, EffectPreset, EffectParameters, EffectLayer, EffectType, TriggerSource, BlendMode } from '../types';
import { DEFAULT_EFFECT_PARAMETERS } from "../constants";

// Initialize AI service only when API key is available
let ai: GoogleGenAI | null = null;

const initializeAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
    return true;
  }
  console.warn('Gemini API key not found. AI features will be disabled.');
  return false;
};

// Define valid enums for the schema to guide the AI
const EFFECT_TYPES: EffectType[] = ['none', 'strobe', 'grid', 'kaleidoscope', 'bloom', 'color_grading', 'glitch_slice', 'pixelate', 'invert', 'rgb_shift', 'liquid_dream'];
const TRIGGER_SOURCES_IDS: TriggerSource[] = [ 'none', 'evolution', 'audio_bass_beat', 'audio_mids_beat', 'audio_treble_beat', 'audio_overall_envelope', 'cosmic_mars_beat', 'cosmic_sun_continuous', 'cosmic_moon_phase', 'cosmic_mercury_continuous', 'cosmic_venus_continuous', 'cosmic_jupiter_slow', 'cosmic_saturn_continuous' ];
const BLEND_MODES_IDS: BlendMode[] = ['normal', 'add', 'multiply', 'screen', 'overlay'];


// Schema for a single, modifiable effect layer
const effectLayerSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "Preserve the original layer ID." },
        name: { type: Type.STRING, description: "Preserve the original layer name." },
        effectType: { type: Type.STRING, enum: EFFECT_TYPES },
        triggerSource: { type: Type.STRING, enum: TRIGGER_SOURCES_IDS },
        blendMode: { type: Type.STRING, enum: BLEND_MODES_IDS },
        opacity: { type: Type.NUMBER, minimum: 0, maximum: 1 },
        isSolo: { type: Type.BOOLEAN, description: "Preserve original value (usually false)." },
        isMuted: { type: Type.BOOLEAN, description: "Preserve original value (usually false)." },
    },
    required: ['id', 'name', 'effectType', 'triggerSource', 'blendMode', 'opacity', 'isSolo', 'isMuted']
};

// Schema for the effect parameters object
const effectParametersSchema = {
    type: Type.OBJECT,
    properties: {
        grid: { type: Type.OBJECT, properties: { size: { type: Type.NUMBER }, lineWidth: { type: Type.NUMBER } } },
        glitch_slice: { type: Type.OBJECT, properties: { intensity: { type: Type.NUMBER }, amount: { type: Type.NUMBER }, type: { type: Type.STRING }, direction: { type: Type.STRING } } },
        pixelate: { type: Type.OBJECT, properties: { blockSize: { type: Type.NUMBER } } },
        rgb_shift: { type: Type.OBJECT, properties: { intensity: { type: Type.NUMBER }, amount: { type: Type.NUMBER }, frequency: { type: Type.STRING } } },
        kaleidoscope: { type: Type.OBJECT, properties: { segments: { type: Type.NUMBER }, rotationSpeed: { type: Type.NUMBER } } },
        bloom: { type: Type.OBJECT, properties: { intensity: { type: Type.NUMBER }, blurSize: { type: Type.NUMBER } } },
        color_grading: { type: Type.OBJECT, properties: { hue: { type: Type.NUMBER }, saturation: { type: Type.NUMBER }, contrast: { type: Type.NUMBER } } },
        liquid_dream: { type: Type.OBJECT, properties: { intensity: { type: Type.NUMBER }, speed: { type: Type.NUMBER }, grain: { type: Type.NUMBER } } },
    }
};

// Schema for the body of a preset (layers + parameters)
const tunedPresetBodySchema = {
    type: Type.OBJECT,
    properties: {
        layers: { type: Type.ARRAY, items: effectLayerSchema },
        parameters: effectParametersSchema,
    },
    required: ['layers', 'parameters']
};

/**
 * Validates and sanitizes the preset body returned by the AI.
 * Merges parameters with defaults and ensures the layers array is well-formed.
 * @param originalPreset The original preset sent to the AI, used as a fallback.
 * @param tunedBody The preset body (layers and parameters) from the AI.
 * @returns A complete, safe object with layers and parameters.
 */
const validateTunedPreset = (
    originalPreset: EffectPreset,
    tunedBody: any
): { layers: EffectLayer[], parameters: EffectParameters } => {
    // 1. Validate parameters by merging with defaults
    const partialParams = tunedBody?.parameters;
    const resultParams: EffectParameters = JSON.parse(JSON.stringify(DEFAULT_EFFECT_PARAMETERS));
     if (partialParams && typeof partialParams === 'object' && !Array.isArray(partialParams)) {
        for (const effectKey in resultParams) {
            const key = effectKey as keyof EffectParameters;
            const partialEffectParams = partialParams[key];
            if (partialEffectParams && typeof partialEffectParams === 'object') {
                Object.assign(resultParams[key], partialEffectParams);
            }
        }
    }

    // 2. Validate layers
    const originalLayers = originalPreset.layers;
    let safeLayers: EffectLayer[] = originalLayers; // Default to original
    
    if (tunedBody?.layers && Array.isArray(tunedBody.layers) && tunedBody.layers.length === originalLayers.length) {
        // If AI returned a correctly sized array, merge properties safely
        safeLayers = originalLayers.map((originalLayer, index) => {
            const tunedLayer = tunedBody.layers[index];
            if (!tunedLayer || typeof tunedLayer !== 'object') return originalLayer;

            return {
                ...originalLayer, // Start with original to preserve id, name, solo, mute
                effectType: tunedLayer.effectType && EFFECT_TYPES.includes(tunedLayer.effectType) ? tunedLayer.effectType : originalLayer.effectType,
                triggerSource: tunedLayer.triggerSource && TRIGGER_SOURCES_IDS.includes(tunedLayer.triggerSource) ? tunedLayer.triggerSource : originalLayer.triggerSource,
                blendMode: tunedLayer.blendMode && BLEND_MODES_IDS.includes(tunedLayer.blendMode) ? tunedLayer.blendMode : originalLayer.blendMode,
                opacity: (typeof tunedLayer.opacity === 'number' && tunedLayer.opacity >= 0 && tunedLayer.opacity <= 1) ? tunedLayer.opacity : originalLayer.opacity,
            };
        });
    }

    return { layers: safeLayers, parameters: resultParams };
};


/**
 * Sends the audio profile and two presets to the Gemini API to be remixed.
 * @param profile The analyzed audio profile.
 * @param presetA The first matched preset.
 * @param presetB The second matched preset.
 * @param creativeDirection Optional user-provided keywords to guide the AI.
 * @returns A promise resolving to the remixed layers and parameters for both presets.
 */
export const tunePresetsWithAI = async (
    profile: AudioProfile,
    presetA: EffectPreset,
    presetB: EffectPreset,
    creativeDirection?: string
): Promise<{ tunedPresetBodyA: { layers: EffectLayer[], parameters: EffectParameters }, tunedPresetBodyB: { layers: EffectLayer[], parameters: EffectParameters } }> => {
    // Initialize AI if not already done
    if (!ai && !initializeAI()) {
        throw new Error('AI service not available. Please set VITE_GEMINI_API_KEY environment variable.');
    }

    const systemInstruction = `You are an expert VJ and music visualizer. Your task is to creatively remix two provided JSON visual effect presets to better match the described mood of an audio track. You must use the user's creative direction as the primary guide for your changes.

User's Creative Direction: "${creativeDirection || 'None provided. Use your best judgment based on the audio profile.'}"

Rules:
1.  Analyze the audio profile (energy, tempo, character) and prioritize the User's Creative Direction.
2.  Analyze the two provided EffectPreset JSON objects (presetA, presetB).
3.  For each preset, you must modify its 'layers' and 'parameters'.
4.  In the 'layers' array, you can change 'effectType', 'triggerSource', 'blendMode', and 'opacity'.
5.  Keep the number of layers the same as in the original preset. Do not add or remove layers.
6.  Preserve the original 'id', 'name', 'isSolo', and 'isMuted' for each layer.
7.  In the 'parameters' object, you can adjust any numerical values.
8.  Make musically and thematically relevant choices based on the creative direction. For example, if the direction is "glitchy", incorporate 'glitch_slice' or 'rgb_shift'. If it's "soft and atmospheric", use 'bloom' and 'liquid_dream'.
9.  Ensure the two resulting presets are distinct from each other to give the user a real choice.
10. Return a single JSON object containing the two remixed presets, keyed as 'tunedPresetA' and 'tunedPresetB'. Each should contain the modified 'layers' array and 'parameters' object.`;

    const prompt = `
        Audio Profile: ${JSON.stringify(profile)}
        Preset A: ${JSON.stringify(presetA)}
        Preset B: ${JSON.stringify(presetB)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tunedPresetA: tunedPresetBodySchema,
                        tunedPresetB: tunedPresetBodySchema,
                    },
                    required: ['tunedPresetA', 'tunedPresetB']
                },
            }
        });

        const responseJson = response.text.trim();
        const parsed = JSON.parse(responseJson);

        if (parsed.tunedPresetA && parsed.tunedPresetB) {
            // Validate and sanitize the AI's output against the original presets
            const safePresetA = validateTunedPreset(presetA, parsed.tunedPresetA);
            const safePresetB = validateTunedPreset(presetB, parsed.tunedPresetB);

            return {
                tunedPresetBodyA: safePresetA,
                tunedPresetBodyB: safePresetB,
            };
        } else {
            throw new Error("AI response did not contain the expected tuned presets.");
        }

    } catch (error) {
        console.error("Error remixing presets with AI:", error);
        throw new Error("Failed to get a valid response from the AI model.");
    }
};
