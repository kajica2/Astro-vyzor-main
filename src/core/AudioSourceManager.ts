/**
 * AudioSourceManager - Centralized management of audio sources
 * Ensures single AudioContext and prevents multiple source connections
 */

export class AudioSourceManager {
    private static instance: AudioSourceManager;
    private audioContext: AudioContext | null = null;
    private mediaElementSources: WeakMap<HTMLMediaElement, MediaElementAudioSourceNode> = new WeakMap();
    private connectedElements: WeakSet<HTMLMediaElement> = new WeakSet();
    // Track ALL sources created globally, not just by us
    private static globalElementSources: Map<HTMLMediaElement, MediaElementAudioSourceNode> = new Map();
    // Track which context each element is connected to
    private static elementContextMap: WeakMap<HTMLMediaElement, AudioContext> = new WeakMap();
    private static interceptorInstalled = false;

    private constructor() {
        this.installGlobalInterceptor();
    }

    /**
     * Install global interceptor to catch ALL MediaElementSource creations
     */
    private installGlobalInterceptor(): void {
        if (AudioSourceManager.interceptorInstalled) return;
        AudioSourceManager.interceptorInstalled = true;

        // Store original createMediaElementSource
        const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!OriginalAudioContext) return;

        const originalCreateMediaElementSource = OriginalAudioContext.prototype.createMediaElementSource;

        // Override createMediaElementSource globally
        OriginalAudioContext.prototype.createMediaElementSource = function(element: HTMLMediaElement) {
            console.log('[AudioSourceManager] Intercepted createMediaElementSource call');

            // Check if element already has a source
            const existingSource = AudioSourceManager.globalElementSources.get(element);
            if (existingSource) {
                console.log('[AudioSourceManager] Element already has source, returning existing');
                return existingSource;
            }

            // Check if element is connected to a different context
            const existingContext = AudioSourceManager.elementContextMap.get(element);
            if (existingContext && existingContext !== this) {
                console.error('[AudioSourceManager] Element connected to different context!');
                throw new DOMException('HTMLMediaElement already connected to a different AudioContext', 'InvalidStateError');
            }

            // Call original method
            const source = originalCreateMediaElementSource.call(this, element);

            // Track the source globally
            AudioSourceManager.globalElementSources.set(element, source);
            AudioSourceManager.elementContextMap.set(element, this as AudioContext);

            // Mark element
            (element as any)._audioSourceNode = source;
            (element as any)._audioContext = this;
            (element as any)._sourceConnected = true;

            console.log('[AudioSourceManager] Created and tracked new MediaElementSource');
            return source;
        };
    }

    static getInstance(): AudioSourceManager {
        if (!AudioSourceManager.instance) {
            AudioSourceManager.instance = new AudioSourceManager();
        }
        return AudioSourceManager.instance;
    }

    /**
     * Get or create the shared AudioContext
     */
    getAudioContext(): AudioContext {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Get or create MediaElementSource for an audio/video element
     * Prevents "already connected" errors
     */
    getOrCreateMediaElementSource(
        element: HTMLMediaElement,
        context?: AudioContext
    ): MediaElementAudioSourceNode {
        // Use provided context or get the shared one
        const ctx = context || this.getAudioContext();

        // FIRST: Check global tracking to see if ANY source exists for this element
        const globalSource = AudioSourceManager.globalElementSources.get(element);
        if (globalSource) {
            console.log('[AudioSourceManager] Reusing existing global source for element');
            // Verify it's from the same context
            const sourceContext = (globalSource as any).context;
            if (sourceContext !== ctx) {
                console.error('[AudioSourceManager] Source exists but from different context!');
                // We can't use it, but we also can't create a new one
                throw new Error('Element already connected to different AudioContext');
            }
            // Store it in our local tracking too
            this.mediaElementSources.set(element, globalSource);
            this.connectedElements.add(element);
            return globalSource;
        }

        // Check if we already have a source for this element locally
        let source = this.mediaElementSources.get(element);

        if (source) {
            // Verify the source is still valid and uses the same context
            if ((source as any).context === ctx) {
                return source;
            }
            // If context differs, something is wrong
            console.warn('[AudioSourceManager] AudioContext mismatch detected');
            throw new Error('Element already connected to different AudioContext');
        }

        // Check if element has ANY connection markers
        const elementAny = element as any;
        if (elementAny._audioSourceNode) {
            console.log('[AudioSourceManager] Found existing source on element property');
            const existingSource = elementAny._audioSourceNode;
            // Verify context
            if ((existingSource as any).context === ctx) {
                // Register it properly
                this.mediaElementSources.set(element, existingSource);
                this.connectedElements.add(element);
                AudioSourceManager.globalElementSources.set(element, existingSource);
                return existingSource;
            } else {
                console.error('[AudioSourceManager] Source on element uses different context');
                throw new Error('Element already connected to different AudioContext');
            }
        }

        // Try to create new source - the interceptor will handle it
        console.log('[AudioSourceManager] Attempting to create new MediaElementSource');
        try {
            // This will go through our interceptor
            source = ctx.createMediaElementSource(element);

            // The interceptor already tracked it, but ensure local tracking too
            this.mediaElementSources.set(element, source);
            this.connectedElements.add(element);

            console.log('[AudioSourceManager] Successfully created new MediaElementSource');
            return source;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'InvalidStateError') {
                // Element is already connected somewhere
                console.error('[AudioSourceManager] Element already connected, checking for orphaned source');

                // Last attempt - check if the element has any audio graph connection
                if (elementAny._audioContext && elementAny._audioSourceNode) {
                    const orphanedSource = elementAny._audioSourceNode;
                    const orphanedContext = elementAny._audioContext;

                    if (orphanedContext === ctx) {
                        console.log('[AudioSourceManager] Recovered orphaned source with matching context');
                        this.mediaElementSources.set(element, orphanedSource);
                        AudioSourceManager.globalElementSources.set(element, orphanedSource);
                        return orphanedSource;
                    } else {
                        console.error('[AudioSourceManager] Orphaned source uses different context');
                        throw new Error('Element connected to different AudioContext - cannot recover');
                    }
                }
            }
            throw error;
        }
    }

    /**
     * Disconnect and cleanup a media element source
     */
    disconnectMediaElement(element: HTMLMediaElement): void {
        const source = this.mediaElementSources.get(element);
        if (source) {
            try {
                source.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
            this.mediaElementSources.delete(element);
        }
        this.connectedElements.delete(element);
    }

    /**
     * Check if a media element is already connected
     */
    isConnected(element: HTMLMediaElement): boolean {
        return this.connectedElements.has(element);
    }

    /**
     * Clean up specific element before reconnecting
     */
    cleanupElement(element: HTMLMediaElement): void {
        this.disconnectMediaElement(element);

        // Also clean up any flags that might be on the element
        const el = element as any;
        delete el._sourceConnected;
        delete el._audioEngineConnected;
    }

    /**
     * Resume audio context if suspended
     */
    async resumeContext(): Promise<void> {
        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
    }

    /**
     * Close audio context and cleanup
     */
    async cleanup(): Promise<void> {
        // Disconnect all sources
        for (const element of Array.from(this.connectedElements)) {
            this.disconnectMediaElement(element);
        }

        // Close context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close();
        }

        this.audioContext = null;
        this.mediaElementSources = new WeakMap();
        this.connectedElements = new WeakSet();
    }

    /**
     * Get statistics
     */
    getStats(): {
        contextState: string | null;
        connectedElements: number;
    } {
        return {
            contextState: this.audioContext?.state || null,
            connectedElements: this.connectedElements.size || 0
        };
    }
}

// Export singleton instance
export const audioSourceManager = AudioSourceManager.getInstance();