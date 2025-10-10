/**
 * Example Kaleidoscope Plugin
 * Demonstrates how to create a visual effect plugin using the modular architecture
 */

import {
    EffectPlugin,
    Canvas2DEffect,
    EffectMetadata,
    EffectContext,
    PluginMetadata
} from '../core';

// Kaleidoscope Effect Implementation
class KaleidoscopeEffect extends Canvas2DEffect {
    metadata: EffectMetadata = {
        id: 'kaleidoscope-advanced',
        name: 'Advanced Kaleidoscope',
        category: 'Geometric',
        description: 'Creates a kaleidoscope effect with configurable segments',
        author: 'Example Plugin',
        version: '1.0.0',
        tags: ['geometric', 'symmetry', 'trippy'],
        parameters: [
            {
                name: 'segments',
                type: 'range',
                default: 6,
                min: 3,
                max: 12,
                step: 1,
                description: 'Number of mirror segments'
            },
            {
                name: 'rotation',
                type: 'range',
                default: 0,
                min: 0,
                max: 360,
                step: 1,
                description: 'Rotation angle in degrees'
            },
            {
                name: 'zoom',
                type: 'range',
                default: 1,
                min: 0.5,
                max: 3,
                step: 0.1,
                description: 'Zoom factor'
            },
            {
                name: 'autoRotate',
                type: 'boolean',
                default: true,
                description: 'Enable automatic rotation'
            },
            {
                name: 'rotationSpeed',
                type: 'range',
                default: 0.5,
                min: -2,
                max: 2,
                step: 0.1,
                description: 'Rotation speed (when auto-rotate is enabled)'
            },
            {
                name: 'audioReactive',
                type: 'boolean',
                default: true,
                description: 'React to audio frequencies'
            },
            {
                name: 'centerX',
                type: 'range',
                default: 0.5,
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Center X position (0-1)'
            },
            {
                name: 'centerY',
                type: 'range',
                default: 0.5,
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Center Y position (0-1)'
            }
        ]
    };

    private sourceCanvas?: HTMLCanvasElement;
    private sourceCtx?: CanvasRenderingContext2D;
    private rotation: number = 0;

    async initialize(context: EffectContext): Promise<void> {
        await super.initialize(context);

        // Create source canvas for capturing the original image
        this.sourceCanvas = document.createElement('canvas');
        this.sourceCanvas.width = context.resolution.width;
        this.sourceCanvas.height = context.resolution.height;
        this.sourceCtx = this.sourceCanvas.getContext('2d')!;
    }

    render(context: EffectContext): void {
        if (!this.offscreenCtx || !this.sourceCtx || !this.sourceCanvas) return;

        const ctx = context.ctx as CanvasRenderingContext2D;
        const { width, height } = context.resolution;

        // Get parameters
        const segments = this.parameters.segments;
        const zoom = this.parameters.zoom;
        const autoRotate = this.parameters.autoRotate;
        const rotationSpeed = this.parameters.rotationSpeed;
        const audioReactive = this.parameters.audioReactive;
        const centerX = this.parameters.centerX * width;
        const centerY = this.parameters.centerY * height;

        // Update rotation
        if (autoRotate) {
            this.rotation += rotationSpeed * context.deltaTime;
        } else {
            this.rotation = (this.parameters.rotation * Math.PI) / 180;
        }

        // Apply audio reactivity
        let audioModulation = 1;
        if (audioReactive && context.audioData) {
            audioModulation = 1 + context.audioData.bass * 0.3;
        }

        // Capture current canvas content
        this.sourceCtx.clearRect(0, 0, width, height);
        this.sourceCtx.drawImage(context.canvas, 0, 0);

        // Clear the main canvas
        ctx.clearRect(0, 0, width, height);

        // Save context state
        ctx.save();

        // Translate to center
        ctx.translate(centerX, centerY);

        // Apply rotation
        ctx.rotate(this.rotation);

        // Scale with zoom and audio modulation
        ctx.scale(zoom * audioModulation, zoom * audioModulation);

        // Draw kaleidoscope segments
        const angleIncrement = (Math.PI * 2) / segments;

        for (let i = 0; i < segments; i++) {
            ctx.save();

            // Rotate to segment position
            ctx.rotate(angleIncrement * i);

            // Create clipping path for segment
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, Math.max(width, height), 0, angleIncrement);
            ctx.closePath();
            ctx.clip();

            // Draw the source image
            if (i % 2 === 0) {
                // Normal segment
                ctx.drawImage(
                    this.sourceCanvas,
                    -centerX,
                    -centerY
                );
            } else {
                // Mirrored segment
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.sourceCanvas,
                    -centerX,
                    -centerY
                );
                ctx.restore();
            }

            ctx.restore();
        }

        // Restore context
        ctx.restore();

        // Add center decoration if audio reactive
        if (audioReactive && context.audioData) {
            const pulseSize = 10 + context.audioData.bass * 50;

            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = `hsl(${(context.time * 100) % 360}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    resize(width: number, height: number): void {
        super.resize(width, height);

        if (this.sourceCanvas) {
            this.sourceCanvas.width = width;
            this.sourceCanvas.height = height;
        }
    }

    cleanup(): void {
        super.cleanup();
        this.sourceCanvas = undefined;
        this.sourceCtx = undefined;
    }
}

// Kaleidoscope Plugin Class
class KaleidoscopePlugin extends EffectPlugin {
    metadata: PluginMetadata = {
        id: 'kaleidoscope-plugin',
        name: 'Kaleidoscope Effect Plugin',
        version: '1.0.0',
        description: 'Adds an advanced kaleidoscope visual effect',
        author: 'Astro-Vysio',
        tags: ['effect', 'visual', 'geometric'],
        provides: ['effect.kaleidoscope']
    };

    private layerId?: string;

    createEffect(): KaleidoscopeEffect {
        return new KaleidoscopeEffect();
    }

    async onStart(): Promise<void> {
        await super.onStart();

        // Create and configure an effect layer
        this.layerId = 'kaleidoscope-layer';
        this.context.effectRegistry.createLayer(
            this.layerId,
            'kaleidoscope-advanced',
            {
                enabled: true,
                opacity: 0.9,
                blendMode: 'normal',
                triggerSource: 'manual',
                order: 100
            }
        );

        // Subscribe to audio beats for dynamic parameter changes
        this.context.eventBus.on('audio:beat', (beat) => {
            if (beat.type === 'bass' && beat.strength > 0.7) {
                // Temporarily increase segments on strong bass beats
                const effect = this.context.effectRegistry.getEffect('kaleidoscope-advanced');
                if (effect) {
                    const currentSegments = effect.getParameter('segments');
                    effect.setParameter('segments', Math.min(12, currentSegments + 1));

                    // Reset after a short time
                    setTimeout(() => {
                        effect.setParameter('segments', currentSegments);
                    }, 200);
                }
            }
        });

        // Log that the plugin is active
        this.context.logger.info('Kaleidoscope plugin started');
    }

    async onStop(): Promise<void> {
        // Remove the effect layer
        if (this.layerId) {
            this.context.effectRegistry.removeLayer(this.layerId);
        }

        await super.onStop();
        this.context.logger.info('Kaleidoscope plugin stopped');
    }

    configure(config: any): void {
        // Apply configuration to the effect
        const effect = this.context?.effectRegistry.getEffect('kaleidoscope-advanced');
        if (effect && config.parameters) {
            for (const [key, value] of Object.entries(config.parameters)) {
                effect.setParameter(key, value);
            }
        }
    }

    getAPI(): any {
        // Expose API methods for other plugins
        return {
            setSegments: (segments: number) => {
                const effect = this.context?.effectRegistry.getEffect('kaleidoscope-advanced');
                if (effect) {
                    effect.setParameter('segments', segments);
                }
            },
            setRotationSpeed: (speed: number) => {
                const effect = this.context?.effectRegistry.getEffect('kaleidoscope-advanced');
                if (effect) {
                    effect.setParameter('rotationSpeed', speed);
                }
            },
            toggleAutoRotate: () => {
                const effect = this.context?.effectRegistry.getEffect('kaleidoscope-advanced');
                if (effect) {
                    const current = effect.getParameter('autoRotate');
                    effect.setParameter('autoRotate', !current);
                }
            }
        };
    }
}

// Export the plugin
export default new KaleidoscopePlugin();