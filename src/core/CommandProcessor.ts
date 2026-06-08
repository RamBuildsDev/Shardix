import type { CommandResponse, ParsedCommand, WalEntry } from "./commands";
import { KEY_NOT_FOUND } from "./errors";
import { StorageEngine } from "./StorageEngine";
import { WriteQueue } from "./WriteQueue";

type WriteAheadLogger = {
  append(entry: WalEntry): void;
};

export class CommandProcessor {
  constructor(
    private storageEngine: StorageEngine,
    private writeAheadLog?: WriteAheadLogger,
    private writeQueue = new WriteQueue()
  ) {}

  execute(command: ParsedCommand): Promise<CommandResponse> {
    switch (command.type) {
      case "SET":
        return this.writeQueue.enqueue(() => {
          this.writeAheadLog?.append(command);
          this.storageEngine.set(command.key, command.value);
          return "OK";
        });

      case "GET":
        return Promise.resolve(this.storageEngine.get(command.key) ?? KEY_NOT_FOUND);

      case "DELETE":
        return this.writeQueue.enqueue(() => {
          if (!this.storageEngine.exists(command.key)) {
            return KEY_NOT_FOUND;
          }

          this.writeAheadLog?.append(command);
          this.storageEngine.delete(command.key);
          return "DELETED";
        });

      case "EXISTS":
        return Promise.resolve(this.storageEngine.exists(command.key));

      case "KEYS":
        return Promise.resolve(this.storageEngine.keys());

      case "CLEAR":
        return this.writeQueue.enqueue(() => {
          this.writeAheadLog?.append(command);
          this.storageEngine.clear();
          return "OK";
        });

      case "SIZE":
        return Promise.resolve(this.storageEngine.size());
    }
  }
}
