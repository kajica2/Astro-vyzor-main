import React, { useRef, useEffect, useCallback } from 'react';
// FIX: Corrected import path for types.
import type { EffectTriggerPayload, TransitionType, ModulatableParam, EffectLayer, EffectParameters } from '../types';
import { FFT_SIZE, BEAT_COOLDOWN, TRANSITION_DEFINITIONS, COLOR_PALETTES } from '../constants';
import * as effects from '../utils/effects';
import { ExportControls } from './ExportControls';
import { PerformancePanel } from './PerformancePanel';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
import { interpolateEffectLayers, interpolateEffectParameters } from '../utils/interpolation';

const BEAT_DETECTION_HISTORY_SIZE = 120; // Approx. 2 seconds at 60fps
const transitionTypesList = TRANSITION_DEFINITIONS.map(t => t.id).filter(t => t !== 'random') as Exclude<TransitionType, 'random'>[];
const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;
const applyCurve = (progress: number, shape: 'linear' | 'exponential' | 'logarithmic' | 'bell'): number => {
    switch (shape) {
        case 'exponential': return progress * progress;
        case 'logarithmic': return Math.sqrt(progress);
        case 'bell': return Math.sin(progress * Math.PI);
        case 'linear': default: return progress;
    }
}
const calculateVariance = (arr: number[]): number => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
};

// --- MODULATION HELPERS --- //
const PARAM_RANGES: { [key in ModulatableParam]?: { min: number; max: number; bipolar?: boolean } } = {
    'globalIntensity': { min: 0, max: 2 },
    'visualComplexity': { min: 0, max: 1 },
    'cosmicInfluence': { min: 0, max: 1 },
    'solarSubtraction': { min: 0, max: 1 },
    'transitionTemperature': { min: 0, max: 1 },
    'effectParameters.grid.size': { min: 10, max: 300 },
    'effectParameters.grid.lineWidth': { min: 0.1, max: 10 },
    'effectParameters.bloom.intensity': { min: 0, max: 2 },
    'effectParameters.bloom.blurSize': { min: 1, max: 100 },
    'effectParameters.kaleidoscope.segments': { min: 2, max: 24 },
    'effectParameters.kaleidoscope.rotationSpeed': { min: -1, max: 1, bipolar: true },
    'effectParameters.rgb_shift.amount': { min: 1, max: 100 },
    'effectParameters.liquid_dream.intensity': { min: 0, max: 50 },
    'effectParameters.liquid_dream.speed': { min: 0, max: 2 },
};

const setValueByPath = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
};
const getValueByPath = (obj: any, path: string): any => {
    return path.split('.').reduce((o, i) => o?.[i], obj);
};


export const Visualizer: React.FC<{ onStop: () => void }> = ({ onStop }) => {
    const { state, dispatch } = useAppState();
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    const { mediaElements, audioUrl, micStream, isRecording } = state;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<AudioNode | null>(null);

    const triggerPayloadRef = useRef<EffectTriggerPayload>({
        bass: 0, mids: 0, highs: 0, overall: 0,
        isBassBeat: false, isMidsBeat: false, isTrebleBeat: false, evolution: 0
    });
    
    const smoothedAudioRef = useRef({ bass: 0, mids: 0, highs: 0, overall: 0 });
    const bassHistoryRef = useRef<number[]>([]);
    const midsHistoryRef = useRef<number[]>([]);
    const highsHistoryRef = useRef<number[]>([]);
    
    const currentMediaIndexRef = useRef(0);
    const previousMediaIndexRef = useRef(0);
    const transitionStartTimeRef = useRef(0);
    const lastBeatTimeRef = useRef({ bass: 0, mids: 0, treble: 0, mars: 0 });
    const lastFrameTimeRef = useRef<number>(0);
    const mediaAlignmentsRef = useRef<('center' | 'left' | 'right')[]>([]);
    const activeTransitionTypeRef = useRef<TransitionType>(state.transitionType);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const calculateMediaAlignments = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || mediaElements.length === 0) {
            mediaAlignmentsRef.current = [];
            return;
        }
        const canvasAspect = canvas.width / canvas.height;
        const alignments: ('center' | 'left' | 'right')[] = [];
        let nextWideAlignment: 'left' | 'right' = 'left';
        mediaElements.forEach(media => {
            if (!media) { alignments.push('center'); return; }
            const mediaWidth = media.tagName === 'IMG' ? (media as HTMLImageElement).naturalWidth : (media as HTMLVideoElement).videoWidth;
            const mediaHeight = media.tagName === 'IMG' ? (media as HTMLImageElement).naturalHeight : (media as HTMLVideoElement).videoHeight;
            if (mediaHeight === 0) { alignments.push('center'); return; }
            const mediaAspect = mediaWidth / mediaHeight;
            if (mediaAspect > canvasAspect) {
                alignments.push(nextWideAlignment);
                nextWideAlignment = nextWideAlignment === 'left' ? 'right' : 'left';
            } else { alignments.push('center'); }
        });
        mediaAlignmentsRef.current = alignments;
    }, [mediaElements]);

    const animate = useCallback((time: number) => {
        const currentState = stateRef.current;
        const { isPlaying } = currentState;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const analyser = analyserRef.current;
        if (!canvas || !ctx || !analyser || !isPlaying) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // --- New Adaptive Beat Detection & Audio Processing ---
        
        const inst_bass = dataArray.slice(1, 4).reduce((a, b) => a + b, 0) / (3 * 255);
        const inst_mids = dataArray.slice(10, 30).reduce((a, b) => a + b, 0) / (20 * 255);
        const inst_highs = dataArray.slice(50, 100).reduce((a, b) => a + b, 0) / (50 * 255);

        bassHistoryRef.current.push(inst_bass);
        if (bassHistoryRef.current.length > BEAT_DETECTION_HISTORY_SIZE) bassHistoryRef.current.shift();
        midsHistoryRef.current.push(inst_mids);
        if (midsHistoryRef.current.length > BEAT_DETECTION_HISTORY_SIZE) midsHistoryRef.current.shift();
        highsHistoryRef.current.push(inst_highs);
        if (highsHistoryRef.current.length > BEAT_DETECTION_HISTORY_SIZE) highsHistoryRef.current.shift();

        const avg_bass = bassHistoryRef.current.reduce((a, b) => a + b, 0) / bassHistoryRef.current.length;
        const avg_mids = midsHistoryRef.current.reduce((a, b) => a + b, 0) / midsHistoryRef.current.length;
        const avg_highs = highsHistoryRef.current.reduce((a, b) => a + b, 0) / highsHistoryRef.current.length;

        const bassVariance = calculateVariance(bassHistoryRef.current);
        const midsVariance = calculateVariance(midsHistoryRef.current);

        const dynamic_inst_bass = bassVariance < 0.0005 ? inst_bass * 1.15 : inst_bass;
        const dynamic_inst_mids = midsVariance < 0.0005 ? inst_mids * 1.15 : inst_mids;

        const now = time;
        const newTriggerPayload: EffectTriggerPayload = {
            bass: 0, mids: 0, highs: 0, overall: 0,
            isBassBeat: false, isMidsBeat: false, isTrebleBeat: false, evolution: 0,
        };
        const bassBeatThreshold = 1.5 - (currentState.bassSensitivity * 0.8);
        const midsBeatThreshold = 1.5 - (currentState.midSensitivity * 0.8);
        const trebleBeatThreshold = 1.6 - (currentState.trebleSensitivity * 0.8);

        if (dynamic_inst_bass > avg_bass * bassBeatThreshold && (now - lastBeatTimeRef.current.bass) > BEAT_COOLDOWN) { newTriggerPayload.isBassBeat = true; lastBeatTimeRef.current.bass = now; }
        if (dynamic_inst_mids > avg_mids * midsBeatThreshold && (now - lastBeatTimeRef.current.mids) > BEAT_COOLDOWN) { newTriggerPayload.isMidsBeat = true; lastBeatTimeRef.current.mids = now; }
        if (inst_highs > avg_highs * trebleBeatThreshold && (now - lastBeatTimeRef.current.treble) > BEAT_COOLDOWN) { newTriggerPayload.isTrebleBeat = true; lastBeatTimeRef.current.treble = now; }
        
        const applyDynamics = (value: number) => Math.min(value, currentState.audioPeakLimiter) < currentState.audioThreshold ? 0 : Math.min(value, currentState.audioPeakLimiter);
        const dynamic = {
            bass: applyDynamics(inst_bass),
            mids: applyDynamics(inst_mids),
            highs: applyDynamics(inst_highs),
            overall: 0,
        };
        dynamic.overall = (dynamic.bass + dynamic.mids + dynamic.highs) / 3;

        smoothedAudioRef.current = {
            bass: lerp(smoothedAudioRef.current.bass, dynamic.bass, dynamic.bass > smoothedAudioRef.current.bass ? currentState.audioAttack : currentState.audioRelease),
            mids: lerp(smoothedAudioRef.current.mids, dynamic.mids, dynamic.mids > smoothedAudioRef.current.mids ? currentState.audioAttack : currentState.audioRelease),
            highs: lerp(smoothedAudioRef.current.highs, dynamic.highs, dynamic.highs > smoothedAudioRef.current.highs ? currentState.audioAttack : currentState.audioRelease),
            overall: lerp(smoothedAudioRef.current.overall, dynamic.overall, dynamic.overall > smoothedAudioRef.current.overall ? currentState.audioAttack : currentState.audioRelease),
        };

        newTriggerPayload.bass = smoothedAudioRef.current.bass * 255;
        newTriggerPayload.mids = smoothedAudioRef.current.mids * 255;
        newTriggerPayload.highs = smoothedAudioRef.current.highs * 255;
        newTriggerPayload.overall = smoothedAudioRef.current.overall * 255;

        // --- Style Blending Engine ---
        const frameState = JSON.parse(JSON.stringify(currentState)); // Deep copy for this frame
        const { styleBlendValue, stylePresetAId, stylePresetBId, effectPresets } = frameState;

        if (styleBlendValue > 0.01 && styleBlendValue < 0.99) {
            const presetA = effectPresets.find(p => p.id === stylePresetAId);
            const presetB = effectPresets.find(p => p.id === stylePresetBId);
            if (presetA && presetB) {
                frameState.effectLayers = interpolateEffectLayers(presetA.layers, presetB.layers, styleBlendValue);
                frameState.effectParameters = interpolateEffectParameters(presetA.parameters, presetB.parameters, presetA.layers, presetB.layers, styleBlendValue);
            }
        } else if (styleBlendValue <= 0.01) {
            const presetA = effectPresets.find(p => p.id === stylePresetAId);
            if (presetA) {
                frameState.effectLayers = presetA.layers;
                frameState.effectParameters = presetA.parameters;
            }
        } else { // >= 0.99
            const presetB = effectPresets.find(p => p.id === stylePresetBId);
            if (presetB) {
                frameState.effectLayers = presetB.layers;
                frameState.effectParameters = presetB.parameters;
            }
        }
        // --- End of Style Blending Engine ---

        // --- MODULATION ENGINE --- //
        const modulatedState = frameState; // Use the (potentially blended) frameState
        const { lfo, envelopeFollower } = modulatedState;

        // 1. Calculate modulator values
        let lfoValue = 0;
        const lfoTime = time * 0.001 * lfo.rate; // time in seconds
        switch (lfo.shape) {
            case 'sine': lfoValue = Math.sin(lfoTime * 2 * Math.PI); break; // -1 to 1
            case 'square': lfoValue = Math.sin(lfoTime * 2 * Math.PI) > 0 ? 1 : -1; break;
            case 'sawtooth': lfoValue = (lfoTime % 1) * 2 - 1; break;
            case 'triangle': lfoValue = Math.abs((lfoTime % 1) * 2 - 1) * 2 - 1; break;
        }
        const envelopeValue = smoothedAudioRef.current[envelopeFollower.source] ?? 0; // 0 to 1

        // 2. Apply modulators
        if (lfo.target !== 'none') {
            const baseValue = getValueByPath(modulatedState, lfo.target);
            const range = PARAM_RANGES[lfo.target] || { min: 0, max: 1 };
            if (typeof baseValue === 'number') {
                const modInput = range.bipolar ? lfoValue : (lfoValue + 1) / 2;
                const modulated = baseValue * (1 - lfo.amount) + (range.min + modInput * (range.max - range.min)) * lfo.amount;
                const clamped = Math.max(range.min, Math.min(range.max, modulated));
                setValueByPath(modulatedState, lfo.target, clamped);
            }
        }
        if (envelopeFollower.target !== 'none') {
            const baseValue = getValueByPath(modulatedState, envelopeFollower.target);
            const range = PARAM_RANGES[envelopeFollower.target] || { min: 0, max: 1 };
            if (typeof baseValue === 'number') {
                const modulated = baseValue * (1 - envelopeFollower.amount) + (range.min + envelopeValue * (range.max - range.min)) * envelopeFollower.amount;
                const clamped = Math.max(range.min, Math.min(range.max, modulated));
                setValueByPath(modulatedState, envelopeFollower.target, clamped);
            }
        }
        // --- End of modulation engine ---
        
        const { isEvolutionEnabled, evolutionLoopDuration, evolutionCurveShape, evolutionRandomization, transitionTemperature, transitionType, isVideoFxEnabled, isVideoReversed, videoPlaybackSpeed, isFitToWidth, isFitToHeight, astroData, cosmicInfluence, solarSubtraction, effectLayers, transitionFrequency, colorPalette, isCosmicInfluenceEnabled } = modulatedState;
        
        let progress = 0;
        if (isEvolutionEnabled) {
            const audio = audioRef.current; const audioContext = audioContextRef.current;
            if (evolutionLoopDuration > 0) { progress = ((audioContext?.currentTime || (audio?.currentTime || 0)) / evolutionLoopDuration) % 1; } 
            else { progress = micStream && audioContext ? ((audioContext.currentTime % 180) / 180) : (audio && audio.duration ? audio.currentTime / audio.duration : 0); }
        }
        let evolutionFactor = isEvolutionEnabled ? applyCurve(progress, evolutionCurveShape) : 0;
        if(isEvolutionEnabled && evolutionRandomization > 0) {
            evolutionFactor += (Math.random() - 0.5) * evolutionRandomization;
            evolutionFactor = Math.max(0, Math.min(1, evolutionFactor));
        }
        newTriggerPayload.evolution = evolutionFactor;

        const dynamicTransitionDuration = 200 + (1 - transitionTemperature) * 1800;
        const transitionProgress = mediaElements.length > 1 ? Math.min(1, (time - transitionStartTimeRef.current) / dynamicTransitionDuration) : 1;
        
        if ((newTriggerPayload.isBassBeat || newTriggerPayload.isMidsBeat) && transitionProgress >= 1 && Math.random() < transitionFrequency) {
            if (transitionType === 'random') {
                activeTransitionTypeRef.current = transitionTypesList[Math.floor(Math.random() * transitionTypesList.length)];
            } else { activeTransitionTypeRef.current = transitionType; }
            previousMediaIndexRef.current = currentMediaIndexRef.current;
            currentMediaIndexRef.current = (currentMediaIndexRef.current + 1) % mediaElements.length;
            transitionStartTimeRef.current = time;
            
            const prevVid = mediaElements[previousMediaIndexRef.current]; if (prevVid?.tagName === 'VIDEO') (prevVid as HTMLVideoElement).pause();
            const currVid = mediaElements[currentMediaIndexRef.current];
            if (currVid?.tagName === 'VIDEO') {
                const vid = currVid as HTMLVideoElement;
                if (isVideoFxEnabled && isVideoReversed && vid.readyState >= 3) vid.currentTime = vid.duration;
            }
        }
        triggerPayloadRef.current = newTriggerPayload;

        const currentMedia = mediaElements[currentMediaIndexRef.current];
        if (currentMedia?.tagName === 'VIDEO') {
            const video = currentMedia as HTMLVideoElement;
            video.playbackRate = isVideoFxEnabled ? videoPlaybackSpeed : 1.0;
            if (isVideoFxEnabled && isVideoReversed) {
                video.pause();
                if (video.readyState >= 3) { let newTime = video.currentTime - ((time - (lastFrameTimeRef.current || time)) / 1000) * video.playbackRate; video.currentTime = newTime <= 0 ? video.duration : newTime; }
            } else if (video.paused) { video.play().catch(() => {}); }
        }
        lastFrameTimeRef.current = time;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const activePalette = colorPalette !== 'astrological' && COLOR_PALETTES[colorPalette] ? COLOR_PALETTES[colorPalette] : astroData?.sun.palette;
        effects.drawBackground(ctx, canvas, activePalette);
        const previousMedia = mediaElements[previousMediaIndexRef.current];
        const currentMediaAlignment = mediaAlignmentsRef.current[currentMediaIndexRef.current] ?? 'center';
        const previousMediaAlignment = mediaAlignmentsRef.current[previousMediaIndexRef.current] ?? 'center';
        effects.drawMedia(ctx, canvas, currentMedia, previousMedia, transitionProgress, newTriggerPayload, currentMediaAlignment, previousMediaAlignment, isFitToWidth, isFitToHeight, activeTransitionTypeRef.current, previousMediaIndexRef.current);
        
        const finalCosmicInfluence = Math.max(0, cosmicInfluence - solarSubtraction);
        const checkTrigger = (source: string) => {
            if (!astroData) return false;
            if (now - lastBeatTimeRef.current.mars < BEAT_COOLDOWN && Math.random() < astroData.mars.intensity) { lastBeatTimeRef.current.mars = now; return source === 'cosmic_mars_beat'; }
            switch (source) {
                case 'audio_bass_beat': return newTriggerPayload.isBassBeat;
                case 'audio_mids_beat': return newTriggerPayload.isMidsBeat;
                case 'audio_treble_beat': return newTriggerPayload.isTrebleBeat;
                case 'audio_overall_envelope': return newTriggerPayload.overall > 20; // threshold
                case 'evolution': return true;
                case 'cosmic_sun_continuous': return astroData.sun.continuous > 0.5;
                case 'cosmic_moon_phase': return astroData.moon.phaseValue > 0.4 && astroData.moon.phaseValue < 0.6; // near full
                case 'cosmic_mercury_continuous': return astroData.mercury.continuous > 0.5;
                case 'cosmic_venus_continuous': return astroData.venus.continuous > 0.5;
                case 'cosmic_jupiter_slow': return astroData.jupiter.slowCycle > 0.5;
                case 'cosmic_saturn_continuous': return astroData.saturn.continuous > 0.5;
                default: return false;
            }
        };

        const activeLayers = effectLayers.filter(l => !l.isMuted);
        const isAnySolo = activeLayers.some(l => l.isSolo);
        const layersToRender = isAnySolo ? activeLayers.filter(l => l.isSolo) : activeLayers;

        layersToRender.forEach(layer => {
            if (checkTrigger(layer.triggerSource)) {
                effects.applyLayerEffect(ctx, canvas, layer, modulatedState.effectParameters, newTriggerPayload, isCosmicInfluenceEnabled ? astroData : null, finalCosmicInfluence, modulatedState.visualComplexity);
            }
        });

        if (modulatedState.globalIntensity !== 1.0) { effects.applyGlobalIntensity(ctx, canvas, modulatedState.globalIntensity); }
        if (isRecording && offscreenCanvasRef.current) {
            const offscreenCtx = offscreenCanvasRef.current.getContext('2d');
            if (offscreenCtx) {
                offscreenCtx.fillStyle = 'black'; offscreenCtx.fillRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
                offscreenCtx.drawImage(canvas, 0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
            }
        }
        animationFrameId.current = requestAnimationFrame(animate);
    }, []);

    const handleStartRecording = useCallback((settings: { resolution: 'auto' | '1080p' | '720p' | '480p', format: string, framerate: 30 | 60 }) => {
        const mainCanvas = canvasRef.current; const audio = audioRef.current;
        if (!mainCanvas || (!audio && !micStream) || !('MediaRecorder' in window)) { alert('Video recording is not supported.'); return; }
        const resolutions = { 'auto': { width: mainCanvas.width, height: mainCanvas.height }, '1080p': { width: 1920, height: 1080 }, '720p': { width: 1280, height: 720 }, '480p': { width: 854, height: 480 },};
        const { width, height } = resolutions[settings.resolution];
        const offscreenCanvas = document.createElement('canvas'); offscreenCanvas.width = width; offscreenCanvas.height = height;
        offscreenCanvasRef.current = offscreenCanvas;
        const videoStream = offscreenCanvas.captureStream(settings.framerate);
        let audioStream: MediaStream | null = null;
        if (micStream) { audioStream = new MediaStream(micStream.getAudioTracks()); } 
        else if (audio) { const ac = audio as any; if (typeof ac.captureStream === 'function') { audioStream = ac.captureStream(); } else if (typeof ac.mozCaptureStream === 'function') { audioStream = ac.mozCaptureStream(); } }
        if (!audioStream) { alert('Could not capture audio source.'); return; }
        const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
        try { recorderRef.current = new MediaRecorder(combinedStream, { mimeType: settings.format }); } 
        catch (e) { console.error('MediaRecorder error:', e); alert(`Recording failed. Unsupported format: ${settings.format}.`); return; }
        recordedChunksRef.current = [];
        recorderRef.current.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
        recorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: settings.format }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
            a.download = `astro-vysio-${new Date().toISOString().replace(/:/g, '-')}.${settings.format.includes('mp4') ? 'mp4' : 'webm'}`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
            recordedChunksRef.current = [];
        };
        recorderRef.current.start(); dispatch({ type: 'SET_IS_RECORDING', payload: true });
    }, [micStream, dispatch]);

    const handleStopRecording = useCallback(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        dispatch({ type: 'SET_IS_RECORDING', payload: false });
        offscreenCanvasRef.current = null;
    }, [dispatch]);

    useEffect(() => {
        const canvas = canvasRef.current; const audio = audioRef.current;
        if (!canvas || (!audioUrl && !micStream)) return;
        const resizeCanvas = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; calculateMediaAlignments(); } };
        resizeCanvas(); window.addEventListener('resize', resizeCanvas);
        mediaElements.forEach(media => { if (media.tagName === 'VIDEO') { (media as HTMLVideoElement).pause(); (media as HTMLVideoElement).currentTime = 0; } });
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = context.createAnalyser(); analyser.fftSize = FFT_SIZE;
            if (micStream) { sourceRef.current = context.createMediaStreamSource(micStream); sourceRef.current.connect(analyser); } 
            else if (audio) { audio.play().catch(e => console.error("Audio play failed:", e)); sourceRef.current = context.createMediaElementSource(audio); sourceRef.current.connect(analyser).connect(context.destination); } 
            else return;
            audioContextRef.current = context; analyserRef.current = analyser;
            animationFrameId.current = requestAnimationFrame(animate);
        } catch (error) { console.error("Error setting up audio context:", error); onStop(); }
        return () => {
            if (recorderRef.current?.state === 'recording') { recorderRef.current.stop(); dispatch({ type: 'SET_IS_RECORDING', payload: false }); }
            window.removeEventListener('resize', resizeCanvas);
            if(animationFrameId.current != null) cancelAnimationFrame(animationFrameId.current);
            if (audio) { audio.pause(); audio.currentTime = 0; }
            mediaElements.forEach(media => { if (media.tagName === 'VIDEO') (media as HTMLVideoElement).pause(); });
            sourceRef.current?.disconnect(); analyserRef.current?.disconnect();
            audioContextRef.current?.close().catch(e => console.error("Error closing AudioContext:", e));
            audioContextRef.current = null; analyserRef.current = null; sourceRef.current = null;
        };
    }, [animate, onStop, calculateMediaAlignments, mediaElements, audioUrl, micStream, dispatch]);

    return (
        <div className="relative w-screen h-screen bg-black">
            <canvas ref={canvasRef} className="w-full h-full" />
            {audioUrl && <audio ref={audioRef} src={audioUrl} key={audioUrl} crossOrigin="anonymous" />}
            <button onClick={onStop} className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors z-10">← Back to Setup</button>
            <ExportControls isRecording={isRecording} onStart={handleStartRecording} onStop={handleStopRecording} />
            <PerformancePanel />
        </div>
    );
};