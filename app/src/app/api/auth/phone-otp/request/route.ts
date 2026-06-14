import { NextRequest, NextResponse } from "next/server";
import { PhoneOtpRequestSchema } from "@/schemas";
import { getServerApiBaseUrl, parseJsonResponse } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { success, data, error } = PhoneOtpRequestSchema.safeParse(body);

    if (!success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((err) => err.message),
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${getServerApiBaseUrl()}/api/accounts/users/phone-otp/request/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: data.phone }),
      },
    );
    const responseData = await parseJsonResponse(response);

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
