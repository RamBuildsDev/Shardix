import type { CommandResponse, ParsedCommand } from "./commands";
import { KEY_NOT_FOUND } from "./errors";
import { StorageEngine } from "./StorageEngine";

export class CommandProcessor {
  constructor(private storageEngine: StorageEngine) {}

  execute(command: ParsedCommand): CommandResponse {
    switch (command.type) {
      case "SET":
        this.storageEngine.set(command.key, command.value);
        return "OK";

      case "GET":
        return this.storageEngine.get(command.key) ?? KEY_NOT_FOUND;

      case "DELETE":
        return this.storageEngine.delete(command.key) ? "DELETED" : KEY_NOT_FOUND;

      case "EXISTS":
        return this.storageEngine.exists(command.key);

      case "KEYS":
        return this.storageEngine.keys();

      case "CLEAR":
        this.storageEngine.clear();
        return "OK";

      case "SIZE":
        return this.storageEngine.size();
    }
  }
}
