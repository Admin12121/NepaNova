import React from "react";
import dynamic from "next/dynamic";
import { cookies } from 'next/headers'


const LandingPage = dynamic(() => import("./_componets"));

const Page = async () => {
  const cookieStore = await cookies();
  const animationCookie = cookieStore.get('showAnimation');
  const userCookie = animationCookie?.value === "false";

  return (
    <main className="h-full max-w-[95rem] w-full">
      <LandingPage userCookie={userCookie} />
    </main>
  );
};

export default Page;
