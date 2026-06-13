import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { Default_Login_Redirect } from "@/routes";
import { PhoneOtpLoginSchema } from "@/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { success, data, error } = PhoneOtpLoginSchema.safeParse(body);

    if (!success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((err) => err.message),
        },
        { status: 400 },
      );
    }

    try {
      const result = await signIn("credentials", {
        authType: "phone_otp",
        phone: data.phone,
        otp: data.otp,
        redirect: false,
      });

      if (result?.error) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      return NextResponse.json(
        {
          message: "Login Successful",
          success: true,
          redirectUrl: Default_Login_Redirect,
        },
        { status: 200 },
      );
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: error.cause?.err?.message
              ? error.cause?.err?.message
              : error.type === "CredentialsSignin"
                ? "Invalid OTP!"
                : "Something went wrong!",
          },
          { status: 401 },
        );
      }
      throw error;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
