import type { CommandResponse, ParsedCommand, WalEntry } from "./commands";
import { KEY_NOT_FOUND, NOT_LEADER } from "./errors";
import { StorageEngine } from "./StorageEngine";
import { WriteQueue } from "./WriteQueue";
import type { NodeRole } from "../cluster/NodeConfig";

type WriteAheadLogger = {
  append(entry: WalEntry): void;
};

type ReplicationWriter = {
  replicateSet(key: string, value: string): Promise<void>;
  replicateDelete(key: string): Promise<void>;
  replicateClear(): Promise<void>;
};

type CommandProcessorOptions = {
  role?: NodeRole;
  replicationManager?: ReplicationWriter;
};

export class CommandProcessor {
  private role: NodeRole;
  private replicationManager?: ReplicationWriter;

  constructor(
    private storageEngine: StorageEngine,
    private writeAheadLog?: WriteAheadLogger,
    private writeQueue = new WriteQueue(),
    options: CommandProcessorOptions = {}
  ) {
    this.role = options.role ?? "leader";
    this.replicationManager = options.replicationManager;
  }

  execute(command: ParsedCommand): Promise<CommandResponse> {
    switch (command.type) {
      case "SET":
        if (this.role !== "leader") {
          return Promise.resolve(NOT_LEADER);
        }

        return this.writeQueue.enqueue(async () => {
          this.writeAheadLog?.append(command);
          this.storageEngine.set(command.key, command.value);
          await this.replicationManager?.replicateSet(command.key, command.value);
          return "OK";
        });

      case "GET":
        return Promise.resolve(this.storageEngine.get(command.key) ?? KEY_NOT_FOUND);

      case "DELETE":
        if (this.role !== "leader") {
          return Promise.resolve(NOT_LEADER);
        }

        return this.writeQueue.enqueue(async () => {
          if (!this.storageEngine.exists(command.key)) {
            return KEY_NOT_FOUND;
          }

          this.writeAheadLog?.append(command);
          this.storageEngine.delete(command.key);
          await this.replicationManager?.replicateDelete(command.key);
          return "DELETED";
        });

      case "EXISTS":
        return Promise.resolve(this.storageEngine.exists(command.key));

      case "KEYS":
        return Promise.resolve(this.storageEngine.keys());

      case "CLEAR":
        if (this.role !== "leader") {
          return Promise.resolve(NOT_LEADER);
        }

        return this.writeQueue.enqueue(async () => {
          this.writeAheadLog?.append(command);
          this.storageEngine.clear();
          await this.replicationManager?.replicateClear();
          return "OK";
        });

      case "SIZE":
        return Promise.resolve(this.storageEngine.size());

      case "REPL_SET":
        return this.writeQueue.enqueue(() => {
          const entry: WalEntry = {
            type: "SET",
            key: command.key,
            value: command.value,
          };
          this.writeAheadLog?.append(entry);
          this.storageEngine.set(command.key, command.value);
          return "ACK";
        });

      case "REPL_DELETE":
        return this.writeQueue.enqueue(() => {
          const entry: WalEntry = { type: "DELETE", key: command.key };
          this.writeAheadLog?.append(entry);
          this.storageEngine.delete(command.key);
          return "ACK";
        });

      case "REPL_CLEAR":
        return this.writeQueue.enqueue(() => {
          this.writeAheadLog?.append({ type: "CLEAR" });
          this.storageEngine.clear();
          return "ACK";
        });
    }
  }
}
