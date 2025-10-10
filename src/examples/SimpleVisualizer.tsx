import React, { useRef, useState, useCallback, useEffect } from 'react';
import { VisualizationEngine, VisualizationEngineHandle } from '../components/core/VisualizationEngine';
import { HeadlessRecorder, HeadlessRecorderHandle } from '../components/core/HeadlessRecorder';
import type { VisualizationConfig, RecordingConfig, MediaElement } from '../types/visualization';
import { RESOLUTIONS } from '../types/visualization';
import { FFT_SIZE } from '../../constants';
import { audioSourceManager } from '../core/AudioSourceManager';

interface SimpleVisualizerProps {
    mediaFiles?: File[];
    audioFile?: File;
    resolution?: '720p' | '1080p' | '480p';
    autoStart?: boolean;
    showControls?: boolean;
}

export const SimpleVisualizer: React.FC<SimpleVisualizerProps> = ({
    mediaFiles = [],
    audioFile,
    resolution = '720p',
    autoStart = false,
    showControls = true
}) => {
    const engineRef = useRef<VisualizationEngineHandle>(null);
    const recorderRef = useRef<HeadlessRecorderHandle>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaElements, setMediaElements] = useState<MediaElement[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Ready');
    const [frameCount, setFrameCount] = useState(0);

    // Convert files to media elements
    useEffect(() => {
        const loadMedia = async () => {
            const elements: MediaElement[] = [];

            for (const file of mediaFiles) {
                const url = URL.createObjectURL(file);
                const type = file.type.startsWith('image/') ? 'image' : 'video';

                if (type === 'image') {
                    const img = new Image();
                    img.src = url;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                    });
                    elements.push(img);
                } else {
                    const video = document.createElement('video');
                    video.src = url;
                    video.muted = true;
                    video.loop = true;
                    await new Promise((resolve) => {
                        video.onloadedmetadata = resolve;
                    });
                    elements.push(video);
                }
            }

            setMediaElements(elements);
        };

        if (mediaFiles.length > 0) {
            loadMedia();
        }

        return () => {
            // Cleanup URLs
            mediaElements.forEach(el => {
                if ('src' in el && el.src.startsWith('blob:')) {
                    URL.revokeObjectURL(el.src);
                }
            });
        };
    }, [mediaFiles]);

    // Setup audio
    useEffect(() => {
        // Clean up previous audio element
        if (audioElementRef.current) {
            const prevAudio = audioElementRef.current;
            prevAudio.pause();
            prevAudio.src = '';
            // Clean up using AudioSourceManager
            audioSourceManager.cleanupElement(prevAudio);
            audioElementRef.current = null;
        }

        if (audioFile) {
            const url = URL.createObjectURL(audioFile);
            setAudioUrl(url);

            const audio = new Audio(url);
            audio.crossOrigin = 'anonymous';
            audioElementRef.current = audio;

            return () => {
                URL.revokeObjectURL(url);
                audio.pause();
                audio.src = '';
                // Clean up using AudioSourceManager
                audioSourceManager.cleanupElement(audio);
                audioElementRef.current = null;
            };
        }
    }, [audioFile]);

    // Create visualization configuration
    const createConfig = useCallback((): VisualizationConfig => {
        const res = RESOLUTIONS[resolution];

        return {
            resolution: res,
            framerate: 60,
            backgroundColor: '#000000',
            mediaElements: mediaElements,
            audioSource: audioElementRef.current,

            audioConfig: {
                fftSize: FFT_SIZE,
                bassSensitivity: 0.7,
                midSensitivity: 0.6,
                trebleSensitivity: 0.5,
                audioAttack: 0.8,
                audioRelease: 0.7,
                audioThreshold: 0.05,
                audioPeakLimiter: 0.95,
                smoothing: 0.8
            },

            effectsConfig: {
                layers: [
                    {
                        id: 'bloom',
                        name: 'Bloom',
                        effectType: 'bloom',
                        triggerSource: 'audio_bass_beat',
                        blendMode: 'screen',
                        opacity: 0.8,
                        isSolo: false,
                        isMuted: false
                    },
                    {
                        id: 'rgb',
                        name: 'RGB Shift',
                        effectType: 'rgb_shift',
                        triggerSource: 'audio_mids_beat',
                        blendMode: 'normal',
                        opacity: 0.6,
                        isSolo: false,
                        isMuted: false
                    }
                ],
                parameters: {
                    grid: { size: 50, lineWidth: 2 },
                    glitch_slice: { intensity: 0.5, amount: 5, type: 'slice', direction: 'horizontal' },
                    pixelate: { blockSize: 10 },
                    rgb_shift: { intensity: 0.7, amount: 20, frequency: 'mids' },
                    kaleidoscope: { segments: 6, rotationSpeed: 0.5 },
                    bloom: { intensity: 1.2, blurSize: 30 },
                    color_grading: { hue: 0, saturation: 1, contrast: 1 },
                    liquid_dream: { intensity: 10, speed: 1, grain: 0.1 }
                },
                globalIntensity: 1.0,
                visualComplexity: 0.5
            },

            transitionConfig: {
                type: 'cross-dissolve',
                temperature: 0.5,
                frequency: 0.15,
                duration: 1000
            },

            evolutionConfig: {
                enabled: true,
                curveShape: 'linear',
                loopDuration: 0,
                randomization: 0.1
            },

            modulationConfig: {
                lfo: {
                    id: 'lfo1',
                    shape: 'sine',
                    rate: 0.5,
                    amount: 0.3,
                    target: 'globalIntensity'
                },
                envelopeFollower: {
                    id: 'env1',
                    source: 'bass',
                    amount: 0.4,
                    target: 'visualComplexity'
                }
            },

            videoConfig: {
                enabled: true,
                playbackSpeed: 1.0,
                reversed: false,
                fitToWidth: false,
                fitToHeight: false
            },

            colorConfig: {
                palette: 'default',
                customColors: []
            }
        };
    }, [mediaElements, resolution]);

    // Create recording configuration
    const createRecordingConfig = useCallback((): RecordingConfig => {
        const res = RESOLUTIONS[resolution];

        return {
            resolution: res,
            framerate: 30,
            format: 'video/webm; codecs=vp9,opus',
            quality: 5, // 5 Mbps
            includeAudio: true
        };
    }, [resolution]);

    const handleStart = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.start();
            setIsPlaying(true);
            setStatus('Playing');
        }
    }, []);

    const handleStop = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.stop();
            setIsPlaying(false);
            setStatus('Stopped');
            setFrameCount(0);
        }
    }, []);

    const handleStartRecording = useCallback(async () => {
        if (!recorderRef.current || !engineRef.current) return;

        const canvas = engineRef.current.getCanvas();
        if (!canvas) {
            setStatus('Error: Canvas not available');
            return;
        }

        try {
            await recorderRef.current.startRecording();
            setIsRecording(true);
            setStatus('Recording...');
        } catch (error) {
            setStatus(`Recording error: ${error}`);
        }
    }, []);

    const handleStopRecording = useCallback(async () => {
        if (!recorderRef.current) return;

        try {
            const blob = await recorderRef.current.stopRecording();
            setIsRecording(false);

            if (blob) {
                recorderRef.current.downloadRecording(`visualizer-${resolution}-${Date.now()}`);
                setStatus('Recording saved');
            } else {
                setStatus('Recording failed - no data');
            }
        } catch (error) {
            setStatus(`Error stopping recording: ${error}`);
        }
    }, [resolution]);

    // Frame callback to track performance
    const handleFrame = useCallback(() => {
        setFrameCount(prev => prev + 1);
    }, []);

    // Display FPS
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setStatus(`Playing - ${frameCount} FPS`);
            setFrameCount(0);
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, frameCount]);

    // Check if ready
    const isReady = mediaElements.length > 0 && audioUrl !== null;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {showControls && (
                <div style={{
                    padding: '20px',
                    background: '#1a1a1a',
                    color: 'white',
                    borderBottom: '1px solid #333'
                }}>
                    <h2>Simple Visualizer Example ({resolution})</h2>

                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleStart}
                            disabled={!isReady || isPlaying}
                            style={{
                                padding: '10px 20px',
                                background: isReady && !isPlaying ? '#4CAF50' : '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: isReady && !isPlaying ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Start
                        </button>

                        <button
                            onClick={handleStop}
                            disabled={!isPlaying}
                            style={{
                                padding: '10px 20px',
                                background: isPlaying ? '#f44336' : '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: isPlaying ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Stop
                        </button>

                        <button
                            onClick={handleStartRecording}
                            disabled={!isPlaying || isRecording}
                            style={{
                                padding: '10px 20px',
                                background: isPlaying && !isRecording ? '#FF9800' : '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: isPlaying && !isRecording ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Start Recording
                        </button>

                        <button
                            onClick={handleStopRecording}
                            disabled={!isRecording}
                            style={{
                                padding: '10px 20px',
                                background: isRecording ? '#FF5722' : '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: isRecording ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Stop Recording
                        </button>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '14px' }}>
                        Status: {status} |
                        Media: {mediaElements.length} files |
                        Audio: {audioUrl ? 'Loaded' : 'None'}
                    </div>
                </div>
            )}

            <div
                ref={canvasContainerRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    overflow: 'hidden'
                }}
            >
                {isReady && (
                    <>
                        <VisualizationEngine
                            ref={engineRef}
                            config={createConfig()}
                            onFrame={handleFrame}
                            onReady={() => setStatus('Engine ready')}
                            onError={(error) => setStatus(`Error: ${error.message}`)}
                            autoStart={autoStart}
                        />

                        {/* Headless recorder - no visual component */}
                        {engineRef.current && (
                            <HeadlessRecorder
                                ref={recorderRef}
                                canvas={engineRef.current.getCanvas()!}
                                audioSource={audioElementRef.current}
                                config={createRecordingConfig()}
                                onStart={() => console.log('Recording started')}
                                onStop={(blob) => console.log('Recording stopped, blob size:', blob.size)}
                                onError={(error) => console.error('Recording error:', error)}
                            />
                        )}
                    </>
                )}

                {!isReady && (
                    <div style={{ color: '#666', textAlign: 'center' }}>
                        <p>No media loaded</p>
                        <p>Please provide media files and audio to start</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Example usage with standalone functions
export function createSimpleVisualizer720p(
    container: HTMLElement,
    mediaFiles: File[],
    audioFile: File
) {
    // This function demonstrates how to use the components programmatically
    // without React (using the standalone recorder)

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    container.appendChild(canvas);

    // Setup would continue here with the standalone recorder
    // This is just a placeholder for the concept

    return {
        start: () => console.log('Starting visualizer'),
        stop: () => console.log('Stopping visualizer'),
        record: () => console.log('Starting recording')
    };
}