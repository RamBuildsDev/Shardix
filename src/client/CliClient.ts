import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ShardixClient } from "./ShardixClient";

const host = "127.0.0.1";
const port = 7379;

const helpText = `Available Shardix commands:

SET key value       Store or update a value
GET key             Get a value
DELETE key          Delete a key
EXISTS key          Check whether a key exists
KEYS                List all keys
SIZE                Show number of keys
CLEAR               Remove all keys

HELP                Show this help message
EXIT / QUIT         Close the CLI`;

export class CliClient {
  constructor(private client: ShardixClient) {}

  async start(): Promise<void> {
    await this.client.connect();
    console.log(`Connected to Shardix at ${host}:${port}`);
    console.log("Type HELP for commands or EXIT to quit.");
    console.log();

    const readline = createInterface({ input, output });

    try {
      while (true) {
        const command = (await readline.question("shardix> ")).trim();
        const upperCommand = command.toUpperCase();

        if (command.length === 0) {
          continue;
        }

        if (upperCommand === "EXIT" || upperCommand === "QUIT") {
          break;
        }

        if (upperCommand === "HELP") {
          console.log(helpText);
          continue;
        }

        try {
          console.log(await this.client.send(command));
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      readline.close();
      await this.client.disconnect();
    }
  }
}

if (require.main === module) {
  const client = new ShardixClient({ host, port });
  const cli = new CliClient(client);

  cli.start().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
