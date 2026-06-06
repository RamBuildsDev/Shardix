export const EMPTY_KEY = "EMPTY_KEY" as const;

export type ErrorCode = typeof EMPTY_KEY;

export class ShardixError extends Error {
  constructor(
    public code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ShardixError";
  }
}