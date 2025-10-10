/**
 * PluginManager - Manages plugin lifecycle, dependencies, and registration
 */

import { EventBus, globalEventBus } from './EventBus';

export interface PluginMetadata {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    dependencies?: string[];
    optionalDependencies?: string[];
    provides?: string[];
    tags?: string[];
}

export interface PluginLifecycle {
    onInit?: () => Promise<void> | void;
    onStart?: () => Promise<void> | void;
    onStop?: () => Promise<void> | void;
    onDestroy?: () => Promise<void> | void;
}

export interface Plugin extends PluginLifecycle {
    metadata: PluginMetadata;

    // Optional methods for plugins to implement
    configure?: (config: any) => void;
    getAPI?: () => any;
    healthCheck?: () => Promise<boolean>;
}

export enum PluginState {
    REGISTERED = 'registered',
    INITIALIZING = 'initializing',
    INITIALIZED = 'initialized',
    STARTING = 'starting',
    STARTED = 'started',
    STOPPING = 'stopping',
    STOPPED = 'stopped',
    ERROR = 'error',
    DESTROYED = 'destroyed'
}

interface PluginEntry {
    plugin: Plugin;
    state: PluginState;
    config?: any;
    error?: Error;
    dependents: Set<string>;
    loadOrder: number;
}

export class PluginManager {
    private plugins: Map<string, PluginEntry> = new Map();
    private loadOrderCounter: number = 0;
    private eventBus: EventBus;

    constructor(eventBus: EventBus = globalEventBus) {
        this.eventBus = eventBus;
    }

    /**
     * Register a new plugin
     */
    async register(plugin: Plugin, config?: any): Promise<void> {
        const { id } = plugin.metadata;

        if (this.plugins.has(id)) {
            throw new Error(`Plugin ${id} is already registered`);
        }

        // Validate dependencies
        this.validateDependencies(plugin);

        const entry: PluginEntry = {
            plugin,
            state: PluginState.REGISTERED,
            config,
            dependents: new Set(),
            loadOrder: this.loadOrderCounter++
        };

        this.plugins.set(id, entry);

        // Update dependents for dependencies
        this.updateDependents(plugin);

        this.eventBus.emit('plugin:register', { id, plugin });

        // Auto-initialize if dependencies are met
        if (this.areDependenciesMet(plugin)) {
            await this.initializePlugin(id);
        }
    }

    /**
     * Unregister a plugin
     */
    async unregister(id: string): Promise<void> {
        const entry = this.plugins.get(id);
        if (!entry) {
            throw new Error(`Plugin ${id} not found`);
        }

        // Check if other plugins depend on this
        if (entry.dependents.size > 0) {
            const dependentIds = Array.from(entry.dependents);
            throw new Error(
                `Cannot unregister ${id}: plugins ${dependentIds.join(', ')} depend on it`
            );
        }

        // Stop and destroy the plugin
        if (entry.state === PluginState.STARTED) {
            await this.stopPlugin(id);
        }

        if (entry.plugin.onDestroy) {
            await entry.plugin.onDestroy();
        }

        entry.state = PluginState.DESTROYED;
        this.plugins.delete(id);

        this.eventBus.emit('plugin:unloaded', { id });
    }

    /**
     * Initialize a plugin
     */
    private async initializePlugin(id: string): Promise<void> {
        const entry = this.plugins.get(id);
        if (!entry) return;

        if (entry.state !== PluginState.REGISTERED) {
            return; // Already initialized
        }

        try {
            entry.state = PluginState.INITIALIZING;

            // Configure the plugin if needed
            if (entry.plugin.configure && entry.config) {
                entry.plugin.configure(entry.config);
            }

            // Call onInit lifecycle method
            if (entry.plugin.onInit) {
                await entry.plugin.onInit();
            }

            entry.state = PluginState.INITIALIZED;
            this.eventBus.emit('plugin:loaded', { id });

            // Initialize dependent plugins
            await this.initializeDependentPlugins(id);

        } catch (error) {
            entry.state = PluginState.ERROR;
            entry.error = error as Error;
            this.eventBus.emit('plugin:error', { id, error: error as Error });
            throw error;
        }
    }

    /**
     * Start a plugin
     */
    async startPlugin(id: string): Promise<void> {
        const entry = this.plugins.get(id);
        if (!entry) {
            throw new Error(`Plugin ${id} not found`);
        }

        if (entry.state === PluginState.STARTED) {
            return; // Already started
        }

        if (entry.state !== PluginState.INITIALIZED && entry.state !== PluginState.STOPPED) {
            throw new Error(`Plugin ${id} must be initialized before starting`);
        }

        try {
            entry.state = PluginState.STARTING;

            // Start dependencies first
            await this.startDependencies(entry.plugin);

            // Call onStart lifecycle method
            if (entry.plugin.onStart) {
                await entry.plugin.onStart();
            }

            entry.state = PluginState.STARTED;

        } catch (error) {
            entry.state = PluginState.ERROR;
            entry.error = error as Error;
            this.eventBus.emit('plugin:error', { id, error: error as Error });
            throw error;
        }
    }

    /**
     * Stop a plugin
     */
    async stopPlugin(id: string): Promise<void> {
        const entry = this.plugins.get(id);
        if (!entry) {
            throw new Error(`Plugin ${id} not found`);
        }

        if (entry.state !== PluginState.STARTED) {
            return; // Not running
        }

        try {
            entry.state = PluginState.STOPPING;

            // Stop dependents first
            await this.stopDependents(id);

            // Call onStop lifecycle method
            if (entry.plugin.onStop) {
                await entry.plugin.onStop();
            }

            entry.state = PluginState.STOPPED;

        } catch (error) {
            entry.state = PluginState.ERROR;
            entry.error = error as Error;
            this.eventBus.emit('plugin:error', { id, error: error as Error });
            throw error;
        }
    }

    /**
     * Start all plugins
     */
    async startAll(): Promise<void> {
        const sortedPlugins = this.getTopologicallySortedPlugins();

        for (const id of sortedPlugins) {
            const entry = this.plugins.get(id)!;
            if (entry.state === PluginState.INITIALIZED || entry.state === PluginState.STOPPED) {
                await this.startPlugin(id);
            }
        }
    }

    /**
     * Stop all plugins
     */
    async stopAll(): Promise<void> {
        const sortedPlugins = this.getTopologicallySortedPlugins().reverse();

        for (const id of sortedPlugins) {
            const entry = this.plugins.get(id)!;
            if (entry.state === PluginState.STARTED) {
                await this.stopPlugin(id);
            }
        }
    }

    /**
     * Get a plugin by ID
     */
    getPlugin(id: string): Plugin | undefined {
        return this.plugins.get(id)?.plugin;
    }

    /**
     * Get plugin API
     */
    getPluginAPI(id: string): any {
        const entry = this.plugins.get(id);
        if (!entry) {
            throw new Error(`Plugin ${id} not found`);
        }

        if (entry.plugin.getAPI) {
            return entry.plugin.getAPI();
        }

        return null;
    }

    /**
     * Get plugins by tag
     */
    getPluginsByTag(tag: string): Plugin[] {
        const plugins: Plugin[] = [];

        for (const entry of this.plugins.values()) {
            if (entry.plugin.metadata.tags?.includes(tag)) {
                plugins.push(entry.plugin);
            }
        }

        return plugins;
    }

    /**
     * Get plugins that provide a capability
     */
    getPluginsProviding(capability: string): Plugin[] {
        const plugins: Plugin[] = [];

        for (const entry of this.plugins.values()) {
            if (entry.plugin.metadata.provides?.includes(capability)) {
                plugins.push(entry.plugin);
            }
        }

        return plugins;
    }

    /**
     * Check plugin health
     */
    async checkHealth(id: string): Promise<boolean> {
        const entry = this.plugins.get(id);
        if (!entry) {
            return false;
        }

        if (entry.state !== PluginState.STARTED) {
            return false;
        }

        if (entry.plugin.healthCheck) {
            try {
                return await entry.plugin.healthCheck();
            } catch {
                return false;
            }
        }

        return true;
    }

    /**
     * Check health of all plugins
     */
    async checkAllHealth(): Promise<Map<string, boolean>> {
        const health = new Map<string, boolean>();

        for (const [id] of this.plugins) {
            health.set(id, await this.checkHealth(id));
        }

        return health;
    }

    /**
     * Get plugin state
     */
    getPluginState(id: string): PluginState | undefined {
        return this.plugins.get(id)?.state;
    }

    /**
     * Get all plugin states
     */
    getAllStates(): Map<string, PluginState> {
        const states = new Map<string, PluginState>();

        for (const [id, entry] of this.plugins) {
            states.set(id, entry.state);
        }

        return states;
    }

    /**
     * Validate plugin dependencies
     */
    private validateDependencies(plugin: Plugin): void {
        if (!plugin.metadata.dependencies) return;

        for (const dep of plugin.metadata.dependencies) {
            // Check if dependency is registered (might not be initialized yet)
            let found = false;

            for (const entry of this.plugins.values()) {
                if (entry.plugin.metadata.id === dep ||
                    entry.plugin.metadata.provides?.includes(dep)) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                throw new Error(
                    `Plugin ${plugin.metadata.id} requires ${dep} which is not available`
                );
            }
        }
    }

    /**
     * Check if dependencies are met
     */
    private areDependenciesMet(plugin: Plugin): boolean {
        if (!plugin.metadata.dependencies) return true;

        for (const dep of plugin.metadata.dependencies) {
            let met = false;

            for (const [id, entry] of this.plugins) {
                if ((entry.plugin.metadata.id === dep ||
                     entry.plugin.metadata.provides?.includes(dep)) &&
                    entry.state >= PluginState.INITIALIZED) {
                    met = true;
                    break;
                }
            }

            if (!met) return false;
        }

        return true;
    }

    /**
     * Update dependents tracking
     */
    private updateDependents(plugin: Plugin): void {
        if (!plugin.metadata.dependencies) return;

        for (const dep of plugin.metadata.dependencies) {
            for (const [id, entry] of this.plugins) {
                if (entry.plugin.metadata.id === dep ||
                    entry.plugin.metadata.provides?.includes(dep)) {
                    entry.dependents.add(plugin.metadata.id);
                }
            }
        }
    }

    /**
     * Initialize dependent plugins
     */
    private async initializeDependentPlugins(providerId: string): Promise<void> {
        const provider = this.plugins.get(providerId);
        if (!provider) return;

        // Find plugins waiting for this provider
        for (const [id, entry] of this.plugins) {
            if (entry.state === PluginState.REGISTERED &&
                this.areDependenciesMet(entry.plugin)) {
                await this.initializePlugin(id);
            }
        }
    }

    /**
     * Start dependencies
     */
    private async startDependencies(plugin: Plugin): Promise<void> {
        if (!plugin.metadata.dependencies) return;

        for (const dep of plugin.metadata.dependencies) {
            for (const [id, entry] of this.plugins) {
                if ((entry.plugin.metadata.id === dep ||
                     entry.plugin.metadata.provides?.includes(dep)) &&
                    entry.state !== PluginState.STARTED) {
                    await this.startPlugin(id);
                }
            }
        }
    }

    /**
     * Stop dependents
     */
    private async stopDependents(pluginId: string): Promise<void> {
        const entry = this.plugins.get(pluginId);
        if (!entry) return;

        for (const dependentId of entry.dependents) {
            const dependent = this.plugins.get(dependentId);
            if (dependent && dependent.state === PluginState.STARTED) {
                await this.stopPlugin(dependentId);
            }
        }
    }

    /**
     * Get topologically sorted plugin IDs
     */
    private getTopologicallySortedPlugins(): string[] {
        const sorted: string[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (id: string) => {
            if (visited.has(id)) return;
            if (visiting.has(id)) {
                throw new Error(`Circular dependency detected involving ${id}`);
            }

            visiting.add(id);

            const entry = this.plugins.get(id);
            if (entry) {
                // Visit dependencies first
                if (entry.plugin.metadata.dependencies) {
                    for (const dep of entry.plugin.metadata.dependencies) {
                        for (const [depId, depEntry] of this.plugins) {
                            if (depEntry.plugin.metadata.id === dep ||
                                depEntry.plugin.metadata.provides?.includes(dep)) {
                                visit(depId);
                            }
                        }
                    }
                }
            }

            visiting.delete(id);
            visited.add(id);
            sorted.push(id);
        };

        for (const id of this.plugins.keys()) {
            visit(id);
        }

        return sorted;
    }

    /**
     * Get plugin statistics
     */
    getStats(): {
        total: number;
        byState: Record<PluginState, number>;
        withErrors: number;
    } {
        const byState: Record<PluginState, number> = {} as any;
        let withErrors = 0;

        for (const state of Object.values(PluginState)) {
            byState[state as PluginState] = 0;
        }

        for (const entry of this.plugins.values()) {
            byState[entry.state]++;
            if (entry.error) withErrors++;
        }

        return {
            total: this.plugins.size,
            byState,
            withErrors
        };
    }
}

// Global plugin manager instance
export const globalPluginManager = new PluginManager();