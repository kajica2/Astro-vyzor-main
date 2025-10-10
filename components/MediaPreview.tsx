import React, { useRef, useCallback } from 'react';
// FIX: Corrected import path for MediaElement type.
import type { MediaElement } from '../types';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
import * as mediaPersistenceService from '../services/mediaPersistenceService';

interface VideoPreviewItemProps {
    element: HTMLVideoElement;
}

const VideoPreviewItem: React.FC<VideoPreviewItemProps> = ({ element }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        const videoNode = videoRef.current;
        if (videoNode && element.srcObject) {
            videoNode.srcObject = element.srcObject;
            videoNode.play().catch(() => {});
        }
    }, [element.srcObject]);

    return (
        <video ref={videoRef} src={element.src} className="w-full h-full object-cover" muted loop playsInline />
    );
}

export const MediaPreview: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { mediaElements, visuals, webcamStream } = state;
    
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const onClear = () => {
        if (window.confirm('Are you sure you want to clear all visuals? This cannot be undone.')) {
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
                dispatch({ type: 'SET_WEBCAM_STREAM', payload: null });
            }
            dispatch({ type: 'SET_VISUALS', payload: [] });
            mediaPersistenceService.clearMedia();
        }
    };

    const onRemoveItem = (indexToRemove: number) => {
        const itemToRemove = visuals[indexToRemove];
        if (itemToRemove === 'webcam' && webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            dispatch({ type: 'SET_WEBCAM_STREAM', payload: null });
        }

        const newVisuals = visuals.filter((_, index) => index !== indexToRemove);
        dispatch({ type: 'SET_VISUALS', payload: newVisuals });
        const filesToSave = newVisuals.filter(v => v instanceof File) as File[];
        mediaPersistenceService.saveMedia(filesToSave);
    };

    const onReorder = useCallback((dragIndex: number, hoverIndex: number) => {
        const newVisuals = [...visuals];
        const [draggedItem] = newVisuals.splice(dragIndex, 1);
        newVisuals.splice(hoverIndex, 0, draggedItem);
        dispatch({ type: 'SET_VISUALS', payload: newVisuals });
        const filesToSave = newVisuals.filter(v => v instanceof File) as File[];
        mediaPersistenceService.saveMedia(filesToSave);
    }, [visuals, dispatch]);


    if (mediaElements.length === 0) {
        return null;
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        setTimeout(() => {
            e.currentTarget.classList.add('opacity-50', 'scale-95');
        }, 0);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        if (dragItem.current !== position) {
            dragOverItem.current = position;
            e.currentTarget.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-stone-900');
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-stone-900');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-stone-900');
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            onReorder(dragItem.current, dragOverItem.current);
        }
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('opacity-50', 'scale-95');
        document.querySelectorAll('.media-drag-target').forEach(el => {
            el.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-stone-900');
        });
        dragItem.current = null;
        dragOverItem.current = null;
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-stone-300">Visuals Queue ({mediaElements.length})</h3>
                {mediaElements.length > 0 && (
                     <button 
                        onClick={onClear} 
                        className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-md hover:bg-red-500/10"
                    >
                        Clear All
                    </button>
                )}
            </div>
            <p className="text-xs text-stone-500 mb-3 -mt-2">Click and drag to reorder visuals.</p>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 h-64 overflow-y-auto p-2 bg-stone-950/50 rounded-lg">
                {mediaElements.map((element, index) => (
                    <div 
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className="media-drag-target aspect-square rounded-md overflow-hidden bg-stone-800 shadow-md relative group cursor-move transition-all duration-200"
                    >
                        <div className="w-full h-full pointer-events-none">
                            {element.tagName === 'IMG' ? (
                                <img src={element.src} alt={`preview ${index}`} className="w-full h-full object-cover" />
                            ) : (
                                <VideoPreviewItem element={element as HTMLVideoElement} />
                            )}
                        </div>
                        <button 
                            onClick={() => onRemoveItem(index)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                            aria-label={`Remove item ${index + 1}`}
                        >
                            <div className="pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};