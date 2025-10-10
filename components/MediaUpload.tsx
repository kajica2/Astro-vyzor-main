import React, { useCallback, useState } from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
import * as mediaPersistenceService from '../services/mediaPersistenceService';

export const MediaUpload: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { webcamStream, audioFile, visuals, micStream } = state;

    const [mediaLoading, setMediaLoading] = useState(false);
    const [webcamLoading, setWebcamLoading] = useState(false);
    const [webcamError, setWebcamError] = useState<string | null>(null);
    const [micLoading, setMicLoading] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);

    const handleMediaFilesChange = useCallback((files: File[]) => {
        const newVisuals = [...visuals, ...files];
        dispatch({ type: 'SET_VISUALS', payload: newVisuals });
        const filesToSave = newVisuals.filter(v => v instanceof File) as File[];
        mediaPersistenceService.saveMedia(filesToSave);
    }, [dispatch, visuals]);

    const handleAudioFileChange = useCallback((file: File | null) => {
        dispatch({ type: 'SET_AUDIO_FILE', payload: file });
        if (file) {
            mediaPersistenceService.saveAudio(file);
        } else {
            mediaPersistenceService.clearAudio();
        }
    }, [dispatch]);
    
    const handleWebcamToggle = useCallback(async () => {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            dispatch({ type: 'SET_WEBCAM_STREAM', payload: null });
            const newVisuals = visuals.filter(v => v !== 'webcam');
            dispatch({ type: 'SET_VISUALS', payload: newVisuals });
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                dispatch({ type: 'SET_WEBCAM_STREAM', payload: stream });
                dispatch({ type: 'SET_VISUALS', payload: [...visuals, 'webcam'] });
            } catch (err) {
                console.error("Error accessing webcam:", err);
                throw err;
            }
        }
    }, [webcamStream, dispatch, visuals]);

    const handleMicToggle = useCallback(async () => {
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            dispatch({ type: 'SET_MIC_STREAM', payload: null });
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                dispatch({ type: 'SET_MIC_STREAM', payload: stream });
            } catch (err) {
                console.error("Error accessing microphone:", err);
                throw err;
            }
        }
    }, [micStream, dispatch]);

    const handleMediaFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setMediaLoading(true);
        handleMediaFilesChange(Array.from(files));
        setMediaLoading(false);
        event.target.value = '';

    }, [handleMediaFilesChange]);

    const handleAudioFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        handleAudioFileChange(file || null);
        event.target.value = '';
    }, [handleAudioFileChange]);

    const handleUseWebcam = useCallback(async () => {
        setWebcamLoading(true);
        setWebcamError(null);
        try {
            await handleWebcamToggle();
        } catch (err) {
            console.error("Error toggling webcam:", err);
            setWebcamError("Could not access webcam. Please check permissions.");
        } finally {
            setWebcamLoading(false);
        }
    }, [handleWebcamToggle]);
    
    const handleUseMic = useCallback(async () => {
        setMicLoading(true);
        setMicError(null);
        try {
            await handleMicToggle();
        } catch (err) {
            console.error("Error toggling microphone:", err);
            setMicError("Could not access microphone. Please check permissions.");
        } finally {
            setMicLoading(false);
        }
    }, [handleMicToggle]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visuals Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-stone-300 text-center md:text-left">Visual Sources</h3>
                <label className="flex-1 block text-center cursor-pointer p-6 border-2 border-dashed border-stone-700 rounded-lg hover:border-purple-500 hover:bg-stone-800/50 transition-colors">
                    <input type="file" multiple accept="image/*,video/mp4,video/webm" onChange={handleMediaFiles} className="hidden" />
                    <span className="text-stone-300 font-semibold">
                       {mediaLoading ? 'Loading Visuals...' : 'Click to Upload Images/Videos'}
                    </span>
                    <p className="text-xs text-stone-500 mt-1">Select one or more files</p>
                </label>
    
                 <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-stone-700"></div>
                    <span className="flex-shrink mx-4 text-stone-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-stone-700"></div>
                </div>
    
                <div>
                     <button
                        onClick={handleUseWebcam}
                        disabled={webcamLoading}
                        className="w-full text-center cursor-pointer p-6 border-2 border-dashed border-stone-700 rounded-lg hover:border-cyan-500 hover:bg-stone-800/50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        <span className="text-stone-300 font-semibold">
                            {webcamLoading ? 'Starting Webcam...' : (!!webcamStream ? 'Stop Webcam' : 'Use Webcam as Source')}
                        </span>
                     </button>
                     {webcamError && <p className="text-red-500 text-sm mt-2 text-center">{webcamError}</p>}
                </div>
            </div>
    
            {/* Audio Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-stone-300 text-center md:text-left">Audio Source</h3>
                <label className={`block text-center p-6 border-2 border-dashed border-stone-700 rounded-lg transition-colors ${!!micStream ? 'opacity-50 cursor-not-allowed bg-stone-800/50 border-stone-800' : 'hover:border-pink-500 hover:bg-stone-800/50 cursor-pointer'}`}>
                    <input type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" disabled={!!micStream} />
                    <span className="text-stone-300 font-semibold">
                        {!!micStream ? 'Using Microphone' : (audioFile ? 'Audio Loaded' : 'Click to Upload Audio Track')}
                    </span>
                    <p className="text-xs text-stone-500 mt-1 truncate px-2">{!!micStream ? 'Live audio input' : (audioFile?.name || 'Select one audio file')}</p>
                </label>
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-stone-700"></div>
                    <span className="flex-shrink mx-4 text-stone-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-stone-700"></div>
                </div>
                <button
                    onClick={handleUseMic}
                    disabled={micLoading}
                    className="w-full text-center cursor-pointer p-6 border-2 border-dashed border-stone-700 rounded-lg hover:border-pink-500 hover:bg-stone-800/50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    <span className="text-stone-300 font-semibold">
                        {micLoading ? 'Starting Mic...' : (!!micStream ? 'Stop Microphone' : 'Use Microphone as Source')}
                    </span>
                </button>
                {micError && <p className="text-red-500 text-sm mt-2 text-center">{micError}</p>}
            </div>
        </div>
    );
};