"use client";

import Cardwrapper from "./cardwrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "../../schemas";
import * as z from "zod";
import { useSearchParams } from "next/navigation";
import LoginError from "./login-error";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FormError } from "../form-message/form-error";
import { FormSuccess } from "../form-message/form-success";
import { useState, useEffect } from "react";
import Link from "next/link";
import useApi from "@/lib/useApi";
import { useRouter } from "nextjs-toploader/app";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";

const Login = () => {
  const router = useRouter();
  const { update } = useAuthUser();
  const { data, error, isLoading, fetchData } = useApi<any>();
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState<string>("");
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
  const errorParam = searchParams.get("error");
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof LoginSchema>) => {
    fetchData({
      url: "/api/auth/login",
      method: "POST",
      data: values,
    });
  };

  const handlePhoneOtpRequest = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setPhoneError("");
    setPhoneSuccess("");
    setPhoneLoading(true);

    try {
      const response = await fetch("/api/auth/phone-otp/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to send OTP");
      }

      setOtpSent(true);
      setPhoneSuccess(responseData.message || "OTP sent successfully.");
    } catch (error: any) {
      setPhoneError(error.message || "Failed to send OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handlePhoneOtpVerify = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setPhoneError("");
    setPhoneSuccess("");
    setPhoneLoading(true);

    try {
      const response = await fetch("/api/auth/phone-otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to verify OTP");
      }

      setPhoneSuccess("Login Successfull");
      if (responseData.redirectUrl) {
        router.push(responseData.redirectUrl);
        update();
      }
    } catch (error: any) {
      setPhoneError(error.message || "Failed to verify OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      setSuccess("Login Successfull");
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        update();
      }
    }
  }, [data]);

  if (errorParam) {
    return <LoginError errorParam={errorParam} />;
  }

  return (
    <Cardwrapper
      title="Welcome back!"
      headerLabel="Please enter your details to continue"
      backButtonLabel="Dont have an account?"
      backButton="Create account"
      backButtonHref="/auth/register"
      showSocial
    >
      <div className="mb-5 grid grid-cols-2 rounded-md bg-muted p-1">
        <Button
          type="button"
          variant={authMode === "email" ? "default" : "ghost"}
          className="h-8 shadow-none"
          onClick={() => setAuthMode("email")}
        >
          Email
        </Button>
        <Button
          type="button"
          variant={authMode === "phone" ? "default" : "ghost"}
          className="h-8 shadow-none"
          onClick={() => setAuthMode("phone")}
        >
          Phone
        </Button>
      </div>

      {authMode === "email" ? (
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label className="font-normal">Email address</Label>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        type="email"
                        placeholder="vicky@gmail.com"
                        className="dark:bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label className="font-normal">Password</Label>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        type="password"
                        placeholder="***********"
                        autoComplete="off"
                        className="dark:bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Link
              href="/auth/reset-password"
              className="!mt-2 dark:text-themeTextGray text-xs underline dark:hover:text-themeTextWhite transition duration-500 flex justify-end w-full font-light"
            >
              Forgot Password?
            </Link>
            <FormError message={error} />
            <FormSuccess message={success} />
            <Button
              disabled={isLoading}
              loading={isLoading}
              type="submit"
              className={cn("w-full !mt-2 fancy-button")}
            >
              Login
            </Button>
          </form>
        </Form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={otpSent ? handlePhoneOtpVerify : handlePhoneOtpRequest}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-normal">Phone number</Label>
              <Input
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setOtpSent(false);
                  setOtp("");
                  setPhoneError("");
                  setPhoneSuccess("");
                }}
                disabled={phoneLoading}
                inputMode="tel"
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                className="dark:bg-muted"
              />
            </div>
            {otpSent ? (
              <div className="space-y-2">
                <Label className="font-normal">OTP</Label>
                <Input
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={phoneLoading}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6 digit OTP"
                  autoComplete="one-time-code"
                  className="dark:bg-muted"
                />
              </div>
            ) : null}
          </div>
          <FormError message={phoneError} />
          <FormSuccess message={phoneSuccess} />
          <Button
            disabled={phoneLoading}
            loading={phoneLoading}
            type="submit"
            className={cn("w-full !mt-2 fancy-button")}
          >
            {otpSent ? "Verify OTP" : "Send OTP"}
          </Button>
          {otpSent ? (
            <Button
              type="button"
              variant="ghost"
              disabled={phoneLoading}
              className="w-full"
              onClick={handlePhoneOtpRequest}
            >
              Resend OTP
            </Button>
          ) : null}
        </form>
      )}
    </Cardwrapper>
  );
};

export default Login;
