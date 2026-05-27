import React from "react";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

const brandStory = [
  "For decades, the standard response to helping Nepal progress has been charity. But temporary donations are a short-term fix to long-term structural challenges. Nepal does not lack vision, intelligence, or ambition; it lacks a sustainable ecosystem to turn raw talent into nationwide progress. Every single day, thousands of groundbreaking ideas conceptualized by brilliant young minds go completely unfunded, accelerating the brain drain of our country's greatest intellectual assets.",
  "NepaNova Impact was built to rewrite this narrative. We are a purpose-driven enterprise born from the rugged landscapes of the Himalayas. We don't ask for handouts; we create world-class products that speak for themselves. By designing a business model where commerce meets collective progress, we provide conscious global consumers with an opportunity to invest back into the soil their products came from. We are changing the global perspective of Nepal, shifting the narrative from just an exotic tourist destination to a powerhouse of modern ingenuity.",
  "We believe that standard business models should serve a national purpose. To prove our commitment to a self-reliant economy, NepaNova Impact pledges fifteen percent of all profits directly to the National Innovation Centre (NIC). Led by visionary social entrepreneur Mahabir Pun, the NIC provides a critical, zero-barrier launching pad for local scientists, engineers, and tech visionaries. Through this structural collaboration, every premium item you buy directly secures the machinery, raw materials, workspaces, and legal support needed to scale prototypes into market-ready industries. We don't just claim to make an impact; we measure, report, and prove it with absolute transparency.",
];

const About = () => {
  return (
    <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
      <section className="mt-10 flex w-full max-w-[65rem] flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            About us
          </p>
          <h1 className="text-5xl md:text-[80px] leading-none">
            {siteConfig.name}
          </h1>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-3xl">Brand Story</h2>
          <div className="flex flex-col gap-5 text-base leading-7 text-neutral-700 dark:text-neutral-300">
            {brandStory.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg bg-background dark:bg-neutral-900 p-5">
            <h2 className="text-2xl">Vision</h2>
            <p className="text-base leading-7 text-neutral-700 dark:text-neutral-300">
              Our vision is to position Nepal as a global hub of technical
              ingenuity and self-reliance by transforming everyday consumer
              choices into a permanent engine for domestic innovation.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-lg bg-background dark:bg-neutral-900 p-5">
            <h2 className="text-2xl">Mission</h2>
            <p className="text-base leading-7 text-neutral-700 dark:text-neutral-300">
              Our mission is to craft exceptional, ethically sourced Himalayan
              products that channel fifteen percent of their profits directly
              into grassroots Research and Development. By doing so, we aim to
              slow down the domestic brain drain and build a prosperous nation
              from the ground up.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
};

export default About;
