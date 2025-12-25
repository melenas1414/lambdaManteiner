import dotenv from 'dotenv';
import { cleanOldVersions } from './cleanupService.js';

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

// Execute cleanup
cleanOldVersions({
  region: REGION,
  versionsToKeep: VERSIONS_TO_KEEP,
  dryRun: DRY_RUN
});