import { beforeEach, describe, expect, it } from "vitest";
import { StorageEngine } from "../src/core/StorageEngine";
import { EMPTY_KEY, ShardixError } from "../src/core/errors";

describe("StorageEngine", () => {
  let engine: StorageEngine;

  beforeEach(() => {
    engine = new StorageEngine();
  });

  it("set stores a new value", () => {
    engine.set("name", "Siva");

    expect(engine.get("name")).toBe("Siva");
  });

  it("set updates an existing value", () => {
    engine.set("name", "Siva");
    engine.set("name", "Ram");

    expect(engine.get("name")).toBe("Ram");
  });

  it("get returns existing value", () => {
    engine.set("city", "Hyderabad");

    expect(engine.get("city")).toBe("Hyderabad");
  });

  it("get returns undefined for missing key", () => {
    expect(engine.get("missing")).toBeUndefined();
  });

  it("delete removes existing key", () => {
    engine.set("name", "Siva");

    const deleted = engine.delete("name");

    expect(deleted).toBe(true);
    expect(engine.get("name")).toBeUndefined();
  });

  it("delete returns false for missing key", () => {
    expect(engine.delete("missing")).toBe(false);
  });

  it("exists returns true for existing key", () => {
    engine.set("name", "Siva");

    expect(engine.exists("name")).toBe(true);
  });

  it("exists returns false for missing key", () => {
    expect(engine.exists("missing")).toBe(false);
  });

  it("keys returns all stored keys", () => {
    engine.set("name", "Siva");
    engine.set("city", "Hyderabad");
    engine.set("user:1", "Ram");

    const keys = engine.keys();

    expect(keys).toHaveLength(3);
    expect(keys).toEqual(expect.arrayContaining(["name", "city", "user:1"]));
  });

  it("clear removes all data", () => {
    engine.set("name", "Siva");
    engine.set("city", "Hyderabad");

    engine.clear();

    expect(engine.size()).toBe(0);
    expect(engine.get("name")).toBeUndefined();
    expect(engine.get("city")).toBeUndefined();
  });

  it("size returns correct count", () => {
    expect(engine.size()).toBe(0);

    engine.set("name", "Siva");
    engine.set("city", "Hyderabad");

    expect(engine.size()).toBe(2);

    engine.delete("name");

    expect(engine.size()).toBe(1);
  });

  it("empty keys are rejected", () => {
    expect(() => engine.set("", "Siva")).toThrow(ShardixError);
    expect(() => engine.get("")).toThrow(ShardixError);
    expect(() => engine.delete("")).toThrow(ShardixError);
    expect(() => engine.exists("")).toThrow(ShardixError);
  });

  it("keys with only spaces are rejected", () => {
    expect(() => engine.set("   ", "Siva")).toThrow(ShardixError);
    expect(() => engine.get("   ")).toThrow(ShardixError);
    expect(() => engine.delete("   ")).toThrow(ShardixError);
    expect(() => engine.exists("   ")).toThrow(ShardixError);
  });

  it("empty key error has EMPTY_KEY code", () => {
    try {
      engine.set("", "Siva");
    } catch (error) {
      expect(error).toBeInstanceOf(ShardixError);
      expect((error as ShardixError).code).toBe(EMPTY_KEY);
    }
  });
});