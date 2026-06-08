import { CommandParser } from "../core/CommandParser";
import { CommandProcessor } from "../core/CommandProcessor";
import { StorageEngine } from "../core/StorageEngine";
import { RecoveryManager } from "../persistence/RecoveryManager";
import { WriteAheadLog } from "../persistence/WriteAheadLog";
import { TcpServer } from "../server/TcpServer";
import type { NodeConfig } from "./NodeConfig";
import { ReplicationManager } from "./ReplicationManager";

export class ShardixNode {
  private storageEngine = new StorageEngine();
  private writeAheadLog: WriteAheadLog;
  private server: TcpServer;

  constructor(private config: NodeConfig) {
    this.writeAheadLog = new WriteAheadLog(config.walPath);

    const replicationManager =
      config.role === "leader"
        ? new ReplicationManager(config.peers)
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

  start(): Promise<void> {
    const recoveryManager = new RecoveryManager(
      this.writeAheadLog,
      this.storageEngine
    );
    recoveryManager.recover();

    return this.server.start();
  }

  stop(): Promise<void> {
    return this.server.stop();
  }

  getPort(): number {
    return this.server.getPort();
  }

  getStorageEngine(): StorageEngine {
    return this.storageEngine;
  }
}
