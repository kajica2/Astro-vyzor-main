import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for ExportSettings type.
import type { ExportSettings } from '../types';

interface ExportControlsProps {
    isRecording: boolean;
    onStart: (settings: ExportSettings) => void;
    onStop: () => void;
}

const supportedFormats: { name: string; mimeType: string }[] = [
    { name: 'WebM (VP9/Opus)', mimeType: 'video/webm; codecs=vp9,opus' },
    { name: 'WebM (VP8/Opus)', mimeType: 'video/webm; codecs=vp8,opus' },
    { name: 'WebM (Default)', mimeType: 'video/webm' },
    { name: 'MP4 (H.264/AAC)', mimeType: 'video/mp4; codecs=avc1.4d401e,mp4a.40.2' },
    { name: 'MP4 (Default)', mimeType: 'video/mp4' },
].filter(format => {
    if (typeof MediaRecorder === 'undefined') return false;
    return MediaRecorder.isTypeSupported(format.mimeType);
});


export const ExportControls: React.FC<ExportControlsProps> = ({ isRecording, onStart, onStop }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [settings, setSettings] = useState<ExportSettings>({
        resolution: 'auto',
        format: supportedFormats[0]?.mimeType || 'video/webm',
        framerate: 30,
    });

    const handleSettingChange = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleStartClick = () => {
        onStart(settings);
        setIsModalOpen(false);
    };

    if (isRecording) {
        return (
            <button
                onClick={onStop}
                className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors z-10 flex items-center gap-2"
            >
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Stop Recording
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors z-10"
            >
                Record / Export
            </button>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div 
                        className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-6 w-full max-w-md text-stone-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Export Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Resolution</label>
                                <select 
                                    value={settings.resolution}
                                    onChange={e => handleSettingChange('resolution', e.target.value as ExportSettings['resolution'])}
                                    className="w-full bg-stone-800 border-stone-700 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="auto">Auto (Screen Size)</option>
                                    <option value="1080p">1080p (1920x1080)</option>
                                    <option value="720p">720p (1280x720)</option>
                                    <option value="480p">480p (854x480)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Format / Codec</label>
                                <select 
                                    value={settings.format}
                                    onChange={e => handleSettingChange('format', e.target.value)}
                                    className="w-full bg-stone-800 border-stone-700 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {supportedFormats.length > 0 ? (
                                        supportedFormats.map(f => <option key={f.mimeType} value={f.mimeType}>{f.name}</option>)
                                    ) : (
                                        <option disabled>No supported formats found</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Framerate</label>
                                <select 
                                    value={settings.framerate}
                                    onChange={e => handleSettingChange('framerate', parseInt(e.target.value, 10) as ExportSettings['framerate'])}
                                    className="w-full bg-stone-800 border-stone-700 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value={30}>30 FPS</option>
                                    <option value={60}>60 FPS</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-stone-700 hover:bg-stone-600 transition-colors"
                            >
                                Cancel
                            </button>
                             <button
                                onClick={handleStartClick}
                                disabled={supportedFormats.length === 0}
                                className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-stone-700 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                            >
                                Start Recording
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};