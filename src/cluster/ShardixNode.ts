import { CommandParser } from "../core/CommandParser";
import { CommandProcessor } from "../core/CommandProcessor";
import { StorageEngine } from "../core/StorageEngine";
import { RecoveryManager } from "../persistence/RecoveryManager";
import { WriteAheadLog } from "../persistence/WriteAheadLog";
import { TcpServer } from "../server/TcpServer";
import { ClusterState } from "./ClusterState";
import { ElectionManager } from "./ElectionManager";
import { HeartbeatManager } from "./HeartbeatManager";
import type { NodeConfig, NodeRole } from "./NodeConfig";
import { ReplicationManager } from "./ReplicationManager";

export class ShardixNode {
  private storageEngine = new StorageEngine();
  private writeAheadLog: WriteAheadLog;
  private server: TcpServer;
  private clusterState: ClusterState;
  private heartbeatManager?: HeartbeatManager;
  private commandProcessor: CommandProcessor;

  constructor(private config: NodeConfig) {
    this.writeAheadLog = new WriteAheadLog(config.walPath);
    this.clusterState = new ClusterState(config.peers);
    this.clusterState.addNode(
      {
        nodeId: config.nodeId,
        host: config.host,
        port: config.port,
      },
      "UP"
    );

    const replicationManager =
      config.role === "leader"
        ? new ReplicationManager(config.peers)
        : undefined;
    this.heartbeatManager =
      config.role === "leader" && config.peers.length > 0
        ? new HeartbeatManager(config.peers, this.clusterState)
        : undefined;
    const commandParser = new CommandParser();
    this.commandProcessor = new CommandProcessor(
      this.storageEngine,
      this.writeAheadLog,
      undefined,
      {
        role: config.role,
        replicationManager,
      }
    );

    this.server = new TcpServer(
      commandParser,
      this.commandProcessor,
      config.host,
      config.port
    );
  }

  async start(): Promise<void> {
    const recoveryManager = new RecoveryManager(
      this.writeAheadLog,
      this.storageEngine
    );
    recoveryManager.recover();

    await this.server.start();
    this.heartbeatManager?.start();
  }

  stop(): Promise<void> {
    this.heartbeatManager?.stop();
    return this.server.stop();
  }

  getPort(): number {
    return this.server.getPort();
  }

  getStorageEngine(): StorageEngine {
    return this.storageEngine;
  }

  getClusterState(): ClusterState {
    return this.clusterState;
  }

  getNodeId(): string {
    return this.config.nodeId;
  }

  getRole(): NodeRole {
    return this.config.role;
  }

  promoteToLeader(): void {
    this.config.role = "leader";
    this.commandProcessor.setRole("leader");
    this.commandProcessor.setReplicationManager(
      new ReplicationManager(this.config.peers)
    );
  }

  runElection(currentLeaderId: string): string | undefined {
    const electionManager = new ElectionManager(this.clusterState, [
      {
        nodeId: this.config.nodeId,
        host: this.config.host,
        port: this.getPort(),
      },
      ...this.config.peers,
    ]);
    const result = electionManager.electLeader(currentLeaderId);

    if (result.leaderId === this.config.nodeId && this.config.role !== "leader") {
      this.promoteToLeader();
    }

    return result.leaderId;
  }
}
