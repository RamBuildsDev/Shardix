import type { PeerConfig } from "./NodeConfig";

export type NodeHealthStatus = "UP" | "DOWN";

export type NodeHealth = {
  nodeId: string;
  host: string;
  port: number;
  status: NodeHealthStatus;
  lastSeenAt?: number;
  lastError?: string;
};

export class ClusterState {
  private nodes = new Map<string, NodeHealth>();

  constructor(peers: PeerConfig[] = []) {
    for (const peer of peers) {
      this.nodes.set(peer.nodeId, {
        nodeId: peer.nodeId,
        host: peer.host,
        port: peer.port,
        status: "DOWN",
      });
    }
  }

  markUp(nodeId: string, seenAt = Date.now()): void {
    const node = this.getExistingNode(nodeId);
    node.status = "UP";
    node.lastSeenAt = seenAt;
    node.lastError = undefined;
  }

  markDown(nodeId: string, error?: string): void {
    const node = this.getExistingNode(nodeId);
    node.status = "DOWN";
    node.lastError = error;
  }

  getNode(nodeId: string): NodeHealth | undefined {
    const node = this.nodes.get(nodeId);
    return node ? { ...node } : undefined;
  }

  getNodes(): NodeHealth[] {
    return Array.from(this.nodes.values()).map((node) => ({ ...node }));
  }

  private getExistingNode(nodeId: string): NodeHealth {
    const node = this.nodes.get(nodeId);

    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    return node;
  }
}
