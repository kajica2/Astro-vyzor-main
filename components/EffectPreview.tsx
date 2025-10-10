



import React, { useRef, useEffect } from 'react';
// FIX: Corrected import path for types.
import type { EffectType, EffectParameters, EffectTriggerPayload, EffectLayer } from '../types';
import * as effects from '../utils/effects';
import { MOCK_ASTRO_DATA } from '../constants';

interface EffectPreviewProps {
    effectType: EffectType;
    parameters: EffectParameters;
}

export const EffectPreview: React.FC<EffectPreviewProps> = ({ effectType, parameters }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const strobeOpacityRef = useRef(0);
    const lastBeatTime = useRef(0);

    useEffect(() => {
        // Reset stateful effects when the effect type changes
        strobeOpacityRef.current = 0;
        lastBeatTime.current = 0;
    }, [effectType]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const animate = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Mock audio data that pulses over time
            const beatCycle = 800; // A "beat" every 800ms
            const bassValue = (Math.sin(time / (beatCycle / Math.PI)) + 1) / 2; // 0 to 1
            const isBeat = time - lastBeatTime.current > beatCycle;
            if (isBeat) lastBeatTime.current = time;

            // Mock evolution cycling every 4 seconds
            const evolutionProgress = (time / 4000) % 1;

            const triggerPayload: EffectTriggerPayload = {
                isBassBeat: isBeat,
                isMidsBeat: isBeat,
                isTrebleBeat: isBeat,
                bass: bassValue * 255,
                mids: (Math.cos(time / 200) + 1) / 2 * 200,
                highs: (Math.sin(time / 100) + 1) / 2 * 150,
                overall: bassValue * 255,
                evolution: evolutionProgress,
            };

            // Draw a simple background
            effects.drawBackground(ctx, canvas, MOCK_ASTRO_DATA.sun.palette);
            // Draw a simple shape to apply effects on
            ctx.fillStyle = MOCK_ASTRO_DATA.sun.palette[1];
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.height / 4, 0, Math.PI * 2);
            ctx.fill();


            switch (effectType) {
                case 'strobe':
                    if (triggerPayload.isBassBeat) strobeOpacityRef.current = MOCK_ASTRO_DATA.mars.intensity;
                    if (strobeOpacityRef.current > 0) {
                        effects.applyStrobe(ctx, strobeOpacityRef.current);
                        strobeOpacityRef.current -= 0.05;
                    }
                    break;
                case 'grid':
                    effects.applyGrid(ctx, canvas, parameters.grid, triggerPayload, MOCK_ASTRO_DATA, 1.0, 0.5);
                    break;
                case 'glitch_slice':
                    effects.applyGlitch(ctx, canvas, parameters.glitch_slice, triggerPayload, MOCK_ASTRO_DATA);
                    break;
                case 'pixelate':
                    if (triggerPayload.isBassBeat) effects.applyPixelate(ctx, canvas, parameters.pixelate, triggerPayload);
                    break;
                case 'invert':
                    if (triggerPayload.isBassBeat) effects.applyInvert(ctx, canvas);
                    break;
                case 'rgb_shift':
                    if (triggerPayload.isBassBeat) effects.applyRgbShift(ctx, canvas, parameters.rgb_shift, triggerPayload);
                    break;
                case 'kaleidoscope':
                    effects.applyKaleidoscope(ctx, canvas, parameters.kaleidoscope, triggerPayload);
                    break;
                case 'bloom':
                    if (triggerPayload.isBassBeat) effects.applyBloom(ctx, canvas, parameters.bloom, triggerPayload);
                    break;
                case 'color_grading':
                    effects.applyColorGrading(ctx, canvas, parameters.color_grading, triggerPayload);
                    break;
                case 'liquid_dream':
                    effects.applyLiquidDream(ctx, canvas, parameters.liquid_dream, triggerPayload);
                    break;
            }

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId.current != null) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [effectType, parameters]);

    return <canvas ref={canvasRef} width="240" height="150" className="w-full h-auto" />;
};


// --- NEW COMPONENT --- //
interface PresetPreviewProps {
    layers: EffectLayer[];
    parameters: EffectParameters;
}

export const PresetPreview: React.FC<PresetPreviewProps> = ({ layers, parameters }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const lastBeatTime = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const animate = (time: number) => {
            if (!canvasRef.current) return; // check if component is unmounted
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Mock audio data that pulses over time
            const beatCycle = 1000; // A "beat" every 1000ms
            const bassValue = (Math.sin(time / (beatCycle / Math.PI)) + 1) / 2;
            const isBeat = time - lastBeatTime.current > beatCycle;
            if (isBeat) lastBeatTime.current = time;

            const evolutionProgress = (time / 8000) % 1;

            const triggerPayload: EffectTriggerPayload = {
                isBassBeat: isBeat, isMidsBeat: isBeat, isTrebleBeat: isBeat,
                bass: bassValue * 255, mids: (Math.cos(time / 200) + 1) / 2 * 200,
                highs: (Math.sin(time / 100) + 1) / 2 * 150, overall: bassValue * 255,
                evolution: evolutionProgress,
            };

            effects.drawBackground(ctx, canvas, MOCK_ASTRO_DATA.sun.palette);
            ctx.fillStyle = MOCK_ASTRO_DATA.sun.palette[1];
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.height / 4, 0, Math.PI * 2);
            ctx.fill();

            // Apply layers from props
            const activeLayers = layers.filter(l => !l.isMuted);
            const isAnySolo = activeLayers.some(l => l.isSolo);
            const layersToRender = isAnySolo ? activeLayers.filter(l => l.isSolo) : activeLayers;

            layersToRender.forEach(layer => {
                // Simplified trigger check for preview
                const shouldTrigger = layer.triggerSource.includes('beat') ? isBeat : true;
                if (shouldTrigger) {
                    effects.applyLayerEffect(ctx, canvas, layer, parameters, triggerPayload, MOCK_ASTRO_DATA, 0.75, 0.5);
                }
            });

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId.current != null) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [layers, parameters]);

    return <canvas ref={canvasRef} width="240" height="135" className="w-full h-auto rounded-lg bg-stone-950" />;
};
