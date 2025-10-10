import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type {
    VisualizationConfig,
    AudioAnalysisData,
    RenderFrame,
    VisualizationEngineProps
} from '../../types/visualization';
import * as effects from '../../../utils/effects';
import { FFT_SIZE, BEAT_COOLDOWN } from '../../../constants';
import { audioSourceManager } from '../../core/AudioSourceManager';

export interface VisualizationEngineHandle {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    getCanvas: () => HTMLCanvasElement | null;
    isPlaying: () => boolean;
    captureFrame: () => ImageData | null;
}

export const VisualizationEngine = forwardRef<VisualizationEngineHandle, VisualizationEngineProps>(
    ({ config, onFrame, onReady, onError, autoStart = false }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const animationFrameId = useRef<number | null>(null);
        const audioContextRef = useRef<AudioContext | null>(null);
        const analyserRef = useRef<AnalyserNode | null>(null);
        const sourceRef = useRef<AudioNode | null>(null);
        const isPlayingRef = useRef(false);
        const isPausedRef = useRef(false);
        const lastFrameTimeRef = useRef<number>(0);

        // Audio analysis state
        const smoothedAudioRef = useRef({ bass: 0, mids: 0, highs: 0, overall: 0 });
        const bassHistoryRef = useRef<number[]>([]);
        const midsHistoryRef = useRef<number[]>([]);
        const highsHistoryRef = useRef<number[]>([]);
        const lastBeatTimeRef = useRef({ bass: 0, mids: 0, treble: 0 });

        // Media state
        const currentMediaIndexRef = useRef(0);
        const previousMediaIndexRef = useRef(0);
        const transitionStartTimeRef = useRef(0);

        const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

        const calculateVariance = (arr: number[]): number => {
            if (arr.length < 2) return 0;
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            return arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
        };

        const analyzeAudio = useCallback((): AudioAnalysisData => {
            const analyser = analyserRef.current;
            if (!analyser) {
                return {
                    bass: 0, mids: 0, highs: 0, overall: 0,
                    isBassBeat: false, isMidsBeat: false, isTrebleBeat: false,
                    frequencyData: new Uint8Array(0),
                    waveformData: new Uint8Array(0)
                };
            }

            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            const waveformData = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(waveformData);

            // Calculate frequency bands
            const inst_bass = frequencyData.slice(1, 4).reduce((a, b) => a + b, 0) / (3 * 255);
            const inst_mids = frequencyData.slice(10, 30).reduce((a, b) => a + b, 0) / (20 * 255);
            const inst_highs = frequencyData.slice(50, 100).reduce((a, b) => a + b, 0) / (50 * 255);

            // Update history
            bassHistoryRef.current.push(inst_bass);
            if (bassHistoryRef.current.length > 120) bassHistoryRef.current.shift();
            midsHistoryRef.current.push(inst_mids);
            if (midsHistoryRef.current.length > 120) midsHistoryRef.current.shift();
            highsHistoryRef.current.push(inst_highs);
            if (highsHistoryRef.current.length > 120) highsHistoryRef.current.shift();

            // Calculate averages and variance
            const avg_bass = bassHistoryRef.current.reduce((a, b) => a + b, 0) / bassHistoryRef.current.length;
            const avg_mids = midsHistoryRef.current.reduce((a, b) => a + b, 0) / midsHistoryRef.current.length;
            const avg_highs = highsHistoryRef.current.reduce((a, b) => a + b, 0) / highsHistoryRef.current.length;

            const bassVariance = calculateVariance(bassHistoryRef.current);
            const midsVariance = calculateVariance(midsHistoryRef.current);

            // Dynamic adjustment for quiet sections
            const dynamic_inst_bass = bassVariance < 0.0005 ? inst_bass * 1.15 : inst_bass;
            const dynamic_inst_mids = midsVariance < 0.0005 ? inst_mids * 1.15 : inst_mids;

            // Beat detection
            const now = performance.now();
            const { bassSensitivity, midSensitivity, trebleSensitivity } = config.audioConfig;

            const bassBeatThreshold = 1.5 - (bassSensitivity * 0.8);
            const midsBeatThreshold = 1.5 - (midSensitivity * 0.8);
            const trebleBeatThreshold = 1.6 - (trebleSensitivity * 0.8);

            let isBassBeat = false, isMidsBeat = false, isTrebleBeat = false;

            if (dynamic_inst_bass > avg_bass * bassBeatThreshold && (now - lastBeatTimeRef.current.bass) > BEAT_COOLDOWN) {
                isBassBeat = true;
                lastBeatTimeRef.current.bass = now;
            }
            if (dynamic_inst_mids > avg_mids * midsBeatThreshold && (now - lastBeatTimeRef.current.mids) > BEAT_COOLDOWN) {
                isMidsBeat = true;
                lastBeatTimeRef.current.mids = now;
            }
            if (inst_highs > avg_highs * trebleBeatThreshold && (now - lastBeatTimeRef.current.treble) > BEAT_COOLDOWN) {
                isTrebleBeat = true;
                lastBeatTimeRef.current.treble = now;
            }

            // Apply dynamics and smoothing
            const { audioAttack, audioRelease, audioThreshold, audioPeakLimiter } = config.audioConfig;

            const applyDynamics = (value: number) => {
                const limited = Math.min(value, audioPeakLimiter);
                return limited < audioThreshold ? 0 : limited;
            };

            const dynamic = {
                bass: applyDynamics(inst_bass),
                mids: applyDynamics(inst_mids),
                highs: applyDynamics(inst_highs),
                overall: 0,
            };
            dynamic.overall = (dynamic.bass + dynamic.mids + dynamic.highs) / 3;

            // Smooth the values
            smoothedAudioRef.current = {
                bass: lerp(smoothedAudioRef.current.bass, dynamic.bass,
                    dynamic.bass > smoothedAudioRef.current.bass ? audioAttack : audioRelease),
                mids: lerp(smoothedAudioRef.current.mids, dynamic.mids,
                    dynamic.mids > smoothedAudioRef.current.mids ? audioAttack : audioRelease),
                highs: lerp(smoothedAudioRef.current.highs, dynamic.highs,
                    dynamic.highs > smoothedAudioRef.current.highs ? audioAttack : audioRelease),
                overall: lerp(smoothedAudioRef.current.overall, dynamic.overall,
                    dynamic.overall > smoothedAudioRef.current.overall ? audioAttack : audioRelease),
            };

            return {
                bass: smoothedAudioRef.current.bass * 255,
                mids: smoothedAudioRef.current.mids * 255,
                highs: smoothedAudioRef.current.highs * 255,
                overall: smoothedAudioRef.current.overall * 255,
                isBassBeat,
                isMidsBeat,
                isTrebleBeat,
                frequencyData,
                waveformData
            };
        }, [config.audioConfig]);

        const calculateEvolution = useCallback((time: number): number => {
            if (!config.evolutionConfig.enabled) return 0;

            let progress = 0;
            const { loopDuration, curveShape, randomization } = config.evolutionConfig;

            if (loopDuration > 0) {
                progress = ((time / 1000) / loopDuration) % 1;
            } else {
                // Use audio duration if available
                if (config.audioSource instanceof HTMLAudioElement) {
                    const duration = config.audioSource.duration;
                    if (duration && duration > 0) {
                        progress = config.audioSource.currentTime / duration;
                    }
                }
            }

            // Apply curve shape
            let evolutionFactor = 0;
            switch (curveShape) {
                case 'exponential':
                    evolutionFactor = progress * progress;
                    break;
                case 'logarithmic':
                    evolutionFactor = Math.sqrt(progress);
                    break;
                case 'bell':
                    evolutionFactor = Math.sin(progress * Math.PI);
                    break;
                case 'linear':
                default:
                    evolutionFactor = progress;
            }

            // Add randomization
            if (randomization > 0) {
                evolutionFactor += (Math.random() - 0.5) * randomization;
                evolutionFactor = Math.max(0, Math.min(1, evolutionFactor));
            }

            return evolutionFactor;
        }, [config.evolutionConfig, config.audioSource]);

        const animate = useCallback((time: number) => {
            if (!isPlayingRef.current || isPausedRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            const deltaTime = lastFrameTimeRef.current ? time - lastFrameTimeRef.current : 0;
            lastFrameTimeRef.current = time;

            // Analyze audio
            const audioData = analyzeAudio();

            // Calculate evolution
            const evolution = calculateEvolution(time);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Handle transitions
            const { transitionConfig, mediaElements } = config;
            const dynamicTransitionDuration = 200 + (1 - transitionConfig.temperature) * 1800;
            const transitionProgress = mediaElements.length > 1
                ? Math.min(1, (time - transitionStartTimeRef.current) / dynamicTransitionDuration)
                : 1;

            // Check for beat-triggered transitions
            if ((audioData.isBassBeat || audioData.isMidsBeat) &&
                transitionProgress >= 1 &&
                Math.random() < transitionConfig.frequency &&
                mediaElements.length > 1) {

                previousMediaIndexRef.current = currentMediaIndexRef.current;
                currentMediaIndexRef.current = (currentMediaIndexRef.current + 1) % mediaElements.length;
                transitionStartTimeRef.current = time;
            }

            // Draw current and previous media with transition
            const currentMedia = mediaElements[currentMediaIndexRef.current];
            const previousMedia = mediaElements[previousMediaIndexRef.current];

            if (currentMedia || previousMedia) {
                effects.drawMedia(
                    ctx, canvas, currentMedia, previousMedia,
                    transitionProgress,
                    {
                        bass: audioData.bass,
                        mids: audioData.mids,
                        highs: audioData.highs,
                        overall: audioData.overall,
                        isBassBeat: audioData.isBassBeat,
                        isMidsBeat: audioData.isMidsBeat,
                        isTrebleBeat: audioData.isTrebleBeat,
                        evolution
                    },
                    'center', 'center',
                    config.videoConfig.fitToWidth,
                    config.videoConfig.fitToHeight,
                    transitionConfig.type,
                    previousMediaIndexRef.current
                );
            }

            // Apply effects from layers
            config.effectsConfig.layers
                .filter(layer => !layer.isMuted)
                .forEach(layer => {
                    effects.applyLayerEffect(
                        ctx, canvas, layer,
                        config.effectsConfig.parameters,
                        {
                            bass: audioData.bass,
                            mids: audioData.mids,
                            highs: audioData.highs,
                            overall: audioData.overall,
                            isBassBeat: audioData.isBassBeat,
                            isMidsBeat: audioData.isMidsBeat,
                            isTrebleBeat: audioData.isTrebleBeat,
                            evolution
                        },
                        config.cosmicConfig?.astroData || null,
                        config.cosmicConfig?.influence || 0,
                        config.effectsConfig.visualComplexity
                    );
                });

            // Apply global intensity
            if (config.effectsConfig.globalIntensity !== 1.0) {
                effects.applyGlobalIntensity(ctx, canvas, config.effectsConfig.globalIntensity);
            }

            // Call frame callback if provided
            if (onFrame) {
                const frame: RenderFrame = {
                    canvas,
                    ctx,
                    audioData,
                    evolution,
                    time,
                    deltaTime
                };
                onFrame(frame);
            }

            animationFrameId.current = requestAnimationFrame(animate);
        }, [config, analyzeAudio, calculateEvolution, onFrame]);

        const setupAudio = useCallback(async () => {
            if (!config.audioSource) return;

            // Don't close the shared context, just disconnect our nodes
            if (sourceRef.current) {
                try {
                    sourceRef.current.disconnect();
                    sourceRef.current = null;
                } catch (e) {
                    console.warn('Error disconnecting source:', e);
                }
            }
            if (analyserRef.current) {
                try {
                    analyserRef.current.disconnect();
                    analyserRef.current = null;
                } catch (e) {
                    console.warn('Error disconnecting analyser:', e);
                }
            }

            try {
                console.log('[VisualizationEngine] Setting up audio...');

                // Use shared context from AudioSourceManager
                const context = audioSourceManager.getAudioContext();

                // Check if element already has our analyser
                if (config.audioSource instanceof HTMLAudioElement) {
                    const elementAny = config.audioSource as any;
                    if (elementAny._visualizationAnalyser &&
                        (elementAny._visualizationAnalyser as any).context === context) {
                        console.log('[VisualizationEngine] Reusing existing analyser from element');
                        analyserRef.current = elementAny._visualizationAnalyser;
                        audioContextRef.current = context;
                        sourceRef.current = elementAny._audioSourceNode || null;
                        if (onReady) onReady();
                        return;
                    }
                }

                const analyser = context.createAnalyser();
                analyser.fftSize = config.audioConfig.fftSize || FFT_SIZE;
                analyser.smoothingTimeConstant = config.audioConfig.smoothing || 0.8;

                let source: AudioNode;

                if (config.audioSource instanceof HTMLAudioElement) {
                    console.log('[VisualizationEngine] Creating MediaElementSource...');
                    try {
                        source = audioSourceManager.getOrCreateMediaElementSource(config.audioSource, context);
                        console.log('[VisualizationEngine] MediaElementSource created/retrieved');
                    } catch (err) {
                        console.error('[VisualizationEngine] Failed to get MediaElementSource:', err);
                        throw err;
                    }

                    // Check if already connected
                    const sourceAny = source as any;
                    if (!sourceAny._vizConnected) {
                        source.connect(analyser).connect(context.destination);
                        sourceAny._vizConnected = true;
                        (config.audioSource as any)._visualizationAnalyser = analyser;
                        console.log('[VisualizationEngine] Connected source to analyser');
                    } else {
                        console.log('[VisualizationEngine] Source already connected');
                    }
                } else if (config.audioSource instanceof MediaStream) {
                    source = context.createMediaStreamSource(config.audioSource);
                    source.connect(analyser);
                }

                audioContextRef.current = context;
                analyserRef.current = analyser;
                sourceRef.current = source!;

                console.log('[VisualizationEngine] Audio setup completed');
                if (onReady) onReady();
            } catch (error) {
                console.error('[VisualizationEngine] Audio setup error:', error);
                if (onError) onError(error as Error);
            }
        }, [config.audioSource, config.audioConfig, onReady, onError]);

        const start = useCallback(() => {
            if (isPlayingRef.current) return;

            isPlayingRef.current = true;
            isPausedRef.current = false;
            lastFrameTimeRef.current = performance.now();

            if (config.audioSource instanceof HTMLAudioElement) {
                config.audioSource.play().catch(console.error);
            }

            animationFrameId.current = requestAnimationFrame(animate);
        }, [config.audioSource, animate]);

        const stop = useCallback(() => {
            isPlayingRef.current = false;
            isPausedRef.current = false;

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }

            if (config.audioSource instanceof HTMLAudioElement) {
                config.audioSource.pause();
                config.audioSource.currentTime = 0;
            }
        }, [config.audioSource]);

        const pause = useCallback(() => {
            isPausedRef.current = true;

            if (config.audioSource instanceof HTMLAudioElement) {
                config.audioSource.pause();
            }
        }, [config.audioSource]);

        const resume = useCallback(() => {
            if (!isPlayingRef.current) return;

            isPausedRef.current = false;
            lastFrameTimeRef.current = performance.now();

            if (config.audioSource instanceof HTMLAudioElement) {
                config.audioSource.play().catch(console.error);
            }

            animationFrameId.current = requestAnimationFrame(animate);
        }, [config.audioSource, animate]);

        const getCanvas = useCallback(() => canvasRef.current, []);

        const isPlaying = useCallback(() => isPlayingRef.current && !isPausedRef.current, []);

        const captureFrame = useCallback(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return null;

            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }, []);

        useImperativeHandle(ref, () => ({
            start,
            stop,
            pause,
            resume,
            getCanvas,
            isPlaying,
            captureFrame
        }), [start, stop, pause, resume, getCanvas, isPlaying, captureFrame]);

        useEffect(() => {
            setupAudio();

            if (autoStart) {
                start();
            }

            return () => {
                stop();
                sourceRef.current?.disconnect();
                analyserRef.current?.disconnect();
                // Don't close the shared context, just cleanup our references
                audioContextRef.current = null;

                // Clean up the audio element using AudioSourceManager
                if (config.audioSource instanceof HTMLAudioElement) {
                    audioSourceManager.cleanupElement(config.audioSource);
                }
            };
        }, [setupAudio, autoStart, start, stop, config.audioSource]);

        return (
            <canvas
                ref={canvasRef}
                width={config.resolution.width}
                height={config.resolution.height}
                style={{
                    width: '100%',
                    height: '100%',
                    background: config.backgroundColor || 'black'
                }}
            />
        );
    }
);

VisualizationEngine.displayName = 'VisualizationEngine';