import Icons from "@/components/navbar/cart/icons";
import { Button } from "@/components/ui/button";
import { decriptData, encryptData } from "@/hooks/dec-data";
import { useAuthUser } from "@/hooks/use-auth-user";
import { delay } from "@/lib/utils";
import React from "react";
import { toast } from "sonner";
import { encryptData as Enc } from "@/lib/transition";
import { useRouter } from "nextjs-toploader/app";
import { Order } from ".";

function Complete_payment({ data }: { data: Order }) {
  const router = useRouter();
  const { accessToken: token } = useAuthUser();

  function extractData(raw: any) {
    return raw.products.map((item: any) => ({
      product: item.product,
      variant: item.variant,
      pcs: item.qty,
      address: raw.shipping.id,
      transactionuid: raw.transactionuid,
    }));
  }

  const handleenc = () => {
    const newdata = extractData(data);
    Enc(newdata, router);
  };

  return (
    <Button
      className="relative bottom-1"
      onClick={handleenc}
    >
      Pay now
      <Icons icons={["visa"]} className="ml-1" />
    </Button>
  );
}

export default Complete_payment;
