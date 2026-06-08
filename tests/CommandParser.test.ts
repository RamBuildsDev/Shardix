import { describe, expect, it } from "vitest";
import { CommandParser } from "../src/core/CommandParser";
import {
  EMPTY_KEY,
  INVALID_ARGUMENTS,
  INVALID_COMMAND,
  ShardixError,
} from "../src/core/errors";

describe("CommandParser", () => {
  const parser = new CommandParser();

  it("parses SET command", () => {
    expect(parser.parse("SET name Siva")).toEqual({
      type: "SET",
      key: "name",
      value: "Siva",
    });
  });

  it("parses SET command with spaces in value", () => {
    expect(parser.parse("SET fullName Siva Ram Kumar")).toEqual({
      type: "SET",
      key: "fullName",
      value: "Siva Ram Kumar",
    });
  });

  it("parses GET command", () => {
    expect(parser.parse("GET name")).toEqual({ type: "GET", key: "name" });
  });

  it("parses DELETE command", () => {
    expect(parser.parse("DELETE name")).toEqual({
      type: "DELETE",
      key: "name",
    });
  });

  it("parses EXISTS command", () => {
    expect(parser.parse("EXISTS name")).toEqual({
      type: "EXISTS",
      key: "name",
    });
  });

  it("parses KEYS command", () => {
    expect(parser.parse("KEYS")).toEqual({ type: "KEYS" });
  });

  it("parses CLEAR command", () => {
    expect(parser.parse("CLEAR")).toEqual({ type: "CLEAR" });
  });

  it("parses SIZE command", () => {
    expect(parser.parse("SIZE")).toEqual({ type: "SIZE" });
  });

  it("throws INVALID_COMMAND for unknown command", () => {
    expectShardixError(() => parser.parse("UNKNOWN name"), INVALID_COMMAND);
  });

  it("throws INVALID_ARGUMENTS for missing key", () => {
    expectShardixError(() => parser.parse("GET"), INVALID_ARGUMENTS);
    expectShardixError(() => parser.parse("DELETE"), INVALID_ARGUMENTS);
    expectShardixError(() => parser.parse("EXISTS"), INVALID_ARGUMENTS);
  });

  it("throws INVALID_ARGUMENTS for SET without value", () => {
    expectShardixError(() => parser.parse("SET"), INVALID_ARGUMENTS);
    expectShardixError(() => parser.parse("SET name"), INVALID_ARGUMENTS);
  });

  it("throws EMPTY_KEY for empty input", () => {
    expectShardixError(() => parser.parse(""), EMPTY_KEY);
    expectShardixError(() => parser.parse("   "), EMPTY_KEY);
  });
});

function expectShardixError(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error("Expected action to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(ShardixError);
    expect((error as ShardixError).code).toBe(code);
  }
}
