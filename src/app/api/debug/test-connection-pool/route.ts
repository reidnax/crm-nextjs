import { NextResponse } from "next/server";
import { ConnectionPoolTester } from "@/lib/performance-utils";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    console.log("🔍 Starting connection pool test...");

    // Test 1: Simple connection pool status
    console.log("📊 Testing connection pool status...");
    const statusStart = Date.now();
    const poolStatus = await ConnectionPoolTester.getConnectionPoolStatus();
    const statusDuration = Date.now() - statusStart;
    console.log(
      "✅ Pool status completed in",
      statusDuration,
      "ms:",
      poolStatus
    );

    // Test 2: Small load test (5 connections instead of 15)
    console.log("🚀 Testing connection pool load (5 connections)...");
    const loadStart = Date.now();
    const loadResults = await ConnectionPoolTester.testConnectionPoolLoad(5);
    const loadDuration = Date.now() - loadStart;
    console.log("✅ Load test completed in", loadDuration, "ms:", loadResults);

    // Test 3: Quick sustained load (2 seconds, 2 concurrent)
    console.log("⚡ Testing sustained load (2s, 2 concurrent)...");
    const sustainedStart = Date.now();
    const sustainedResults = await ConnectionPoolTester.testSustainedLoad(
      2000,
      2
    );
    const sustainedDuration = Date.now() - sustainedStart;
    console.log(
      "✅ Sustained test completed in",
      sustainedDuration,
      "ms:",
      sustainedResults
    );

    return successResponse({
      message: "Connection pool tests completed successfully",
      results: {
        poolStatus: {
          duration: statusDuration,
          data: poolStatus,
        },
        loadTest: {
          duration: loadDuration,
          data: loadResults,
        },
        sustainedTest: {
          duration: sustainedDuration,
          data: sustainedResults,
        },
      },
      timing: {
        total: Date.now() - statusStart,
        individual: {
          status: statusDuration,
          load: loadDuration,
          sustained: sustainedDuration,
        },
      },
    });
  } catch (error) {
    console.error("❌ Connection pool test error:", error);
    return errorResponse(
      `Connection pool test failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}
