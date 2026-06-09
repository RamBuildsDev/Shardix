import { ClusterState } from "./ClusterState";
import { FailureDetector } from "./FailureDetector";
import type { PeerConfig } from "./NodeConfig";

export type HeartbeatManagerOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

export class HeartbeatManager {
  private interval?: NodeJS.Timeout;
  private failureDetector: FailureDetector;
  private intervalMs: number;

  constructor(
    private peers: PeerConfig[],
    private clusterState: ClusterState,
    options: HeartbeatManagerOptions = {}
  ) {
    this.failureDetector = new FailureDetector(options.timeoutMs);
    this.intervalMs = options.intervalMs ?? 1000;
  }

  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      void this.checkOnce();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;
  }

  async checkOnce(): Promise<void> {
    await Promise.all(
      this.peers.map(async (peer) => {
        try {
          await this.failureDetector.check(peer);
          this.clusterState.markUp(peer.nodeId);
        } catch (error) {
          this.clusterState.markDown(
            peer.nodeId,
            error instanceof Error ? error.message : String(error)
          );
        }
      })
    );
  }
}
