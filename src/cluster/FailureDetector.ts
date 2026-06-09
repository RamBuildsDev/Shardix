import { ShardixClient } from "../client/ShardixClient";
import type { PeerConfig } from "./NodeConfig";

export class FailureDetector {
  constructor(private timeoutMs = 500) {}

  async check(peer: PeerConfig): Promise<void> {
    const client = new ShardixClient({ host: peer.host, port: peer.port });

    try {
      await this.withTimeout(client.connect(), peer);
      const response = await this.withTimeout(client.send("PING"), peer);

      if (response !== "PONG") {
        throw new Error(`Unexpected heartbeat response: ${response}`);
      }
    } finally {
      await client.disconnect();
    }
  }

  private withTimeout<T>(promise: Promise<T>, peer: PeerConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Heartbeat timed out for ${peer.nodeId}`));
      }, this.timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      );
    });
  }
}
