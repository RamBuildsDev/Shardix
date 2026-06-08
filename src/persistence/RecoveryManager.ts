import { StorageEngine } from "../core/StorageEngine";
import { WriteAheadLog } from "./WriteAheadLog";

export class RecoveryManager {
  constructor(
    private writeAheadLog: WriteAheadLog,
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
