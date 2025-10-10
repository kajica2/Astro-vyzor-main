/**
 * EffectRegistry - Centralized effect management system with plugin support
 * Manages visual effects, shaders, and post-processing pipelines
 */

import { EventBus, globalEventBus } from './EventBus';
import { DependencyContainer } from './DependencyContainer';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' |
                        'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' |
                        'soft-light' | 'difference' | 'exclusion';

export type TriggerSource = 'manual' | 'audio_bass' | 'audio_mids' | 'audio_highs' |
                           'audio_bass_beat' | 'audio_mids_beat' | 'audio_highs_beat' |
                           'time' | 'mouse' | 'keyboard' | 'custom';

export interface EffectParameter {
    name: string;
    type: 'number' | 'boolean' | 'string' | 'color' | 'select' | 'range' | 'vec2' | 'vec3' | 'vec4';
    value: any;
    default: any;
    min?: number;
    max?: number;
    step?: number;
    options?: any[];
    description?: string;
}

export interface EffectMetadata {
    id: string;
    name: string;
    category: string;
    description?: string;
    author?: string;
    version?: string;
    tags?: string[];
    preview?: string;
    parameters: EffectParameter[];
}

export interface EffectContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext;
    time: number;
    deltaTime: number;
    resolution: { width: number; height: number };
    audioData?: {
        bass: number;
        mids: number;
        highs: number;
        frequencyData: Float32Array;
        timeDomainData: Float32Array;
    };
    mouse?: { x: number; y: number; pressed: boolean };
    parameters: Record<string, any>;
}

export interface Effect {
    metadata: EffectMetadata;

    // Lifecycle methods
    initialize?(context: EffectContext): Promise<void> | void;
    render(context: EffectContext): void;
    cleanup?(): void;

    // Parameter management
    setParameter(name: string, value: any): void;
    getParameter(name: string): any;
    getParameters(): Record<string, any>;
    resetParameters(): void;

    // Optional methods
    resize?(width: number, height: number): void;
    isSupported?(): boolean;
}

// Base class for effects
export abstract class BaseEffect implements Effect {
    abstract metadata: EffectMetadata;
    protected parameters: Record<string, any> = {};
    protected initialized = false;

    constructor() {
        this.resetParameters();
    }

    async initialize(context: EffectContext): Promise<void> {
        this.initialized = true;
    }

    abstract render(context: EffectContext): void;

    cleanup(): void {
        this.initialized = false;
    }

    setParameter(name: string, value: any): void {
        const param = this.metadata.parameters.find(p => p.name === name);
        if (param) {
            // Validate and clamp value
            if (param.type === 'number' || param.type === 'range') {
                if (param.min !== undefined) value = Math.max(param.min, value);
                if (param.max !== undefined) value = Math.min(param.max, value);
            }
            this.parameters[name] = value;
        }
    }

    getParameter(name: string): any {
        return this.parameters[name];
    }

    getParameters(): Record<string, any> {
        return { ...this.parameters };
    }

    resetParameters(): void {
        this.parameters = {};
        for (const param of this.metadata.parameters) {
            this.parameters[param.name] = param.default;
        }
    }

    isSupported(): boolean {
        return true;
    }
}

// Canvas 2D Effect base class
export abstract class Canvas2DEffect extends BaseEffect {
    protected offscreenCanvas?: HTMLCanvasElement;
    protected offscreenCtx?: CanvasRenderingContext2D;

    async initialize(context: EffectContext): Promise<void> {
        await super.initialize(context);

        // Create offscreen canvas
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = context.resolution.width;
        this.offscreenCanvas.height = context.resolution.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    }

    resize(width: number, height: number): void {
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = width;
            this.offscreenCanvas.height = height;
        }
    }

    cleanup(): void {
        super.cleanup();
        this.offscreenCanvas = undefined;
        this.offscreenCtx = undefined;
    }
}

// WebGL Shader Effect base class
export abstract class ShaderEffect extends BaseEffect {
    protected gl?: WebGLRenderingContext | WebGL2RenderingContext;
    protected program?: WebGLProgram;
    protected uniforms: Record<string, WebGLUniformLocation> = {};
    protected vertexShader?: WebGLShader;
    protected fragmentShader?: WebGLShader;
    protected quadBuffer?: WebGLBuffer;

    abstract getVertexShaderSource(): string;
    abstract getFragmentShaderSource(): string;

    async initialize(context: EffectContext): Promise<void> {
        await super.initialize(context);

        if (!(context.ctx instanceof WebGLRenderingContext || context.ctx instanceof WebGL2RenderingContext)) {
            throw new Error('ShaderEffect requires WebGL context');
        }

        this.gl = context.ctx;
        this.compileShaders();
        this.setupQuad();
        this.locateUniforms();
    }

    protected compileShaders(): void {
        if (!this.gl) return;

        // Compile vertex shader
        this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
        this.gl.shaderSource(this.vertexShader, this.getVertexShaderSource());
        this.gl.compileShader(this.vertexShader);

        if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
            throw new Error(`Vertex shader compilation failed: ${this.gl.getShaderInfoLog(this.vertexShader)}`);
        }

        // Compile fragment shader
        this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
        this.gl.shaderSource(this.fragmentShader, this.getFragmentShaderSource());
        this.gl.compileShader(this.fragmentShader);

        if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
            throw new Error(`Fragment shader compilation failed: ${this.gl.getShaderInfoLog(this.fragmentShader)}`);
        }

        // Create and link program
        this.program = this.gl.createProgram()!;
        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            throw new Error(`Shader program linking failed: ${this.gl.getProgramInfoLog(this.program)}`);
        }
    }

    protected setupQuad(): void {
        if (!this.gl || !this.program) return;

        // Create fullscreen quad
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);

        this.quadBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        // Set up vertex attribute
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    protected locateUniforms(): void {
        if (!this.gl || !this.program) return;

        // Standard uniforms
        this.uniforms.u_time = this.gl.getUniformLocation(this.program, 'u_time')!;
        this.uniforms.u_resolution = this.gl.getUniformLocation(this.program, 'u_resolution')!;
        this.uniforms.u_mouse = this.gl.getUniformLocation(this.program, 'u_mouse')!;

        // Audio uniforms
        this.uniforms.u_bass = this.gl.getUniformLocation(this.program, 'u_bass')!;
        this.uniforms.u_mids = this.gl.getUniformLocation(this.program, 'u_mids')!;
        this.uniforms.u_highs = this.gl.getUniformLocation(this.program, 'u_highs')!;

        // Parameter uniforms
        for (const param of this.metadata.parameters) {
            this.uniforms[`u_${param.name}`] = this.gl.getUniformLocation(this.program, `u_${param.name}`)!;
        }
    }

    render(context: EffectContext): void {
        if (!this.gl || !this.program) return;

        this.gl.useProgram(this.program);

        // Set standard uniforms
        this.gl.uniform1f(this.uniforms.u_time, context.time);
        this.gl.uniform2f(this.uniforms.u_resolution, context.resolution.width, context.resolution.height);

        if (context.mouse) {
            this.gl.uniform2f(this.uniforms.u_mouse, context.mouse.x, context.mouse.y);
        }

        if (context.audioData) {
            this.gl.uniform1f(this.uniforms.u_bass, context.audioData.bass);
            this.gl.uniform1f(this.uniforms.u_mids, context.audioData.mids);
            this.gl.uniform1f(this.uniforms.u_highs, context.audioData.highs);
        }

        // Set parameter uniforms
        for (const param of this.metadata.parameters) {
            const value = this.parameters[param.name];
            const location = this.uniforms[`u_${param.name}`];

            if (location) {
                switch (param.type) {
                    case 'number':
                    case 'range':
                        this.gl.uniform1f(location, value);
                        break;
                    case 'boolean':
                        this.gl.uniform1i(location, value ? 1 : 0);
                        break;
                    case 'vec2':
                        this.gl.uniform2fv(location, value);
                        break;
                    case 'vec3':
                        this.gl.uniform3fv(location, value);
                        break;
                    case 'vec4':
                        this.gl.uniform4fv(location, value);
                        break;
                }
            }
        }

        // Draw quad
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    cleanup(): void {
        super.cleanup();
        if (this.gl) {
            if (this.program) this.gl.deleteProgram(this.program);
            if (this.vertexShader) this.gl.deleteShader(this.vertexShader);
            if (this.fragmentShader) this.gl.deleteShader(this.fragmentShader);
            if (this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);
        }
    }
}

// Effect Layer for compositing
export interface EffectLayer {
    id: string;
    effect: Effect;
    enabled: boolean;
    opacity: number;
    blendMode: BlendMode;
    triggerSource: TriggerSource;
    order: number;
}

// Main EffectRegistry class
export class EffectRegistry {
    private effects: Map<string, Effect> = new Map();
    private layers: Map<string, EffectLayer> = new Map();
    private categories: Map<string, Set<string>> = new Map();
    private eventBus: EventBus;
    private container?: DependencyContainer;

    constructor(eventBus: EventBus = globalEventBus, container?: DependencyContainer) {
        this.eventBus = eventBus;
        this.container = container;
    }

    /**
     * Register an effect
     */
    register(effect: Effect): void {
        const { id, category } = effect.metadata;

        // Check if supported
        if (effect.isSupported && !effect.isSupported()) {
            throw new Error(`Effect ${id} is not supported on this platform`);
        }

        this.effects.set(id, effect);

        // Add to category
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category)!.add(id);

        this.eventBus.emit('effect:applied', { id, params: effect.getParameters() });
    }

    /**
     * Unregister an effect
     */
    unregister(id: string): void {
        const effect = this.effects.get(id);
        if (!effect) return;

        // Remove from layers
        for (const [layerId, layer] of this.layers) {
            if (layer.effect === effect) {
                this.removeLayer(layerId);
            }
        }

        // Cleanup effect
        effect.cleanup?.();

        // Remove from registry
        this.effects.delete(id);

        // Remove from category
        const category = effect.metadata.category;
        this.categories.get(category)?.delete(id);

        this.eventBus.emit('effect:removed', { id });
    }

    /**
     * Get effect by ID
     */
    getEffect(id: string): Effect | undefined {
        return this.effects.get(id);
    }

    /**
     * Get effects by category
     */
    getEffectsByCategory(category: string): Effect[] {
        const ids = this.categories.get(category);
        if (!ids) return [];

        return Array.from(ids).map(id => this.effects.get(id)!).filter(Boolean);
    }

    /**
     * Get effects by tag
     */
    getEffectsByTag(tag: string): Effect[] {
        const results: Effect[] = [];

        for (const effect of this.effects.values()) {
            if (effect.metadata.tags?.includes(tag)) {
                results.push(effect);
            }
        }

        return results;
    }

    /**
     * Get all effects
     */
    getAllEffects(): Effect[] {
        return Array.from(this.effects.values());
    }

    /**
     * Get all categories
     */
    getCategories(): string[] {
        return Array.from(this.categories.keys());
    }

    /**
     * Create effect layer
     */
    createLayer(
        id: string,
        effectId: string,
        options?: Partial<EffectLayer>
    ): EffectLayer {
        const effect = this.effects.get(effectId);
        if (!effect) {
            throw new Error(`Effect ${effectId} not found`);
        }

        const layer: EffectLayer = {
            id,
            effect,
            enabled: options?.enabled ?? true,
            opacity: options?.opacity ?? 1,
            blendMode: options?.blendMode ?? 'normal',
            triggerSource: options?.triggerSource ?? 'manual',
            order: options?.order ?? this.layers.size
        };

        this.layers.set(id, layer);
        return layer;
    }

    /**
     * Remove layer
     */
    removeLayer(id: string): void {
        this.layers.delete(id);
    }

    /**
     * Get layer
     */
    getLayer(id: string): EffectLayer | undefined {
        return this.layers.get(id);
    }

    /**
     * Get all layers sorted by order
     */
    getLayers(): EffectLayer[] {
        return Array.from(this.layers.values()).sort((a, b) => a.order - b.order);
    }

    /**
     * Update layer
     */
    updateLayer(id: string, updates: Partial<EffectLayer>): void {
        const layer = this.layers.get(id);
        if (!layer) return;

        Object.assign(layer, updates);
    }

    /**
     * Render all layers
     */
    renderLayers(context: EffectContext): void {
        const layers = this.getLayers();

        for (const layer of layers) {
            if (!layer.enabled) continue;

            // Check trigger
            if (!this.shouldTrigger(layer, context)) continue;

            // Apply opacity
            const originalAlpha = context.ctx instanceof CanvasRenderingContext2D
                ? context.ctx.globalAlpha
                : 1;

            if (context.ctx instanceof CanvasRenderingContext2D) {
                context.ctx.globalAlpha = layer.opacity;
                context.ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
            }

            // Render effect
            try {
                layer.effect.render(context);
            } catch (error) {
                this.eventBus.emit('effect:error', {
                    id: layer.effect.metadata.id,
                    error: error as Error
                });
            }

            // Restore context
            if (context.ctx instanceof CanvasRenderingContext2D) {
                context.ctx.globalAlpha = originalAlpha;
                context.ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

    /**
     * Check if layer should trigger
     */
    private shouldTrigger(layer: EffectLayer, context: EffectContext): boolean {
        switch (layer.triggerSource) {
            case 'manual':
                return true;

            case 'audio_bass':
                return (context.audioData?.bass ?? 0) > 0.5;

            case 'audio_mids':
                return (context.audioData?.mids ?? 0) > 0.5;

            case 'audio_highs':
                return (context.audioData?.highs ?? 0) > 0.5;

            case 'audio_bass_beat':
            case 'audio_mids_beat':
            case 'audio_highs_beat':
                // These would need beat detection data
                return false;

            case 'time':
                return true;

            case 'mouse':
                return context.mouse?.pressed ?? false;

            default:
                return false;
        }
    }

    /**
     * Get registry statistics
     */
    getStats(): {
        totalEffects: number;
        categories: number;
        layers: number;
        enabledLayers: number;
    } {
        let enabledLayers = 0;
        for (const layer of this.layers.values()) {
            if (layer.enabled) enabledLayers++;
        }

        return {
            totalEffects: this.effects.size,
            categories: this.categories.size,
            layers: this.layers.size,
            enabledLayers
        };
    }
}

// Global effect registry instance
export const globalEffectRegistry = new EffectRegistry();