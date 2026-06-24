import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ConversionOptions {
    quality?: 'low' | 'medium' | 'high';
    onProgress?: (progress: number) => void;
}

class MP4Converter {
    private ffmpeg: FFmpeg | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize ffmpeg.wasm (lazy loading)
     * This is a one-time setup that loads the WebAssembly binary
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized && this.ffmpeg) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                this.ffmpeg = new FFmpeg();
                
                // Set up logging for debugging
                this.ffmpeg.on('log', ({ message }) => {
                    console.log('[FFmpeg]', message);
                });

                // Set up progress tracking
                this.ffmpeg.on('progress', ({ progress }) => {
                    // Progress is 0-1, convert to percentage
                    const percentage = Math.round(progress * 100);
                    console.log(`[FFmpeg] Progress: ${percentage}%`);
                });

                // Load ffmpeg.wasm core (pinned to match @ffmpeg/core in package.json)
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
                
                await this.ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });

                this.isInitialized = true;
            } catch (error) {
                console.error('Failed to initialize FFmpeg:', error);
                this.initPromise = null;
                throw new Error('Failed to initialize video converter. Please try again.');
            }
        })();

        return this.initPromise;
    }

    /**
     * Convert WebM blob to MP4
     */
    async convertWebMToMP4(
        webmBlob: Blob,
        options: ConversionOptions = {}
    ): Promise<Blob> {
        const { quality = 'medium', onProgress } = options;

        try {
            // Initialize if needed
            await this.initialize();

            if (!this.ffmpeg) {
                throw new Error('FFmpeg not initialized');
            }

            // Generate unique filenames
            const inputFileName = `input_${Date.now()}.webm`;
            const outputFileName = `output_${Date.now()}.mp4`;

            // Write input file to virtual filesystem
            await this.ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));

            // Set up progress tracking
            if (onProgress) {
                this.ffmpeg.on('progress', ({ progress }) => {
                    onProgress(Math.round(progress * 100));
                });
            }

            // Determine quality settings
            const qualitySettings = {
                low: {
                    videoBitrate: '1M',
                    audioBitrate: '96k',
                    preset: 'ultrafast',
                },
                medium: {
                    videoBitrate: '5M',
                    audioBitrate: '128k',
                    preset: 'fast',
                },
                high: {
                    videoBitrate: '10M',
                    audioBitrate: '192k',
                    preset: 'medium',
                },
            };

            const settings = qualitySettings[quality];

            // Convert WebM to MP4 using H.264 codec
            await this.ffmpeg.exec([
                '-i', inputFileName,
                '-c:v', 'libx264',
                '-preset', settings.preset,
                '-b:v', settings.videoBitrate,
                '-c:a', 'aac',
                '-b:a', settings.audioBitrate,
                '-movflags', '+faststart', // Enable streaming
                '-y', // Overwrite output file
                outputFileName,
            ]);

            // Read output file
            const data = await this.ffmpeg.readFile(outputFileName);
            const mp4Blob = new Blob([data], { type: 'video/mp4' });

            // Clean up virtual filesystem
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName);

            // Remove progress listener
            if (onProgress) {
                this.ffmpeg.off('progress');
            }

            return mp4Blob;
        } catch (error) {
            console.error('MP4 conversion error:', error);
            throw new Error(
                error instanceof Error
                    ? `Failed to convert video: ${error.message}`
                    : 'Failed to convert video to MP4 format'
            );
        }
    }

    /**
     * Check if conversion is supported in this browser
     */
    isSupported(): boolean {
        return typeof WebAssembly !== 'undefined' && typeof Worker !== 'undefined';
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        if (this.ffmpeg) {
            try {
                await this.ffmpeg.terminate();
            } catch (error) {
                console.warn('Error cleaning up FFmpeg:', error);
            }
            this.ffmpeg = null;
            this.isInitialized = false;
            this.initPromise = null;
        }
    }
}

// Export singleton instance
export const mp4Converter = new MP4Converter();

