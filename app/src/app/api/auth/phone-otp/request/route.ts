import { NextRequest, NextResponse } from "next/server";
import { PhoneOtpRequestSchema } from "@/schemas";

const getApiBaseUrl = () => {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("Authentication API URL is not configured");
  }

  return apiUrl.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Authentication API returned a non-JSON response.");
  }

  return JSON.parse(text);
};

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
      `${getApiBaseUrl()}/api/accounts/users/phone-otp/request/`,
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
