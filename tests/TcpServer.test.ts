import { createConnection, type Socket } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CommandParser } from "../src/core/CommandParser";
import { CommandProcessor } from "../src/core/CommandProcessor";
import { StorageEngine } from "../src/core/StorageEngine";
import { TcpServer } from "../src/server/TcpServer";

const host = "127.0.0.1";

describe("TcpServer", () => {
  let server: TcpServer;
  let port: number;

  beforeEach(async () => {
    const storageEngine = new StorageEngine();
    const commandParser = new CommandParser();
    const commandProcessor = new CommandProcessor(storageEngine);
    server = new TcpServer(commandParser, commandProcessor, host, 0);

    await server.start();
    port = server.getPort();
  });

  afterEach(async () => {
    await server.stop();
  });

  it("server starts successfully", () => {
    expect(port).toBeGreaterThan(0);
  });

  it("client can connect", async () => {
    const socket = await connectClient(port);

    expect(socket.connecting).toBe(false);

    socket.destroy();
  });

  it("client can send SET command and receive OK", async () => {
    await expect(sendAndRead(port, "SET name Siva\n", 1)).resolves.toEqual([
      "OK",
    ]);
  });

  it("client can send GET command and receive value", async () => {
    await expect(
      sendAndRead(port, "SET name Siva\nGET name\n", 2)
    ).resolves.toEqual(["OK", "Siva"]);
  });

  it("server handles multiple commands in one connection", async () => {
    const responses = await sendAndRead(
      port,
      [
        "SET name Siva",
        "EXISTS name",
        "KEYS",
        "SIZE",
        "DELETE name",
        "GET name",
      ].join("\n") + "\n",
      6
    );

    expect(responses).toEqual([
      "OK",
      "true",
      "[\"name\"]",
      "1",
      "DELETED",
      "KEY_NOT_FOUND",
    ]);
  });

  it("server handles invalid command without crashing", async () => {
    await expect(sendAndRead(port, "UNKNOWN name\nSIZE\n", 2)).resolves.toEqual([
      "INVALID_COMMAND",
      "0",
    ]);
  });

  it("server handles incomplete command chunks", async () => {
    const socket = await connectClient(port);
    const responses = waitForResponses(socket, 2);

    socket.write("SET na");
    socket.write("me Siva\nGET name\n");

    await expect(responses).resolves.toEqual(["OK", "Siva"]);

    socket.destroy();
  });

  it("server stops cleanly", async () => {
    await expect(server.stop()).resolves.toBeUndefined();
  });
});

function connectClient(port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function sendAndRead(
  port: number,
  payload: string,
  responseCount: number
): Promise<string[]> {
  const socket = await connectClient(port);
  const responses = waitForResponses(socket, responseCount);

  socket.write(payload);

  try {
    return await responses;
  } finally {
    socket.destroy();
  }
}

function waitForResponses(
  socket: Socket,
  responseCount: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const responses: string[] = [];
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for TCP responses"));
    }, 1000);

    const cleanup = (): void => {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        responses.push(line);
      }

      if (responses.length >= responseCount) {
        cleanup();
        resolve(responses);
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
  });
}
