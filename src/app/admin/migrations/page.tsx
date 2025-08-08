"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Terminal,
  FileText,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface Migration {
  name: string;
  timestamp: string;
  description: string;
  created: string;
  status: "deployed" | "pending";
  isDeployed: boolean;
  sqlContent: string;
  fullSqlContent: string;
}

interface MigrationStatus {
  applied: number;
  pending: number;
  total: number;
  lastMigration: string | null;
  output: string;
  statusAvailable?: boolean;
  environment?: string;
  method?: string;
}

interface MigrationData {
  status: MigrationStatus;
  migrations: Migration[];
  totalMigrations: number;
}

export default function AdminMigrationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [migrationData, setMigrationData] = useState<MigrationData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(
    null
  );
  const [deploymentLogs, setDeploymentLogs] = useState<any[]>([]);
  const [productionDbUrl, setProductionDbUrl] = useState("");
  const [showProductionDeploy, setShowProductionDeploy] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Check if user is Admin Dev
  const isAdminDev =
    session?.user?.role === "Admin-Dev" || session?.user?.role === "Admin";

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !isAdminDev) {
      router.push("/");
      return;
    }

    fetchMigrationData();
  }, [session, status, isAdminDev, router]);

  const fetchMigrationData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/migrations");
      const result = await response.json();

      if (result.success) {
        setMigrationData(result.data);
        // Update deployment logs from the response
        if (result.data.recentLogs) {
          setDeploymentLogs(result.data.recentLogs);
        }
      } else {
        toast.error("Failed to fetch migration data");
      }
    } catch (error) {
      console.error("Error fetching migration data:", error);
      toast.error("Failed to fetch migration data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMigrationLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await fetch("/api/admin/migrations/logs?limit=100");
      const result = await response.json();

      if (result.success) {
        setDeploymentLogs(result.data.logs);
      } else {
        toast.error("Failed to fetch migration logs");
      }
    } catch (error) {
      console.error("Error fetching migration logs:", error);
      toast.error("Failed to fetch migration logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const executeMigrationAction = async (
    action: string,
    migrationName?: string,
    targetDatabase?: string
  ) => {
    try {
      setExecuting(action);
      const response = await fetch("/api/admin/migrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          migrationName,
          targetDatabase,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.data.description} completed successfully`);

        // Refresh migration data and logs after successful execution
        await fetchMigrationData();
        await fetchMigrationLogs();
      } else {
        toast.error(`Migration failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error executing migration:", error);
      toast.error("Failed to execute migration command");
    } finally {
      setExecuting(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading migration data...</span>
        </div>
      </div>
    );
  }

  if (!session || !isAdminDev) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only available to Admin users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status.includes("All migrations")) return "bg-green-100 text-green-800";
    if (status.includes("pending")) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Migrations</h1>
          <p className="text-muted-foreground">
            Manage database schema migrations and view migration history
            {migrationData?.status.method === "database_query" && (
              <span className="text-green-600 ml-2">(Database-powered status)</span>
            )}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Admin Dev Only</span>
        </Badge>
      </div>

              {/* Status Method Info */}
        {migrationData?.status.method === "database_query" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Enhanced Migration Status:</strong> Migration status is now retrieved directly from the database 
              (_prisma_migrations table) for 100% accuracy in all environments including Vercel serverless.
            </AlertDescription>
          </Alert>
        )}

      {/* Migration Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Applied Migrations
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {migrationData?.status.applied || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Migrations
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {migrationData?.status.pending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Migrations
            </CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {migrationData?.totalMigrations || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="h-5 w-5" />
            <span>Migration Actions</span>
          </CardTitle>
          <CardDescription>
            Execute migration commands. Use with caution in production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => executeMigrationAction("deploy")}
              disabled={executing !== null}
              className="flex items-center space-x-2"
            >
              {executing === "deploy" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>Deploy All Migrations</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowProductionDeploy(!showProductionDeploy)}
              className="flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>Deploy to Production</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => executeMigrationAction("status")}
              disabled={executing !== null}
              className="flex items-center space-x-2"
            >
              {executing === "status" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Check Status</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => executeMigrationAction("generate")}
              disabled={executing !== null}
              className="flex items-center space-x-2"
            >
              {executing === "generate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              <span>Generate Client</span>
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                if (
                  confirm("Are you sure? This will reset the entire database!")
                ) {
                  executeMigrationAction("reset");
                }
              }}
              disabled={executing !== null}
              className="flex items-center space-x-2"
            >
              {executing === "reset" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>Reset Database</span>
            </Button>

            <Button
              variant="ghost"
              onClick={fetchMigrationData}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Refresh</span>
            </Button>
          </div>

          {showProductionDeploy && (
            <div className="mt-6 p-4 border rounded-lg bg-yellow-50">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">
                  Production Deployment
                </h3>
              </div>
              <p className="text-sm text-yellow-700 mb-4">
                ⚠️ This will deploy migrations directly to your production
                database. Ensure you have a backup!
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Production Database URL
                  </label>
                  <input
                    type="text"
                    value={productionDbUrl}
                    onChange={(e) => setProductionDbUrl(e.target.value)}
                    placeholder="postgresql://user:pass@host:port/db"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() =>
                      executeMigrationAction(
                        "deploy-to-production",
                        undefined,
                        productionDbUrl
                      )
                    }
                    disabled={executing !== null || !productionDbUrl}
                    className="flex items-center space-x-2"
                  >
                    {executing === "deploy-to-production" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Deploy to Production
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowProductionDeploy(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Details */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Migration History</TabsTrigger>
          <TabsTrigger value="status">Current Status</TabsTrigger>
          <TabsTrigger value="logs">Deployment Logs</TabsTrigger>
          {selectedMigration && (
            <TabsTrigger value="details">Migration Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Migration History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {migrationData?.migrations.map((migration) => (
                  <div
                    key={migration.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedMigration(migration)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="font-medium">
                          {migration.description}
                        </div>
                        <Badge
                          variant={
                            migration.isDeployed ? "default" : "secondary"
                          }
                          className={
                            migration.isDeployed
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {migration.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {migration.name} •{" "}
                        {new Date(migration.created).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{migration.timestamp}</Badge>
                      {!migration.isDeployed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            executeMigrationAction(
                              "deploy-selective",
                              migration.name
                            )
                          }
                          disabled={executing !== null}
                        >
                          {executing === "deploy-selective" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Deploy
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Current Migration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                {migrationData?.status.output}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-5 w-5" />
                  <span>Deployment Logs</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMigrationLogs}
                  disabled={logsLoading}
                >
                  {logsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh Logs
                </Button>
              </div>
              <CardDescription>
                Persistent deployment logs and execution history stored in
                database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                  <p className="mt-2">Loading migration logs...</p>
                </div>
              ) : deploymentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deployment logs yet</p>
                  <p className="text-sm">
                    Logs will appear here when you execute migrations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deploymentLogs.map((log, index) => (
                    <div
                      key={log.id || index}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={log.success ? "default" : "destructive"}
                          >
                            {log.success ? "Success" : "Failed"}
                          </Badge>
                          <span className="font-medium">{log.description}</span>
                          {log.migrationName && (
                            <Badge variant="outline">{log.migrationName}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(log.executedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Executed by: {log.user?.name || "Unknown"} (
                        {log.user?.role || "Unknown"}) • Duration:{" "}
                        {log.duration}ms
                      </div>
                      {log.output && (
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-40">
                          {log.output}
                        </pre>
                      )}
                      {log.error && (
                        <pre className="bg-red-50 border border-red-200 p-3 rounded text-xs overflow-x-auto max-h-40 text-red-800">
                          {log.error}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {selectedMigration && (
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>{selectedMigration.description}</CardTitle>
                <CardDescription>
                  {selectedMigration.name} • Created:{" "}
                  {new Date(selectedMigration.created).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  {selectedMigration.fullSqlContent}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
