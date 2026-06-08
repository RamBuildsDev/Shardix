import type { WalEntry } from "../core/commands";
import { StorageEngine } from "../core/StorageEngine";

type WalReader = {
  readAll(): WalEntry[];
};

export class RecoveryManager {
  constructor(
    private writeAheadLog: WalReader,
    private storageEngine: StorageEngine
  ) {}

  recover(): void {
    const entries = this.writeAheadLog.readAll();

    for (const entry of entries) {
      switch (entry.type) {
        case "SET":
          this.storageEngine.set(entry.key, entry.value);
          break;

        case "DELETE":
          this.storageEngine.delete(entry.key);
          break;

        case "CLEAR":
          this.storageEngine.clear();
          break;
      }
    }
  }
}
