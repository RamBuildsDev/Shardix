import {
  createServer,
  type AddressInfo,
  type Server,
  type Socket,
} from "node:net";
import { CommandParser } from "../core/CommandParser";
import { CommandProcessor } from "../core/CommandProcessor";
import { INTERNAL_ERROR, ShardixError } from "../core/errors";

export class TcpServer {
  private server?: Server;
  private sockets = new Set<Socket>();

  constructor(
    private commandParser: CommandParser,
    private commandProcessor: CommandProcessor,
    private host: string,
    private port: number
  ) {}

  start(): Promise<void> {
    if (this.server?.listening) {
      return Promise.resolve();
    }

    this.server = createServer((socket) => this.handleConnection(socket));

    return new Promise((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.port, this.host, () => {
        this.server?.off("error", reject);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    if (!this.server) {
      return Promise.resolve();
    }

    for (const socket of this.sockets) {
      socket.destroy();
    }

    return new Promise((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        this.server = undefined;
        resolve();
      });
    });
  }

  getPort(): number {
    const address = this.server?.address();

    if (typeof address === "object" && address !== null) {
      return (address as AddressInfo).port;
    }

    return this.port;
  }

  private handleConnection(socket: Socket): void {
    let buffer = "";

    this.sockets.add(socket);
    socket.setEncoding("utf8");

    socket.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const response = this.handleCommand(line.replace(/\r$/, ""));
        socket.write(`${response}\n`);
      }
    });

    socket.on("close", () => {
      this.sockets.delete(socket);
    });
  }

  private handleCommand(commandLine: string): string {
    try {
      const command = this.commandParser.parse(commandLine);
      const response = this.commandProcessor.execute(command);
      return this.formatResponse(response);
    } catch (error) {
      if (error instanceof ShardixError) {
        return error.code;
      }

      return INTERNAL_ERROR;
    }
  }

  private formatResponse(response: unknown): string {
    if (Array.isArray(response)) {
      return JSON.stringify(response);
    }

    return String(response);
  }
}
