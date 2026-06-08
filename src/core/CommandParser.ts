import type { CommandType, ParsedCommand } from "./commands";
import {
  EMPTY_KEY,
  INVALID_ARGUMENTS,
  INVALID_COMMAND,
  ShardixError,
} from "./errors";

const KEY_COMMANDS = new Set(["GET", "DELETE", "EXISTS"]);
const NO_ARGUMENT_COMMANDS = new Set(["KEYS", "CLEAR", "SIZE"]);

export class CommandParser {
  parse(input: string): ParsedCommand {
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0) {
      throw new ShardixError(EMPTY_KEY, "Command cannot be empty");
    }

    const [rawCommand] = trimmedInput.split(/\s+/, 1);
    const command = rawCommand.toUpperCase();
    const rest = trimmedInput.slice(rawCommand.length).trimStart();

    if (command === "SET") {
      return this.parseSet(rest);
    }

    if (KEY_COMMANDS.has(command)) {
      return this.parseKeyCommand(command, rest);
    }

    if (NO_ARGUMENT_COMMANDS.has(command)) {
      this.ensureNoArguments(rest);
      return { type: command as Extract<CommandType, "KEYS" | "CLEAR" | "SIZE"> };
    }

    throw new ShardixError(INVALID_COMMAND, `Unsupported command: ${rawCommand}`);
  }

  private parseSet(rest: string): ParsedCommand {
    const keyMatch = rest.match(/^\S+/);

    if (!keyMatch) {
      throw new ShardixError(INVALID_ARGUMENTS, "SET requires a key and value");
    }

    const key = keyMatch[0];
    const value = rest.slice(key.length).trimStart();

    if (value.length === 0) {
      throw new ShardixError(INVALID_ARGUMENTS, "SET requires a value");
    }

    return { type: "SET", key, value };
  }

  private parseKeyCommand(command: string, rest: string): ParsedCommand {
    const parts = rest.split(/\s+/).filter(Boolean);

    if (parts.length !== 1) {
      throw new ShardixError(
        INVALID_ARGUMENTS,
        `${command} requires exactly one key`
      );
    }

    if (command === "GET") {
      return { type: "GET", key: parts[0] };
    }

    if (command === "DELETE") {
      return { type: "DELETE", key: parts[0] };
    }

    return { type: "EXISTS", key: parts[0] };
  }

  private ensureNoArguments(rest: string): void {
    if (rest.trim().length > 0) {
      throw new ShardixError(
        INVALID_ARGUMENTS,
        "Command does not accept arguments"
      );
    }
  }
}
