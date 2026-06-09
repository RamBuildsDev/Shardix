import {
  createServer,
  type AddressInfo,
  type Server,
  type Socket,
} from "node:net";
import { INTERNAL_ERROR } from "../core/errors";
import { ShardRouter } from "./ShardRouter";

export class ShardRouterServer {
  private server?: Server;
  private sockets = new Set<Socket>();

  constructor(
    private shardRouter: ShardRouter,
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
    let responseChain = Promise.resolve();

    this.sockets.add(socket);
    socket.setEncoding("utf8");

    socket.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        responseChain = responseChain.then(async () => {
          const response = await this.handleCommand(line.replace(/\r$/, ""));
          socket.write(`${response}\n`);
        });
      }
    });

    socket.on("close", () => {
      this.sockets.delete(socket);
    });
  }

  private async handleCommand(commandLine: string): Promise<string> {
    try {
      return await this.shardRouter.send(commandLine);
    } catch {
      return INTERNAL_ERROR;
    }
  }
}
