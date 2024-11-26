// api/utils/manualCleanup.js

import { cleanupOldMedia } from "./cleanup.js";

const runManualCleanup = async () => {
  console.log("Running manual cleanup of old media files...");
  await cleanupOldMedia();
  console.log("Manual cleanup completed.");
};

runManualCleanup().catch((error) => {
  console.error("Error during manual cleanup:", error);
});
