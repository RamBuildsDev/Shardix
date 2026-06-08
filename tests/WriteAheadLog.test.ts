import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WriteAheadLog } from "../src/persistence/WriteAheadLog";

const testLogPath = join(process.cwd(), "data", "test-wal.log");

describe("WriteAheadLog", () => {
  beforeEach(() => {
    removeTestLog();
  });

  afterEach(() => {
    removeTestLog();
  });

  it("creates log file if missing", () => {
    new WriteAheadLog(testLogPath);

    expect(existsSync(testLogPath)).toBe(true);
  });

  it("appends SET entry", () => {
    const wal = new WriteAheadLog(testLogPath);

    wal.append({ type: "SET", key: "name", value: "Siva" });

    expect(wal.readAll()).toEqual([
      { type: "SET", key: "name", value: "Siva" },
    ]);
  });

  it("appends DELETE entry", () => {
    const wal = new WriteAheadLog(testLogPath);

    wal.append({ type: "DELETE", key: "name" });

    expect(wal.readAll()).toEqual([{ type: "DELETE", key: "name" }]);
  });

  it("appends CLEAR entry", () => {
    const wal = new WriteAheadLog(testLogPath);

    wal.append({ type: "CLEAR" });

    expect(wal.readAll()).toEqual([{ type: "CLEAR" }]);
  });

  it("reads all entries in order", () => {
    const wal = new WriteAheadLog(testLogPath);

    wal.append({ type: "SET", key: "name", value: "Siva" });
    wal.append({ type: "SET", key: "city", value: "Hyderabad" });
    wal.append({ type: "DELETE", key: "city" });
    wal.append({ type: "CLEAR" });

    expect(wal.readAll()).toEqual([
      { type: "SET", key: "name", value: "Siva" },
      { type: "SET", key: "city", value: "Hyderabad" },
      { type: "DELETE", key: "city" },
      { type: "CLEAR" },
    ]);
  });

  it("clear removes all entries", () => {
    const wal = new WriteAheadLog(testLogPath);

    wal.append({ type: "SET", key: "name", value: "Siva" });
    wal.clear();

    expect(wal.readAll()).toEqual([]);
  });
});

function removeTestLog(): void {
  if (existsSync(testLogPath)) {
    unlinkSync(testLogPath);
  }
}
