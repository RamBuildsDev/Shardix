import { beforeEach, describe, expect, it } from "vitest";
import type { WalEntry } from "../src/core/commands";
import { CommandProcessor } from "../src/core/CommandProcessor";
import { KEY_NOT_FOUND } from "../src/core/errors";
import { StorageEngine } from "../src/core/StorageEngine";

describe("CommandProcessor", () => {
  let storageEngine: StorageEngine;
  let processor: CommandProcessor;

  beforeEach(() => {
    storageEngine = new StorageEngine();
    processor = new CommandProcessor(storageEngine);
  });

  it("SET stores value and returns OK", () => {
    const response = processor.execute({
      type: "SET",
      key: "name",
      value: "Siva",
    });

    expect(response).toBe("OK");
    expect(storageEngine.get("name")).toBe("Siva");
  });

  it("GET returns existing value", () => {
    storageEngine.set("name", "Siva");

    expect(processor.execute({ type: "GET", key: "name" })).toBe("Siva");
  });

  it("GET returns KEY_NOT_FOUND for missing key", () => {
    expect(processor.execute({ type: "GET", key: "missing" })).toBe(
      KEY_NOT_FOUND
    );
  });

  it("DELETE removes key and returns DELETED", () => {
    storageEngine.set("name", "Siva");

    expect(processor.execute({ type: "DELETE", key: "name" })).toBe("DELETED");
    expect(storageEngine.exists("name")).toBe(false);
  });

  it("DELETE returns KEY_NOT_FOUND for missing key", () => {
    expect(processor.execute({ type: "DELETE", key: "missing" })).toBe(
      KEY_NOT_FOUND
    );
  });

  it("EXISTS returns true for existing key", () => {
    storageEngine.set("name", "Siva");

    expect(processor.execute({ type: "EXISTS", key: "name" })).toBe(true);
  });

  it("EXISTS returns false for missing key", () => {
    expect(processor.execute({ type: "EXISTS", key: "missing" })).toBe(false);
  });

  it("KEYS returns all keys", () => {
    storageEngine.set("name", "Siva");
    storageEngine.set("city", "Hyderabad");

    expect(processor.execute({ type: "KEYS" })).toEqual(
      expect.arrayContaining(["name", "city"])
    );
  });

  it("CLEAR removes all keys and returns OK", () => {
    storageEngine.set("name", "Siva");
    storageEngine.set("city", "Hyderabad");

    expect(processor.execute({ type: "CLEAR" })).toBe("OK");
    expect(storageEngine.size()).toBe(0);
  });

  it("SIZE returns number of stored keys", () => {
    storageEngine.set("name", "Siva");
    storageEngine.set("city", "Hyderabad");

    expect(processor.execute({ type: "SIZE" })).toBe(2);
  });

  it("SET writes to WAL before storing value", () => {
    const wal = createFakeWal((entry) => {
      expect(entry).toEqual({ type: "SET", key: "name", value: "Siva" });
      expect(storageEngine.get("name")).toBeUndefined();
    });
    processor = new CommandProcessor(storageEngine, wal);

    expect(
      processor.execute({ type: "SET", key: "name", value: "Siva" })
    ).toBe("OK");
    expect(wal.entries).toEqual([{ type: "SET", key: "name", value: "Siva" }]);
    expect(storageEngine.get("name")).toBe("Siva");
  });

  it("DELETE writes to WAL when key exists", () => {
    const wal = createFakeWal();
    storageEngine.set("name", "Siva");
    processor = new CommandProcessor(storageEngine, wal);

    expect(processor.execute({ type: "DELETE", key: "name" })).toBe("DELETED");
    expect(wal.entries).toEqual([{ type: "DELETE", key: "name" }]);
  });

  it("DELETE does not write to WAL when key is missing", () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    expect(processor.execute({ type: "DELETE", key: "missing" })).toBe(
      KEY_NOT_FOUND
    );
    expect(wal.entries).toEqual([]);
  });

  it("CLEAR writes to WAL", () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    expect(processor.execute({ type: "CLEAR" })).toBe("OK");
    expect(wal.entries).toEqual([{ type: "CLEAR" }]);
  });

  it("GET does not write to WAL", () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    processor.execute({ type: "GET", key: "missing" });

    expect(wal.entries).toEqual([]);
  });

  it("EXISTS does not write to WAL", () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    processor.execute({ type: "EXISTS", key: "missing" });

    expect(wal.entries).toEqual([]);
  });

  it("KEYS does not write to WAL", () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    processor.execute({ type: "KEYS" });

    expect(wal.entries).toEqual([]);
  });

  it("SIZE does not write to WAL", () => {
    const wal = createFakeWal();
    processor = new CommandProcessor(storageEngine, wal);

    processor.execute({ type: "SIZE" });

    expect(wal.entries).toEqual([]);
  });
});

function createFakeWal(onAppend?: (entry: WalEntry) => void): {
  entries: WalEntry[];
  append(entry: WalEntry): void;
} {
  return {
    entries: [],
    append(entry: WalEntry): void {
      onAppend?.(entry);
      this.entries.push(entry);
    },
  };
}
