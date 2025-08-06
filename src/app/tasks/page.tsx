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
import { CheckSquare, Zap, Target, ArrowLeft, Sparkles } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="bg-green-500 text-white p-3 rounded-lg">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600">
              Stay organized and boost your productivity
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
                <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-full">
                  <CheckSquare className="h-12 w-12" />
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mb-2">
              Task Management Coming Soon!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              We're crafting the ultimate task management experience for sales
              teams
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="p-4 bg-green-50 rounded-lg">
                <CheckSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">Smart Lists</h3>
                <p className="text-sm text-green-700">
                  Organized by priority, deadline, and lead stage
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">Automation</h3>
                <p className="text-sm text-blue-700">
                  Auto-create follow-up tasks based on lead activity
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900">Goal Tracking</h3>
                <p className="text-sm text-purple-700">
                  Track completion rates and productivity metrics
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                What's Coming:
              </h4>
              <ul className="text-left space-y-2 text-gray-700 max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Kanban board view with drag & drop
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Recurring tasks and template library
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Team collaboration and task assignment
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Time tracking and productivity analytics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Integration with calendar and email
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <p className="text-sm text-gray-500 mb-4">
                Currently, you can create and manage tasks from individual lead
                pages
              </p>
              <Link href="/leads">
                <Button className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Manage Tasks in Leads
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
