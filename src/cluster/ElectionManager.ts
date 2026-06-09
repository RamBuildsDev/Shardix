import { ClusterState } from "./ClusterState";
import type { PeerConfig } from "./NodeConfig";

export type ElectionResult = {
  leaderId: string | undefined;
  changed: boolean;
};

export class ElectionManager {
  constructor(
    private clusterState: ClusterState,
    private candidates: PeerConfig[]
  ) {}

  electLeader(currentLeaderId: string): ElectionResult {
    const currentLeader = this.clusterState.getNode(currentLeaderId);

    if (currentLeader?.status === "UP") {
      return {
        leaderId: currentLeaderId,
        changed: false,
      };
    }

    const leaderId = this.candidates
      .filter((candidate) => this.clusterState.getNode(candidate.nodeId)?.status === "UP")
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId))[0]?.nodeId;

    return {
      leaderId,
      changed: leaderId !== undefined && leaderId !== currentLeaderId,
    };
  }
}
