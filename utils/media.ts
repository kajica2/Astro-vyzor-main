// FIX: Corrected import path for MediaElement type.
import type { MediaElement } from '../types';

export const fileToMediaElement = (file: File): Promise<MediaElement> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);

        if (file.type.startsWith('image/')) {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = () => {
                URL.revokeObjectURL(url); // Clean up blob URL on error
                reject(new Error(`Failed to load image file: ${file.name}`));
            };
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = url;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.oncanplay = () => {
                video.play().catch(err => {
                    // Autoplay can be blocked by browser policies, but the video is still loaded.
                    console.warn(`Could not autoplay video preview for ${file.name}.`, err);
                });
                resolve(video);
            };
            video.onerror = () => {
                URL.revokeObjectURL(url); // Clean up blob URL on error
                reject(new Error(`Failed to load video file: ${file.name}`));
            };
        } else {
            URL.revokeObjectURL(url); // Clean up blob URL for unsupported files
            reject(new Error(`Unsupported file type for ${file.name}: ${file.type}`));
        }
    });
};