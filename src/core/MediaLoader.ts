/**
 * MediaLoader - Modular media loading system with pluggable strategies
 * Supports images, videos, 3D models, shaders, and custom media types
 */

import { EventBus, globalEventBus } from './EventBus';
import { DependencyContainer } from './DependencyContainer';

export interface MediaMetadata {
    id: string;
    type: string;
    url: string;
    size?: number;
    dimensions?: { width: number; height: number; depth?: number };
    duration?: number;
    format?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface MediaLoadOptions {
    preload?: boolean;
    cache?: boolean;
    crossOrigin?: string;
    timeout?: number;
    retries?: number;
    onProgress?: (progress: number) => void;
    onError?: (error: Error) => void;
}

export interface MediaAsset<T = any> {
    id: string;
    type: string;
    data: T;
    metadata: MediaMetadata;
    loaded: boolean;
    error?: Error;
}

export interface MediaStrategy<T = any> {
    type: string;
    extensions: string[];
    mimeTypes: string[];

    canLoad(url: string, metadata?: MediaMetadata): boolean;
    load(url: string, options?: MediaLoadOptions): Promise<MediaAsset<T>>;
    unload(asset: MediaAsset<T>): void;
    validate(asset: MediaAsset<T>): boolean;
    transform?(asset: MediaAsset<T>, params: any): MediaAsset<T>;
}

// Built-in strategies
export class ImageStrategy implements MediaStrategy<HTMLImageElement> {
    type = 'image';
    extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];

    canLoad(url: string): boolean {
        const ext = url.split('.').pop()?.toLowerCase();
        return this.extensions.includes(ext || '');
    }

    async load(url: string, options?: MediaLoadOptions): Promise<MediaAsset<HTMLImageElement>> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            if (options?.crossOrigin) {
                img.crossOrigin = options.crossOrigin;
            }

            const timeout = options?.timeout || 30000;
            const timeoutId = setTimeout(() => {
                reject(new Error(`Image load timeout: ${url}`));
            }, timeout);

            img.onload = () => {
                clearTimeout(timeoutId);
                resolve({
                    id: this.generateId(url),
                    type: 'image',
                    data: img,
                    metadata: {
                        id: this.generateId(url),
                        type: 'image',
                        url,
                        dimensions: { width: img.width, height: img.height },
                        format: this.getFormat(url)
                    },
                    loaded: true
                });
            };

            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load image: ${url}`));
            };

            if (options?.onProgress) {
                // Note: Image loading doesn't provide real progress events
                // This is a simulation
                const progressInterval = setInterval(() => {
                    options.onProgress!(Math.random() * 0.8);
                }, 100);

                img.onload = () => {
                    clearInterval(progressInterval);
                    options.onProgress!(1);
                    clearTimeout(timeoutId);
                    resolve({
                        id: this.generateId(url),
                        type: 'image',
                        data: img,
                        metadata: {
                            id: this.generateId(url),
                            type: 'image',
                            url,
                            dimensions: { width: img.width, height: img.height },
                            format: this.getFormat(url)
                        },
                        loaded: true
                    });
                };
            }

            img.src = url;
        });
    }

    unload(asset: MediaAsset<HTMLImageElement>): void {
        if (asset.data.src.startsWith('blob:')) {
            URL.revokeObjectURL(asset.data.src);
        }
        asset.data.src = '';
    }

    validate(asset: MediaAsset<HTMLImageElement>): boolean {
        return asset.data.complete && asset.data.naturalWidth > 0;
    }

    private generateId(url: string): string {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getFormat(url: string): string {
        return url.split('.').pop()?.toLowerCase() || 'unknown';
    }
}

export class VideoStrategy implements MediaStrategy<HTMLVideoElement> {
    type = 'video';
    extensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    mimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

    canLoad(url: string): boolean {
        const ext = url.split('.').pop()?.toLowerCase();
        return this.extensions.includes(ext || '');
    }

    async load(url: string, options?: MediaLoadOptions): Promise<MediaAsset<HTMLVideoElement>> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');

            if (options?.crossOrigin) {
                video.crossOrigin = options.crossOrigin;
            }

            video.muted = true;
            video.loop = true;
            video.playsInline = true;

            if (options?.preload !== false) {
                video.preload = 'auto';
            }

            const timeout = options?.timeout || 30000;
            const timeoutId = setTimeout(() => {
                reject(new Error(`Video load timeout: ${url}`));
            }, timeout);

            video.onloadedmetadata = () => {
                clearTimeout(timeoutId);
                resolve({
                    id: this.generateId(url),
                    type: 'video',
                    data: video,
                    metadata: {
                        id: this.generateId(url),
                        type: 'video',
                        url,
                        dimensions: {
                            width: video.videoWidth,
                            height: video.videoHeight
                        },
                        duration: video.duration,
                        format: this.getFormat(url)
                    },
                    loaded: true
                });
            };

            video.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load video: ${url}`));
            };

            if (options?.onProgress) {
                video.addEventListener('progress', () => {
                    if (video.buffered.length > 0) {
                        const buffered = video.buffered.end(video.buffered.length - 1);
                        const progress = buffered / video.duration;
                        options.onProgress!(progress);
                    }
                });
            }

            video.src = url;
            video.load();
        });
    }

    unload(asset: MediaAsset<HTMLVideoElement>): void {
        asset.data.pause();
        if (asset.data.src.startsWith('blob:')) {
            URL.revokeObjectURL(asset.data.src);
        }
        asset.data.src = '';
    }

    validate(asset: MediaAsset<HTMLVideoElement>): boolean {
        return asset.data.readyState >= 2; // HAVE_CURRENT_DATA
    }

    private generateId(url: string): string {
        return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getFormat(url: string): string {
        return url.split('.').pop()?.toLowerCase() || 'unknown';
    }
}

export class AudioStrategy implements MediaStrategy<HTMLAudioElement> {
    type = 'audio';
    extensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    mimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];

    canLoad(url: string): boolean {
        const ext = url.split('.').pop()?.toLowerCase();
        return this.extensions.includes(ext || '');
    }

    async load(url: string, options?: MediaLoadOptions): Promise<MediaAsset<HTMLAudioElement>> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();

            if (options?.crossOrigin) {
                audio.crossOrigin = options.crossOrigin;
            }

            const timeout = options?.timeout || 30000;
            const timeoutId = setTimeout(() => {
                reject(new Error(`Audio load timeout: ${url}`));
            }, timeout);

            audio.onloadedmetadata = () => {
                clearTimeout(timeoutId);
                resolve({
                    id: this.generateId(url),
                    type: 'audio',
                    data: audio,
                    metadata: {
                        id: this.generateId(url),
                        type: 'audio',
                        url,
                        duration: audio.duration,
                        format: this.getFormat(url)
                    },
                    loaded: true
                });
            };

            audio.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load audio: ${url}`));
            };

            audio.src = url;
            audio.load();
        });
    }

    unload(asset: MediaAsset<HTMLAudioElement>): void {
        asset.data.pause();
        if (asset.data.src.startsWith('blob:')) {
            URL.revokeObjectURL(asset.data.src);
        }
        asset.data.src = '';
    }

    validate(asset: MediaAsset<HTMLAudioElement>): boolean {
        return asset.data.readyState >= 2; // HAVE_CURRENT_DATA
    }

    private generateId(url: string): string {
        return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getFormat(url: string): string {
        return url.split('.').pop()?.toLowerCase() || 'unknown';
    }
}

// Main MediaLoader class
export class MediaLoader {
    private strategies: Map<string, MediaStrategy> = new Map();
    private cache: Map<string, MediaAsset> = new Map();
    private loading: Map<string, Promise<MediaAsset>> = new Map();
    private eventBus: EventBus;
    private container?: DependencyContainer;

    constructor(eventBus: EventBus = globalEventBus, container?: DependencyContainer) {
        this.eventBus = eventBus;
        this.container = container;

        // Register built-in strategies
        this.registerStrategy(new ImageStrategy());
        this.registerStrategy(new VideoStrategy());
        this.registerStrategy(new AudioStrategy());
    }

    /**
     * Register a media loading strategy
     */
    registerStrategy(strategy: MediaStrategy): void {
        this.strategies.set(strategy.type, strategy);

        // Also register by extensions
        for (const ext of strategy.extensions) {
            this.strategies.set(ext, strategy);
        }

        this.eventBus.emit('media:loaded', {
            id: strategy.type,
            element: null as any
        });
    }

    /**
     * Load media from URL
     */
    async load(url: string, options?: MediaLoadOptions): Promise<MediaAsset> {
        // Check cache
        if (options?.cache !== false) {
            const cached = this.cache.get(url);
            if (cached) {
                return cached;
            }
        }

        // Check if already loading
        const loading = this.loading.get(url);
        if (loading) {
            return loading;
        }

        // Find appropriate strategy
        const strategy = this.findStrategy(url);
        if (!strategy) {
            throw new Error(`No strategy found for URL: ${url}`);
        }

        // Load with retry logic
        const loadPromise = this.loadWithRetry(strategy, url, options);
        this.loading.set(url, loadPromise);

        try {
            const asset = await loadPromise;

            // Cache if enabled
            if (options?.cache !== false) {
                this.cache.set(url, asset);
            }

            this.eventBus.emit('media:loaded', {
                id: asset.id,
                element: asset.data
            });

            return asset;
        } catch (error) {
            this.eventBus.emit('media:error', {
                id: url,
                error: error as Error
            });
            throw error;
        } finally {
            this.loading.delete(url);
        }
    }

    /**
     * Load multiple media files
     */
    async loadBatch(
        urls: string[],
        options?: MediaLoadOptions,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<MediaAsset[]> {
        let loaded = 0;
        const total = urls.length;

        const promises = urls.map(async (url) => {
            const asset = await this.load(url, options);
            loaded++;
            if (onProgress) {
                onProgress(loaded, total);
            }
            return asset;
        });

        return Promise.all(promises);
    }

    /**
     * Load media from File
     */
    async loadFile(file: File, options?: MediaLoadOptions): Promise<MediaAsset> {
        const url = URL.createObjectURL(file);
        const asset = await this.load(url, options);

        // Store original file info
        asset.metadata.metadata = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            lastModified: file.lastModified
        };

        return asset;
    }

    /**
     * Unload media asset
     */
    unload(asset: MediaAsset): void {
        const strategy = this.strategies.get(asset.type);
        if (strategy) {
            strategy.unload(asset);
        }

        // Remove from cache
        this.cache.delete(asset.metadata.url);
    }

    /**
     * Clear all cached media
     */
    clearCache(): void {
        for (const asset of this.cache.values()) {
            this.unload(asset);
        }
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        items: number;
        types: Record<string, number>;
        totalSize?: number;
    } {
        const types: Record<string, number> = {};

        for (const asset of this.cache.values()) {
            types[asset.type] = (types[asset.type] || 0) + 1;
        }

        return {
            items: this.cache.size,
            types,
            totalSize: undefined // Could calculate if we track sizes
        };
    }

    /**
     * Find appropriate strategy for URL
     */
    private findStrategy(url: string): MediaStrategy | null {
        // Try by extension
        const ext = url.split('.').pop()?.toLowerCase();
        if (ext && this.strategies.has(ext)) {
            return this.strategies.get(ext)!;
        }

        // Try all strategies
        for (const strategy of this.strategies.values()) {
            if (strategy.canLoad(url)) {
                return strategy;
            }
        }

        return null;
    }

    /**
     * Load with retry logic
     */
    private async loadWithRetry(
        strategy: MediaStrategy,
        url: string,
        options?: MediaLoadOptions,
        attempt: number = 0
    ): Promise<MediaAsset> {
        const maxRetries = options?.retries || 3;

        try {
            return await strategy.load(url, options);
        } catch (error) {
            if (attempt < maxRetries) {
                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.loadWithRetry(strategy, url, options, attempt + 1);
            }
            throw error;
        }
    }
}

// Global media loader instance
export const globalMediaLoader = new MediaLoader();