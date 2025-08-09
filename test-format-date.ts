import assert from "assert";
import { formatDate, formatDateTime } from "./src/lib/utils";

assert.strictEqual(formatDate("2024-01-15"), "15/01/2024");
assert.strictEqual(formatDate("invalid-date"), "");
assert.strictEqual(
  formatDateTime("2024-01-15T10:30:00Z"),
  "15/01/2024 10:30"
);
assert.strictEqual(formatDateTime("invalid-date"), "");

console.log("All date format tests passed");
