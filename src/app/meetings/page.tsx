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
import { Calendar, Clock, Users, ArrowLeft, Sparkles } from "lucide-react";

export default function MeetingsPage() {
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
          <div className="bg-blue-500 text-white p-3 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
            <p className="text-gray-600">
              Manage all your meetings and appointments
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
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-full">
                  <Calendar className="h-12 w-12" />
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mb-2">
              Meetings Hub Coming Soon!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              We're building an amazing meetings management experience for you
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">Calendar View</h3>
                <p className="text-sm text-blue-700">
                  Visual calendar with drag & drop scheduling
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">
                  Smart Scheduling
                </h3>
                <p className="text-sm text-green-700">
                  AI-powered meeting suggestions and conflicts detection
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900">
                  Team Integration
                </h3>
                <p className="text-sm text-purple-700">
                  Sync with team calendars and video conferencing
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                What's Coming:
              </h4>
              <ul className="text-left space-y-2 text-gray-700 max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Global meetings dashboard with filtering and search
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Calendar integrations (Google, Outlook, Apple)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Meeting analytics and reporting
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Automated follow-up and meeting notes
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <p className="text-sm text-gray-500 mb-4">
                In the meantime, you can manage meetings from individual lead
                pages
              </p>
              <Link href="/leads">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Meetings in Leads
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
