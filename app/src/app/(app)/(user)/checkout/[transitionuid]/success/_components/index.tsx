"use client";
import React, { useEffect, useState } from "react";
import { MultiStepLoader as Loader } from "@/components/global/spin-loader";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useParams } from 'next/navigation';
import { delay } from "@/lib/utils";

type StepState = {
  text: string;
  state: boolean;
  verified?: string;
};

const Response = () => {
  const router = useRouter();
  const { transitionuid } = useParams();
  const [steps, setSteps] = useState<StepState[]>([
    { text: "Placing order", state: false },
  ]);

  const handleOrderCompletion = async () => {
    await delay(1000);
    setSteps([
      { text: "Order placed successfully", state: true },
    ]);
    await delay(1000);
    setSteps([
      { text: "Order placed successfully", state: true },
      { text: "Redirecting to Order Details", state: false },
    ]);
    await delay(1000);
    router.push(`/orders/${transitionuid}`);
  };

  useEffect(() => {
    handleOrderCompletion();
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader steps={steps} />
    </div>
  );
};

export default Response;
