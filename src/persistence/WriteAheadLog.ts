import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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

    return contents.split("\n").reduce<WalEntry[]>((entries, line) => {
      if (line.trim().length === 0) {
        return entries;
      }

      try {
        entries.push(JSON.parse(line) as WalEntry);
      } catch {
        // Corrupted WAL lines are skipped so recovery can continue.
      }

      return entries;
    }, []);
  }

  clear(): void {
    writeFileSync(this.logPath, "", "utf8");
  }

  getLogPath(): string {
    return this.logPath;
  }
}
