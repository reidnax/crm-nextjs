import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/api-response";

// Temporary debug endpoint - remove in production
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (username) {
    // Get specific user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        password: true, // Include to check if it's hashed
      },
    });

    return successResponse({
      user,
      passwordLength: user?.password?.length,
      passwordStartsWith: user?.password?.substring(0, 10),
    });
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return successResponse(users);
}
