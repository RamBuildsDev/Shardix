export const EMPTY_KEY = "EMPTY_KEY" as const;
export const INVALID_COMMAND = "INVALID_COMMAND" as const;
export const INVALID_ARGUMENTS = "INVALID_ARGUMENTS" as const;
export const KEY_NOT_FOUND = "KEY_NOT_FOUND" as const;
export const INTERNAL_ERROR = "INTERNAL_ERROR" as const;
export const NOT_LEADER = "NOT_LEADER" as const;
export const REPLICATION_ERROR = "REPLICATION_ERROR" as const;

export type ErrorCode =
  | typeof EMPTY_KEY
  | typeof INVALID_COMMAND
  | typeof INVALID_ARGUMENTS
  | typeof KEY_NOT_FOUND
  | typeof INTERNAL_ERROR
  | typeof NOT_LEADER
  | typeof REPLICATION_ERROR;

export class ShardixError extends Error {
  constructor(
    public code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ShardixError";
  }
}
