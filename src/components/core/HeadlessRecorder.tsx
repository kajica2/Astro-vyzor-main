import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { RecorderProps, RecordingConfig } from '../../types/visualization';

export interface HeadlessRecorderHandle {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    isRecording: () => boolean;
    getRecordedBlob: () => Blob | null;
    downloadRecording: (filename?: string) => void;
}

export const HeadlessRecorder = forwardRef<HeadlessRecorderHandle, RecorderProps>(
    ({ canvas, audioSource, config, onStart, onStop, onError }, ref) => {
        const recorderRef = useRef<MediaRecorder | null>(null);
        const recordedChunksRef = useRef<Blob[]>([]);
        const recordedBlobRef = useRef<Blob | null>(null);
        const isRecordingRef = useRef(false);

        // Supported recording formats with fallbacks
        const getOptimalFormat = useCallback((): string => {
            const formats = [
                'video/webm; codecs=vp9,opus',
                'video/webm; codecs=vp8,opus',
                'video/webm; codecs=vp9',
                'video/webm; codecs=vp8',
                'video/webm',
                'video/mp4; codecs=avc1.4d401e,mp4a.40.2',
                'video/mp4'
            ];

            if (config.format && MediaRecorder.isTypeSupported(config.format)) {
                return config.format;
            }

            for (const format of formats) {
                if (MediaRecorder.isTypeSupported(format)) {
                    return format;
                }
            }

            return 'video/webm'; // Default fallback
        }, [config.format]);

        const createRecordingStream = useCallback(async (): Promise<MediaStream | null> => {
            try {
                // Create video stream from canvas
                const videoStream = canvas.captureStream(config.framerate);

                // If no audio is needed, return video-only stream
                if (!config.includeAudio || !audioSource) {
                    return videoStream;
                }

                // Create audio stream
                let audioStream: MediaStream | null = null;

                if (audioSource instanceof MediaStream) {
                    audioStream = new MediaStream(audioSource.getAudioTracks());
                } else if (audioSource instanceof HTMLAudioElement) {
                    // Try different methods for capturing audio from HTML audio element
                    const audioElement = audioSource as any;

                    if (typeof audioElement.captureStream === 'function') {
                        audioStream = audioElement.captureStream();
                    } else if (typeof audioElement.mozCaptureStream === 'function') {
                        audioStream = audioElement.mozCaptureStream();
                    } else {
                        // Fallback: Try to create audio context and capture from there
                        try {
                            const audioContext = new AudioContext();
                            const source = audioContext.createMediaElementSource(audioSource);
                            const destination = audioContext.createMediaStreamDestination();
                            source.connect(destination);
                            source.connect(audioContext.destination);
                            audioStream = destination.stream;
                        } catch (err) {
                            console.warn('Could not capture audio from HTML audio element', err);
                        }
                    }
                }

                // Combine video and audio streams
                if (audioStream && audioStream.getAudioTracks().length > 0) {
                    const combinedStream = new MediaStream([
                        ...videoStream.getVideoTracks(),
                        ...audioStream.getAudioTracks()
                    ]);
                    return combinedStream;
                }

                // Return video-only stream if audio capture failed
                return videoStream;
            } catch (error) {
                if (onError) onError(error as Error);
                return null;
            }
        }, [canvas, audioSource, config, onError]);

        const startRecording = useCallback(async (): Promise<void> => {
            if (isRecordingRef.current) {
                console.warn('Recording already in progress');
                return;
            }

            try {
                const stream = await createRecordingStream();
                if (!stream) {
                    throw new Error('Failed to create recording stream');
                }

                const format = getOptimalFormat();
                const options: MediaRecorderOptions = {
                    mimeType: format
                };

                // Add bitrate settings if quality is specified
                if (config.quality) {
                    const bitrate = config.quality * 1000000; // Convert Mbps to bps
                    options.videoBitsPerSecond = bitrate;
                    if (config.includeAudio) {
                        options.audioBitsPerSecond = 128000; // 128 kbps for audio
                    }
                }

                const recorder = new MediaRecorder(stream, options);

                recordedChunksRef.current = [];
                recordedBlobRef.current = null;

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const blob = new Blob(recordedChunksRef.current, { type: format });
                    recordedBlobRef.current = blob;

                    if (onStop) {
                        onStop(blob);
                    }
                };

                recorder.onerror = (event) => {
                    const error = new Error(`Recording error: ${event}`);
                    if (onError) onError(error);
                };

                recorder.start(1000); // Collect data every second
                recorderRef.current = recorder;
                isRecordingRef.current = true;

                if (onStart) onStart();
            } catch (error) {
                if (onError) onError(error as Error);
                throw error;
            }
        }, [createRecordingStream, getOptimalFormat, config, onStart, onStop, onError]);

        const stopRecording = useCallback(async (): Promise<Blob | null> => {
            if (!isRecordingRef.current || !recorderRef.current) {
                console.warn('No recording in progress');
                return null;
            }

            return new Promise((resolve) => {
                const recorder = recorderRef.current;
                if (!recorder) {
                    resolve(null);
                    return;
                }

                // Set up a one-time listener for when recording stops
                recorder.onstop = () => {
                    const format = getOptimalFormat();
                    const blob = new Blob(recordedChunksRef.current, { type: format });
                    recordedBlobRef.current = blob;

                    if (onStop) {
                        onStop(blob);
                    }

                    resolve(blob);
                };

                if (recorder.state === 'recording') {
                    recorder.stop();
                } else if (recorder.state === 'paused') {
                    recorder.resume();
                    recorder.stop();
                }

                isRecordingRef.current = false;
                recorderRef.current = null;
            });
        }, [getOptimalFormat, onStop]);

        const pauseRecording = useCallback(() => {
            const recorder = recorderRef.current;
            if (recorder && recorder.state === 'recording') {
                recorder.pause();
            }
        }, []);

        const resumeRecording = useCallback(() => {
            const recorder = recorderRef.current;
            if (recorder && recorder.state === 'paused') {
                recorder.resume();
            }
        }, []);

        const isRecording = useCallback(() => {
            return isRecordingRef.current;
        }, []);

        const getRecordedBlob = useCallback(() => {
            return recordedBlobRef.current;
        }, []);

        const downloadRecording = useCallback((filename?: string) => {
            const blob = recordedBlobRef.current;
            if (!blob) {
                console.warn('No recording available to download');
                return;
            }

            const format = getOptimalFormat();
            const extension = format.includes('mp4') ? 'mp4' : 'webm';
            const defaultFilename = `recording-${new Date().toISOString().replace(/:/g, '-')}.${extension}`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename || defaultFilename;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
        }, [getOptimalFormat]);

        useImperativeHandle(ref, () => ({
            startRecording,
            stopRecording,
            pauseRecording,
            resumeRecording,
            isRecording,
            getRecordedBlob,
            downloadRecording
        }), [
            startRecording,
            stopRecording,
            pauseRecording,
            resumeRecording,
            isRecording,
            getRecordedBlob,
            downloadRecording
        ]);

        // This is a headless component, so no visual elements
        return null;
    }
);

HeadlessRecorder.displayName = 'HeadlessRecorder';

// Utility function to create a standalone recorder without React
export function createStandaloneRecorder(
    canvas: HTMLCanvasElement,
    audioSource: HTMLAudioElement | MediaStream | null,
    config: RecordingConfig
): HeadlessRecorderHandle {
    let recorder: MediaRecorder | null = null;
    let recordedChunks: Blob[] = [];
    let recordedBlob: Blob | null = null;
    let isRecording = false;

    const getOptimalFormat = (): string => {
        const formats = [
            'video/webm; codecs=vp9,opus',
            'video/webm; codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];

        if (config.format && MediaRecorder.isTypeSupported(config.format)) {
            return config.format;
        }

        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format)) {
                return format;
            }
        }
        return 'video/webm';
    };

    const createStream = async (): Promise<MediaStream | null> => {
        try {
            const videoStream = canvas.captureStream(config.framerate);

            if (!config.includeAudio || !audioSource) {
                return videoStream;
            }

            let audioStream: MediaStream | null = null;

            if (audioSource instanceof MediaStream) {
                audioStream = new MediaStream(audioSource.getAudioTracks());
            } else {
                const audioElement = audioSource as any;
                if (typeof audioElement.captureStream === 'function') {
                    audioStream = audioElement.captureStream();
                } else if (typeof audioElement.mozCaptureStream === 'function') {
                    audioStream = audioElement.mozCaptureStream();
                }
            }

            if (audioStream && audioStream.getAudioTracks().length > 0) {
                return new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...audioStream.getAudioTracks()
                ]);
            }

            return videoStream;
        } catch (error) {
            console.error('Failed to create recording stream:', error);
            return null;
        }
    };

    return {
        async startRecording() {
            if (isRecording) return;

            const stream = await createStream();
            if (!stream) throw new Error('Failed to create recording stream');

            const format = getOptimalFormat();
            recorder = new MediaRecorder(stream, { mimeType: format });

            recordedChunks = [];
            recordedBlob = null;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            recorder.start(1000);
            isRecording = true;
        },

        async stopRecording() {
            if (!isRecording || !recorder) return null;

            return new Promise((resolve) => {
                if (!recorder) {
                    resolve(null);
                    return;
                }

                recorder.onstop = () => {
                    const format = getOptimalFormat();
                    const blob = new Blob(recordedChunks, { type: format });
                    recordedBlob = blob;
                    resolve(blob);
                };

                recorder.stop();
                isRecording = false;
                recorder = null;
            });
        },

        pauseRecording() {
            if (recorder && recorder.state === 'recording') {
                recorder.pause();
            }
        },

        resumeRecording() {
            if (recorder && recorder.state === 'paused') {
                recorder.resume();
            }
        },

        isRecording() {
            return isRecording;
        },

        getRecordedBlob() {
            return recordedBlob;
        },

        downloadRecording(filename?: string) {
            if (!recordedBlob) return;

            const format = getOptimalFormat();
            const extension = format.includes('mp4') ? 'mp4' : 'webm';
            const defaultFilename = `recording-${Date.now()}.${extension}`;

            const url = URL.createObjectURL(recordedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || defaultFilename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
}