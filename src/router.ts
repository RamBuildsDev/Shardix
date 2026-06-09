import { ShardMap, type ShardConfig } from "./sharding/ShardMap";
import { ShardRouter } from "./sharding/ShardRouter";
import { ShardRouterServer } from "./sharding/ShardRouterServer";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 7379);

async function main(): Promise<void> {
  const shards = parseShards(process.env.SHARDS);
  const shardRouter = new ShardRouter(new ShardMap(shards));
  const server = new ShardRouterServer(shardRouter, host, port);

  await server.start();
  console.log(`Shardix router listening on ${host}:${port}`);

  process.on("SIGINT", async () => {
    await server.stop();
    process.exit(0);
  });
}

function parseShards(value: string | undefined): ShardConfig[] {
  if (!value) {
    return [{ shardId: "shard-1", host: "127.0.0.1", port: 7379 }];
  }

  return value
    .split(",")
    .map((shard) => shard.trim())
    .filter(Boolean)
    .map((shard) => {
      const [shardId, host, rawPort] = shard.split(":");

      return {
        shardId,
        host,
        port: Number(rawPort),
      };
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
