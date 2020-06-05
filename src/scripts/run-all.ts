import { manifestHasChanged, saveManifestVersion } from "./lib/manifest-utils";
import buildIconData from "./build-icon-data";

const TASKS = [buildIconData];

async function main() {
  const shouldRun = await manifestHasChanged();

  if (!shouldRun) {
    console.log("Manifest has not changed, returning and quitting");
    return;
  }

  console.log("Manifest has changed, running all scripts");

  for (const task of TASKS) {
    await task();
  }

  console.log("Scripts finished, saving version");
  await saveManifestVersion();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
