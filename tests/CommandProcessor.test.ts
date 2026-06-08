import { beforeEach, describe, expect, it } from "vitest";
import type { WalEntry } from "../src/core/commands";
import { CommandProcessor } from "../src/core/CommandProcessor";
import { KEY_NOT_FOUND, NOT_LEADER } from "../src/core/errors";
import { StorageEngine } from "../src/core/StorageEngine";
import { RecoveryManager } from "../src/persistence/RecoveryManager";

describe("CommandProcessor", () => {
  let storageEngine: StorageEngine;
  let processor: CommandProcessor;

  beforeEach(() => {
    storageEngine = new StorageEngine();
    processor = new CommandProcessor(storageEngine);
  });

  it("SET stores value and returns OK", async () => {
    const response = await processor.execute({
      type: "SET",
      key: "name",
      value: "Siva",
    });

    expect(response).toBe("OK");
    expect(storageEngine.get("name")).toBe("Siva");
  });

  it("GET returns existing value", async () => {
    storageEngine.set("name", "Siva");

    await expect(processor.execute({ type: "GET", key: "name" })).resolves.toBe(
      "Siva"
    );
  });

  it("GET returns KEY_NOT_FOUND for missing key", async () => {
    await expect(processor.execute({ type: "GET", key: "missing" })).resolves.toBe(
      KEY_NOT_FOUND
    );
  });

  it("DELETE removes key and returns DELETED", async () => {
    storageEngine.set("name", "Siva");

    await expect(
      processor.execute({ type: "DELETE", key: "name" })
    ).resolves.toBe("DELETED");
    expect(storageEngine.exists("name")).toBe(false);
  });

  it("DELETE returns KEY_NOT_FOUND for missing key", async () => {
    await expect(
      processor.execute({ type: "DELETE", key: "missing" })
    ).resolves.toBe(KEY_NOT_FOUND);
  });

  it("EXISTS returns true for existing key", async () => {
    storageEngine.set("name", "Siva");

    await expect(
      processor.execute({ type: "EXISTS", key: "name" })
    ).resolves.toBe(true);
  });

  it("EXISTS returns false for missing key", async () => {
    await expect(
      processor.execute({ type: "EXISTS", key: "missing" })
    ).resolves.toBe(false);
  });

  it("KEYS returns all keys", async () => {
    storageEngine.set("name", "Siva");
    storageEngine.set("city", "Hyderabad");

    await expect(processor.execute({ type: "KEYS" })).resolves.toEqual(
      expect.arrayContaining(["name", "city"])
    );
  });

  it("CLEAR removes all keys and returns OK", async () => {
    storageEngine.set("name", "Siva");
    storageEngine.set("city", "Hyderabad");

    await expect(processor.execute({ type: "CLEAR" })).resolves.toBe("OK");
    expect(storageEngine.size()).toBe(0);
  });

  it("SIZE returns number of stored keys", async () => {
    storageEngine.set("name", "Siva");
    storageEngine.set("city", "Hyderabad");

    await expect(processor.execute({ type: "SIZE" })).resolves.toBe(2);
  });

  it("SET writes to WAL before storing value", async () => {
    const wal = createFakeWal((entry) => {
      expect(entry).toEqual({ type: "SET", key: "name", value: "Siva" });
      expect(storageEngine.get("name")).toBeUndefined();
    });
    processor = new CommandProcessor(storageEngine, wal);

    await expect(
      processor.execute({ type: "SET", key: "name", value: "Siva" })
    ).resolves.toBe("OK");
    expect(wal.entries).toEqual([{ type: "SET", key: "name", value: "Siva" }]);
    expect(storageEngine.get("name")).toBe("Siva");
  });

  it("DELETE writes to WAL when key exists", async () => {
    const wal = createFakeWal();
    storageEngine.set("name", "Siva");
    processor = new CommandProcessor(storageEngine, wal);

    await expect(
      processor.execute({ type: "DELETE", key: "name" })
    ).resolves.toBe("DELETED");
    expect(wal.entries).toEqual([{ type: "DELETE", key: "name" }]);
  });

  it("DELETE does not write to WAL when key is missing", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await expect(
      processor.execute({ type: "DELETE", key: "missing" })
    ).resolves.toBe(KEY_NOT_FOUND);
    expect(wal.entries).toEqual([]);
  });

  it("CLEAR writes to WAL", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await expect(processor.execute({ type: "CLEAR" })).resolves.toBe("OK");
    expect(wal.entries).toEqual([{ type: "CLEAR" }]);
  });

  it("GET does not write to WAL", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await processor.execute({ type: "GET", key: "missing" });

    expect(wal.entries).toEqual([]);
  });

  it("EXISTS does not write to WAL", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await processor.execute({ type: "EXISTS", key: "missing" });

    expect(wal.entries).toEqual([]);
  });

  it("KEYS does not write to WAL", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await processor.execute({ type: "KEYS" });

    expect(wal.entries).toEqual([]);
  });

  it("SIZE does not write to WAL", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await processor.execute({ type: "SIZE" });

    expect(wal.entries).toEqual([]);
  });

  it("multiple SET commands are applied in order", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await Promise.all([
      processor.execute({ type: "SET", key: "name", value: "Siva" }),
      processor.execute({ type: "SET", key: "name", value: "Ram" }),
    ]);

    expect(storageEngine.get("name")).toBe("Ram");
    expect(wal.entries).toEqual([
      { type: "SET", key: "name", value: "Siva" },
      { type: "SET", key: "name", value: "Ram" },
    ]);
  });

  it("WAL entries match final memory order", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await Promise.all([
      processor.execute({ type: "SET", key: "name", value: "Siva" }),
      processor.execute({ type: "SET", key: "name", value: "Ram" }),
    ]);

    const recoveredStorageEngine = new StorageEngine();
    const recoveryManager = new RecoveryManager(wal, recoveredStorageEngine);
    recoveryManager.recover();

    expect(storageEngine.get("name")).toBe("Ram");
    expect(recoveredStorageEngine.get("name")).toBe("Ram");
  });

  it("DELETE checks key existence inside queued task", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    const setResult = processor.execute({
      type: "SET",
      key: "name",
      value: "Siva",
    });
    const deleteResult = processor.execute({ type: "DELETE", key: "name" });

    await expect(Promise.all([setResult, deleteResult])).resolves.toEqual([
      "OK",
      "DELETED",
    ]);
    expect(storageEngine.get("name")).toBeUndefined();
    expect(wal.entries).toEqual([
      { type: "SET", key: "name", value: "Siva" },
      { type: "DELETE", key: "name" },
    ]);
  });

  it("CLEAR is ordered with SET commands", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    await Promise.all([
      processor.execute({ type: "SET", key: "name", value: "Siva" }),
      processor.execute({ type: "CLEAR" }),
      processor.execute({ type: "SET", key: "city", value: "Hyderabad" }),
    ]);

    expect(storageEngine.get("name")).toBeUndefined();
    expect(storageEngine.get("city")).toBe("Hyderabad");
    expect(wal.entries).toEqual([
      { type: "SET", key: "name", value: "Siva" },
      { type: "CLEAR" },
      { type: "SET", key: "city", value: "Hyderabad" },
    ]);
  });

  it("failed write does not block future writes", async () => {
    const wal = createFailingWalOnce();
    processor = new CommandProcessor(storageEngine, wal);

    await expect(
      processor.execute({ type: "SET", key: "name", value: "Siva" })
    ).rejects.toThrow("WAL append failed");

    await expect(
      processor.execute({ type: "SET", key: "name", value: "Ram" })
    ).resolves.toBe("OK");

    expect(storageEngine.get("name")).toBe("Ram");
    expect(wal.entries).toEqual([{ type: "SET", key: "name", value: "Ram" }]);
  });

  it("leader accepts SET", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal, undefined, {
      role: "leader",
    });

    await expect(
      processor.execute({ type: "SET", key: "name", value: "Siva" })
    ).resolves.toBe("OK");
  });

  it("leader replicates SET after local write", async () => {
    const wal = createFakeWal();
    const replicationManager = createFakeReplicationManager((operation) => {
      expect(operation).toEqual("SET name Siva");
      expect(wal.entries).toEqual([{ type: "SET", key: "name", value: "Siva" }]);
      expect(storageEngine.get("name")).toBe("Siva");
    });
    processor = new CommandProcessor(storageEngine, wal, undefined, {
      role: "leader",
      replicationManager,
    });

    await expect(
      processor.execute({ type: "SET", key: "name", value: "Siva" })
    ).resolves.toBe("OK");
    expect(replicationManager.operations).toEqual(["SET name Siva"]);
  });

  it("follower rejects normal SET with NOT_LEADER", async () => {
    processor = new CommandProcessor(storageEngine, createFakeWal(), undefined, {
      role: "follower",
    });

    await expect(
      processor.execute({ type: "SET", key: "name", value: "Siva" })
    ).resolves.toBe(NOT_LEADER);
  });

  it("follower rejects normal DELETE with NOT_LEADER", async () => {
    processor = new CommandProcessor(storageEngine, createFakeWal(), undefined, {
      role: "follower",
    });

    await expect(
      processor.execute({ type: "DELETE", key: "name" })
    ).resolves.toBe(NOT_LEADER);
  });

  it("follower rejects normal CLEAR with NOT_LEADER", async () => {
    processor = new CommandProcessor(storageEngine, createFakeWal(), undefined, {
      role: "follower",
    });

    await expect(processor.execute({ type: "CLEAR" })).resolves.toBe(
      NOT_LEADER
    );
  });

  it("follower accepts REPL SET", async () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal, undefined, {
      role: "follower",
    });

    await expect(
      processor.execute({ type: "REPL_SET", key: "name", value: "Siva" })
    ).resolves.toBe("ACK");
    expect(storageEngine.get("name")).toBe("Siva");
    expect(wal.entries).toEqual([{ type: "SET", key: "name", value: "Siva" }]);
  });

  it("follower accepts REPL DELETE", async () => {
    const wal = createFakeWal();
    storageEngine.set("name", "Siva");
    processor = new CommandProcessor(storageEngine, wal, undefined, {
      role: "follower",
    });

    await expect(
      processor.execute({ type: "REPL_DELETE", key: "name" })
    ).resolves.toBe("ACK");
    expect(storageEngine.get("name")).toBeUndefined();
    expect(wal.entries).toEqual([{ type: "DELETE", key: "name" }]);
  });

  it("follower accepts REPL CLEAR", async () => {
    const wal = createFakeWal();
    storageEngine.set("name", "Siva");
    processor = new CommandProcessor(storageEngine, wal, undefined, {
      role: "follower",
    });

    await expect(processor.execute({ type: "REPL_CLEAR" })).resolves.toBe(
      "ACK"
    );
    expect(storageEngine.size()).toBe(0);
    expect(wal.entries).toEqual([{ type: "CLEAR" }]);
  });
});

function createFakeWal(onAppend?: (entry: WalEntry) => void): {
  entries: WalEntry[];
  append(entry: WalEntry): void;
  readAll(): WalEntry[];
} {
  return {
    entries: [],
    append(entry: WalEntry): void {
      onAppend?.(entry);
      this.entries.push(entry);
    },
    readAll(): WalEntry[] {
      return this.entries;
    },
  };
}

function createFakeReplicationManager(
  onReplicate?: (operation: string) => void
): {
  operations: string[];
  replicateSet(key: string, value: string): Promise<void>;
  replicateDelete(key: string): Promise<void>;
  replicateClear(): Promise<void>;
} {
  return {
    operations: [],
    async replicateSet(key: string, value: string): Promise<void> {
      const operation = `SET ${key} ${value}`;
      onReplicate?.(operation);
      this.operations.push(operation);
    },
    async replicateDelete(key: string): Promise<void> {
      const operation = `DELETE ${key}`;
      onReplicate?.(operation);
      this.operations.push(operation);
    },
    async replicateClear(): Promise<void> {
      const operation = "CLEAR";
      onReplicate?.(operation);
      this.operations.push(operation);
    },
  };
}

function createFailingWalOnce(): {
  entries: WalEntry[];
  append(entry: WalEntry): void;
  readAll(): WalEntry[];
} {
  let shouldFail = true;

  return {
    entries: [],
    append(entry: WalEntry): void {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("WAL append failed");
      }

      this.entries.push(entry);
    },
    readAll(): WalEntry[] {
      return this.entries;
    },
  };
}
