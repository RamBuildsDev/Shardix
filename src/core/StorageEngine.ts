import { EMPTY_KEY, ShardixError } from "./errors";
import type { Key, Value } from  "./types";


export class StorageEngine {
    private store: Map<Key, Value>;


    constructor() {
        this.store = new Map<Key, Value>();
        
    }

    set(key : Key, value: Value): void {
        this.validateKey(key);
        this.store.set(key, value);
    }

    get(key: Key): Value | undefined {
        this.validateKey(key);
        return this.store.get(key);
    }

    delete(key : Key): boolean {
        this.validateKey(key);
        return this.store.delete(key);
    }
    
      exists(key: Key): boolean {
    this.validateKey(key);
    return this.store.has(key);
  }

  keys(): Key[] {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private validateKey(key: Key): void {
    if (key.trim().length === 0) {
      throw new ShardixError(EMPTY_KEY, "Key cannot be empty");
    }
  }
    
}