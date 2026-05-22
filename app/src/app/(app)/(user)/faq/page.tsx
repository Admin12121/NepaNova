import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const general = [
  {
    id: "1",
    title: "What types of suits and clothing do you offer?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6 ">
          <p>
            We specialize in premium men’s wear including custom suits, formal
            suits, blazers, waistcoats, trousers, shirts, and wedding or
            special-occasion outfits.
          </p>
          <p>
            Every piece is designed with attention to detail, fit, and fabric
            quality so it feels personal, not mass-produced.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: "2",
    title: "How does the custom tailoring process work?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6">
          <p>
            Our process starts with a consultation where we understand your
            style, purpose, and preferences.
          </p>
          <p>
            We then take precise measurements, help you select fabrics and
            design details, and begin tailoring. Depending on the design,
            fittings may be done to ensure the final outfit fits perfectly
            before delivery.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: "3",
    title: "Do you provide ready-made suits or only custom-made?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6 ">
          <p>
            We primarily focus on custom-made and made-to-measure suits to
            ensure the best fit and finish.
          </p>
          <p>
            In some cases, limited ready-to-wear options may be available, but
            our strength is tailoring outfits that are crafted specifically for
            your body and style.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: "4",
    title: "How long does it take to receive my suit after placing an order?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6 ">
          <p>
            The delivery time depends on the design and fabric selection, but
            most custom suits are completed within a few weeks.
          </p>
          <p>
            We always aim to deliver on time, especially for weddings, events,
            or urgent requirements, and will inform you clearly about timelines
            before confirming the order.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: "5",
    title: "What if the suit does not fit properly after delivery?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6">
          <p>
            Customer satisfaction is very important to us. If any adjustments
            are needed, we provide alteration support to ensure the fit meets
            expectations.
          </p>
          <p>
            Our goal is to make sure you feel confident and comfortable wearing
            your suit.
          </p>
        </section>
      </div>
    ),
  },
];

const shipping = [
  {
    id: "1",
    title: "What are the shipping fees and delivery times?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6 ">
          <span>
            <p>
              Delivery estimates are just that. They are not guaranteed delivery
              times and should not be relied upon as such.
            </p>
            <p>
              Delivery times will depend on where you are located, our shipping
              partners, and the service of your choice. We are not responsible
              for any delays in delivery caused by customs clearance or other
              events beyond our control.
            </p>
            <p>Standard: 2 to 7 business days - Free</p>
          </span>
        </section>
      </div>
    ),
  },
  {
    id: "2",
    title: "IS a signature required on delivery?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6">
          <p>
            A signature will not be required upon delivery of any of our
            shipping services.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: "3",
    title: "What should i do if my delivery is late?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <p>
          Delivery time refers to the number of days between the collection of
          the package from our warehouse and the first delivery attempt. This
          does not account for the order preparation time, additional delivery
          attempts, or the date or days available at a carrier pick-up point.
          Please note that delivery estimates are just that. They are not
          guaranteed delivery times and should not be relied upon as such. If
          your order is late and you don&apos;t have any recent update on your
          tracking number, we kindly ask for you contact our Customer Support
          Team at info@alphasuits.com.np.
        </p>
      </div>
    ),
  },
];

const order = [
  {
    id: "1",
    title: "Can I cancel my order?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section className="space-y-6 ">
          <span>
            <p>
              Please note that as our team is constantly making efforts to get
              your order dispatched as quickly as possible, we may not be able
              to cancel your order upon request. Please send an email to
              info@alphasuits.com.np requesting to cancel the order and provide
              us with the name of the person who made the order, the email
              address, and the transactionuid or if your payment failed you can
              cancled your order by yourself.
            </p>
          </span>
        </section>
      </div>
    ),
  },
  {
    id: "2",
    title: "Can I change my delivery address?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section>
          <p>
            As a customer, you can change your address during the first 15
            minutes after completing a purchase.
          </p>
          <p>
            Please note that as our team is constantly making efforts to get
            your order dispatched as quickly as possible, we&apos;re unable to
            guarantee changes to the delivery address. Once the order is
            shipped, we at Alphasuits will be unable to change the delivery
            address.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: "3",
    title: "Can I change my order?",
    content: (
      <div className="flex flex-col pb-3 pt-3 text-base dark:text-muted-foreground">
        <section>
          <p>
            Please note that as our team is constantly making efforts to get
            your order dispatched as quickly as possible, we may not be able to
            update your order upon request, either on items or delivery details.
            Please send an email to info@alphasuits.com.np, if the order was not
            sent out when our support assistant reads your request, he/she may
            be able to update it.
          </p>
        </section>
      </div>
    ),
  },
];

const FaQ = () => {
  return (
    <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
      <h1 className="text-start max-w-[50rem] mt-10 text-3xl w-full">
        How can we help you?
      </h1>
      <p className="text-lg max-w-[50rem] text-neutral-700 dark:text-neutral-300">
        We are looking forward to helping you out. Please choose the topic and
        check the most frequently asked questions about it. Below, you&apos;ll
        find answers to the questions we get most asked.
      </p>
      <div className="space-y-4 max-w-[50rem] w-full lg:w-auto">
        <p className="text-lg text-neutral-500">General</p>
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
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="text-lg text-neutral-500">Shipping</p>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {shipping.map((item) => (
            <AccordionItem
              value={item.id}
              key={item.id}
              className="rounded-lg bg-background dark:bg-neutral-900 px-4 py-1"
            >
              <AccordionTrigger className="py-2 text-base leading-6 hover:no-underline w-full md:w-[50rem]">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="pb-2 text-muted-foreground max-w-[50rem]">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="text-lg text-neutral-500">Order</p>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {order.map((item) => (
            <AccordionItem
              value={item.id}
              key={item.id}
              className="rounded-lg bg-background dark:bg-neutral-900 px-4 py-1"
            >
              <AccordionTrigger className="py-2 text-base leading-6 hover:no-underline w-full md:w-[50rem]">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="pb-2 text-muted-foreground max-w-[50rem]">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </main>
  );
};

export default FaQ;
