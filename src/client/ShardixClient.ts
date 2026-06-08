import { createConnection, type Socket } from "node:net";

export type ShardixClientOptions = {
  host: string;
  port: number;
};

type PendingRequest = {
  resolve(response: string): void;
  reject(error: Error): void;
};

export class ShardixClient {
  private socket?: Socket;
  private buffer = "";
  private pendingRequest?: PendingRequest;

  constructor(private options: ShardixClientOptions) {}

  connect(): Promise<void> {
    if (this.socket && !this.socket.destroyed) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const socket = createConnection({
        host: this.options.host,
        port: this.options.port,
      });

      const onConnect = (): void => {
        socket.off("error", onInitialError);
        this.socket = socket;
        this.buffer = "";
        socket.setEncoding("utf8");
        socket.on("data", (chunk) => this.handleData(chunk));
        socket.on("error", (error) => this.rejectPending(error));
        socket.on("close", () => {
          this.rejectPending(new Error("Connection closed"));
        });
        resolve();
      };

      const onInitialError = (error: Error): void => {
        socket.destroy();
        reject(error);
      };

      socket.once("connect", onConnect);
      socket.once("error", onInitialError);
    });
  }

  disconnect(): Promise<void> {
    if (!this.socket || this.socket.destroyed) {
      this.socket = undefined;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const socket = this.socket;
      this.socket = undefined;
      this.pendingRequest = undefined;

      socket?.once("close", () => resolve());
      socket?.end();
    });
  }

  send(command: string): Promise<string> {
    if (!this.socket || this.socket.destroyed) {
      return Promise.reject(new Error("Client is not connected"));
    }

    if (this.pendingRequest) {
      return Promise.reject(
        new Error("ShardixClient supports one request at a time")
      );
    }

    return new Promise((resolve, reject) => {
      this.pendingRequest = { resolve, reject };
      this.socket?.write(`${command}\n`, "utf8", (error) => {
        if (error) {
          this.pendingRequest = undefined;
          reject(error);
        }
      });
    });
  }

  set(key: string, value: string): Promise<string> {
    return this.send(`SET ${key} ${value}`);
  }

  get(key: string): Promise<string> {
    return this.send(`GET ${key}`);
  }

  delete(key: string): Promise<string> {
    return this.send(`DELETE ${key}`);
  }

  exists(key: string): Promise<string> {
    return this.send(`EXISTS ${key}`);
  }

  keys(): Promise<string> {
    return this.send("KEYS");
  }

  clear(): Promise<string> {
    return this.send("CLEAR");
  }

  size(): Promise<string> {
    return this.send("SIZE");
  }

  private handleData(chunk: string | Buffer): void {
    this.buffer += chunk.toString();
    const newlineIndex = this.buffer.indexOf("\n");

    if (newlineIndex === -1 || !this.pendingRequest) {
      return;
    }

    const response = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
    this.buffer = this.buffer.slice(newlineIndex + 1);
    const pendingRequest = this.pendingRequest;
    this.pendingRequest = undefined;
    pendingRequest.resolve(response);
  }

  private rejectPending(error: Error): void {
    if (!this.pendingRequest) {
      return;
    }

    const pendingRequest = this.pendingRequest;
    this.pendingRequest = undefined;
    pendingRequest.reject(error);
  }
}
