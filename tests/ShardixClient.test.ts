import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../src/client/ShardixClient";
import { CommandParser } from "../src/core/CommandParser";
import { CommandProcessor } from "../src/core/CommandProcessor";
import { StorageEngine } from "../src/core/StorageEngine";
import { WriteAheadLog } from "../src/persistence/WriteAheadLog";
import { TcpServer } from "../src/server/TcpServer";

const host = "127.0.0.1";
const testLogPath = join(process.cwd(), "data", "test-client.log");

describe("ShardixClient", () => {
  let server: TcpServer;
  let client: ShardixClient;
  let port: number;

  beforeEach(async () => {
    removeTestLog();

    const storageEngine = new StorageEngine();
    const writeAheadLog = new WriteAheadLog(testLogPath);
    const commandParser = new CommandParser();
    const commandProcessor = new CommandProcessor(storageEngine, writeAheadLog);
    server = new TcpServer(commandParser, commandProcessor, host, 0);

    await server.start();
    port = server.getPort();
    client = new ShardixClient({ host, port });
  });

  afterEach(async () => {
    await client.disconnect();
    await server.stop();
    removeTestLog();
  });

  it("client connects to server", async () => {
    await expect(client.connect()).resolves.toBeUndefined();
  });

  it("client sends SET and receives OK", async () => {
    await client.connect();

    await expect(client.set("name", "Siva")).resolves.toBe("OK");
  });

  it("client sends GET and receives stored value", async () => {
    await client.connect();

    await client.set("name", "Siva");

    await expect(client.get("name")).resolves.toBe("Siva");
  });

  it("client sends DELETE and receives DELETED", async () => {
    await client.connect();

    await client.set("name", "Siva");

    await expect(client.delete("name")).resolves.toBe("DELETED");
  });

  it("client receives KEY_NOT_FOUND for missing key", async () => {
    await client.connect();

    await expect(client.get("missing")).resolves.toBe("KEY_NOT_FOUND");
  });

  it("client sends EXISTS and receives true or false", async () => {
    await client.connect();

    expect(await client.exists("name")).toBe("false");
    await client.set("name", "Siva");
    expect(await client.exists("name")).toBe("true");
  });

  it("client sends KEYS and receives key list", async () => {
    await client.connect();

    await client.set("name", "Siva");

    await expect(client.keys()).resolves.toBe("[\"name\"]");
  });

  it("client sends SIZE and receives count", async () => {
    await client.connect();

    await client.set("name", "Siva");
    await client.set("city", "Hyderabad");

    await expect(client.size()).resolves.toBe("2");
  });

  it("client disconnects cleanly", async () => {
    await client.connect();

    await expect(client.disconnect()).resolves.toBeUndefined();
  });
});

function removeTestLog(): void {
  if (existsSync(testLogPath)) {
    unlinkSync(testLogPath);
  }
}
