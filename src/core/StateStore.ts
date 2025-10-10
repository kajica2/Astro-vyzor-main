/**
 * StateStore - Centralized state management with reactive updates
 * Supports nested paths, subscriptions, persistence, and time travel
 */

import { EventBus, globalEventBus } from './EventBus';
import { DependencyContainer } from './DependencyContainer';

export type StateValue = any;
export type StatePath = string | string[];
export type StateListener<T = any> = (value: T, previousValue: T, path: string) => void;
export type StateMiddleware = (path: string, value: any, previousValue: any) => any;

export interface StateSnapshot {
    timestamp: number;
    state: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface StatePersistence {
    load(): Promise<Record<string, any> | null>;
    save(state: Record<string, any>): Promise<void>;
    clear(): Promise<void>;
}

// Local Storage persistence
export class LocalStoragePersistence implements StatePersistence {
    constructor(private key: string = 'app_state') {}

    async load(): Promise<Record<string, any> | null> {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load state from localStorage:', error);
            return null;
        }
    }

    async save(state: Record<string, any>): Promise<void> {
        try {
            localStorage.setItem(this.key, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save state to localStorage:', error);
        }
    }

    async clear(): Promise<void> {
        try {
            localStorage.removeItem(this.key);
        } catch {
            // Ignore errors
        }
    }
}

// IndexedDB persistence
export class IndexedDBPersistence implements StatePersistence {
    private db?: IDBDatabase;

    constructor(
        private dbName: string = 'app_state',
        private storeName: string = 'state',
        private version: number = 1
    ) {}

    private async openDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onerror = () => {
                reject(request.error);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    async load(): Promise<Record<string, any> | null> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.get('state');
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to load state from IndexedDB:', error);
            return null;
        }
    }

    async save(state: Record<string, any>): Promise<void> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            await new Promise<void>((resolve, reject) => {
                const request = store.put(state, 'state');
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to save state to IndexedDB:', error);
        }
    }

    async clear(): Promise<void> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            await new Promise<void>((resolve, reject) => {
                const request = store.delete('state');
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch {
            // Ignore errors
        }
    }
}

// Main StateStore class
export class StateStore {
    private state: Record<string, any> = {};
    private listeners: Map<string, Set<StateListener>> = new Map();
    private middleware: StateMiddleware[] = [];
    private history: StateSnapshot[] = [];
    private maxHistorySize: number = 50;
    private historyIndex: number = -1;
    private persistence?: StatePersistence;
    private eventBus: EventBus;
    private container?: DependencyContainer;
    private autosaveTimer?: NodeJS.Timeout;
    private autosaveInterval: number = 5000; // 5 seconds

    constructor(
        eventBus: EventBus = globalEventBus,
        container?: DependencyContainer,
        persistence?: StatePersistence
    ) {
        this.eventBus = eventBus;
        this.container = container;
        this.persistence = persistence;
    }

    /**
     * Initialize store
     */
    async initialize(): Promise<void> {
        // Load persisted state
        if (this.persistence) {
            const loaded = await this.persistence.load();
            if (loaded) {
                this.state = loaded;
                this.saveSnapshot();
            }
        }

        // Start autosave
        if (this.persistence) {
            this.startAutosave();
        }
    }

    /**
     * Get value at path
     */
    get<T = any>(path: StatePath, defaultValue?: T): T {
        const pathArray = this.normalizePath(path);
        let current: any = this.state;

        for (const key of pathArray) {
            if (current == null || typeof current !== 'object') {
                return defaultValue as T;
            }
            current = current[key];
        }

        return current !== undefined ? current : defaultValue;
    }

    /**
     * Set value at path
     */
    set(path: StatePath, value: StateValue): void {
        const pathArray = this.normalizePath(path);
        const pathStr = pathArray.join('.');
        const previousValue = this.get(path);

        // Apply middleware
        let processedValue = value;
        for (const mw of this.middleware) {
            processedValue = mw(pathStr, processedValue, previousValue);
        }

        // Update state
        if (pathArray.length === 0) {
            this.state = processedValue;
        } else {
            let current = this.state;

            for (let i = 0; i < pathArray.length - 1; i++) {
                const key = pathArray[i];
                if (current[key] == null || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }

            current[pathArray[pathArray.length - 1]] = processedValue;
        }

        // Save snapshot
        this.saveSnapshot();

        // Notify listeners
        this.notifyListeners(pathStr, processedValue, previousValue);

        // Emit event
        this.eventBus.emit('state:change', {
            path: pathStr,
            value: processedValue,
            previousValue
        });
    }

    /**
     * Update value at path with updater function
     */
    update<T = any>(path: StatePath, updater: (current: T) => T): void {
        const current = this.get<T>(path);
        this.set(path, updater(current));
    }

    /**
     * Delete value at path
     */
    delete(path: StatePath): void {
        const pathArray = this.normalizePath(path);
        if (pathArray.length === 0) return;

        const pathStr = pathArray.join('.');
        const previousValue = this.get(path);

        let current = this.state;
        for (let i = 0; i < pathArray.length - 1; i++) {
            const key = pathArray[i];
            if (current[key] == null || typeof current[key] !== 'object') {
                return; // Path doesn't exist
            }
            current = current[key];
        }

        delete current[pathArray[pathArray.length - 1]];

        // Save snapshot
        this.saveSnapshot();

        // Notify listeners
        this.notifyListeners(pathStr, undefined, previousValue);
    }

    /**
     * Check if path exists
     */
    has(path: StatePath): boolean {
        return this.get(path) !== undefined;
    }

    /**
     * Subscribe to changes at path
     */
    subscribe<T = any>(path: StatePath, listener: StateListener<T>): () => void {
        const pathStr = this.normalizePath(path).join('.');

        if (!this.listeners.has(pathStr)) {
            this.listeners.set(pathStr, new Set());
        }

        this.listeners.get(pathStr)!.add(listener);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(pathStr);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(pathStr);
                }
            }
        };
    }

    /**
     * Watch for changes with pattern matching
     */
    watch(pattern: string | RegExp, listener: StateListener): () => void {
        const patternRegex = typeof pattern === 'string'
            ? new RegExp(pattern.replace(/\*/g, '.*'))
            : pattern;

        const wrapper: StateListener = (value, previousValue, path) => {
            if (patternRegex.test(path)) {
                listener(value, previousValue, path);
            }
        };

        // Subscribe to root to catch all changes
        return this.subscribe('', wrapper);
    }

    /**
     * Add middleware
     */
    use(middleware: StateMiddleware): void {
        this.middleware.push(middleware);
    }

    /**
     * Get entire state
     */
    getState(): Record<string, any> {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Set entire state
     */
    setState(state: Record<string, any>): void {
        const previousState = this.state;
        this.state = JSON.parse(JSON.stringify(state));

        // Save snapshot
        this.saveSnapshot();

        // Notify all listeners
        this.notifyAllListeners(previousState);

        this.eventBus.emit('state:restore', { state });
    }

    /**
     * Reset state
     */
    reset(): void {
        this.setState({});
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Undo last change
     */
    undo(): boolean {
        if (this.historyIndex <= 0) return false;

        this.historyIndex--;
        const snapshot = this.history[this.historyIndex];
        this.state = JSON.parse(JSON.stringify(snapshot.state));

        // Notify listeners
        this.notifyAllListeners();

        return true;
    }

    /**
     * Redo last undone change
     */
    redo(): boolean {
        if (this.historyIndex >= this.history.length - 1) return false;

        this.historyIndex++;
        const snapshot = this.history[this.historyIndex];
        this.state = JSON.parse(JSON.stringify(snapshot.state));

        // Notify listeners
        this.notifyAllListeners();

        return true;
    }

    /**
     * Get history
     */
    getHistory(): StateSnapshot[] {
        return [...this.history];
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
        this.historyIndex = -1;
        this.saveSnapshot();
    }

    /**
     * Persist state
     */
    async persist(): Promise<void> {
        if (this.persistence) {
            await this.persistence.save(this.state);
            this.eventBus.emit('state:save', { state: this.state });
        }
    }

    /**
     * Clear persisted state
     */
    async clearPersisted(): Promise<void> {
        if (this.persistence) {
            await this.persistence.clear();
        }
    }

    /**
     * Start autosave
     */
    private startAutosave(): void {
        this.stopAutosave();

        this.autosaveTimer = setInterval(() => {
            this.persist().catch(console.error);
        }, this.autosaveInterval);
    }

    /**
     * Stop autosave
     */
    private stopAutosave(): void {
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = undefined;
        }
    }

    /**
     * Normalize path to array
     */
    private normalizePath(path: StatePath): string[] {
        if (typeof path === 'string') {
            return path ? path.split('.').filter(Boolean) : [];
        }
        return path.filter(Boolean);
    }

    /**
     * Save snapshot for history
     */
    private saveSnapshot(): void {
        const snapshot: StateSnapshot = {
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(this.state))
        };

        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new snapshot
        this.history.push(snapshot);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * Notify listeners for path
     */
    private notifyListeners(path: string, value: any, previousValue: any): void {
        // Notify exact path listeners
        const exactListeners = this.listeners.get(path);
        if (exactListeners) {
            for (const listener of exactListeners) {
                try {
                    listener(value, previousValue, path);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            }
        }

        // Notify parent path listeners
        const parts = path.split('.');
        for (let i = parts.length - 1; i >= 0; i--) {
            const parentPath = parts.slice(0, i).join('.');
            const parentListeners = this.listeners.get(parentPath);

            if (parentListeners) {
                const parentValue = this.get(parentPath);
                for (const listener of parentListeners) {
                    try {
                        listener(parentValue, previousValue, parentPath);
                    } catch (error) {
                        console.error('Error in state listener:', error);
                    }
                }
            }
        }
    }

    /**
     * Notify all listeners
     */
    private notifyAllListeners(previousState?: Record<string, any>): void {
        for (const [path, listeners] of this.listeners) {
            const value = this.get(path);
            const previousValue = previousState ? this.getFromState(previousState, path) : undefined;

            for (const listener of listeners) {
                try {
                    listener(value, previousValue, path);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            }
        }
    }

    /**
     * Get value from specific state object
     */
    private getFromState(state: Record<string, any>, path: string): any {
        const pathArray = path.split('.');
        let current = state;

        for (const key of pathArray) {
            if (current == null || typeof current !== 'object') {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Destroy store
     */
    destroy(): void {
        this.stopAutosave();
        this.listeners.clear();
        this.middleware = [];
        this.history = [];
        this.state = {};
    }
}

// Create derived store
export function derived<T>(
    store: StateStore,
    paths: StatePath[],
    fn: (...values: any[]) => T
): { subscribe: (listener: StateListener<T>) => () => void; get: () => T } {
    let currentValue: T;
    const listeners = new Set<StateListener<T>>();

    const update = () => {
        const values = paths.map(path => store.get(path));
        const newValue = fn(...values);

        if (newValue !== currentValue) {
            const previousValue = currentValue;
            currentValue = newValue;

            for (const listener of listeners) {
                listener(newValue, previousValue, '');
            }
        }
    };

    // Subscribe to all paths
    const unsubscribes = paths.map(path => store.subscribe(path, update));

    // Initial calculation
    update();

    return {
        subscribe: (listener: StateListener<T>) => {
            listeners.add(listener);
            listener(currentValue, undefined as any, '');

            return () => {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    // Cleanup subscriptions
                    unsubscribes.forEach(unsub => unsub());
                }
            };
        },
        get: () => currentValue
    };
}

// Global state store instance
export const globalStateStore = new StateStore();