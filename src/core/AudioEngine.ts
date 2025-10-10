/**
 * AudioEngine - Modular audio processing system with pluggable strategies
 * Supports various analysis algorithms, beat detection, and audio effects
 */

import { EventBus, globalEventBus } from './EventBus';
import { DependencyContainer } from './DependencyContainer';
import { audioSourceManager } from './AudioSourceManager';

export interface AudioAnalysisData {
    bass: number;
    mids: number;
    highs: number;
    overall: number;
    frequencyData: Float32Array;
    timeDomainData: Float32Array;
    bpm?: number;
    beatConfidence?: number;
    spectralCentroid?: number;
    spectralRolloff?: number;
    zeroCrossingRate?: number;
    energy?: number;
    rms?: number;
    peak?: number;
}

export interface BeatEvent {
    type: 'bass' | 'mids' | 'highs' | 'overall';
    strength: number;
    timestamp: number;
    confidence: number;
}

export interface AudioConfig {
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
    bassSensitivity?: number;
    midSensitivity?: number;
    trebleSensitivity?: number;
    beatThreshold?: number;
    beatDecay?: number;
    beatMinTime?: number;
}

// Analysis Strategy Interface
export interface AnalysisStrategy {
    name: string;
    analyze(analyser: AnalyserNode, config: AudioConfig): AudioAnalysisData;
    reset(): void;
}

// Beat Detection Strategy Interface
export interface BeatDetectionStrategy {
    name: string;
    detect(analysisData: AudioAnalysisData, config: AudioConfig): BeatEvent[];
    reset(): void;
}

// Audio Effect Strategy Interface
export interface AudioEffectStrategy {
    name: string;
    connect(context: AudioContext, source: AudioNode): AudioNode;
    disconnect(): void;
    setParameter(param: string, value: any): void;
    getParameters(): Record<string, any>;
}

// Built-in Strategies

export class StandardAnalysisStrategy implements AnalysisStrategy {
    name = 'standard';
    private frequencyData: Float32Array | null = null;
    private timeDomainData: Float32Array | null = null;

    analyze(analyser: AnalyserNode, config: AudioConfig): AudioAnalysisData {
        const bufferLength = analyser.frequencyBinCount;

        // Initialize buffers if needed
        if (!this.frequencyData || this.frequencyData.length !== bufferLength) {
            this.frequencyData = new Float32Array(bufferLength);
            this.timeDomainData = new Float32Array(analyser.fftSize);
        }

        // Get frequency data
        analyser.getFloatFrequencyData(this.frequencyData);
        analyser.getFloatTimeDomainData(this.timeDomainData);

        // Calculate frequency bands
        const nyquist = analyser.context.sampleRate / 2;
        const bassEnd = Math.floor((250 / nyquist) * bufferLength);
        const midsEnd = Math.floor((2000 / nyquist) * bufferLength);

        let bass = 0, mids = 0, highs = 0, overall = 0;

        // Calculate band energies
        for (let i = 0; i < bufferLength; i++) {
            const value = Math.pow(10, this.frequencyData[i] / 20);

            if (i < bassEnd) {
                bass += value;
            } else if (i < midsEnd) {
                mids += value;
            } else {
                highs += value;
            }
            overall += value;
        }

        // Normalize
        bass = Math.min(1, bass / bassEnd);
        mids = Math.min(1, mids / (midsEnd - bassEnd));
        highs = Math.min(1, highs / (bufferLength - midsEnd));
        overall = Math.min(1, overall / bufferLength);

        // Calculate RMS
        let rms = 0;
        for (let i = 0; i < this.timeDomainData.length; i++) {
            rms += this.timeDomainData[i] * this.timeDomainData[i];
        }
        rms = Math.sqrt(rms / this.timeDomainData.length);

        return {
            bass,
            mids,
            highs,
            overall,
            frequencyData: this.frequencyData,
            timeDomainData: this.timeDomainData,
            rms,
            energy: overall
        };
    }

    reset(): void {
        this.frequencyData = null;
        this.timeDomainData = null;
    }
}

export class AdvancedAnalysisStrategy implements AnalysisStrategy {
    name = 'advanced';
    private frequencyData: Float32Array | null = null;
    private timeDomainData: Float32Array | null = null;
    private previousSpectrum: Float32Array | null = null;

    analyze(analyser: AnalyserNode, config: AudioConfig): AudioAnalysisData {
        const bufferLength = analyser.frequencyBinCount;

        // Initialize buffers
        if (!this.frequencyData || this.frequencyData.length !== bufferLength) {
            this.frequencyData = new Float32Array(bufferLength);
            this.timeDomainData = new Float32Array(analyser.fftSize);
            this.previousSpectrum = new Float32Array(bufferLength);
        }

        // Get data
        analyser.getFloatFrequencyData(this.frequencyData);
        analyser.getFloatTimeDomainData(this.timeDomainData);

        // Standard band analysis
        const nyquist = analyser.context.sampleRate / 2;
        const bassEnd = Math.floor((250 / nyquist) * bufferLength);
        const midsEnd = Math.floor((2000 / nyquist) * bufferLength);

        let bass = 0, mids = 0, highs = 0, overall = 0;
        let spectralCentroid = 0;
        let magnitudeSum = 0;

        for (let i = 0; i < bufferLength; i++) {
            const value = Math.pow(10, this.frequencyData[i] / 20);
            const frequency = (i * nyquist) / bufferLength;

            if (i < bassEnd) {
                bass += value;
            } else if (i < midsEnd) {
                mids += value;
            } else {
                highs += value;
            }
            overall += value;

            // For spectral centroid
            spectralCentroid += frequency * value;
            magnitudeSum += value;
        }

        // Normalize bands
        bass = Math.min(1, bass / bassEnd);
        mids = Math.min(1, mids / (midsEnd - bassEnd));
        highs = Math.min(1, highs / (bufferLength - midsEnd));
        overall = Math.min(1, overall / bufferLength);

        // Calculate spectral centroid
        if (magnitudeSum > 0) {
            spectralCentroid /= magnitudeSum;
        }

        // Calculate spectral rolloff (frequency below which 85% of energy is contained)
        let cumulativeEnergy = 0;
        const targetEnergy = magnitudeSum * 0.85;
        let spectralRolloff = nyquist;

        for (let i = 0; i < bufferLength; i++) {
            cumulativeEnergy += Math.pow(10, this.frequencyData[i] / 20);
            if (cumulativeEnergy >= targetEnergy) {
                spectralRolloff = (i * nyquist) / bufferLength;
                break;
            }
        }

        // Calculate zero crossing rate
        let zeroCrossingRate = 0;
        for (let i = 1; i < this.timeDomainData.length; i++) {
            if ((this.timeDomainData[i] > 0) !== (this.timeDomainData[i - 1] > 0)) {
                zeroCrossingRate++;
            }
        }
        zeroCrossingRate /= this.timeDomainData.length;

        // Calculate RMS and peak
        let rms = 0;
        let peak = 0;
        for (let i = 0; i < this.timeDomainData.length; i++) {
            const abs = Math.abs(this.timeDomainData[i]);
            rms += this.timeDomainData[i] * this.timeDomainData[i];
            peak = Math.max(peak, abs);
        }
        rms = Math.sqrt(rms / this.timeDomainData.length);

        // Store current spectrum for next frame
        this.previousSpectrum.set(this.frequencyData);

        return {
            bass,
            mids,
            highs,
            overall,
            frequencyData: this.frequencyData,
            timeDomainData: this.timeDomainData,
            spectralCentroid,
            spectralRolloff,
            zeroCrossingRate,
            rms,
            peak,
            energy: overall
        };
    }

    reset(): void {
        this.frequencyData = null;
        this.timeDomainData = null;
        this.previousSpectrum = null;
    }
}

export class SimpleBeatDetectionStrategy implements BeatDetectionStrategy {
    name = 'simple';
    private lastBeatTime: Record<string, number> = {};
    private beatHistory: Record<string, number[]> = {
        bass: [],
        mids: [],
        highs: [],
        overall: []
    };
    private readonly historySize = 30;

    detect(analysisData: AudioAnalysisData, config: AudioConfig): BeatEvent[] {
        const beats: BeatEvent[] = [];
        const now = performance.now();
        const minTime = config.beatMinTime || 100;
        const threshold = config.beatThreshold || 0.3;

        // Check each frequency band
        const bands: Array<{ type: keyof typeof this.beatHistory; value: number; sensitivity: number }> = [
            { type: 'bass', value: analysisData.bass, sensitivity: config.bassSensitivity || 0.8 },
            { type: 'mids', value: analysisData.mids, sensitivity: config.midSensitivity || 0.7 },
            { type: 'highs', value: analysisData.highs, sensitivity: config.trebleSensitivity || 0.6 },
            { type: 'overall', value: analysisData.overall, sensitivity: 0.75 }
        ];

        for (const band of bands) {
            // Update history
            this.beatHistory[band.type].push(band.value);
            if (this.beatHistory[band.type].length > this.historySize) {
                this.beatHistory[band.type].shift();
            }

            // Calculate average
            const history = this.beatHistory[band.type];
            if (history.length < 5) continue;

            const average = history.reduce((a, b) => a + b, 0) / history.length;
            const variance = history.reduce((a, b) => a + Math.pow(b - average, 2), 0) / history.length;
            const dynamicThreshold = average + Math.sqrt(variance) * band.sensitivity;

            // Check for beat
            if (band.value > dynamicThreshold && band.value > threshold) {
                const lastTime = this.lastBeatTime[band.type] || 0;
                if (now - lastTime > minTime) {
                    beats.push({
                        type: band.type as any,
                        strength: Math.min(1, (band.value - average) / (1 - average)),
                        timestamp: now,
                        confidence: Math.min(1, variance * 2)
                    });
                    this.lastBeatTime[band.type] = now;
                }
            }
        }

        return beats;
    }

    reset(): void {
        this.lastBeatTime = {};
        this.beatHistory = {
            bass: [],
            mids: [],
            highs: [],
            overall: []
        };
    }
}

// Main AudioEngine class
export class AudioEngine {
    private context: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
    private gainNode: GainNode | null = null;

    private analysisStrategy: AnalysisStrategy;
    private beatStrategy: BeatDetectionStrategy;
    private effectStrategies: Map<string, AudioEffectStrategy> = new Map();
    private effectChain: AudioNode[] = [];

    private config: AudioConfig;
    private eventBus: EventBus;
    private container?: DependencyContainer;

    private isInitialized = false;
    private isAnalyzing = false;
    private animationFrameId: number | null = null;

    constructor(
        config: AudioConfig = {},
        eventBus: EventBus = globalEventBus,
        container?: DependencyContainer
    ) {
        this.config = {
            fftSize: config.fftSize || 2048,
            smoothingTimeConstant: config.smoothingTimeConstant || 0.8,
            minDecibels: config.minDecibels || -100,
            maxDecibels: config.maxDecibels || -30,
            bassSensitivity: config.bassSensitivity || 0.8,
            midSensitivity: config.midSensitivity || 0.7,
            trebleSensitivity: config.trebleSensitivity || 0.6,
            beatThreshold: config.beatThreshold || 0.3,
            beatDecay: config.beatDecay || 0.98,
            beatMinTime: config.beatMinTime || 100,
            ...config
        };

        this.eventBus = eventBus;
        this.container = container;

        // Default strategies
        this.analysisStrategy = new StandardAnalysisStrategy();
        this.beatStrategy = new SimpleBeatDetectionStrategy();
    }

    /**
     * Initialize audio context and analyser
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create analyser node
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = this.config.fftSize!;
            this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant!;
            this.analyser.minDecibels = this.config.minDecibels!;
            this.analyser.maxDecibels = this.config.maxDecibels!;

            // Create gain node
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination);

            this.isInitialized = true;
            this.eventBus.emit('audio:ready', { context: this.context });
        } catch (error) {
            this.eventBus.emit('audio:error', error as Error);
            throw error;
        }
    }

    /**
     * Connect audio source
     */
    async connectSource(source: HTMLMediaElement | MediaStream): Promise<void> {
        if (!this.context || !this.analyser || !this.gainNode) {
            await this.initialize();
        }

        // Disconnect existing source
        if (this.source) {
            this.source.disconnect();
        }

        try {
            // Create source node
            if (source instanceof HTMLMediaElement) {
                this.source = audioSourceManager.getOrCreateMediaElementSource(source, this.context!);
            } else {
                this.source = this.context!.createMediaStreamSource(source);
            }

            if (this.source) {
                // Rebuild audio chain
                this.rebuildAudioChain();
            }
        } catch (error) {
            this.eventBus.emit('audio:error', error as Error);
            throw error;
        }
    }

    /**
     * Disconnect audio source
     */
    disconnectSource(): void {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
    }

    /**
     * Set analysis strategy
     */
    setAnalysisStrategy(strategy: AnalysisStrategy): void {
        this.analysisStrategy = strategy;
        strategy.reset();
    }

    /**
     * Set beat detection strategy
     */
    setBeatDetectionStrategy(strategy: BeatDetectionStrategy): void {
        this.beatStrategy = strategy;
        strategy.reset();
    }

    /**
     * Add audio effect
     */
    addEffect(effect: AudioEffectStrategy): void {
        this.effectStrategies.set(effect.name, effect);
        this.rebuildAudioChain();
    }

    /**
     * Remove audio effect
     */
    removeEffect(name: string): void {
        const effect = this.effectStrategies.get(name);
        if (effect) {
            effect.disconnect();
            this.effectStrategies.delete(name);
            this.rebuildAudioChain();
        }
    }

    /**
     * Start analysis
     */
    start(): void {
        if (!this.isInitialized || this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.analyze();
    }

    /**
     * Stop analysis
     */
    stop(): void {
        this.isAnalyzing = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Get current analysis data
     */
    getAnalysisData(): AudioAnalysisData | null {
        if (!this.analyser) return null;

        return this.analysisStrategy.analyze(this.analyser, this.config);
    }

    /**
     * Set master volume
     */
    setVolume(volume: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AudioConfig>): void {
        this.config = { ...this.config, ...config };

        if (this.analyser) {
            if (config.fftSize !== undefined) {
                this.analyser.fftSize = config.fftSize;
            }
            if (config.smoothingTimeConstant !== undefined) {
                this.analyser.smoothingTimeConstant = config.smoothingTimeConstant;
            }
            if (config.minDecibels !== undefined) {
                this.analyser.minDecibels = config.minDecibels;
            }
            if (config.maxDecibels !== undefined) {
                this.analyser.maxDecibels = config.maxDecibels;
            }
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.stop();
        this.disconnectSource();

        // Disconnect all effects
        for (const effect of this.effectStrategies.values()) {
            effect.disconnect();
        }
        this.effectStrategies.clear();

        if (this.context && this.context.state !== 'closed') {
            this.context.close();
        }

        this.context = null;
        this.analyser = null;
        this.gainNode = null;
        this.isInitialized = false;
    }

    /**
     * Main analysis loop
     */
    private analyze = (): void => {
        if (!this.isAnalyzing || !this.analyser) return;

        // Get analysis data
        const analysisData = this.analysisStrategy.analyze(this.analyser, this.config);

        // Detect beats
        const beats = this.beatStrategy.detect(analysisData, this.config);

        // Emit events
        this.eventBus.emit('audio:analysis', analysisData);

        for (const beat of beats) {
            this.eventBus.emit('audio:beat', beat);
        }

        // Continue analysis
        this.animationFrameId = requestAnimationFrame(this.analyze);
    };

    /**
     * Rebuild audio chain
     */
    private rebuildAudioChain(): void {
        if (!this.source || !this.analyser || !this.gainNode) return;

        // Disconnect everything
        this.source.disconnect();
        this.analyser.disconnect();
        for (const node of this.effectChain) {
            node.disconnect();
        }

        // Clear effect chain
        this.effectChain = [];

        // Build new chain
        let currentNode: AudioNode = this.source;

        // Add effects
        for (const effect of this.effectStrategies.values()) {
            const effectNode = effect.connect(this.context!, currentNode);
            this.effectChain.push(effectNode);
            currentNode = effectNode;
        }

        // Connect to analyser
        currentNode.connect(this.analyser);

        // Connect to output
        currentNode.connect(this.gainNode);
    }
}

// Global audio engine instance
export const globalAudioEngine = new AudioEngine();