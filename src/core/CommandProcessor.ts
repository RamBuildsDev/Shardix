import type { CommandResponse, ParsedCommand, WalEntry } from "./commands";
import { KEY_NOT_FOUND } from "./errors";
import { StorageEngine } from "./StorageEngine";

type WriteAheadLogger = {
  append(entry: WalEntry): void;
};

export class CommandProcessor {
  constructor(
    private storageEngine: StorageEngine,
    private writeAheadLog?: WriteAheadLogger
  ) {}

  execute(command: ParsedCommand): CommandResponse {
    switch (command.type) {
      case "SET":
        this.writeAheadLog?.append(command);
        this.storageEngine.set(command.key, command.value);
        return "OK";

      case "GET":
        return this.storageEngine.get(command.key) ?? KEY_NOT_FOUND;

      case "DELETE":
        if (!this.storageEngine.exists(command.key)) {
          return KEY_NOT_FOUND;
        }

        this.writeAheadLog?.append(command);
        this.storageEngine.delete(command.key);
        return "DELETED";

      case "EXISTS":
        return this.storageEngine.exists(command.key);

      case "KEYS":
        return this.storageEngine.keys();

      case "CLEAR":
        this.writeAheadLog?.append(command);
        this.storageEngine.clear();
        return "OK";

      case "SIZE":
        return this.storageEngine.size();
    }
  }
}
