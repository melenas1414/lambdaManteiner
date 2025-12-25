import { LambdaClient, ListFunctionsCommand, ListVersionsByFunctionCommand, DeleteFunctionCommand } from "@aws-sdk/client-lambda";

// Lambda handler for scheduled cleanup
export const scheduledCleanup = async (event, context) => {
  console.log("========================================");
  console.log("🚀 Starting scheduled Lambda cleanup");
  console.log("Event:", JSON.stringify(event, null, 2));
  console.log("========================================\n");

  // Read configuration from environment variables
  const VERSIONS_TO_KEEP = parseInt(process.env.VERSIONS_TO_KEEP) || 5;
  const REGION = process.env.AWS_REGION || "us-east-1";
  
  // Scheduled cleanups should always run in production mode (DRY_RUN = false)
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

async function processFunction(client, funcName, VERSIONS_TO_KEEP, DRY_RUN) {
  try {
    let versions = [];
    let versionMarker;
    
    // Get all paginated versions
    do {
      const vCmd = new ListVersionsByFunctionCommand({ 
        FunctionName: funcName, 
        Marker: versionMarker 
      });
      const vRes = await client.send(vCmd);
      versions.push(...(vRes.Versions || []));
      versionMarker = vRes.NextMarker;
    } while (versionMarker);

    // Filter $LATEST and sort numerically descending (highest first)
    const numericVersions = versions
      .filter(v => v.Version !== "$LATEST")
      .sort((a, b) => parseInt(b.Version) - parseInt(a.Version));

    if (numericVersions.length <= VERSIONS_TO_KEEP) {
      // If you have less than or equal versions to the limit, do nothing
      return { deletedCount: 0 };
    }

    // The surplus ones are at the end of the list (the oldest)
    const versionsToDelete = numericVersions.slice(VERSIONS_TO_KEEP);
    
    console.log(`🧹 Function: ${funcName} | Total: ${numericVersions.length} | To delete: ${versionsToDelete.length}`);

    let deletedCount = 0;
    for (const v of versionsToDelete) {
      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would delete version: v${v.Version}`);
      } else {
        process.stdout.write(`   🔥 Deleting v${v.Version}... `);
        await client.send(new DeleteFunctionCommand({
          FunctionName: funcName,
          Qualifier: v.Version
        }));
        console.log("OK");
        deletedCount++;
        // Anti-throttling pause
        await new Promise(r => setTimeout(r, 100)); 
      }
    }

    return { deletedCount: DRY_RUN ? 0 : deletedCount };

  } catch (err) {
    console.error(`   ❌ Error in ${funcName}:`, err.message);
    return { deletedCount: 0 };
  }
}
