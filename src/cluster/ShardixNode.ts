import { CommandParser } from "../core/CommandParser";
import { CommandProcessor } from "../core/CommandProcessor";
import { StorageEngine } from "../core/StorageEngine";
import { RecoveryManager } from "../persistence/RecoveryManager";
import { WriteAheadLog } from "../persistence/WriteAheadLog";
import { TcpServer } from "../server/TcpServer";
import { ClusterState } from "./ClusterState";
import { HeartbeatManager } from "./HeartbeatManager";
import type { NodeConfig } from "./NodeConfig";
import { ReplicationManager } from "./ReplicationManager";

export class ShardixNode {
  private storageEngine = new StorageEngine();
  private writeAheadLog: WriteAheadLog;
  private server: TcpServer;
  private clusterState: ClusterState;
  private heartbeatManager?: HeartbeatManager;

  constructor(private config: NodeConfig) {
    this.writeAheadLog = new WriteAheadLog(config.walPath);
    this.clusterState = new ClusterState(config.peers);

    const replicationManager =
      config.role === "leader"
        ? new ReplicationManager(config.peers)
        : undefined;
    this.heartbeatManager =
      config.role === "leader" && config.peers.length > 0
        ? new HeartbeatManager(config.peers, this.clusterState)
        : undefined;
    const commandParser = new CommandParser();
    const commandProcessor = new CommandProcessor(
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
      commandProcessor,
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
}
