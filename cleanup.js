import { LambdaClient, ListFunctionsCommand, ListVersionsByFunctionCommand, DeleteFunctionCommand } from "@aws-sdk/client-lambda";
import dotenv from 'dotenv';
dotenv.config();

// --- PARAMETER READING ---
// Usage: node limpieza.js <VERSIONS_TO_KEEP> <DRY_RUN_FALSE>
// Example: node limpieza.js 3 false

const args = process.argv.slice(2);

// 1. Number of versions to keep (Default: 5)
const VERSIONS_TO_KEEP = args[0] ? parseInt(args[0]) : 5;

// 2. Dry Run Mode. TRUE by default for safety.
// Only deactivated if you explicitly write "false" as the second argument.
const DRY_RUN = args[1] === 'false' ? false : true;
const REGION = process.env.AWS_REGION || "us-east-1";

// ---------------------

const client = new LambdaClient({ region: REGION });

async function cleanOldVersions() {
  console.log("========================================");
  console.log(`🚀 Starting cleanup in region: ${REGION}`);
  console.log(`📥 Configuration received:`);
  console.log(`   - Versions to KEEP: ${VERSIONS_TO_KEEP}`);
  console.log(`   - Dry Run Mode (DRY RUN): ${DRY_RUN ? "✅ ENABLED (Nothing will be deleted)" : "❌ DISABLED (DANGER: Data will be deleted)"}`);
  console.log("========================================\n");

  let functionMarker;

  try {
    do {
      const listCmd = new ListFunctionsCommand({ Marker: functionMarker });
      const listRes = await client.send(listCmd);
      const functions = listRes.Functions || [];

      for (const fn of functions) {
        await processFunction(fn.FunctionName);
      }

      functionMarker = listRes.NextMarker;
    } while (functionMarker);

    console.log("\n✅ Process completed.");

  } catch (err) {
    console.error("❌ General Error:", err);
  }
}

async function processFunction(funcName) {
  try {
    let versions = [];
    let versionMarker;
    
    // Obtener todas las versiones paginadas
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
      return;
    }

    // The surplus ones are at the end of the list (the oldest)
    const versionsToDelete = numericVersions.slice(VERSIONS_TO_KEEP);
    
    console.log(`🧹 Function: ${funcName} | Total: ${numericVersions.length} | To delete: ${versionsToDelete.length}`);

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
        // Anti-throttling pause
        await new Promise(r => setTimeout(r, 100)); 
      }
    }

  } catch (err) {
    console.error(`   ❌ Error in ${funcName}:`, err.message);
  }
}

cleanOldVersions();