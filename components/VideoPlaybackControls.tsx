import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';

export const VideoPlaybackControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { isVideoFxEnabled, videoPlaybackSpeed, isVideoReversed, isFitToWidth, isFitToHeight } = state;

    const onToggle = (enabled: boolean) => dispatch({ type: 'SET_VIDEO_FX_ENABLED', payload: enabled });
    const onSpeedChange = (value: number) => dispatch({ type: 'SET_VIDEO_PLAYBACK_SPEED', payload: value });
    const onReverseToggle = (reversed: boolean) => dispatch({ type: 'SET_VIDEO_REVERSED', payload: reversed });
    const onFitToWidthChange = (fit: boolean) => dispatch({ type: 'SET_FIT_TO_WIDTH', payload: fit });
    const onFitToHeightChange = (fit: boolean) => dispatch({ type: 'SET_FIT_TO_HEIGHT', payload: fit });

    return (
        <div className="space-y-6">
            <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="fit-to-width-toggle" className="text-lg font-medium text-stone-200">Fit to Width</label>
                        <button
                            onClick={() => onFitToWidthChange(!isFitToWidth)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-cyan-500 ${isFitToWidth ? 'bg-cyan-600' : 'bg-stone-700'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isFitToWidth ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                     <div className="flex items-center justify-between">
                        <label htmlFor="fit-to-height-toggle" className="text-lg font-medium text-stone-200">Fit to Height</label>
                        <button
                            onClick={() => onFitToHeightChange(!isFitToHeight)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-cyan-500 ${isFitToHeight ? 'bg-cyan-600' : 'bg-stone-700'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isFitToHeight ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-stone-500 mt-2">"Fit to Width" prevents horizontal cropping. "Fit to Height" prevents vertical. Enabling both prevents all cropping.</p>
            </div>


            <div className="relative flex pt-2 items-center">
                <div className="flex-grow border-t border-stone-700/50"></div>
                <span className="flex-shrink mx-4 text-stone-500 text-xs uppercase">Playback FX</span>
                <div className="flex-grow border-t border-stone-700/50"></div>
            </div>

            <div className="flex items-center justify-between">
                <label htmlFor="video-fx-toggle" className="text-lg font-medium text-stone-200">Enable Video FX</label>
                <button
                    onClick={() => onToggle(!isVideoFxEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-cyan-500 ${isVideoFxEnabled ? 'bg-cyan-600' : 'bg-stone-700'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isVideoFxEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            
            <div className={`space-y-6 transition-opacity duration-500 ${isVideoFxEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div>
                    <label htmlFor="speed-slider" className="block text-lg font-medium text-stone-200 mb-2">
                        Playback Speed: <span className="font-bold text-cyan-400">{videoPlaybackSpeed.toFixed(1)}x</span>
                    </label>
                    <input
                        id="speed-slider"
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={videoPlaybackSpeed}
                        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                        disabled={!isVideoFxEnabled}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                     <p className="text-sm text-stone-500 mt-2">Slow down or speed up your video clips.</p>
                </div>
                
                <div className="flex items-center justify-between">
                    <label htmlFor="reverse-toggle" className="text-lg font-medium text-stone-200">Play in Reverse</label>
                    <button
                        onClick={() => onReverseToggle(!isVideoReversed)}
                        disabled={!isVideoFxEnabled}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-cyan-500 ${isVideoReversed ? 'bg-cyan-600' : 'bg-stone-700'}`}
                    >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isVideoReversed ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
        </div>
    );
};