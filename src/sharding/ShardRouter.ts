import { ShardixClient } from "../client/ShardixClient";
import { INVALID_ARGUMENTS, INVALID_COMMAND } from "../core/errors";
import { HashRouter } from "./HashRouter";
import type { ShardConfig } from "./ShardMap";
import { ShardMap } from "./ShardMap";

type ClientLike = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(command: string): Promise<string>;
};

type ClientFactory = (shard: ShardConfig) => ClientLike;

const KEYED_COMMANDS = new Set(["SET", "GET", "DELETE", "EXISTS"]);

export class ShardRouter {
  constructor(
    private shardMap: ShardMap,
    private hashRouter = new HashRouter(),
    private clientFactory: ClientFactory = (shard) =>
      new ShardixClient({ host: shard.host, port: shard.port })
  ) {}

  getShardForKey(key: string): ShardConfig {
    return this.hashRouter.getShardForKey(key, this.shardMap);
  }

  set(key: string, value: string): Promise<string> {
    return this.sendToKeyShard(key, `SET ${key} ${value}`);
  }

  get(key: string): Promise<string> {
    return this.sendToKeyShard(key, `GET ${key}`);
  }

  delete(key: string): Promise<string> {
    return this.sendToKeyShard(key, `DELETE ${key}`);
  }

  exists(key: string): Promise<string> {
    return this.sendToKeyShard(key, `EXISTS ${key}`);
  }

  async keys(): Promise<string> {
    const responses = await this.broadcast("KEYS");
    const keys = responses.flatMap((response) => JSON.parse(response) as string[]);
    return JSON.stringify(keys);
  }

  async size(): Promise<string> {
    const responses = await this.broadcast("SIZE");
    return responses
      .reduce((total, response) => total + Number(response), 0)
      .toString();
  }

  async clear(): Promise<string> {
    const responses = await this.broadcast("CLEAR");
    return responses.every((response) => response === "OK") ? "OK" : "INTERNAL_ERROR";
  }

  send(command: string): Promise<string> {
    const trimmedCommand = command.trim();
    const [rawType] = trimmedCommand.split(/\s+/, 1);
    const type = rawType.toUpperCase();

    if (type === "KEYS") {
      return this.keys();
    }

    if (type === "SIZE") {
      return this.size();
    }

    if (type === "CLEAR") {
      return this.clear();
    }

    if (!KEYED_COMMANDS.has(type)) {
      return Promise.resolve(INVALID_COMMAND);
    }

    const key = trimmedCommand.split(/\s+/)[1];

    if (!key) {
      return Promise.resolve(INVALID_ARGUMENTS);
    }

    return this.sendToKeyShard(key, trimmedCommand);
  }

  private async sendToKeyShard(key: string, command: string): Promise<string> {
    const shard = this.getShardForKey(key);
    return this.withClient(shard, (client) => client.send(command));
  }

  private async broadcast(command: string): Promise<string[]> {
    return Promise.all(
      this.shardMap
        .getShards()
        .map((shard) => this.withClient(shard, (client) => client.send(command)))
    );
  }

  private async withClient<T>(
    shard: ShardConfig,
    action: (client: ClientLike) => Promise<T>
  ): Promise<T> {
    const client = this.clientFactory(shard);

    try {
      await client.connect();
      return await action(client);
    } finally {
      await client.disconnect();
    }
  }
}
