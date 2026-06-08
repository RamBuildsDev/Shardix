import type { Key, Value } from "./types";

export type CommandType =
  | "SET"
  | "GET"
  | "DELETE"
  | "EXISTS"
  | "KEYS"
  | "CLEAR"
  | "SIZE"
  | "REPL_SET"
  | "REPL_DELETE"
  | "REPL_CLEAR";

export type SetCommand = {
  type: "SET";
  key: Key;
  value: Value;
};

export type GetCommand = {
  type: "GET";
  key: Key;
};

export type DeleteCommand = {
  type: "DELETE";
  key: Key;
};

export type ExistsCommand = {
  type: "EXISTS";
  key: Key;
};

export type KeysCommand = {
  type: "KEYS";
};

export type ClearCommand = {
  type: "CLEAR";
};

export type SizeCommand = {
  type: "SIZE";
};

export type ReplSetCommand = {
  type: "REPL_SET";
  key: Key;
  value: Value;
};

export type ReplDeleteCommand = {
  type: "REPL_DELETE";
  key: Key;
};

export type ReplClearCommand = {
  type: "REPL_CLEAR";
};

export type ParsedCommand =
  | SetCommand
  | GetCommand
  | DeleteCommand
  | ExistsCommand
  | KeysCommand
  | ClearCommand
  | SizeCommand
  | ReplSetCommand
  | ReplDeleteCommand
  | ReplClearCommand;

export type WalEntry = SetCommand | DeleteCommand | ClearCommand;

export type CommandResponse = string | string[] | number | boolean;
