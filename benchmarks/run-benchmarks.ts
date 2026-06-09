import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { StorageEngine } from "../src/core/StorageEngine";
import { RecoveryManager } from "../src/persistence/RecoveryManager";
import { WriteAheadLog } from "../src/persistence/WriteAheadLog";
import { HashRouter } from "../src/sharding/HashRouter";
import { ShardMap } from "../src/sharding/ShardMap";

const operations = Number(process.env.BENCHMARK_OPS ?? 10_000);
const walPath = join(process.cwd(), "data", "benchmark-wal.log");

function main(): void {
  benchmarkStorageSet();
  benchmarkStorageGet();
  benchmarkRecovery();
  benchmarkShardDistribution();
  cleanup();
}

function benchmarkStorageSet(): void {
  const storageEngine = new StorageEngine();
  const start = performance.now();

  for (let index = 0; index < operations; index += 1) {
    storageEngine.set(`key:${index}`, `value:${index}`);
  }

  report("SET operations per second", operations, start);
}

function benchmarkStorageGet(): void {
  const storageEngine = new StorageEngine();

  for (let index = 0; index < operations; index += 1) {
    storageEngine.set(`key:${index}`, `value:${index}`);
  }

  const start = performance.now();

  for (let index = 0; index < operations; index += 1) {
    storageEngine.get(`key:${index}`);
  }

  report("GET operations per second", operations, start);
}

function benchmarkRecovery(): void {
  cleanup();
  const wal = new WriteAheadLog(walPath);

  for (let index = 0; index < operations; index += 1) {
    wal.append({ type: "SET", key: `key:${index}`, value: `value:${index}` });
  }

  const storageEngine = new StorageEngine();
  const recoveryManager = new RecoveryManager(wal, storageEngine);
  const start = performance.now();
  recoveryManager.recover();

  report("WAL recovery entries per second", operations, start);
  cleanup();
}

function benchmarkShardDistribution(): void {
  const router = new HashRouter();
  const shardMap = new ShardMap([
    { shardId: "shard-1", host: "127.0.0.1", port: 7379 },
    { shardId: "shard-2", host: "127.0.0.1", port: 7380 },
    { shardId: "shard-3", host: "127.0.0.1", port: 7381 },
  ]);
  const distribution = new Map<string, number>();

  for (let index = 0; index < operations; index += 1) {
    const shard = router.getShardForKey(`key:${index}`, shardMap);
    distribution.set(shard.shardId, (distribution.get(shard.shardId) ?? 0) + 1);
  }

  console.log("Shard distribution", Object.fromEntries(distribution));
}

function report(label: string, count: number, start: number): void {
  const elapsedSeconds = (performance.now() - start) / 1000;
  console.log(`${label}: ${Math.round(count / elapsedSeconds)}`);
}

function cleanup(): void {
  if (existsSync(walPath)) {
    unlinkSync(walPath);
  }
}

main();
