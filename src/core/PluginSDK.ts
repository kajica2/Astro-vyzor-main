/**
 * PluginSDK - Unified API for plugin development
 * Provides access to all core modules and utilities for plugin authors
 */

import { Plugin, PluginMetadata, PluginLifecycle, PluginManager } from './PluginManager';
import { EventBus, EventMap, EventHandler, EventOptions } from './EventBus';
import { DependencyContainer, ServiceProvider, ServiceDescriptor } from './DependencyContainer';
import { MediaLoader, MediaAsset, MediaStrategy, MediaLoadOptions } from './MediaLoader';
import { AudioEngine, AudioAnalysisData, BeatEvent, AnalysisStrategy, BeatDetectionStrategy } from './AudioEngine';
import { EffectRegistry, Effect, EffectLayer, BaseEffect, Canvas2DEffect, ShaderEffect } from './EffectRegistry';
import { RenderPipeline, RenderPass, RenderStrategy, RenderContext } from './RenderPipeline';
import { StateStore, StateListener, StatePath } from './StateStore';

// Plugin context provided to all plugins
export interface PluginContext {
    // Core modules
    eventBus: EventBus;
    container: DependencyContainer;
    stateStore: StateStore;
    pluginManager: PluginManager;
    mediaLoader: MediaLoader;
    audioEngine: AudioEngine;
    effectRegistry: EffectRegistry;
    renderPipeline: RenderPipeline;

    // Plugin-specific
    pluginId: string;
    pluginConfig: any;

    // Utilities
    logger: Logger;
    storage: PluginStorage;
    api: PluginAPI;
}

// Logger for plugins
export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

// Storage for plugin data
export interface PluginStorage {
    get<T>(key: string, defaultValue?: T): Promise<T | undefined>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
}

// Plugin API for inter-plugin communication
export interface PluginAPI {
    call(pluginId: string, method: string, ...args: any[]): Promise<any>;
    expose(method: string, handler: (...args: any[]) => any): void;
    getExposed(pluginId: string): string[];
}

// Base Plugin class
export abstract class BasePlugin implements Plugin {
    abstract metadata: PluginMetadata;
    protected context!: PluginContext;
    protected initialized = false;
    protected started = false;

    // Lifecycle methods
    async onInit(): Promise<void> {
        this.initialized = true;
    }

    async onStart(): Promise<void> {
        this.started = true;
    }

    async onStop(): Promise<void> {
        this.started = false;
    }

    async onDestroy(): Promise<void> {
        this.initialized = false;
    }

    // Configuration
    configure(config: any): void {
        // Override in subclass
    }

    // API exposure
    getAPI(): any {
        return null;
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        return this.initialized && !this.hasErrors();
    }

    // Internal methods
    protected hasErrors(): boolean {
        return false;
    }

    // Context injection
    setContext(context: PluginContext): void {
        this.context = context;
    }
}

// Effect Plugin base class
export abstract class EffectPlugin extends BasePlugin {
    protected effect!: Effect;

    async onInit(): Promise<void> {
        await super.onInit();
        this.effect = this.createEffect();
        this.context.effectRegistry.register(this.effect);
    }

    async onDestroy(): Promise<void> {
        if (this.effect) {
            this.context.effectRegistry.unregister(this.effect.metadata.id);
        }
        await super.onDestroy();
    }

    abstract createEffect(): Effect;
}

// Audio Analysis Plugin base class
export abstract class AudioAnalysisPlugin extends BasePlugin {
    protected strategy!: AnalysisStrategy | BeatDetectionStrategy;

    async onStart(): Promise<void> {
        await super.onStart();
        this.strategy = this.createStrategy();

        if ('analyze' in this.strategy) {
            this.context.audioEngine.setAnalysisStrategy(this.strategy);
        } else {
            this.context.audioEngine.setBeatDetectionStrategy(this.strategy);
        }
    }

    abstract createStrategy(): AnalysisStrategy | BeatDetectionStrategy;
}

// Media Loader Plugin base class
export abstract class MediaLoaderPlugin extends BasePlugin {
    protected strategy!: MediaStrategy;

    async onInit(): Promise<void> {
        await super.onInit();
        this.strategy = this.createStrategy();
        this.context.mediaLoader.registerStrategy(this.strategy);
    }

    abstract createStrategy(): MediaStrategy;
}

// Render Pass Plugin base class
export abstract class RenderPassPlugin extends BasePlugin {
    protected pass!: RenderPass;

    async onStart(): Promise<void> {
        await super.onStart();
        this.pass = this.createPass();
        this.context.renderPipeline.addPass(this.pass);
    }

    async onStop(): Promise<void> {
        if (this.pass) {
            this.context.renderPipeline.removePass(this.pass.name);
        }
        await super.onStop();
    }

    abstract createPass(): RenderPass;
}

// Plugin Builder for easy plugin creation
export class PluginBuilder {
    private metadata: Partial<PluginMetadata> = {};
    private lifecycle: Partial<PluginLifecycle> = {};
    private api: any = null;
    private configHandler?: (config: any) => void;

    id(id: string): this {
        this.metadata.id = id;
        return this;
    }

    name(name: string): this {
        this.metadata.name = name;
        return this;
    }

    version(version: string): this {
        this.metadata.version = version;
        return this;
    }

    description(description: string): this {
        this.metadata.description = description;
        return this;
    }

    author(author: string): this {
        this.metadata.author = author;
        return this;
    }

    dependencies(deps: string[]): this {
        this.metadata.dependencies = deps;
        return this;
    }

    provides(capabilities: string[]): this {
        this.metadata.provides = capabilities;
        return this;
    }

    tags(tags: string[]): this {
        this.metadata.tags = tags;
        return this;
    }

    onInit(handler: () => Promise<void> | void): this {
        this.lifecycle.onInit = handler;
        return this;
    }

    onStart(handler: () => Promise<void> | void): this {
        this.lifecycle.onStart = handler;
        return this;
    }

    onStop(handler: () => Promise<void> | void): this {
        this.lifecycle.onStop = handler;
        return this;
    }

    onDestroy(handler: () => Promise<void> | void): this {
        this.lifecycle.onDestroy = handler;
        return this;
    }

    onConfigure(handler: (config: any) => void): this {
        this.configHandler = handler;
        return this;
    }

    exposeAPI(api: any): this {
        this.api = api;
        return this;
    }

    build(): Plugin {
        if (!this.metadata.id || !this.metadata.name || !this.metadata.version) {
            throw new Error('Plugin must have id, name, and version');
        }

        return {
            metadata: this.metadata as PluginMetadata,
            ...this.lifecycle,
            configure: this.configHandler,
            getAPI: () => this.api
        };
    }
}

// Plugin SDK main class
export class PluginSDK {
    private contexts: Map<string, PluginContext> = new Map();
    private storages: Map<string, PluginStorage> = new Map();
    private apis: Map<string, Map<string, Function>> = new Map();

    constructor(
        private eventBus: EventBus,
        private container: DependencyContainer,
        private stateStore: StateStore,
        private pluginManager: PluginManager,
        private mediaLoader: MediaLoader,
        private audioEngine: AudioEngine,
        private effectRegistry: EffectRegistry,
        private renderPipeline: RenderPipeline
    ) {}

    /**
     * Create plugin context
     */
    createContext(pluginId: string, config?: any): PluginContext {
        const logger = this.createLogger(pluginId);
        const storage = this.createStorage(pluginId);
        const api = this.createAPI(pluginId);

        const context: PluginContext = {
            eventBus: this.eventBus,
            container: this.container,
            stateStore: this.stateStore,
            pluginManager: this.pluginManager,
            mediaLoader: this.mediaLoader,
            audioEngine: this.audioEngine,
            effectRegistry: this.effectRegistry,
            renderPipeline: this.renderPipeline,
            pluginId,
            pluginConfig: config,
            logger,
            storage,
            api
        };

        this.contexts.set(pluginId, context);
        return context;
    }

    /**
     * Get plugin context
     */
    getContext(pluginId: string): PluginContext | undefined {
        return this.contexts.get(pluginId);
    }

    /**
     * Create logger for plugin
     */
    private createLogger(pluginId: string): Logger {
        const prefix = `[${pluginId}]`;

        return {
            debug: (message: string, ...args: any[]) => {
                console.debug(`${prefix} ${message}`, ...args);
            },
            info: (message: string, ...args: any[]) => {
                console.info(`${prefix} ${message}`, ...args);
            },
            warn: (message: string, ...args: any[]) => {
                console.warn(`${prefix} ${message}`, ...args);
            },
            error: (message: string, ...args: any[]) => {
                console.error(`${prefix} ${message}`, ...args);
                this.eventBus.emit('plugin:error', {
                    id: pluginId,
                    error: new Error(message)
                });
            }
        };
    }

    /**
     * Create storage for plugin
     */
    private createStorage(pluginId: string): PluginStorage {
        const prefix = `plugin_${pluginId}_`;

        const storage: PluginStorage = {
            get: async <T>(key: string, defaultValue?: T): Promise<T | undefined> => {
                try {
                    const value = localStorage.getItem(prefix + key);
                    return value ? JSON.parse(value) : defaultValue;
                } catch {
                    return defaultValue;
                }
            },
            set: async (key: string, value: any): Promise<void> => {
                try {
                    localStorage.setItem(prefix + key, JSON.stringify(value));
                } catch (error) {
                    console.error(`Failed to save plugin data: ${error}`);
                }
            },
            delete: async (key: string): Promise<void> => {
                localStorage.removeItem(prefix + key);
            },
            clear: async (): Promise<void> => {
                const keys = await storage.keys();
                for (const key of keys) {
                    await storage.delete(key);
                }
            },
            keys: async (): Promise<string[]> => {
                const allKeys = Object.keys(localStorage);
                const pluginKeys = allKeys
                    .filter(k => k.startsWith(prefix))
                    .map(k => k.substring(prefix.length));
                return pluginKeys;
            }
        };

        this.storages.set(pluginId, storage);
        return storage;
    }

    /**
     * Create API for plugin
     */
    private createAPI(pluginId: string): PluginAPI {
        if (!this.apis.has(pluginId)) {
            this.apis.set(pluginId, new Map());
        }

        const pluginAPIs = this.apis.get(pluginId)!;

        return {
            call: async (targetPluginId: string, method: string, ...args: any[]): Promise<any> => {
                const targetAPIs = this.apis.get(targetPluginId);
                if (!targetAPIs || !targetAPIs.has(method)) {
                    throw new Error(`Method ${method} not found on plugin ${targetPluginId}`);
                }

                const handler = targetAPIs.get(method)!;
                return handler(...args);
            },
            expose: (method: string, handler: (...args: any[]) => any): void => {
                pluginAPIs.set(method, handler);
            },
            getExposed: (targetPluginId: string): string[] => {
                const targetAPIs = this.apis.get(targetPluginId);
                return targetAPIs ? Array.from(targetAPIs.keys()) : [];
            }
        };
    }

    /**
     * Register plugin with SDK
     */
    async registerPlugin(plugin: Plugin, config?: any): Promise<void> {
        const context = this.createContext(plugin.metadata.id, config);

        // Inject context if plugin extends BasePlugin
        if (plugin instanceof BasePlugin) {
            plugin.setContext(context);
        }

        // Register with plugin manager
        await this.pluginManager.register(plugin, config);
    }

    /**
     * Create a simple plugin
     */
    createPlugin(
        metadata: PluginMetadata,
        handlers: Partial<PluginLifecycle> & {
            configure?: (config: any) => void;
            getAPI?: () => any;
        }
    ): Plugin {
        return {
            metadata,
            ...handlers
        };
    }

    /**
     * Plugin builder
     */
    builder(): PluginBuilder {
        return new PluginBuilder();
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.contexts.clear();
        this.storages.clear();
        this.apis.clear();
    }
}

// Export utilities for plugin development
export * from './EventBus';
export * from './PluginManager';
export * from './DependencyContainer';
export * from './MediaLoader';
export * from './AudioEngine';
export * from './EffectRegistry';
export * from './RenderPipeline';
export * from './StateStore';

// Create global SDK instance
let globalSDK: PluginSDK | null = null;

export function initializeSDK(
    eventBus: EventBus,
    container: DependencyContainer,
    stateStore: StateStore,
    pluginManager: PluginManager,
    mediaLoader: MediaLoader,
    audioEngine: AudioEngine,
    effectRegistry: EffectRegistry,
    renderPipeline: RenderPipeline
): PluginSDK {
    globalSDK = new PluginSDK(
        eventBus,
        container,
        stateStore,
        pluginManager,
        mediaLoader,
        audioEngine,
        effectRegistry,
        renderPipeline
    );
    return globalSDK;
}

export function getGlobalSDK(): PluginSDK | null {
    return globalSDK;
}