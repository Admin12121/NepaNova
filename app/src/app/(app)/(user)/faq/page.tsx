import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const general = [
  {
    id: "1",
    title: "What is NepaNova Impact, and how does it work?",
    content:
      "NepaNova Impact is an impact-driven social enterprise. We source high-quality premium products, such as our artisanal Himalayan teas, and link their commercial success directly to national development. Instead of counting on volatile donations, we use sustainable commerce to fund the creators shaping our country's economic future.",
  },
  {
    id: "2",
    title:
      "How exactly does the fifteen percent profit contribution support the National Innovation Centre (NIC)?",
    content:
      "For every single product sold, fifteen percent of the net profit margin is deposited directly into the National Innovation Centre (NIC) led by Mahabir Pun. These funds are free of bureaucratic red tape and are utilized to purchase raw materials, build tech laboratories, secure international patents, and give free workspaces to local Nepali inventors.",
  },
  {
    id: "3",
    title: "Where are NepaNova Impact products sourced?",
    content:
      "Our flagship product lines are sourced directly from the pristine, high-altitude estates of the Himalayan region. We focus on ethical agricultural partnerships, ensuring local farmers receive fair compensation while delivering unmatched global quality to our consumers.",
  },
  {
    id: "4",
    title: "How can I track the impact of my purchase?",
    content:
      "Transparency is a non-negotiable core value for us. NepaNova Impact provides clear, honest, and auditable public reporting detailing our total sales margins alongside the financial distributions transferred directly to the NIC. We don't just say it; we prove it.",
  },
];

const FaQ = () => {
  return (
    <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
      <h1 className="text-start max-w-[50rem] mt-10 text-3xl w-full">
        Frequently Asked Questions
      </h1>
      <p className="text-lg max-w-[50rem] text-neutral-700 dark:text-neutral-300">
        Learn how NepaNova Impact connects ethically sourced Himalayan products
        with long-term innovation funding in Nepal.
      </p>
      <div className="space-y-4 max-w-[50rem] w-full lg:w-auto">
        <p className="text-lg text-neutral-500">NepaNova Impact</p>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {general.map((item) => (
            <AccordionItem
              value={item.id}
              key={item.id}
              className="rounded-lg bg-background dark:bg-neutral-900 px-4 py-1"
            >
              <AccordionTrigger className="py-2 text-base leading-6 hover:no-underline w-full md:w-[50rem]">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="pb-2 text-muted-foreground max-w-[50rem]">
                <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
                  <p>{item.content}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </main>
  );
};

export default FaQ;
