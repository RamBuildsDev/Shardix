import type { ShardConfig } from "./ShardMap";
import { ShardMap } from "./ShardMap";

export class HashRouter {
  getShardForKey(key: string, shardMap: ShardMap): ShardConfig {
    const shardIndex = this.hash(key) % shardMap.size();
    return shardMap.getShard(shardIndex);
  }

  hash(key: string): number {
    let hash = 5381;

    for (const char of key) {
      hash = (hash * 33) ^ char.charCodeAt(0);
    }

    return Math.abs(hash);
  }
}
