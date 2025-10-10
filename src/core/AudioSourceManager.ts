/**
 * AudioSourceManager - Centralized management of audio sources
 * Ensures single AudioContext and prevents multiple source connections
 */

export class AudioSourceManager {
    private static instance: AudioSourceManager;
    private audioContext: AudioContext | null = null;
    private mediaElementSources: WeakMap<HTMLMediaElement, MediaElementAudioSourceNode> = new WeakMap();
    private connectedElements: WeakSet<HTMLMediaElement> = new WeakSet();

    private constructor() {}

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

        // Check if we already have a source for this element
        let source = this.mediaElementSources.get(element);

        if (source) {
            // Verify the source is still valid and uses the same context
            if ((source as any).context === ctx) {
                return source;
            }
            // If context differs, we need to recreate (shouldn't happen with proper management)
            console.warn('AudioContext mismatch detected, recreating source');
        }

        // Check if element is already connected to any audio context
        if (this.connectedElements.has(element)) {
            console.warn('Media element was previously connected, attempting to reuse');
            // Try to get existing source
            const existingSource = this.mediaElementSources.get(element);
            if (existingSource) {
                return existingSource;
            }
        }

        // Create new source
        try {
            source = ctx.createMediaElementSource(element);
            this.mediaElementSources.set(element, source);
            this.connectedElements.add(element);
            return source;
        } catch (error) {
            // Handle case where element is already connected to a different context
            if (error instanceof DOMException && error.name === 'InvalidStateError') {
                console.error('Media element is already connected to a different AudioContext');
                // Try to find and return existing source
                const existingSource = this.mediaElementSources.get(element);
                if (existingSource) {
                    return existingSource;
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