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
import { FileText, Search, Brain, ArrowLeft, Sparkles } from "lucide-react";

export default function NotesPage() {
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
          <div className="bg-orange-500 text-white p-3 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
            <p className="text-gray-600">
              Capture insights and build your knowledge base
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
                <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-full">
                  <FileText className="h-12 w-12" />
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mb-2">
              Smart Notes Hub Coming Soon!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              We&apos;re building an intelligent note-taking system for sales
              professionals
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="p-4 bg-orange-50 rounded-lg">
                <FileText className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h3 className="font-semibold text-orange-900">Rich Editor</h3>
                <p className="text-sm text-orange-700">
                  Markdown support, tables, and media attachments
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <Search className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">Smart Search</h3>
                <p className="text-sm text-blue-700">
                  AI-powered search across all your notes and leads
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900">AI Insights</h3>
                <p className="text-sm text-purple-700">
                  Automatic tagging and relationship discovery
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                What&apos;s Coming:
              </h4>
              <ul className="text-left space-y-2 text-gray-700 max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Global notes library with advanced filtering
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Cross-reference notes with leads, meetings, and tasks
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Note templates for common scenarios
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Team sharing and collaborative editing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Export to PDF and integration with docs
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <p className="text-sm text-gray-500 mb-4">
                For now, you can add and organize notes from individual lead
                pages
              </p>
              <Link href="/leads">
                <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                  <FileText className="mr-2 h-4 w-4" />
                  Manage Notes in Leads
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
