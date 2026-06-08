import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CommandProcessor } from "../src/core/CommandProcessor";
import { StorageEngine } from "../src/core/StorageEngine";
import { RecoveryManager } from "../src/persistence/RecoveryManager";
import { WriteAheadLog } from "../src/persistence/WriteAheadLog";

const testLogPath = join(process.cwd(), "data", "test-recovery-wal.log");

describe("RecoveryManager", () => {
  beforeEach(() => {
    removeTestLog();
  });

  afterEach(() => {
    removeTestLog();
  });

  it("recovers SET entries from WAL", () => {
    const storageEngine = recoverFromEntries([
      { type: "SET", key: "name", value: "Siva" },
    ]);

    expect(storageEngine.get("name")).toBe("Siva");
  });

  it("latest SET value wins during recovery", () => {
    const storageEngine = recoverFromEntries([
      { type: "SET", key: "name", value: "Siva" },
      { type: "SET", key: "name", value: "Ram" },
    ]);

    expect(storageEngine.get("name")).toBe("Ram");
  });

  it("recovers DELETE entries correctly", () => {
    const storageEngine = recoverFromEntries([
      { type: "SET", key: "city", value: "Hyderabad" },
      { type: "DELETE", key: "city" },
    ]);

    expect(storageEngine.get("city")).toBeUndefined();
  });

  it("recovers CLEAR entries correctly", () => {
    const storageEngine = recoverFromEntries([
      { type: "SET", key: "name", value: "Siva" },
      { type: "SET", key: "city", value: "Hyderabad" },
      { type: "CLEAR" },
    ]);

    expect(storageEngine.size()).toBe(0);
  });

  it("recovers CLEAR followed by SET correctly", () => {
    const storageEngine = recoverFromEntries([
      { type: "SET", key: "name", value: "Siva" },
      { type: "CLEAR" },
      { type: "SET", key: "city", value: "Hyderabad" },
    ]);

    expect(storageEngine.get("name")).toBeUndefined();
    expect(storageEngine.get("city")).toBe("Hyderabad");
    expect(storageEngine.size()).toBe(1);
  });

  it("skips corrupted WAL lines", () => {
    writeFileSync(
      testLogPath,
      [
        JSON.stringify({ type: "SET", key: "name", value: "Siva" }),
        "this is invalid json",
        "",
        JSON.stringify({ type: "SET", key: "city", value: "Hyderabad" }),
      ].join("\n"),
      "utf8"
    );

    const storageEngine = new StorageEngine();
    const wal = new WriteAheadLog(testLogPath);
    const recoveryManager = new RecoveryManager(wal, storageEngine);

    recoveryManager.recover();

    expect(storageEngine.get("name")).toBe("Siva");
    expect(storageEngine.get("city")).toBe("Hyderabad");
  });

  it("does not duplicate WAL entries during recovery", () => {
    const wal = new WriteAheadLog(testLogPath);
    wal.append({ type: "SET", key: "name", value: "Siva" });
    const beforeRecovery = readFileSync(testLogPath, "utf8");

    const storageEngine = new StorageEngine();
    const recoveryManager = new RecoveryManager(wal, storageEngine);

    recoveryManager.recover();

    expect(readFileSync(testLogPath, "utf8")).toBe(beforeRecovery);
    expect(wal.readAll()).toEqual([
      { type: "SET", key: "name", value: "Siva" },
    ]);
  });

  it("handles empty WAL file", () => {
    const wal = new WriteAheadLog(testLogPath);
    const storageEngine = new StorageEngine();
    const recoveryManager = new RecoveryManager(wal, storageEngine);

    recoveryManager.recover();

    expect(storageEngine.size()).toBe(0);
  });

  it("data survives simulated restart", () => {
    const wal = new WriteAheadLog(testLogPath);
    const firstStorageEngine = new StorageEngine();
    const firstProcessor = new CommandProcessor(firstStorageEngine, wal);

    firstProcessor.execute({ type: "SET", key: "name", value: "Siva" });

    const recoveredStorageEngine = new StorageEngine();
    const recoveryManager = new RecoveryManager(wal, recoveredStorageEngine);

    recoveryManager.recover();

    expect(recoveredStorageEngine.get("name")).toBe("Siva");
  });
});

function recoverFromEntries(
  entries: Parameters<WriteAheadLog["append"]>[0][]
): StorageEngine {
  const wal = new WriteAheadLog(testLogPath);

  for (const entry of entries) {
    wal.append(entry);
  }

  const storageEngine = new StorageEngine();
  const recoveryManager = new RecoveryManager(wal, storageEngine);
  recoveryManager.recover();

  return storageEngine;
}

function removeTestLog(): void {
  if (existsSync(testLogPath)) {
    unlinkSync(testLogPath);
  }
}
