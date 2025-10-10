


import type {
    EffectParameters, AstroData, EffectTriggerPayload, MediaElement,
// FIX: Corrected import path for types.
    TransitionType, EffectLayer, EffectType, BlendMode
} from '../types';
import React from 'react';

const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let starfieldStars: { x: number; y: number; z: number }[] = [];

function drawStarfield(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
    const starCount = 500;
    const centerX = canvas.width / 2; const centerY = canvas.height / 2; const maxZ = canvas.width;
    if (progress < 0.05) {
        starfieldStars = [];
        for (let i = 0; i < starCount; i++) {
            starfieldStars.push({ x: (Math.random() - 0.5) * canvas.width, y: (Math.random() - 0.5) * canvas.height, z: Math.random() * maxZ });
        }
    }
    ctx.save(); ctx.fillStyle = 'white'; ctx.strokeStyle = 'white';
    starfieldStars.forEach(star => {
        star.z -= 10;
        if (star.z <= 0) { star.z = maxZ; }
        const k = 128 / star.z; const px = star.x * k + centerX; const py = star.y * k + centerY;
        if (px > 0 && px < canvas.width && py > 0 && py < canvas.height) {
            const size = (1 - star.z / maxZ) * 4;
            const prevZ = star.z + 20; const prevK = 128 / prevZ;
            const prevPx = star.x * prevK + centerX; const prevPy = star.y * prevK + centerY;
            ctx.globalAlpha = (1 - star.z / maxZ) * (progress < 0.5 ? progress * 2 : (1 - progress) * 2);
            ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(prevPx, prevPy); ctx.lineTo(px, py); ctx.stroke();
        }
    });
    ctx.restore();
}

function applyGlitchTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
    const intensity = Math.floor(progress * 25);
    for (let i = 0; i < intensity; i++) {
        const y = Math.random() * canvas.height; const h = Math.random() * 20 + 5; const xOffset = (Math.random() - 0.5) * 60 * progress;
        try { ctx.drawImage(canvas, 0, y, canvas.width, h, xOffset, y, canvas.width, h); } catch (e) { }
    }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

export function drawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, palette: [string, string] | undefined) {
    const bgColor = palette ? palette[0] : '#0c0a09'; const gradColor = palette ? palette[1] : '#222';
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    gradient.addColorStop(0, gradColor); gradient.addColorStop(1, bgColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

const drawImageWithAspectRatio = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, media: MediaElement, alignment: 'center' | 'left' | 'right', isFitToWidth: boolean, isFitToHeight: boolean) => {
    if (!media) return;
    const mediaWidth = media.tagName === 'IMG' ? (media as HTMLImageElement).naturalWidth : (media as HTMLVideoElement).videoWidth;
    const mediaHeight = media.tagName === 'IMG' ? (media as HTMLImageElement).naturalHeight : (media as HTMLVideoElement).videoHeight;
    if (!mediaWidth || !mediaHeight) return;
    const mediaAspect = mediaWidth / mediaHeight; const canvasAspect = canvas.width / canvas.height;
    let drawWidth, drawHeight, x, y;
    if (isFitToWidth && isFitToHeight) {
        if (mediaAspect > canvasAspect) { drawWidth = canvas.width; drawHeight = drawWidth / mediaAspect; x = 0; y = (canvas.height - drawHeight) / 2; } 
        else { drawHeight = canvas.height; drawWidth = drawHeight * mediaAspect; y = 0; x = (canvas.width - drawWidth) / 2; }
    } else if (isFitToWidth) { drawWidth = canvas.width; drawHeight = drawWidth / mediaAspect; x = 0; y = (canvas.height - drawHeight) / 2;
    } else if (isFitToHeight) { drawHeight = canvas.height; drawWidth = drawHeight * mediaAspect; y = 0; x = (canvas.width - drawWidth) / 2;
    } else {
        if (mediaAspect > canvasAspect) {
            drawHeight = canvas.height; drawWidth = drawHeight * mediaAspect; y = 0;
            if (alignment === 'left') { x = 0; } else if (alignment === 'right') { x = canvas.width - drawWidth; } else { x = (canvas.width - drawWidth) / 2; }
        } else { drawWidth = canvas.width; drawHeight = drawWidth / mediaAspect; x = 0; y = (canvas.height - drawHeight) / 2; }
    }
    ctx.drawImage(media, x, y, drawWidth, drawHeight);
};

export function drawMedia(
    ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, currentMedia: MediaElement, previousMedia: MediaElement, 
    transitionProgress: number, trigger: EffectTriggerPayload, currentMediaAlignment: 'center' | 'left' | 'right', 
    previousMediaAlignment: 'center' | 'left' | 'right', isFitToWidth: boolean, isFitToHeight: boolean, 
    transitionType: TransitionType, previousMediaIndex: number
) {
    const baseAlpha = 0.8 + (trigger.bass / 255) * 0.2;
    const baseZoom = 1.01 + (trigger.bass / 255) * 0.05 + (trigger.evolution * 0.05);

    const drawFunc = (media: MediaElement, alignment: 'center' | 'left' | 'right') => { drawImageWithAspectRatio(ctx, canvas, media, alignment, isFitToWidth, isFitToHeight); };
    
    if (transitionProgress >= 1 || currentMedia === previousMedia) {
        ctx.save(); ctx.globalAlpha = baseAlpha;
        ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(baseZoom, baseZoom); ctx.translate(-canvas.width / 2, -canvas.height / 2);
        drawFunc(currentMedia, currentMediaAlignment); ctx.restore(); return;
    }

    const easedProgress = easeInOutCubic(transitionProgress);
    switch(transitionType) {
        case 'push':
            ctx.save(); ctx.globalAlpha = baseAlpha; ctx.translate(-easedProgress * canvas.width, 0); drawFunc(previousMedia, previousMediaAlignment); ctx.restore();
            ctx.save(); ctx.globalAlpha = baseAlpha; ctx.translate(canvas.width * (1 - easedProgress), 0); drawFunc(currentMedia, currentMediaAlignment); ctx.restore();
            break;
        case 'starfield-warp':
            ctx.save(); ctx.globalAlpha = baseAlpha * (1 - easedProgress); drawFunc(previousMedia, previousMediaAlignment); ctx.restore();
            ctx.save(); ctx.globalAlpha = baseAlpha * easedProgress; drawFunc(currentMedia, currentMediaAlignment); ctx.restore();
            drawStarfield(ctx, canvas, easedProgress);
            break;
        case 'digital-glitch':
            if (easedProgress < 0.5) { drawFunc(previousMedia, previousMediaAlignment); } else { drawFunc(currentMedia, currentMediaAlignment); }
            const glitchProgress = 1 - Math.abs(easedProgress - 0.5) * 2;
            if (glitchProgress > 0.1) { applyGlitchTransition(ctx, canvas, glitchProgress); }
            break;
        case 'wipe-directional': {
            const direction = previousMediaIndex % 4; // 0: right, 1: left, 2: down, 3: up
            drawFunc(previousMedia, previousMediaAlignment);
            ctx.save();
            ctx.beginPath();
            if (direction === 0) ctx.rect(0, 0, canvas.width * easedProgress, canvas.height); // right
            else if (direction === 1) ctx.rect(canvas.width * (1 - easedProgress), 0, canvas.width * easedProgress, canvas.height); // left
            else if (direction === 2) ctx.rect(0, 0, canvas.width, canvas.height * easedProgress); // down
            else ctx.rect(0, canvas.height * (1 - easedProgress), canvas.width, canvas.height * easedProgress); // up
            ctx.clip();
            drawFunc(currentMedia, currentMediaAlignment);
            ctx.restore();
            break;
        }
        case 'radial-wipe':
        case 'iris-wipe': {
            drawFunc(previousMedia, previousMediaAlignment);
            ctx.save();
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const maxRadius = Math.hypot(canvas.width, canvas.height) / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius * easedProgress, 0, Math.PI * 2);
            ctx.clip();
            drawFunc(currentMedia, currentMediaAlignment);
            ctx.restore();
            break;
        }
        case 'star-wipe': {
            drawFunc(previousMedia, previousMediaAlignment);
            ctx.save();
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const maxRadius = Math.hypot(centerX, centerY) * 1.2;
            drawStar(ctx, centerX, centerY, 5, maxRadius * easedProgress, (maxRadius / 2) * easedProgress);
            ctx.clip();
            drawFunc(currentMedia, currentMediaAlignment);
            ctx.restore();
            break;
        }
        case 'cross-dissolve':
        default: // fade
            ctx.save(); ctx.globalAlpha = baseAlpha * (1 - easedProgress);
            ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(baseZoom, baseZoom); ctx.translate(-canvas.width / 2, -canvas.height / 2);
            drawFunc(previousMedia, previousMediaAlignment); ctx.restore();
            ctx.save(); ctx.globalAlpha = baseAlpha * easedProgress;
            ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(baseZoom, baseZoom); ctx.translate(-canvas.width / 2, -canvas.height / 2);
            drawFunc(currentMedia, currentMediaAlignment); ctx.restore();
            break;
    }
}

export function applyLayerEffect(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, layer: EffectLayer, params: EffectParameters, trigger: EffectTriggerPayload, astroData: AstroData | null, cosmicInfluence: number, visualComplexity: number) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    const blendMap: Record<BlendMode, GlobalCompositeOperation> = {
        'normal': 'source-over',
        'add': 'lighter',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
    };
    ctx.globalCompositeOperation = blendMap[layer.blendMode];

    const currentParams = params; // In future, this could be merged with layer-specific overrides

    switch(layer.effectType) {
        case 'strobe': applyStrobe(ctx, astroData ? astroData.mars.intensity : 0.8); break;
        case 'grid': applyGrid(ctx, canvas, currentParams.grid, trigger, astroData, cosmicInfluence, visualComplexity); break;
        case 'glitch_slice': applyGlitch(ctx, canvas, currentParams.glitch_slice, trigger, astroData); break;
        case 'pixelate': applyPixelate(ctx, canvas, currentParams.pixelate, trigger); break;
        case 'invert': applyInvert(ctx, canvas); break;
        case 'rgb_shift': applyRgbShift(ctx, canvas, currentParams.rgb_shift, trigger); break;
        case 'kaleidoscope': applyKaleidoscope(ctx, canvas, currentParams.kaleidoscope, trigger); break;
        case 'bloom': applyBloom(ctx, canvas, currentParams.bloom, trigger); break;
        case 'color_grading': applyColorGrading(ctx, canvas, currentParams.color_grading, trigger); break;
        case 'liquid_dream': applyLiquidDream(ctx, canvas, currentParams.liquid_dream, trigger); break;
        // Note: 'particles' effect is handled in ThreeScene.tsx
    }
    ctx.restore();
}

export function applyGlobalIntensity(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, intensity: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    if (intensity < 1) {
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - intensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (intensity > 1) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity - 1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
}

export function applyStrobe(ctx: CanvasRenderingContext2D, opacity: number) {
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function applyGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['grid'], trigger: EffectTriggerPayload, astroData: AstroData | null, cosmicInfluence: number, visualComplexity: number) {
    const saturnStructure = astroData ? astroData.saturn.structure : 0.5;
    const influence = astroData ? cosmicInfluence : 0.5;
    const color = astroData ? astroData.sun.palette[1] : '#aaa';
    ctx.globalAlpha = Math.min(ctx.globalAlpha, (trigger.mids / 255) * saturnStructure * influence * 2);
    ctx.fillStyle = color;
    const complexityFactor = 1 - (visualComplexity * 0.8);
    const baseGridSize = params.size * complexityFactor + (1 - saturnStructure) * 100;
    const gridSize = Math.max(10, baseGridSize - (trigger.evolution * baseGridSize * 0.8));
    for (let i = 0; i < canvas.width; i += gridSize) { ctx.fillRect(i, 0, params.lineWidth, canvas.height); }
    for (let i = 0; i < canvas.height; i += gridSize) { ctx.fillRect(0, i, canvas.width, params.lineWidth); }
}

export function applyGlitch(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['glitch_slice'], trigger: EffectTriggerPayload, astroData: AstroData | null) {
    if (trigger.highs <= 100) return;
    const isRetrograde = astroData ? astroData.mercury.retrograde : false;
    let probability = (params.intensity * 0.2) + (trigger.highs / 255 * 0.3) + (trigger.evolution * 0.4);
    if (isRetrograde) { probability = Math.min(1.0, probability * 2.5); }
    if (Math.random() > probability) return;
    try {
        const x = Math.random() * canvas.width; const y = Math.random() * canvas.height;
        const spliceWidth = canvas.width * (0.2 + Math.random() * 0.4);
        const spliceHeight = (5 + Math.random() * 20) * (trigger.highs / 255);
        ctx.drawImage(canvas, 0, y, spliceWidth, spliceHeight, x, y, spliceWidth, spliceHeight);
    } catch (e) { console.warn("Glitch failed.", e); }
}

export function applyPixelate(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['pixelate'], trigger: EffectTriggerPayload) {
    const blockSize = 2 + (trigger.bass / 255) * (params.blockSize - 2);
    if (blockSize < 2) return;
    const w = canvas.width / blockSize; const h = canvas.height / blockSize;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, w, h); ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
    ctx.restore();
}

export function applyInvert(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function applyRgbShift(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['rgb_shift'], trigger: EffectTriggerPayload) {
    const frequencyValue = trigger[params.frequency] / 255;
    if (frequencyValue < (1 - params.intensity)) return;
    const amount = Math.floor(frequencyValue * params.amount) + Math.floor(trigger.evolution * params.amount * 0.5);
    if (amount <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(canvas, amount, 0); ctx.drawImage(canvas, -amount, 0);
}

export function applyKaleidoscope(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['kaleidoscope'], trigger: EffectTriggerPayload) {
    const segments = Math.floor(params.segments); if (segments < 2) return;
    const angle = (Math.PI * 2) / segments; const centerX = canvas.width / 2; const centerY = canvas.height / 2;
    const tempCanvas = document.createElement('canvas'); tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d'); if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rotation = (performance.now() * params.rotationSpeed * 0.1) + (trigger.evolution * Math.PI);
    for (let i = 0; i < segments; i++) {
        ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(i * angle + rotation);
        if (i % 2 === 0) { ctx.scale(1, -1); }
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, canvas.width * 1.5, -angle / 2, angle / 2); ctx.closePath(); ctx.clip();
        ctx.rotate(-(i * angle + rotation)); ctx.translate(-centerX, -centerY); ctx.drawImage(tempCanvas, 0, 0); ctx.restore();
    }
}

export function applyBloom(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['bloom'], trigger: EffectTriggerPayload) {
    ctx.save();
    const currentIntensity = params.intensity * (trigger.overall / 255);
    const currentBlur = params.blurSize * (trigger.overall / 255);
    if (currentIntensity <= 0.1) { ctx.restore(); return; }
    ctx.filter = `blur(${currentBlur}px) brightness(${100 + currentIntensity * 50}%)`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
}

export function applyColorGrading(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['color_grading'], trigger: EffectTriggerPayload) {
    const evolvingHue = (params.hue + (trigger.evolution * 360)) % 360;
    ctx.filter = `hue-rotate(${evolvingHue}deg) saturate(${params.saturation}%) contrast(${params.contrast}%)`;
    ctx.drawImage(canvas, 0, 0);
}

export function applyLiquidDream(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, params: EffectParameters['liquid_dream'], trigger: EffectTriggerPayload) {
    try {
        const { width, height } = canvas;
        const time = performance.now() * 0.0001 * params.speed;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width; tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d'); if (!tempCtx) return;
        tempCtx.drawImage(canvas, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const offsetX = Math.floor(params.intensity * (Math.sin(y / 15 + time * 2) + Math.cos(x / 15 + time * 3)));
                const offsetY = Math.floor(params.intensity * (Math.sin(y / 10 + time * 3) + Math.cos(x / 20 + time * 2)));
                const newX = Math.max(0, Math.min(width - 1, x + offsetX));
                const newY = Math.max(0, Math.min(height - 1, y + offsetY));
                const newIndex = (newY * width + newX) * 4;
                data[index] = copy[newIndex];
                data[index + 1] = copy[newIndex + 1];
                data[index + 2] = copy[newIndex + 2];
                if (params.grain > 0) {
                    const grain = (Math.random() - 0.5) * 255 * params.grain;
                    data[index] = Math.max(0, Math.min(255, data[index] + grain));
                    data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + grain));
                    data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + grain));
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    } catch (e) {
        console.warn("Liquid Dream effect failed. This can happen on some browsers with hardware acceleration disabled.", e);
        // Fallback: draw original image
        ctx.drawImage(canvas, 0, 0);
    }
}