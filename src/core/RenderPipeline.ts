/**
 * RenderPipeline - Modular rendering pipeline with pluggable strategies
 * Supports Canvas2D, WebGL, WebGPU, and custom rendering backends
 */

import { EventBus, globalEventBus } from './EventBus';
import { DependencyContainer } from './DependencyContainer';
import { EffectRegistry, EffectContext } from './EffectRegistry';
import { MediaAsset } from './MediaLoader';

export interface RenderTarget {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    pixelRatio: number;
}

export interface RenderFrame {
    time: number;
    deltaTime: number;
    frameNumber: number;
    fps: number;
}

export interface RenderContext extends RenderTarget, RenderFrame {
    audioData?: {
        bass: number;
        mids: number;
        highs: number;
        frequencyData: Float32Array;
        timeDomainData: Float32Array;
    };
    mediaAssets?: MediaAsset[];
    mouse?: { x: number; y: number; pressed: boolean };
    keyboard?: Set<string>;
    custom?: Record<string, any>;
}

export interface RenderPass {
    name: string;
    enabled: boolean;
    order: number;
    render(context: RenderContext): void;
}

export interface RenderStrategy {
    name: string;
    type: 'canvas2d' | 'webgl' | 'webgl2' | 'webgpu' | 'custom';

    initialize(target: RenderTarget): Promise<void> | void;
    beginFrame(context: RenderContext): void;
    endFrame(context: RenderContext): void;
    clear(color?: string | number[]): void;
    resize(width: number, height: number): void;
    destroy(): void;

    isSupported(): boolean;
    getContext(): any;
}

// Canvas2D Rendering Strategy
export class Canvas2DStrategy implements RenderStrategy {
    name = 'canvas2d';
    type = 'canvas2d' as const;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;

    async initialize(target: RenderTarget): Promise<void> {
        this.canvas = target.canvas;
        this.ctx = this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true,
            willReadFrequently: false
        }) as CanvasRenderingContext2D;

        if (!this.ctx) {
            throw new Error('Failed to get 2D context');
        }

        // Set initial size
        this.resize(target.width, target.height);

        // Set default settings
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    beginFrame(context: RenderContext): void {
        if (!this.ctx) return;

        this.ctx.save();

        // Apply pixel ratio scaling
        if (context.pixelRatio !== 1) {
            this.ctx.scale(context.pixelRatio, context.pixelRatio);
        }
    }

    endFrame(context: RenderContext): void {
        if (!this.ctx) return;

        this.ctx.restore();
    }

    clear(color?: string): void {
        if (!this.ctx || !this.canvas) return;

        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    resize(width: number, height: number): void {
        if (!this.canvas) return;

        this.canvas.width = width;
        this.canvas.height = height;
    }

    destroy(): void {
        this.ctx = undefined;
        this.canvas = undefined;
    }

    isSupported(): boolean {
        return typeof CanvasRenderingContext2D !== 'undefined';
    }

    getContext(): CanvasRenderingContext2D | undefined {
        return this.ctx;
    }
}

// WebGL Rendering Strategy
export class WebGLStrategy implements RenderStrategy {
    name = 'webgl';
    type = 'webgl' as const;
    private canvas?: HTMLCanvasElement;
    private gl?: WebGLRenderingContext;

    async initialize(target: RenderTarget): Promise<void> {
        this.canvas = target.canvas;
        this.gl = this.canvas.getContext('webgl', {
            alpha: true,
            depth: true,
            stencil: false,
            antialias: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
        }) as WebGLRenderingContext;

        if (!this.gl) {
            throw new Error('Failed to get WebGL context');
        }

        // Set initial viewport
        this.resize(target.width, target.height);

        // Enable common features
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    beginFrame(context: RenderContext): void {
        if (!this.gl) return;

        this.gl.viewport(0, 0, context.width, context.height);
    }

    endFrame(context: RenderContext): void {
        if (!this.gl) return;

        // Ensure all commands are flushed
        this.gl.flush();
    }

    clear(color?: number[]): void {
        if (!this.gl) return;

        if (color && color.length >= 4) {
            this.gl.clearColor(color[0], color[1], color[2], color[3]);
        } else {
            this.gl.clearColor(0, 0, 0, 0);
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    resize(width: number, height: number): void {
        if (!this.canvas || !this.gl) return;

        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    destroy(): void {
        // Clean up WebGL resources
        if (this.gl) {
            const loseContext = this.gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }
        }

        this.gl = undefined;
        this.canvas = undefined;
    }

    isSupported(): boolean {
        return typeof WebGLRenderingContext !== 'undefined';
    }

    getContext(): WebGLRenderingContext | undefined {
        return this.gl;
    }
}

// WebGL2 Rendering Strategy
export class WebGL2Strategy implements RenderStrategy {
    name = 'webgl2';
    type = 'webgl2' as const;
    private canvas?: HTMLCanvasElement;
    private gl?: WebGL2RenderingContext;

    async initialize(target: RenderTarget): Promise<void> {
        this.canvas = target.canvas;
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            depth: true,
            stencil: false,
            antialias: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
        }) as WebGL2RenderingContext;

        if (!this.gl) {
            throw new Error('Failed to get WebGL2 context');
        }

        // Set initial viewport
        this.resize(target.width, target.height);

        // Enable common features
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    beginFrame(context: RenderContext): void {
        if (!this.gl) return;

        this.gl.viewport(0, 0, context.width, context.height);
    }

    endFrame(context: RenderContext): void {
        if (!this.gl) return;

        this.gl.flush();
    }

    clear(color?: number[]): void {
        if (!this.gl) return;

        if (color && color.length >= 4) {
            this.gl.clearColor(color[0], color[1], color[2], color[3]);
        } else {
            this.gl.clearColor(0, 0, 0, 0);
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    resize(width: number, height: number): void {
        if (!this.canvas || !this.gl) return;

        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    destroy(): void {
        if (this.gl) {
            const loseContext = this.gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }
        }

        this.gl = undefined;
        this.canvas = undefined;
    }

    isSupported(): boolean {
        return typeof WebGL2RenderingContext !== 'undefined';
    }

    getContext(): WebGL2RenderingContext | undefined {
        return this.gl;
    }
}

// Main RenderPipeline class
export class RenderPipeline {
    private strategy?: RenderStrategy;
    private passes: Map<string, RenderPass> = new Map();
    private target?: RenderTarget;

    private isRendering = false;
    private animationFrameId?: number;
    private frameNumber = 0;
    private lastFrameTime = 0;
    private fps = 0;
    private fpsHistory: number[] = [];
    private readonly fpsHistorySize = 60;

    private eventBus: EventBus;
    private container?: DependencyContainer;
    private effectRegistry?: EffectRegistry;

    // Render context data
    private audioData?: RenderContext['audioData'];
    private mediaAssets?: MediaAsset[];
    private mouse?: { x: number; y: number; pressed: boolean };
    private keyboard: Set<string> = new Set();

    constructor(
        eventBus: EventBus = globalEventBus,
        container?: DependencyContainer
    ) {
        this.eventBus = eventBus;
        this.container = container;

        // Try to get effect registry from container
        if (container) {
            this.effectRegistry = container.tryResolve<EffectRegistry>('EffectRegistry');
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Set rendering strategy
     */
    async setStrategy(strategy: RenderStrategy): Promise<void> {
        // Check if supported
        if (!strategy.isSupported()) {
            throw new Error(`Rendering strategy ${strategy.name} is not supported`);
        }

        // Clean up old strategy
        if (this.strategy) {
            this.strategy.destroy();
        }

        this.strategy = strategy;

        // Initialize if we have a target
        if (this.target) {
            await this.strategy.initialize(this.target);
        }
    }

    /**
     * Auto-select best rendering strategy
     */
    async autoSelectStrategy(): Promise<void> {
        // Try strategies in order of preference
        const strategies = [
            new WebGL2Strategy(),
            new WebGLStrategy(),
            new Canvas2DStrategy()
        ];

        for (const strategy of strategies) {
            if (strategy.isSupported()) {
                await this.setStrategy(strategy);
                console.log(`Selected rendering strategy: ${strategy.name}`);
                return;
            }
        }

        throw new Error('No supported rendering strategy found');
    }

    /**
     * Set render target
     */
    async setTarget(canvas: HTMLCanvasElement, width?: number, height?: number): Promise<void> {
        const pixelRatio = window.devicePixelRatio || 1;

        this.target = {
            canvas,
            width: width || canvas.width,
            height: height || canvas.height,
            pixelRatio
        };

        // Initialize strategy if set
        if (this.strategy) {
            await this.strategy.initialize(this.target);
        }
    }

    /**
     * Add render pass
     */
    addPass(pass: RenderPass): void {
        this.passes.set(pass.name, pass);
        this.sortPasses();
    }

    /**
     * Remove render pass
     */
    removePass(name: string): void {
        this.passes.delete(name);
    }

    /**
     * Get render pass
     */
    getPass(name: string): RenderPass | undefined {
        return this.passes.get(name);
    }

    /**
     * Sort passes by order
     */
    private sortPasses(): void {
        const sorted = Array.from(this.passes.values()).sort((a, b) => a.order - b.order);
        this.passes.clear();
        for (const pass of sorted) {
            this.passes.set(pass.name, pass);
        }
    }

    /**
     * Start rendering
     */
    start(): void {
        if (this.isRendering) return;

        this.isRendering = true;
        this.lastFrameTime = performance.now();
        this.render();

        this.eventBus.emit('render:start', undefined);
    }

    /**
     * Stop rendering
     */
    stop(): void {
        this.isRendering = false;

        if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }

        this.eventBus.emit('render:stop', undefined);
    }

    /**
     * Resize
     */
    resize(width: number, height: number): void {
        if (!this.target) return;

        this.target.width = width;
        this.target.height = height;

        if (this.strategy) {
            this.strategy.resize(width * this.target.pixelRatio, height * this.target.pixelRatio);
        }
    }

    /**
     * Update audio data
     */
    updateAudioData(audioData: RenderContext['audioData']): void {
        this.audioData = audioData;
    }

    /**
     * Update media assets
     */
    updateMediaAssets(assets: MediaAsset[]): void {
        this.mediaAssets = assets;
    }

    /**
     * Get current FPS
     */
    getFPS(): number {
        return this.fps;
    }

    /**
     * Get average FPS
     */
    getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return 0;
        return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    }

    /**
     * Get render statistics
     */
    getStats(): {
        fps: number;
        averageFps: number;
        frameNumber: number;
        strategy: string | undefined;
        passes: number;
        enabledPasses: number;
    } {
        let enabledPasses = 0;
        for (const pass of this.passes.values()) {
            if (pass.enabled) enabledPasses++;
        }

        return {
            fps: this.fps,
            averageFps: this.getAverageFPS(),
            frameNumber: this.frameNumber,
            strategy: this.strategy?.name,
            passes: this.passes.size,
            enabledPasses
        };
    }

    /**
     * Main render loop
     */
    private render = (): void => {
        if (!this.isRendering) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;

        // Calculate FPS
        this.fps = 1000 / deltaTime;
        this.fpsHistory.push(this.fps);
        if (this.fpsHistory.length > this.fpsHistorySize) {
            this.fpsHistory.shift();
        }

        // Create render context
        const context: RenderContext = {
            ...this.target!,
            time: now / 1000,
            deltaTime: deltaTime / 1000,
            frameNumber: this.frameNumber,
            fps: this.fps,
            audioData: this.audioData,
            mediaAssets: this.mediaAssets,
            mouse: this.mouse,
            keyboard: this.keyboard
        };

        // Begin frame
        if (this.strategy) {
            this.strategy.beginFrame(context);

            // Clear
            this.strategy.clear();

            // Render passes
            for (const pass of this.passes.values()) {
                if (pass.enabled) {
                    try {
                        pass.render(context);
                    } catch (error) {
                        console.error(`Error in render pass ${pass.name}:`, error);
                    }
                }
            }

            // Render effects if available
            if (this.effectRegistry && this.strategy.getContext()) {
                const effectContext: EffectContext = {
                    canvas: this.target!.canvas,
                    ctx: this.strategy.getContext(),
                    time: context.time,
                    deltaTime: context.deltaTime,
                    resolution: { width: context.width, height: context.height },
                    audioData: context.audioData,
                    mouse: context.mouse,
                    parameters: {}
                };

                this.effectRegistry.renderLayers(effectContext);
            }

            // End frame
            this.strategy.endFrame(context);
        }

        // Emit frame event
        this.eventBus.emit('render:frame', {
            time: context.time,
            deltaTime: context.deltaTime,
            fps: this.fps
        });

        // Update counters
        this.frameNumber++;
        this.lastFrameTime = now;

        // Continue rendering
        this.animationFrameId = requestAnimationFrame(this.render);
    };

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        if (typeof window === 'undefined') return;

        // Mouse events
        window.addEventListener('mousemove', (e) => {
            this.mouse = {
                x: e.clientX,
                y: e.clientY,
                pressed: this.mouse?.pressed || false
            };
        });

        window.addEventListener('mousedown', () => {
            if (this.mouse) {
                this.mouse.pressed = true;
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.mouse) {
                this.mouse.pressed = false;
            }
        });

        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keyboard.add(e.key);
        });

        window.addEventListener('keyup', (e) => {
            this.keyboard.delete(e.key);
        });

        // Audio data events
        this.eventBus.on('audio:analysis', (data) => {
            this.audioData = {
                bass: data.bass,
                mids: data.mids,
                highs: data.highs,
                frequencyData: data.frequencyData,
                timeDomainData: data.timeDomainData
            };
        });
    }

    /**
     * Destroy pipeline
     */
    destroy(): void {
        this.stop();

        if (this.strategy) {
            this.strategy.destroy();
        }

        this.passes.clear();
        this.target = undefined;
        this.audioData = undefined;
        this.mediaAssets = undefined;
    }
}

// Create standard render passes
export class ClearPass implements RenderPass {
    name = 'clear';
    enabled = true;
    order = 0;
    color = '#000000';

    render(context: RenderContext): void {
        if (context.canvas) {
            const ctx = context.canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = this.color;
                ctx.fillRect(0, 0, context.width, context.height);
            }
        }
    }
}

export class MediaPass implements RenderPass {
    name = 'media';
    enabled = true;
    order = 10;

    render(context: RenderContext): void {
        if (!context.mediaAssets || context.mediaAssets.length === 0) return;

        const ctx = context.canvas.getContext('2d');
        if (!ctx) return;

        // Render first media asset (for simplicity)
        const asset = context.mediaAssets[0];
        if (asset.type === 'image' && asset.data instanceof HTMLImageElement) {
            // Scale to fit
            const scale = Math.min(
                context.width / asset.data.width,
                context.height / asset.data.height
            );

            const width = asset.data.width * scale;
            const height = asset.data.height * scale;
            const x = (context.width - width) / 2;
            const y = (context.height - height) / 2;

            ctx.drawImage(asset.data, x, y, width, height);
        } else if (asset.type === 'video' && asset.data instanceof HTMLVideoElement) {
            // Similar logic for video
            const scale = Math.min(
                context.width / asset.data.videoWidth,
                context.height / asset.data.videoHeight
            );

            const width = asset.data.videoWidth * scale;
            const height = asset.data.videoHeight * scale;
            const x = (context.width - width) / 2;
            const y = (context.height - height) / 2;

            ctx.drawImage(asset.data, x, y, width, height);
        }
    }
}

// Global render pipeline instance
export const globalRenderPipeline = new RenderPipeline();