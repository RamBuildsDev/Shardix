import type {
  CommandType,
  DeleteCommand,
  ExistsCommand,
  GetCommand,
  ParsedCommand,
  SetCommand,
} from "./commands";
import {
  EMPTY_KEY,
  INVALID_ARGUMENTS,
  INVALID_COMMAND,
  ShardixError,
} from "./errors";

const KEY_COMMANDS = new Set(["GET", "DELETE", "EXISTS"]);
const NO_ARGUMENT_COMMANDS = new Set(["KEYS", "CLEAR", "SIZE", "PING"]);

export class CommandParser {
  parse(input: string): ParsedCommand {
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0) {
      throw new ShardixError(EMPTY_KEY, "Command cannot be empty");
    }

    const [rawCommand] = trimmedInput.split(/\s+/, 1);
    const command = rawCommand.toUpperCase();
    const rest = trimmedInput.slice(rawCommand.length).trimStart();

    if (command === "REPL") {
      return this.parseReplicationCommand(rest);
    }

    if (command === "SET") {
      return this.parseSet(rest);
    }

    if (KEY_COMMANDS.has(command)) {
      return this.parseKeyCommand(command, rest);
    }

    if (NO_ARGUMENT_COMMANDS.has(command)) {
      this.ensureNoArguments(rest);
      return {
        type: command as Extract<CommandType, "KEYS" | "CLEAR" | "SIZE" | "PING">,
      };
    }

    throw new ShardixError(INVALID_COMMAND, `Unsupported command: ${rawCommand}`);
  }

  private parseSet(rest: string): SetCommand {
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

  private parseReplicationCommand(rest: string): ParsedCommand {
    const [rawCommand] = rest.split(/\s+/, 1);

    if (!rawCommand) {
      throw new ShardixError(INVALID_ARGUMENTS, "REPL requires a command");
    }

    const command = rawCommand.toUpperCase();
    const commandRest = rest.slice(rawCommand.length).trimStart();

    if (command === "SET") {
      const parsedSet = this.parseSet(commandRest);
      return {
        type: "REPL_SET",
        key: parsedSet.key,
        value: parsedSet.value,
      };
    }

    if (command === "DELETE") {
      const parsedDelete = this.parseKeyCommand("DELETE", commandRest);
      return { type: "REPL_DELETE", key: parsedDelete.key };
    }

    if (command === "CLEAR") {
      this.ensureNoArguments(commandRest);
      return { type: "REPL_CLEAR" };
    }

    throw new ShardixError(INVALID_COMMAND, `Unsupported REPL command: ${rawCommand}`);
  }

  private parseKeyCommand(
    command: string,
    rest: string
  ): GetCommand | DeleteCommand | ExistsCommand {
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
