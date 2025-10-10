import type { EffectParameters, EffectLayer, BlendMode, TriggerSource, EffectType } from '../types';
import { DEFAULT_EFFECT_PARAMETERS } from '../constants';

const lerp = (a: number, b: number, t: number): number => {
    const clampedT = Math.max(0, Math.min(1, t));
    return a * (1 - clampedT) + b * clampedT;
}

const pickString = <T extends string>(a: T, b: T, t: number): T => t < 0.5 ? a : b;

export const interpolateEffectParameters = (
    paramsA: EffectParameters,
    paramsB: EffectParameters,
    layersA: EffectLayer[],
    layersB: EffectLayer[],
    factor: number
): EffectParameters => {
    const result: EffectParameters = JSON.parse(JSON.stringify(DEFAULT_EFFECT_PARAMETERS));
    
    const typesInA = new Set(layersA.map(l => l.effectType));
    const typesInB = new Set(layersB.map(l => l.effectType));
    const allTypes = new Set([...typesInA, ...typesInB]);

    for (const effectKey of allTypes) {
        if (effectKey === 'none' || !(effectKey in result)) continue;

        const key = effectKey as keyof EffectParameters;
        const isInA = typesInA.has(key);
        const isInB = typesInB.has(key);
        
        const effectParamsA = paramsA[key] || {};
        const effectParamsB = paramsB[key] || {};
        const resultParams = result[key];

        if (isInA && isInB) {
            // Effect is in both, interpolate parameters
            for (const paramKey of Object.keys(resultParams)) {
                const k = paramKey as keyof typeof resultParams;
                const valueA = (effectParamsA as any)[k] ?? (resultParams as any)[k];
                const valueB = (effectParamsB as any)[k] ?? (resultParams as any)[k];

                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    (resultParams as any)[k] = lerp(valueA, valueB, factor);
                } else {
                    (resultParams as any)[k] = pickString(String(valueA) as any, String(valueB) as any, factor);
                }
            }
        } else if (isInA) {
            // Effect is only in A, use A's parameters
            Object.assign(resultParams, effectParamsA);
        } else if (isInB) {
            // Effect is only in B, use B's parameters
            Object.assign(resultParams, effectParamsB);
        }
        
        (result as any)[key] = resultParams;
    }

    return result;
};


export const interpolateEffectLayers = (
    layersA: EffectLayer[],
    layersB: EffectLayer[],
    factor: number
): EffectLayer[] => {
    const blendedLayers: EffectLayer[] = [];

    // Add layers from preset A, fading them out
    for (const layerA of layersA) {
        blendedLayers.push({
            ...layerA,
            opacity: lerp(layerA.opacity, 0, factor)
        });
    }

    // Add layers from preset B, fading them in
    for (const layerB of layersB) {
        blendedLayers.push({
            ...layerB,
            opacity: lerp(0, layerB.opacity, factor)
        });
    }
    
    // Filter out layers that are nearly invisible.
    return blendedLayers.filter(l => l.opacity > 0.01);
};
