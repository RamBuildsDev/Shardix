import { CommandParser } from "./core/CommandParser";
import { CommandProcessor } from "./core/CommandProcessor";
import { StorageEngine } from "./core/StorageEngine";
import { RecoveryManager } from "./persistence/RecoveryManager";
import { WriteAheadLog } from "./persistence/WriteAheadLog";
import { TcpServer } from "./server/TcpServer";

const host = "127.0.0.1";
const port = 7379;

async function main(): Promise<void> {
  const storageEngine = new StorageEngine();
  const writeAheadLog = new WriteAheadLog("data/shardix.log");
  const recoveryManager = new RecoveryManager(writeAheadLog, storageEngine);
  recoveryManager.recover();

  const commandParser = new CommandParser();
  const commandProcessor = new CommandProcessor(storageEngine, writeAheadLog);
  const server = new TcpServer(commandParser, commandProcessor, host, port);

  await server.start();
  console.log(`Shardix server listening on ${host}:${port}`);

  process.on("SIGINT", async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
