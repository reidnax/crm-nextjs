import { NextResponse } from "next/server";

export function successResponse(data: unknown, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export function validationErrorResponse(errors: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      details: errors,
    },
    { status: 400 }
  );
}
