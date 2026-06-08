import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { WalEntry } from "../core/commands";

export class WriteAheadLog {
  constructor(private logPath = join(process.cwd(), "data", "wal.log")) {
    mkdirSync(dirname(this.logPath), { recursive: true });

    if (!existsSync(this.logPath)) {
      writeFileSync(this.logPath, "", "utf8");
    }
  }

  append(entry: WalEntry): void {
    appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  readAll(): WalEntry[] {
    const contents = readFileSync(this.logPath, "utf8");

    if (contents.trim().length === 0) {
      return [];
    }

    return contents
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as WalEntry);
  }

  clear(): void {
    writeFileSync(this.logPath, "", "utf8");
  }

  getLogPath(): string {
    return this.logPath;
  }
}
