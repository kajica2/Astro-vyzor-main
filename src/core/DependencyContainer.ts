/**
 * DependencyContainer - IoC container for dependency injection and service management
 * Supports constructor injection, factory functions, and lifecycle management
 */

import { EventBus, globalEventBus } from './EventBus';
import { PluginManager, globalPluginManager } from './PluginManager';

export type ServiceFactory<T = any> = (container: DependencyContainer) => T;
export type ServiceConstructor<T = any> = new (...args: any[]) => T;
export type ServiceProvider<T = any> = ServiceFactory<T> | ServiceConstructor<T> | T;

export interface ServiceDescriptor {
    provider: ServiceProvider;
    singleton?: boolean;
    lazy?: boolean;
    dependencies?: string[];
    tags?: string[];
    metadata?: any;
}

export interface ServiceInstance {
    instance?: any;
    descriptor: ServiceDescriptor;
    creating?: boolean;
}

export interface InjectionToken<T = any> {
    name: string;
    type?: T;
}

// Decorator support
const INJECTION_METADATA_KEY = Symbol('injection:metadata');
const INJECTABLE_METADATA_KEY = Symbol('injectable:metadata');

export class DependencyContainer {
    private services: Map<string | InjectionToken, ServiceInstance> = new Map();
    private eventBus: EventBus;
    private pluginManager: PluginManager;
    private parent?: DependencyContainer;
    private children: Set<DependencyContainer> = new Set();

    constructor(parent?: DependencyContainer) {
        this.parent = parent;
        if (parent) {
            parent.children.add(this);
        }

        // Register core services
        if (!parent) {
            this.eventBus = globalEventBus;
            this.pluginManager = globalPluginManager;
            this.registerCore();
        } else {
            this.eventBus = parent.eventBus;
            this.pluginManager = parent.pluginManager;
        }
    }

    /**
     * Register a service with the container
     */
    register<T>(
        token: string | InjectionToken<T>,
        provider: ServiceProvider<T>,
        options?: Partial<ServiceDescriptor>
    ): void {
        const descriptor: ServiceDescriptor = {
            provider,
            singleton: options?.singleton !== false, // Default to singleton
            lazy: options?.lazy !== false, // Default to lazy
            dependencies: options?.dependencies || [],
            tags: options?.tags || [],
            metadata: options?.metadata
        };

        const tokenKey = typeof token === 'string' ? token : token.name;

        this.services.set(token, {
            descriptor,
            instance: descriptor.lazy ? undefined : this.createInstance(descriptor)
        });

        this.eventBus.emit('runtime:error', new Error(`Service registered: ${tokenKey}`));
    }

    /**
     * Register a singleton service
     */
    registerSingleton<T>(
        token: string | InjectionToken<T>,
        provider: ServiceProvider<T>
    ): void {
        this.register(token, provider, { singleton: true });
    }

    /**
     * Register a transient service
     */
    registerTransient<T>(
        token: string | InjectionToken<T>,
        provider: ServiceProvider<T>
    ): void {
        this.register(token, provider, { singleton: false });
    }

    /**
     * Register a factory function
     */
    registerFactory<T>(
        token: string | InjectionToken<T>,
        factory: ServiceFactory<T>
    ): void {
        this.register(token, factory);
    }

    /**
     * Register a value directly
     */
    registerValue<T>(
        token: string | InjectionToken<T>,
        value: T
    ): void {
        this.services.set(token, {
            descriptor: { provider: value, singleton: true },
            instance: value
        });
    }

    /**
     * Resolve a service from the container
     */
    resolve<T>(token: string | InjectionToken<T>): T {
        const service = this.services.get(token);

        if (!service) {
            // Try parent container
            if (this.parent) {
                return this.parent.resolve(token);
            }

            const tokenKey = typeof token === 'string' ? token : token.name;
            throw new Error(`Service not found: ${tokenKey}`);
        }

        // Check for circular dependency
        if (service.creating) {
            const tokenKey = typeof token === 'string' ? token : token.name;
            throw new Error(`Circular dependency detected: ${tokenKey}`);
        }

        // Return existing instance for singletons
        if (service.descriptor.singleton && service.instance !== undefined) {
            return service.instance;
        }

        // Create new instance
        service.creating = true;
        try {
            const instance = this.createInstance(service.descriptor);

            if (service.descriptor.singleton) {
                service.instance = instance;
            }

            return instance;
        } finally {
            service.creating = false;
        }
    }

    /**
     * Try to resolve a service, return undefined if not found
     */
    tryResolve<T>(token: string | InjectionToken<T>): T | undefined {
        try {
            return this.resolve(token);
        } catch {
            return undefined;
        }
    }

    /**
     * Resolve all services with a specific tag
     */
    resolveByTag<T>(tag: string): T[] {
        const results: T[] = [];

        for (const [token, service] of this.services) {
            if (service.descriptor.tags?.includes(tag)) {
                results.push(this.resolve(token as any));
            }
        }

        // Include parent services
        if (this.parent) {
            results.push(...this.parent.resolveByTag(tag));
        }

        return results;
    }

    /**
     * Check if a service is registered
     */
    has(token: string | InjectionToken): boolean {
        return this.services.has(token) || (this.parent?.has(token) ?? false);
    }

    /**
     * Create a child container
     */
    createChild(): DependencyContainer {
        return new DependencyContainer(this);
    }

    /**
     * Clear all services
     */
    clear(): void {
        // Clear children first
        for (const child of this.children) {
            child.clear();
        }

        // Clear own services
        this.services.clear();

        // Re-register core services if root
        if (!this.parent) {
            this.registerCore();
        }
    }

    /**
     * Create instance from descriptor
     */
    private createInstance(descriptor: ServiceDescriptor): any {
        const { provider, dependencies = [] } = descriptor;

        // If it's already an instance, return it
        if (typeof provider !== 'function') {
            return provider;
        }

        // Resolve dependencies
        const resolvedDeps = dependencies.map(dep => this.resolve(dep));

        // Check if it's a factory function
        if (provider.length === 1 && !this.isConstructor(provider)) {
            return (provider as ServiceFactory)(this);
        }

        // It's a constructor
        const Constructor = provider as ServiceConstructor;

        // Check for decorator metadata
        const metadata = Reflect.getMetadata(INJECTION_METADATA_KEY, Constructor);
        if (metadata) {
            const args = metadata.map((token: any) => this.resolve(token));
            return new Constructor(...args);
        }

        // Use resolved dependencies
        return new Constructor(...resolvedDeps);
    }

    /**
     * Check if a function is a constructor
     */
    private isConstructor(func: Function): boolean {
        return func.prototype && func.prototype.constructor === func;
    }

    /**
     * Register core services
     */
    private registerCore(): void {
        this.registerValue('EventBus', this.eventBus);
        this.registerValue('PluginManager', this.pluginManager);
        this.registerValue('Container', this);
    }

    /**
     * Get container statistics
     */
    getStats(): {
        services: number;
        singletons: number;
        transients: number;
        children: number;
    } {
        let singletons = 0;
        let transients = 0;

        for (const service of this.services.values()) {
            if (service.descriptor.singleton) {
                singletons++;
            } else {
                transients++;
            }
        }

        return {
            services: this.services.size,
            singletons,
            transients,
            children: this.children.size
        };
    }
}

// Decorators for TypeScript projects
export function Injectable(token?: string | InjectionToken) {
    return function (target: any) {
        Reflect.defineMetadata(INJECTABLE_METADATA_KEY, token || target.name, target);
        return target;
    };
}

export function Inject(token: string | InjectionToken) {
    return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
        const existingTokens = Reflect.getMetadata(INJECTION_METADATA_KEY, target) || [];
        existingTokens[parameterIndex] = token;
        Reflect.defineMetadata(INJECTION_METADATA_KEY, existingTokens, target);
    };
}

// Service Locator pattern (anti-pattern but sometimes useful)
export class ServiceLocator {
    private static container: DependencyContainer = new DependencyContainer();

    static register<T>(
        token: string | InjectionToken<T>,
        provider: ServiceProvider<T>,
        options?: Partial<ServiceDescriptor>
    ): void {
        this.container.register(token, provider, options);
    }

    static resolve<T>(token: string | InjectionToken<T>): T {
        return this.container.resolve(token);
    }

    static tryResolve<T>(token: string | InjectionToken<T>): T | undefined {
        return this.container.tryResolve(token);
    }

    static has(token: string | InjectionToken): boolean {
        return this.container.has(token);
    }

    static clear(): void {
        this.container.clear();
    }

    static getContainer(): DependencyContainer {
        return this.container;
    }

    static setContainer(container: DependencyContainer): void {
        this.container = container;
    }
}

// Global container instance
export const globalContainer = ServiceLocator.getContainer();

// Export convenience functions
export const register = globalContainer.register.bind(globalContainer);
export const resolve = globalContainer.resolve.bind(globalContainer);
export const tryResolve = globalContainer.tryResolve.bind(globalContainer);
export const has = globalContainer.has.bind(globalContainer);