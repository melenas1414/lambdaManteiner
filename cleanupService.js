import { LambdaClient, ListFunctionsCommand, ListVersionsByFunctionCommand, DeleteFunctionCommand } from "@aws-sdk/client-lambda";

/**
 * Cleanup service for Lambda version management
 * Shared logic used by both CLI and Lambda handler
 */

/**
 * Process a single Lambda function and delete old versions
 * @param {LambdaClient} client - AWS Lambda client instance
 * @param {string} funcName - Name of the Lambda function
 * @param {number} versionsToKeep - Number of recent versions to keep
 * @param {boolean} dryRun - If true, only logs what would be deleted
 * @returns {Promise<{deletedCount: number}>} - Number of versions deleted
 */
export async function processFunction(client, funcName, versionsToKeep, dryRun) {
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

    if (numericVersions.length <= versionsToKeep) {
      // If there are fewer than or equal to versionsToKeep versions, do nothing
      return { deletedCount: 0 };
    }

    // The surplus ones are at the end of the list (the oldest)
    const versionsToDelete = numericVersions.slice(versionsToKeep);
    
    console.log(`🧹 Function: ${funcName} | Total: ${numericVersions.length} | To delete: ${versionsToDelete.length}`);

    let deletedCount = 0;
    for (const v of versionsToDelete) {
      if (dryRun) {
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

    return { deletedCount: dryRun ? 0 : deletedCount };

  } catch (err) {
    console.error(`   ❌ Error in ${funcName}:`, err.message);
    return { deletedCount: 0 };
  }
}

/**
 * Clean old versions from all Lambda functions in the account
 * @param {Object} options - Configuration options
 * @param {string} options.region - AWS region
 * @param {number} options.versionsToKeep - Number of versions to keep per function
 * @param {boolean} options.dryRun - If true, only logs what would be deleted
 * @returns {Promise<{functionsProcessed: number, versionsDeleted: number}>}
 */
export async function cleanOldVersions({ region, versionsToKeep, dryRun }) {
  console.log("========================================");
  console.log(`🚀 Starting cleanup in region: ${region}`);
  console.log(`📥 Configuration received:`);
  console.log(`   - Versions to KEEP: ${versionsToKeep}`);
  console.log(`   - Dry Run Mode (DRY RUN): ${dryRun ? "✅ ENABLED (Nothing will be deleted)" : "❌ DISABLED (DANGER: Data will be deleted)"}`);
  console.log("========================================\n");

  const client = new LambdaClient({ region });
  let totalFunctionsProcessed = 0;
  let totalVersionsDeleted = 0;
  let functionMarker;

  try {
    do {
      const listCmd = new ListFunctionsCommand({ Marker: functionMarker });
      const listRes = await client.send(listCmd);
      const functions = listRes.Functions || [];

      for (const fn of functions) {
        const result = await processFunction(client, fn.FunctionName, versionsToKeep, dryRun);
        totalFunctionsProcessed++;
        totalVersionsDeleted += result.deletedCount;
      }

      functionMarker = listRes.NextMarker;
    } while (functionMarker);

    console.log("\n✅ Process completed.");

    return {
      functionsProcessed: totalFunctionsProcessed,
      versionsDeleted: totalVersionsDeleted
    };

  } catch (err) {
    console.error("❌ General Error:", err);
    throw err;
  }
}
