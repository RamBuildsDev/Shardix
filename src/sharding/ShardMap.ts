export type ShardConfig = {
  shardId: string;
  host: string;
  port: number;
};

export class ShardMap {
  constructor(private shards: ShardConfig[]) {
    if (shards.length === 0) {
      throw new Error("ShardMap requires at least one shard");
    }
  }

  getShards(): ShardConfig[] {
    return this.shards.map((shard) => ({ ...shard }));
  }

  getShard(index: number): ShardConfig {
    const shard = this.shards[index];

    if (!shard) {
      throw new Error(`Shard index out of range: ${index}`);
    }

    return { ...shard };
  }

  size(): number {
    return this.shards.length;
  }
}
