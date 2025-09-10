import "dotenv/config";
import runAllDbFeedsOnce, { runStaticAdaptersOnce } from "./runOnce";

async function main() {
  // allow override to run legacy static adapters if needed
  if (process.env.INGEST_STATIC === "1") {
    await runStaticAdaptersOnce();
  } else {
    console.log("FALLING HERE???");
    await runAllDbFeedsOnce();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
