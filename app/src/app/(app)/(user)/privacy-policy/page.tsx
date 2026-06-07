import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const items = [
  {
    id: "1",
    title: "Information we collect",
    content: [
      "At NepaNova Impact, protecting the digital integrity of our community members, customers, and partners is paramount. This policy outlines how we safeguard information across our primary digital channels, including our official domain and our dedicated form server.",
      "We collect only the essential personal parameters required to fulfill product transactions, process community applications, or respond to direct user requests. This includes contact coordinates such as your name, email address, phone number, and physical mailing address, alongside communication logs gathered via our automated social media and messaging APIs.",
      "We maintain a strict policy where we do not store sensitive payment card details on our local databases, ensuring all monetary processing runs securely through third-party encrypted merchant gateways.",
    ],
  },
  {
    id: "2",
    title: "Security safeguards",
    content: [
      "To prevent unauthorized access, all interactions across our web architectures are enforced with Hypertext Transfer Protocol Secure (HTTPS). Data processed on our form server is fully protected using industry-standard Secure Sockets Layer (SSL) and Transport Layer Security (TLS) cryptographic protocols.",
      "Collected records are maintained within firewalled, role-access restricted cloud architectures to completely negate unauthorized perimeter breaches.",
    ],
  },
  {
    id: "3",
    title: "Data sharing and ownership",
    content: [
      "We stand firmly against data monetization. NepaNova Impact will never sell, lease, or rent customer database directories to external marketing networks.",
      "Data sharing occurs exclusively with vetted logistical handlers, such as shipping couriers, or when mandated for direct execution of our fifteen percent profit audits alongside the National Innovation Centre.",
      "You hold complete ownership of your personal information. Users may request access, modification, or permanent erasure of their data from our active storage facilities at any time by contacting our system admin desk at info@nepanova.com or by messaging our verified WhatsApp support line.",
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
      <h1 className="text-3xl">Security and Privacy Policy</h1>
      <p className="text-lg max-w-[50rem] text-neutral-700 dark:text-neutral-300">
        <span className="text-neutral-950 dark:text-white">
          NepaNova Impact
        </span>{" "}
        protects customer, partner, and community information across our website
        and digital channels. For privacy requests, contact{" "}
        <Link
          href="mailto:info@nepanova.com"
          className="text-neutral-950 dark:text-white"
        >
          info@nepanova.com
        </Link>
        .
      </p>
      <section className="w-full max-w-[50rem] rounded-lg border border-neutral-200 bg-background p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-medium text-neutral-950 dark:text-white">
          Registered Organization
        </h2>
        <p className="mt-2 text-base text-neutral-700 dark:text-neutral-300">
          NepaNova Impact operates as a registered organization in Nepal.
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">PAN No.</dt>
            <dd className="font-medium text-neutral-950 dark:text-white">
              623596672
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Registration Number</dt>
            <dd className="font-medium text-neutral-950 dark:text-white">
              390352/82/83
            </dd>
          </div>
        </dl>
      </section>
      <div className="space-y-4 max-w-[95rem] w-full lg:w-auto">
        <Accordion
          type="single"
          collapsible
          className="w-full space-y-2"
          defaultValue="1"
        >
          {items.map((item) => (
            <AccordionItem
              value={item.id}
              key={item.id}
              className="rounded-lg bg-background dark:bg-neutral-900 px-4 py-1"
            >
              <AccordionTrigger className="py-2 text-base leading-6 hover:no-underline w-full md:w-[50rem]">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="pb-2 text-muted-foreground max-w-[50rem]">
                <div className="flex flex-col gap-4 pb-3 pt-3 text-base dark:text-muted-foreground">
                  {item.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
