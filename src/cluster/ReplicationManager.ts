import { ShardixClient } from "../client/ShardixClient";
import { REPLICATION_ERROR, ShardixError } from "../core/errors";
import type { PeerConfig } from "./NodeConfig";

export class ReplicationManager {
  constructor(private peers: PeerConfig[]) {}

  replicateSet(key: string, value: string): Promise<void> {
    return this.replicateToAll(`REPL SET ${key} ${value}`);
  }

  replicateDelete(key: string): Promise<void> {
    return this.replicateToAll(`REPL DELETE ${key}`);
  }

  replicateClear(): Promise<void> {
    return this.replicateToAll("REPL CLEAR");
  }

  private async replicateToAll(command: string): Promise<void> {
    await Promise.all(this.peers.map((peer) => this.replicateToPeer(peer, command)));
  }

  private async replicateToPeer(peer: PeerConfig, command: string): Promise<void> {
    const client = new ShardixClient({ host: peer.host, port: peer.port });

    try {
      await client.connect();
      const response = await client.send(command);

      if (response !== "ACK") {
        throw new ShardixError(
          REPLICATION_ERROR,
          `Peer ${peer.nodeId} returned ${response}`
        );
      }
    } finally {
      await client.disconnect();
    }
  }
}
