import "dotenv/config";
import { runAllAdaptersOnce } from "./runOnce";

async function main() {
  await runAllAdaptersOnce();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
