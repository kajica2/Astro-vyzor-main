



import React, { useEffect, useCallback, useState } from 'react';
import { MediaUpload } from './components/MediaUpload';
import { MediaPreview } from './components/MediaPreview';
import { CosmicControls } from './components/CosmicControls';
import { EvolutionControls } from './components/EvolutionControls';
import { AstrologicalDisplay } from './components/AstrologicalDisplay';
import { Visualizer } from './components/Visualizer';
import { getAstrologicalData } from './services/astrologicalService';
import { AudioControls } from './components/AudioControls';
import { VideoPlaybackControls } from './components/VideoPlaybackControls';
import { TransitionControls } from './components/TransitionControls';
import * as mediaPersistenceService from './services/mediaPersistenceService';
import { fileToMediaElement } from './utils/media';
import { FxKontrols } from './components/FxKontrols';
// FIX: Corrected import path for useAppState.
import { useAppState } from './context/AppStateContext';
// FIX: Corrected import path for MediaElement type.
import type { MediaElement } from './types';
import { VisualOutputControls } from './components/VisualOutputControls';
import { GlobalModulation } from './components/fx/GlobalModulation';
import { StarsBackground } from './components/StarsBackground';

const Section: React.FC<{ title: string; children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-stone-900/10 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-stone-800/40 hover:bg-stone-800/70 transition-colors rounded-lg"
            >
                <h2 className="text-2xl font-semibold text-stone-100">{title}</h2>
                <svg
                    className={`w-6 h-6 text-stone-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="relative p-6 space-y-8 border border-t-0 border-stone-700/50 rounded-b-lg">
                    {children}
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { 
        isPlaying, isReady, activeTab, mediaElements, visuals, audioFile, 
        webcamStream, audioUrl, effectPresets, isCosmicInfluenceEnabled, micStream,
        timeOffset, planetaryFocus
    } = state;

    // Load persisted media from IndexedDB on initial mount
    useEffect(() => {
        const loadPersistedMedia = async () => {
            try {
                const [loadedVisuals, loadedAudio] = await Promise.all([
                    mediaPersistenceService.loadMedia(),
                    mediaPersistenceService.loadAudio(),
                ]);
                if (loadedVisuals.length > 0) {
                    dispatch({ type: 'SET_VISUALS', payload: loadedVisuals });
                }
                if (loadedAudio) {
                    dispatch({ type: 'SET_AUDIO_FILE', payload: loadedAudio });
                }
            } catch (error) {
                console.error("Failed to load persisted media:", error);
            }
        };
        loadPersistedMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to derive MediaElement array and audio URL from file state
    useEffect(() => {
        // Cleanup function: revoke ONLY URLs we created and that are no longer
        // referenced by the new state. Captured refs avoid the previous-code
        // double-revoke race where previousAudioUrl could equal current.
        const previousAudioUrl = audioUrl;
        const previousMediaElements = mediaElements;

        // Process audio file
        if (audioFile) {
            const newAudioUrl = URL.createObjectURL(audioFile);
            dispatch({ type: 'SET_AUDIO_URL', payload: newAudioUrl });
        } else {
            dispatch({ type: 'SET_AUDIO_URL', payload: null });
        }

        // Process visual files
        const fileVisuals = visuals.filter(v => v instanceof File) as File[];
        if (fileVisuals.length === 0 && !visuals.includes('webcam')) {
            dispatch({ type: 'SET_MEDIA_ELEMENTS', payload: [] });
        } else {
            const filePromises = fileVisuals.map(fileToMediaElement);
            Promise.all(filePromises).then(fileElements => {
                const finalElements: MediaElement[] = [];
                let fileElementIndex = 0;

                let webcamElement: HTMLVideoElement | null = null;
                if (webcamStream) {
                    webcamElement = document.createElement('video');
                    webcamElement.srcObject = webcamStream;
                    webcamElement.muted = true;
                    webcamElement.playsInline = true;
                    webcamElement.play().catch(() => {});
                }

                visuals.forEach(v => {
                    if (v === 'webcam' && webcamElement) {
                        finalElements.push(webcamElement);
                    } else if (v instanceof File) {
                        if (fileElements[fileElementIndex]) {
                            finalElements.push(fileElements[fileElementIndex]);
                            fileElementIndex++;
                        }
                    }
                });
                dispatch({ type: 'SET_MEDIA_ELEMENTS', payload: finalElements });
            }).catch(err => console.error("Error creating media elements from files:", err));
        }

        // Cleanup function: runs BEFORE the next effect call and on unmount.
        // Only revoke URLs we created and that are not still in use.
        return () => {
            if (previousAudioUrl && previousAudioUrl.startsWith('blob:')) {
                try { URL.revokeObjectURL(previousAudioUrl); } catch { /* already revoked */ }
            }
            previousMediaElements.forEach(el => {
                if ((el.tagName === 'VIDEO' || el.tagName === 'IMG') && el.src?.startsWith('blob:')) {
                    try { URL.revokeObjectURL(el.src); } catch { /* already revoked */ }
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visuals, audioFile, webcamStream, dispatch]);

    // Save presets to local storage (debounced to avoid stringify on every render)
    useEffect(() => {
        const handle = setTimeout(() => {
            try {
                localStorage.setItem('astro-vysio-presets', JSON.stringify(effectPresets));
            } catch (error) {
                console.error("Could not save presets to local storage", error);
            }
        }, 400);
        return () => clearTimeout(handle);
    }, [effectPresets]);
    
    // Update isReady state
    useEffect(() => {
      dispatch({ type: 'SET_IS_READY', payload: mediaElements.length > 0 && (!!audioUrl || !!micStream) });
    }, [mediaElements, audioUrl, micStream, dispatch]);

    const handleGenerateClick = () => {
        if (isReady) {
            if (isCosmicInfluenceEnabled) {
                const now = new Date();
                const offsetDate = new Date(now.getTime() + timeOffset * 60 * 60 * 1000);
                dispatch({ type: 'SET_ASTRO_DATA', payload: getAstrologicalData(offsetDate, planetaryFocus) });
            } else {
                dispatch({ type: 'SET_ASTRO_DATA', payload: null });
            }
            dispatch({ type: 'SET_IS_PLAYING', payload: true });
        }
    };

    const handleBackToSetup = useCallback(() => {
        dispatch({ type: 'SET_IS_PLAYING', payload: false });
    }, [dispatch]);

    const tabs: {id: 'media' | 'engine' | 'fx', label: string}[] = [
        { id: 'media', label: '1. Media' },
        { id: 'engine', label: '2. Engine' },
        { id: 'fx', label: '3. FX & Kontrols' },
    ];

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans relative">
            {!isPlaying && <StarsBackground starCount={300} speed={0.3} />}
            {isPlaying ? (
                <Visualizer onStop={handleBackToSetup} />
            ) : (
                <div className="container mx-auto p-4 lg:p-8 relative z-10">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse">
                            Astro-Vysio
                        </h1>
                        <p className="text-stone-400 mt-2 text-lg">Create audio-reactive music videos influenced by the cosmos.</p>
                    </header>
                    
                    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="flex border-b border-stone-800 overflow-x-auto">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
                                        className={`flex-1 sm:flex-none sm:px-6 py-3 text-center text-sm sm:text-base font-semibold border-b-2 transition-all duration-300 whitespace-nowrap ${
                                            activeTab === tab.id
                                                ? 'border-purple-500 text-white'
                                                : 'border-transparent text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="py-8 bg-stone-900/30 rounded-b-2xl">
                                {activeTab === 'media' && (
                                    <div className="px-6 space-y-8">
                                        <div id="media-upload">
                                            <h2 className="text-2xl font-semibold mb-4 text-stone-100">Upload & Transitions</h2>
                                            <MediaUpload />
                                        </div>
                                         <div id="transition-style">
                                            <TransitionControls />
                                        </div>
                                        <div id="video-playback">
                                            <h2 className="text-2xl font-semibold mb-4 text-stone-100">Video Playback & Sizing</h2>
                                            <VideoPlaybackControls />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'engine' && (
                                    <div className="px-6 space-y-6">
                                       <Section title="Celestial Data Source" defaultOpen>
                                            <CosmicControls />
                                        </Section>
                                        <Section title="Effect Evolution" defaultOpen>
                                            <EvolutionControls />
                                        </Section>
                                        <Section title="Audio Reactivity" defaultOpen>
                                            <AudioControls />
                                        </Section>
                                        <Section title="Global Modulation" defaultOpen>
                                            <GlobalModulation />
                                        </Section>
                                        <Section title="Global Visual Modifiers" defaultOpen>
                                            <VisualOutputControls />
                                        </Section>
                                    </div>
                                )}
                                {activeTab === 'fx' && (
                                     <FxKontrols />
                                )}
                            </div>
                        </div>
                        
                        <aside className="space-y-8">
                           <div className="sticky top-8 space-y-8">
                                <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-800 shadow-lg">
                                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-purple-500/30 pb-2 text-stone-100">Generate</h2>
                                    <p className="text-stone-400 mb-6">Once you've uploaded visuals and an audio source, you're ready to create.</p>
                                    <button
                                        onClick={handleGenerateClick}
                                        disabled={!isReady}
                                        className={`w-full py-4 text-xl font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg
                                            ${isReady 
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-purple-500/50' 
                                                : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`
                                    }>
                                        {isReady ? 'Generate Visualization' : 'Waiting for media...'}
                                    </button>
                                </div>
                                {mediaElements.length > 0 && (
                                     <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-800 shadow-lg">
                                        <MediaPreview />
                                     </div>
                                )}
                                {isCosmicInfluenceEnabled && (
                                    <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-800 shadow-lg">
                                        <AstrologicalDisplay />
                                    </div>
                                )}
                           </div>
                        </aside>
                    </main>
                </div>
            )}
        </div>
    );
};

export default App;