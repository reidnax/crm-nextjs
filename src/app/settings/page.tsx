"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Database,
  Zap,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gray-500 text-white p-3 rounded-lg">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">
              Configure your system preferences and integrations
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[500px]">
        <Card className="max-w-2xl w-full text-center">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="bg-gradient-to-r from-gray-500 to-slate-600 text-white p-6 rounded-full">
                  <Settings className="h-12 w-12" />
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mb-2">
              Advanced Settings Coming Soon!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              We&apos;re building a comprehensive settings panel for system
              configuration
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Shield className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-700">
                  Two-factor authentication and access controls
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <Bell className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">Notifications</h3>
                <p className="text-sm text-blue-700">
                  Email alerts, push notifications, and preferences
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <Palette className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900">Appearance</h3>
                <p className="text-sm text-purple-700">
                  Themes, layouts, and UI customization
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <Database className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">
                  Data Management
                </h3>
                <p className="text-sm text-green-700">
                  Import/export, backups, and data retention
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h3 className="font-semibold text-orange-900">Integrations</h3>
                <p className="text-sm text-orange-700">
                  Third-party apps, APIs, and automations
                </p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <Settings className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <h3 className="font-semibold text-red-900">System</h3>
                <p className="text-sm text-red-700">
                  Performance, logs, and system configuration
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                What&apos;s Coming:
              </h4>
              <ul className="text-left space-y-2 text-gray-700 max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  User preferences and account settings
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Email and notification configuration
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Dark mode and theme customization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Data import/export tools
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Third-party integrations (Slack, Zapier, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Advanced security and audit logs
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <p className="text-sm text-gray-500 mb-4">
                For now, you can manage your personal settings from your profile
                page
              </p>
              <Link href="/profile">
                <Button className="bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Profile Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
