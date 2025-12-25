import { LambdaClient } from "@aws-sdk/client-lambda";
import { processFunction } from './cleanupService.js';

// Lambda handler for scheduled cleanup
// Uses shared cleanupService for consistency with CLI tools
export const scheduledCleanup = async (event, context) => {
  console.log("========================================");
  console.log("🚀 Starting scheduled Lambda cleanup");
  console.log("Event:", JSON.stringify(event, null, 2));
  console.log("========================================\n");

  // Read configuration from environment variables
  const VERSIONS_TO_KEEP = parseInt(process.env.VERSIONS_TO_KEEP) || 5;
  const REGION = process.env.AWS_REGION || "us-east-1";
  
  // Scheduled cleanups should run in production mode by default (DRY_RUN = false)
  const DRY_RUN = process.env.DRY_RUN === 'true';

  console.log(`📥 Configuration:`);
  console.log(`   - Region: ${REGION}`);
  console.log(`   - Versions to KEEP: ${VERSIONS_TO_KEEP}`);
  console.log(`   - Dry Run Mode: ${DRY_RUN ? "✅ ENABLED (Nothing will be deleted)" : "❌ DISABLED (Data will be deleted)"}`);
  console.log("========================================\n");

  const client = new LambdaClient({ region: REGION });

  try {
    let totalFunctionsProcessed = 0;
    let totalVersionsDeleted = 0;
    let functionMarker;

    const { ListFunctionsCommand } = await import("@aws-sdk/client-lambda");

    do {
      const listCmd = new ListFunctionsCommand({ Marker: functionMarker });
      const listRes = await client.send(listCmd);
      const functions = listRes.Functions || [];

      for (const fn of functions) {
        const result = await processFunction(client, fn.FunctionName, VERSIONS_TO_KEEP, DRY_RUN);
        totalFunctionsProcessed++;
        totalVersionsDeleted += result.deletedCount;
      }

      functionMarker = listRes.NextMarker;
    } while (functionMarker);

    const summary = {
      status: 'SUCCESS',
      functionsProcessed: totalFunctionsProcessed,
      versionsDeleted: totalVersionsDeleted,
      versionsToKeep: VERSIONS_TO_KEEP,
      dryRun: DRY_RUN
    };

    console.log("\n========================================");
    console.log("✅ Cleanup completed successfully");
    console.log(`📊 Summary:`);
    console.log(`   - Functions processed: ${totalFunctionsProcessed}`);
    console.log(`   - Versions deleted: ${totalVersionsDeleted}`);
    console.log("========================================\n");

    return {
      statusCode: 200,
      body: JSON.stringify(summary)
    };

  } catch (err) {
    console.error("❌ General Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'ERROR',
        error: err.message
      })
    };
  }
};
