require('dotenv').config();

const { LambdaClient, ListFunctionsCommand, ListVersionsByFunctionCommand } = require("@aws-sdk/client-lambda");

// Client configuration (will use credentials from ~/.aws/credentials or environment variables)
const client = new LambdaClient({ region: process.env.AWS_REGION || "us-east-1" });

async function getFuncionesPesadas() {
  console.log("🔍 Scanning Lambda functions and their versions... (this may take a while)");
  
  const results = [];
  let marker;

  try {
    // 1. Iterate over all functions (Pagination)
    do {
      const command = new ListFunctionsCommand({ Marker: marker });
      const response = await client.send(command);
      
      const functions = response.Functions || [];
      
      // Process each function found
      for (const fn of functions) {
        const name = fn.FunctionName;
        process.stdout.write(`- Analyzing: ${name} ... \r`); // Loading effect
        
        // 2. Get REAL size by summing all versions
        const { totalSize, versionCount } = await calculateVersionsSize(name);
        
        results.push({
          Name: name,
          Versions: versionCount,
          "Unit Size (MB)": (fn.CodeSize / (1024 * 1024)).toFixed(2),
          "TOTAL USED (MB)": (totalSize / (1024 * 1024)).toFixed(2),
          rawSize: totalSize
        });
      }
      
      marker = response.NextMarker;
    } while (marker);

    // 3. Sort by TOTAL size (highest to lowest)
    results.sort((a, b) => b.rawSize - a.rawSize);

    // Clear loading line
    process.stdout.clearLine();
    process.stdout.cursorTo(0);

    // 4. Display Table (Top 20)
    console.log("\n📊 TOP 20 LAMBDAS USING MOST STORAGE:");
    console.table(results.slice(0, 20), ["Name", "Versions", "Unit Size (MB)", "TOTAL USED (MB)"]);
    
    // Total summary
    const grandTotal = results.reduce((acc, curr) => acc + curr.rawSize, 0);
    console.log(`\n📦 Total Storage Used in Account: ${(grandTotal / (1024 * 1024 * 1024)).toFixed(2)} GB`);

  } catch (err) {
    console.error("\n❌ Error:", err);
  }
}

// Helper function to sum the size of all versions of a Lambda
async function calculateVersionsSize(functionName) {
  let totalSize = 0;
  let versionCount = 0;
  let marker;

  do {
    const command = new ListVersionsByFunctionCommand({ 
      FunctionName: functionName,
      Marker: marker 
    });
    const response = await client.send(command);
    
    // Sum the CodeSize of each version
    (response.Versions || []).forEach(v => {
      totalSize += v.CodeSize;
      versionCount++;
    });

    marker = response.NextMarker;
  } while (marker);

  return { totalSize, versionCount };
}

getFuncionesPesadas();