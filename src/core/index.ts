/**
 * Core Module Exports
 * Central export point for all core visualization modules
 */

// Runtime Infrastructure
export * from './EventBus';
export * from './PluginManager';
export * from './DependencyContainer';
export * from './StateStore';

// Media & Audio
export * from './MediaLoader';
export * from './AudioEngine';

// Rendering & Effects
export * from './EffectRegistry';
export * from './RenderPipeline';

// Plugin Development
export * from './PluginSDK';

// Initialize core system
import { EventBus, globalEventBus } from './EventBus';
import { PluginManager, globalPluginManager } from './PluginManager';
import { DependencyContainer, globalContainer } from './DependencyContainer';
import { StateStore, globalStateStore } from './StateStore';
import { MediaLoader, globalMediaLoader } from './MediaLoader';
import { AudioEngine, globalAudioEngine } from './AudioEngine';
import { EffectRegistry, globalEffectRegistry } from './EffectRegistry';
import { RenderPipeline, globalRenderPipeline } from './RenderPipeline';
import { initializeSDK, PluginSDK } from './PluginSDK';

// Core system configuration
export interface CoreConfig {
    enableDebug?: boolean;
    persistence?: 'localStorage' | 'indexedDB' | 'none';
    autosaveInterval?: number;
    maxHistorySize?: number;
    plugins?: string[];
}

// Core system class
export class CoreSystem {
    public eventBus: EventBus;
    public pluginManager: PluginManager;
    public container: DependencyContainer;
    public stateStore: StateStore;
    public mediaLoader: MediaLoader;
    public audioEngine: AudioEngine;
    public effectRegistry: EffectRegistry;
    public renderPipeline: RenderPipeline;
    public sdk: PluginSDK;

    constructor(config?: CoreConfig) {
        // Use global instances
        this.eventBus = globalEventBus;
        this.pluginManager = globalPluginManager;
        this.container = globalContainer;
        this.stateStore = globalStateStore;
        this.mediaLoader = globalMediaLoader;
        this.audioEngine = globalAudioEngine;
        this.effectRegistry = globalEffectRegistry;
        this.renderPipeline = globalRenderPipeline;

        // Initialize SDK
        this.sdk = initializeSDK(
            this.eventBus,
            this.container,
            this.stateStore,
            this.pluginManager,
            this.mediaLoader,
            this.audioEngine,
            this.effectRegistry,
            this.renderPipeline
        );

        // Register core services in container
        this.registerCoreServices();

        // Apply configuration
        if (config) {
            this.configure(config);
        }
    }

    /**
     * Register core services in dependency container
     */
    private registerCoreServices(): void {
        this.container.registerValue('EventBus', this.eventBus);
        this.container.registerValue('PluginManager', this.pluginManager);
        this.container.registerValue('StateStore', this.stateStore);
        this.container.registerValue('MediaLoader', this.mediaLoader);
        this.container.registerValue('AudioEngine', this.audioEngine);
        this.container.registerValue('EffectRegistry', this.effectRegistry);
        this.container.registerValue('RenderPipeline', this.renderPipeline);
        this.container.registerValue('PluginSDK', this.sdk);
    }

    /**
     * Configure core system
     */
    configure(config: CoreConfig): void {
        // Enable debug mode
        if (config.enableDebug) {
            this.eventBus.enableDebug();
        }

        // Configure persistence
        if (config.persistence === 'localStorage') {
            import('./StateStore').then(({ LocalStoragePersistence }) => {
                const persistence = new LocalStoragePersistence();
                this.stateStore = new StateStore(this.eventBus, this.container, persistence);
                this.stateStore.initialize();
            });
        } else if (config.persistence === 'indexedDB') {
            import('./StateStore').then(({ IndexedDBPersistence }) => {
                const persistence = new IndexedDBPersistence();
                this.stateStore = new StateStore(this.eventBus, this.container, persistence);
                this.stateStore.initialize();
            });
        }

        // Load plugins
        if (config.plugins) {
            this.loadPlugins(config.plugins);
        }
    }

    /**
     * Load plugins by name
     */
    async loadPlugins(pluginNames: string[]): Promise<void> {
        for (const name of pluginNames) {
            try {
                // Dynamic import of plugin
                const pluginModule = await import(`../plugins/${name}`);
                const plugin = pluginModule.default || pluginModule.plugin;

                if (plugin) {
                    await this.sdk.registerPlugin(plugin);
                    console.log(`Loaded plugin: ${name}`);
                } else {
                    console.warn(`Plugin ${name} has no default export`);
                }
            } catch (error) {
                console.error(`Failed to load plugin ${name}:`, error);
            }
        }
    }

    /**
     * Initialize core system
     */
    async initialize(): Promise<void> {
        // Initialize state store
        await this.stateStore.initialize();

        // Initialize audio engine
        await this.audioEngine.initialize();

        // Auto-select render strategy
        await this.renderPipeline.autoSelectStrategy();

        // Emit ready event
        this.eventBus.emit('runtime:init', undefined);
        this.eventBus.emit('runtime:ready', undefined);
    }

    /**
     * Shutdown core system
     */
    async shutdown(): Promise<void> {
        // Emit shutdown event
        this.eventBus.emit('runtime:shutdown', undefined);

        // Stop all plugins
        await this.pluginManager.stopAll();

        // Stop rendering
        this.renderPipeline.stop();

        // Stop audio
        this.audioEngine.stop();

        // Persist state
        await this.stateStore.persist();

        // Cleanup
        this.audioEngine.destroy();
        this.renderPipeline.destroy();
        this.stateStore.destroy();
        this.sdk.destroy();
    }

    /**
     * Get system statistics
     */
    getStats(): Record<string, any> {
        return {
            eventBus: this.eventBus.getStats(),
            plugins: this.pluginManager.getStats(),
            container: this.container.getStats(),
            mediaLoader: this.mediaLoader.getCacheStats(),
            effectRegistry: this.effectRegistry.getStats(),
            renderPipeline: this.renderPipeline.getStats()
        };
    }
}

// Create and export default core system instance
export const coreSystem = new CoreSystem();

// Convenience exports for global instances
export {
    globalEventBus,
    globalPluginManager,
    globalContainer,
    globalStateStore,
    globalMediaLoader,
    globalAudioEngine,
    globalEffectRegistry,
    globalRenderPipeline
};

// Export types for external use
export type {
    // Event types
    EventHandler,
    EventOptions,
    EventMap,
    EventMiddleware,

    // Plugin types
    Plugin,
    PluginMetadata,
    PluginLifecycle,
    PluginState,

    // Media types
    MediaAsset,
    MediaStrategy,
    MediaMetadata,

    // Audio types
    AudioAnalysisData,
    BeatEvent,
    AudioConfig,

    // Effect types
    Effect,
    EffectMetadata,
    EffectContext,
    EffectLayer,

    // Render types
    RenderContext,
    RenderPass,
    RenderStrategy,
    RenderFrame,

    // State types
    StateValue,
    StatePath,
    StateListener
};