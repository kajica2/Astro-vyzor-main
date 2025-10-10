import type { EffectPreset, AudioProfile } from '../types';
import { FFT_SIZE } from '../constants';

const ANALYSIS_DURATION_S = 15;
const BEAT_COOLDOWN_MS = 300; 

export const analyzeAudio = (audioFile: File): Promise<AudioProfile> => {
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const fileReader = new FileReader();

        fileReader.onload = async (event) => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                // Use an OfflineAudioContext to process without playback
                const offlineContext = new OfflineAudioContext(
                    audioBuffer.numberOfChannels,
                    audioContext.sampleRate * Math.min(ANALYSIS_DURATION_S, audioBuffer.duration),
                    audioContext.sampleRate
                );
                const offlineSource = offlineContext.createBufferSource();
                offlineSource.buffer = audioBuffer;
                const offlineAnalyser = offlineContext.createAnalyser();
                offlineAnalyser.fftSize = FFT_SIZE;
                offlineSource.connect(offlineAnalyser);
                offlineSource.start(0);

                const renderedBuffer = await offlineContext.startRendering();
                const channelData = renderedBuffer.getChannelData(0);
                
                let energySum = 0;
                const beats: number[] = [];
                let lastBeatTime = -BEAT_COOLDOWN_MS;
                const historySize = 120;
                const energyHistory: number[] = [];
                const samplesPerFrame = 1024;

                for (let i = 0; i < channelData.length; i += samplesPerFrame) {
                    const chunk = channelData.slice(i, i + samplesPerFrame);
                    const instantEnergy = chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length;
                    energySum += instantEnergy;
                    
                    const avgEnergy = energyHistory.length > 0 ? energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length : 0;
                    if (instantEnergy > avgEnergy * 1.8 && (i / audioContext.sampleRate * 1000 - lastBeatTime) > BEAT_COOLDOWN_MS) {
                        beats.push(i / audioContext.sampleRate);
                        lastBeatTime = i / audioContext.sampleRate * 1000;
                    }
                    energyHistory.push(instantEnergy);
                    if (energyHistory.length > historySize) energyHistory.shift();
                }

                const numFrames = Math.ceil(channelData.length / samplesPerFrame);
                const avgEnergy = Math.sqrt(energySum / numFrames);
                const bpm = (beats.length / Math.min(ANALYSIS_DURATION_S, audioBuffer.duration)) * 60;
                
                const profile: AudioProfile = {
                    energy: avgEnergy > 0.1 ? 'high' : avgEnergy > 0.04 ? 'medium' : 'low',
                    tempo: bpm > 140 ? 'fast' : bpm > 90 ? 'medium' : 'slow',
                    character: avgEnergy > 0.08 && bpm > 120 ? 'rhythmic' : beats.length < 5 ? 'atmospheric' : 'melodic',
                };
                
                resolve(profile);

            } catch (e) {
                reject(e);
            } finally {
                audioContext.close();
            }
        };

        fileReader.onerror = (e) => reject(e);
        fileReader.readAsArrayBuffer(audioFile);
    });
};


export const findBestMatches = (profile: AudioProfile, presets: EffectPreset[]): EffectPreset[] => {
    const scoredPresets = presets.map(preset => {
        let score = 0;
        if (!preset.tags) return { preset, score: 0 };
        if (preset.tags.energy === profile.energy) score += 3;
        if (preset.tags.tempo === profile.tempo) score += 3;
        if (preset.tags.character === profile.character) score += 2;
        
        // Partial matches
        if (profile.energy === 'medium' && (preset.tags.energy === 'low' || preset.tags.energy === 'high')) score += 1;
        if (profile.tempo === 'medium' && (preset.tags.tempo === 'slow' || preset.tags.tempo === 'fast')) score += 1;
        
        return { preset, score };
    });

    scoredPresets.sort((a, b) => b.score - a.score);
    
    // Ensure we don't return duplicates or undefined presets
    const topPresets = scoredPresets.slice(0, 5).map(p => p.preset).filter(Boolean);

    // If we have less than 2 suggestions, fill with random presets
    if (topPresets.length < 2 && presets.length >= 2) {
        const existingIds = new Set(topPresets.map(p => p.id));
        while (topPresets.length < 2) {
            const randomPreset = presets[Math.floor(Math.random() * presets.length)];
            if (!existingIds.has(randomPreset.id)) {
                topPresets.push(randomPreset);
                existingIds.add(randomPreset.id);
            }
        }
    }
    
    return topPresets;
};
