"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (session) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">CRM System</CardTitle>
          <CardDescription>
            Customer Relationship Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-gray-600">
            Manage your leads, meetings, tasks, and notes all in one place.
          </p>
          <Link href="/login">
            <Button className="w-full">Sign In to Continue</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
