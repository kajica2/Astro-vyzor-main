import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { EffectLayer, EffectParameters } from '../../../types';
import type { AudioAnalysisData, EffectFunction, EffectDefinition } from '../../types/visualization';
import * as effects from '../../../utils/effects';

export interface EffectPipelineHandle {
    applyEffects: (
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        audioData: AudioAnalysisData,
        time: number
    ) => void;
    addEffect: (effect: EffectDefinition) => void;
    removeEffect: (effectId: string) => void;
    setEffectParameter: (effectId: string, param: string, value: any) => void;
    getEffects: () => EffectDefinition[];
    clearEffects: () => void;
}

interface EffectPipelineProps {
    layers: EffectLayer[];
    parameters: EffectParameters;
    globalIntensity?: number;
    visualComplexity?: number;
}

export const EffectPipeline = forwardRef<EffectPipelineHandle, EffectPipelineProps>(
    ({ layers, parameters, globalIntensity = 1.0, visualComplexity = 0.5 }, ref) => {
        const customEffectsRef = useRef<Map<string, EffectDefinition>>(new Map());

        const applyEffects = useCallback((
            ctx: CanvasRenderingContext2D,
            canvas: HTMLCanvasElement,
            audioData: AudioAnalysisData,
            time: number
        ) => {
            // Filter active layers
            const activeLayers = layers.filter(layer => !layer.isMuted);
            const isAnySolo = activeLayers.some(layer => layer.isSolo);
            const layersToRender = isAnySolo
                ? activeLayers.filter(layer => layer.isSolo)
                : activeLayers;

            // Apply each layer effect
            layersToRender.forEach(layer => {
                // Check if trigger condition is met
                if (shouldTriggerEffect(layer, audioData, time)) {
                    // Check for custom effect first
                    const customEffect = customEffectsRef.current.get(layer.effectType);
                    if (customEffect) {
                        customEffect.apply(ctx, canvas, parameters, audioData, time);
                    } else {
                        // Use built-in effect
                        effects.applyLayerEffect(
                            ctx,
                            canvas,
                            layer,
                            parameters,
                            {
                                bass: audioData.bass,
                                mids: audioData.mids,
                                highs: audioData.highs,
                                overall: audioData.overall,
                                isBassBeat: audioData.isBassBeat,
                                isMidsBeat: audioData.isMidsBeat,
                                isTrebleBeat: audioData.isTrebleBeat,
                                evolution: 0
                            },
                            null, // astroData
                            0, // cosmicInfluence
                            visualComplexity
                        );
                    }
                }
            });

            // Apply global intensity
            if (globalIntensity !== 1.0) {
                effects.applyGlobalIntensity(ctx, canvas, globalIntensity);
            }
        }, [layers, parameters, globalIntensity, visualComplexity]);

        const shouldTriggerEffect = useCallback((
            layer: EffectLayer,
            audioData: AudioAnalysisData,
            time: number
        ): boolean => {
            switch (layer.triggerSource) {
                case 'audio_bass_beat':
                    return audioData.isBassBeat;
                case 'audio_mids_beat':
                    return audioData.isMidsBeat;
                case 'audio_treble_beat':
                    return audioData.isTrebleBeat;
                case 'audio_overall_envelope':
                    return audioData.overall > 20;
                case 'evolution':
                    return true; // Always triggered for evolution
                case 'none':
                    return false;
                default:
                    return true; // Default to always trigger
            }
        }, []);

        const addEffect = useCallback((effect: EffectDefinition) => {
            customEffectsRef.current.set(effect.id, effect);
        }, []);

        const removeEffect = useCallback((effectId: string) => {
            customEffectsRef.current.delete(effectId);
        }, []);

        const setEffectParameter = useCallback((effectId: string, param: string, value: any) => {
            // This would need to be implemented based on your parameter structure
            // For now, it's a placeholder
            console.log(`Setting ${param} to ${value} for effect ${effectId}`);
        }, []);

        const getEffects = useCallback((): EffectDefinition[] => {
            return Array.from(customEffectsRef.current.values());
        }, []);

        const clearEffects = useCallback(() => {
            customEffectsRef.current.clear();
        }, []);

        useImperativeHandle(ref, () => ({
            applyEffects,
            addEffect,
            removeEffect,
            setEffectParameter,
            getEffects,
            clearEffects
        }), [
            applyEffects,
            addEffect,
            removeEffect,
            setEffectParameter,
            getEffects,
            clearEffects
        ]);

        return null; // Headless component
    }
);

EffectPipeline.displayName = 'EffectPipeline';

// Standalone effect pipeline class
export class StandaloneEffectPipeline {
    private effects: Map<string, EffectDefinition> = new Map();
    private layers: EffectLayer[];
    private parameters: EffectParameters;
    private globalIntensity: number;
    private visualComplexity: number;

    constructor(config: {
        layers: EffectLayer[];
        parameters: EffectParameters;
        globalIntensity?: number;
        visualComplexity?: number;
    }) {
        this.layers = config.layers;
        this.parameters = config.parameters;
        this.globalIntensity = config.globalIntensity ?? 1.0;
        this.visualComplexity = config.visualComplexity ?? 0.5;
    }

    applyEffects(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        audioData: AudioAnalysisData,
        time: number
    ): void {
        const activeLayers = this.layers.filter(layer => !layer.isMuted);
        const isAnySolo = activeLayers.some(layer => layer.isSolo);
        const layersToRender = isAnySolo
            ? activeLayers.filter(layer => layer.isSolo)
            : activeLayers;

        layersToRender.forEach(layer => {
            if (this.shouldTriggerEffect(layer, audioData, time)) {
                const customEffect = this.effects.get(layer.effectType);
                if (customEffect) {
                    customEffect.apply(ctx, canvas, this.parameters, audioData, time);
                } else {
                    // Use built-in effect
                    this.applyBuiltInEffect(ctx, canvas, layer, audioData);
                }
            }
        });

        if (this.globalIntensity !== 1.0) {
            this.applyGlobalIntensity(ctx, canvas);
        }
    }

    private shouldTriggerEffect(
        layer: EffectLayer,
        audioData: AudioAnalysisData,
        time: number
    ): boolean {
        switch (layer.triggerSource) {
            case 'audio_bass_beat':
                return audioData.isBassBeat;
            case 'audio_mids_beat':
                return audioData.isMidsBeat;
            case 'audio_treble_beat':
                return audioData.isTrebleBeat;
            case 'audio_overall_envelope':
                return audioData.overall > 20;
            default:
                return true;
        }
    }

    private applyBuiltInEffect(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        layer: EffectLayer,
        audioData: AudioAnalysisData
    ): void {
        // Apply built-in effects based on layer type
        switch (layer.effectType) {
            case 'bloom':
                this.applyBloom(ctx, canvas, audioData);
                break;
            case 'rgb_shift':
                this.applyRGBShift(ctx, canvas, audioData);
                break;
            case 'glitch_slice':
                this.applyGlitch(ctx, canvas, audioData);
                break;
            case 'pixelate':
                this.applyPixelate(ctx, canvas);
                break;
            case 'kaleidoscope':
                this.applyKaleidoscope(ctx, canvas, audioData);
                break;
            // Add more built-in effects as needed
        }
    }

    private applyBloom(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: AudioAnalysisData): void {
        const intensity = this.parameters.bloom.intensity * (audioData.bass / 255);
        const blurSize = this.parameters.bloom.blurSize;

        ctx.save();
        ctx.filter = `blur(${blurSize * intensity}px) brightness(${1 + intensity * 0.5})`;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5 * intensity;
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
    }

    private applyRGBShift(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: AudioAnalysisData): void {
        const amount = this.parameters.rgb_shift.amount * (audioData.mids / 255);

        ctx.save();

        // Red channel
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(amount, 0);
        ctx.drawImage(canvas, 0, 0);
        ctx.translate(-amount, 0);

        // Green channel
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(canvas, 0, 0);

        // Blue channel
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(-amount, 0);
        ctx.drawImage(canvas, 0, 0);

        ctx.restore();
    }

    private applyGlitch(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: AudioAnalysisData): void {
        const intensity = this.parameters.glitch_slice.intensity;
        const sliceCount = Math.floor(this.parameters.glitch_slice.amount);

        for (let i = 0; i < sliceCount; i++) {
            const y = Math.random() * canvas.height;
            const h = Math.random() * 50 * intensity;
            const offset = (Math.random() - 0.5) * 100 * intensity;

            const imageData = ctx.getImageData(0, y, canvas.width, h);
            ctx.putImageData(imageData, offset, y);
        }
    }

    private applyPixelate(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        const blockSize = this.parameters.pixelate.blockSize;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const scaledWidth = canvas.width / blockSize;
        const scaledHeight = canvas.height / blockSize;

        ctx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
        ctx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height);

        ctx.restore();
    }

    private applyKaleidoscope(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: AudioAnalysisData): void {
        const segments = this.parameters.kaleidoscope.segments;
        const rotation = this.parameters.kaleidoscope.rotationSpeed * (audioData.overall / 255);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        for (let i = 0; i < segments; i++) {
            ctx.rotate((Math.PI * 2) / segments);
            ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        }

        ctx.restore();
    }

    private applyGlobalIntensity(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        ctx.save();
        ctx.globalAlpha = this.globalIntensity;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    addEffect(effect: EffectDefinition): void {
        this.effects.set(effect.id, effect);
    }

    removeEffect(effectId: string): void {
        this.effects.delete(effectId);
    }

    updateParameters(parameters: Partial<EffectParameters>): void {
        this.parameters = { ...this.parameters, ...parameters };
    }

    updateLayers(layers: EffectLayer[]): void {
        this.layers = layers;
    }

    setGlobalIntensity(intensity: number): void {
        this.globalIntensity = intensity;
    }

    setVisualComplexity(complexity: number): void {
        this.visualComplexity = complexity;
    }
}

// Example custom effect creation helper
export function createCustomEffect(
    id: string,
    name: string,
    apply: EffectFunction,
    defaultParams?: any
): EffectDefinition {
    return {
        id,
        name,
        apply,
        defaultParams
    };
}

// Example custom effects
export const CUSTOM_EFFECTS = {
    wave: createCustomEffect(
        'wave',
        'Wave Distortion',
        (ctx, canvas, params, audioData, time) => {
            const amplitude = (audioData.bass / 255) * 50;
            const frequency = 0.01;

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let y = 0; y < canvas.height; y++) {
                const offset = Math.sin(y * frequency + time * 0.001) * amplitude;
                for (let x = 0; x < canvas.width; x++) {
                    const sourceX = Math.floor(x + offset);
                    if (sourceX >= 0 && sourceX < canvas.width) {
                        const targetIndex = (y * canvas.width + x) * 4;
                        const sourceIndex = (y * canvas.width + sourceX) * 4;

                        data[targetIndex] = data[sourceIndex];
                        data[targetIndex + 1] = data[sourceIndex + 1];
                        data[targetIndex + 2] = data[sourceIndex + 2];
                        data[targetIndex + 3] = data[sourceIndex + 3];
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }
    ),

    spiral: createCustomEffect(
        'spiral',
        'Spiral Effect',
        (ctx, canvas, params, audioData, time) => {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const rotation = time * 0.0001 * (audioData.mids / 255);

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.drawImage(canvas, -centerX, -centerY);
            ctx.restore();
        }
    )
};