"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Download,
  Printer,
  Mail,
  MessageCircle,
  Save,
  Receipt,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useUpdateBillMutation,
  useSendBillEmailMutation,
} from "@/lib/store/Service/api";

// ─── Number to words (Indian/Nepali style) ──────────────────────────────────
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  if (num < 0) return "Minus " + numberToWords(-num);

  let word = "";

  if (Math.floor(num / 10000000) > 0) {
    word += numberToWords(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    word += numberToWords(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    word += numberToWords(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    word += numberToWords(Math.floor(num / 100)) + " Hundred ";
    num %= 100;
  }
  if (num > 0) {
    if (word !== "") word += "and ";
    if (num < 20) {
      word += ONES[num];
    } else {
      word += TENS[Math.floor(num / 10)];
      if (num % 10 > 0) word += " " + ONES[num % 10];
    }
  }
  return word.trim();
}

function amountToWords(rs: number, ps: number): string {
  if (rs === 0 && ps === 0) return "";
  let result = "Rupees " + numberToWords(rs);
  if (ps > 0) {
    result += " and " + numberToWords(ps) + " Paisa";
  }
  result += " Only";
  return result;
}

// ─── Default 10 items matching physical order slip ──────────────────────────
const DEFAULT_ITEMS = [
  {
    sn: 1,
    description: "Coat",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  {
    sn: 2,
    description: "Shirt",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  {
    sn: 3,
    description: "Pant",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  {
    sn: 4,
    description: "Tie",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  {
    sn: 5,
    description: "Safari",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  {
    sn: 6,
    description: "W. Coat",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  {
    sn: 7,
    description: "Daura Suruwal",
    qty: "",
    rate: "",
    amount_rs: "",
    amount_ps: "",
  },
  { sn: 8, description: "", qty: "", rate: "", amount_rs: "", amount_ps: "" },
  { sn: 9, description: "", qty: "", rate: "", amount_rs: "", amount_ps: "" },
  { sn: 10, description: "", qty: "", rate: "", amount_rs: "", amount_ps: "" },
];

interface BillItem {
  sn: number;
  description: string;
  qty: string;
  rate: string;
  amount_rs: string;
  amount_ps: string;
}

interface BillData {
  items: BillItem[];
  total_rs: string;
  total_ps: string;
  advance_rs: string;
  advance_ps: string;
  balance_rs: string;
  balance_ps: string;
  amount_in_words: string;
  date_ordered: string;
  date_delivery: string;
}

interface Booking {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  location: string;
  preferred_date: string;
  delivery_date: string | null;
  bill_number: string | null;
  bill_data: BillData | Record<string, never>;
  [key: string]: any;
}

interface BillDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Shared cell style helpers ──────────────────────────────────────────────
const border = "1px solid #222";
const cellBase: React.CSSProperties = {
  border,
  padding: "5px 6px",
  fontSize: "13px",
  verticalAlign: "middle",
};
const inputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  width: "100%",
  fontSize: "13px",
  background: "transparent",
  padding: "2px 3px",
  fontFamily: "inherit",
};

export default function BillDialog({
  booking,
  open,
  onOpenChange,
}: BillDialogProps) {
  const { accessToken } = useAuthUser();
  const printRef = useRef<HTMLDivElement>(null);
  const [updateBill, { isLoading: isSaving }] = useUpdateBillMutation();
  const [sendBillEmail, { isLoading: isSending }] = useSendBillEmailMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);

  // ─── Bill state ────────────────────────────────────────────────────
  const [items, setItems] = useState<BillItem[]>(
    structuredClone(DEFAULT_ITEMS),
  );
  const [totalRs, setTotalRs] = useState("");
  const [totalPs, setTotalPs] = useState("");
  const [advanceRs, setAdvanceRs] = useState("");
  const [advancePs, setAdvancePs] = useState("");
  const [balanceRs, setBalanceRs] = useState("");
  const [balancePs, setBalancePs] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [dateOrdered, setDateOrdered] = useState("");
  const [dateDelivery, setDateDelivery] = useState("");

  const hasSavedBill =
    booking.bill_data && Object.keys(booking.bill_data).length > 0;

  // ─── Populate from existing data or defaults ──────────────────────
  useEffect(() => {
    if (!open) return;

    if (hasSavedBill) {
      const bd = booking.bill_data as BillData;
      const merged = DEFAULT_ITEMS.map((def) => {
        const saved = bd.items?.find((i) => i.sn === def.sn);
        return saved ? { ...def, ...saved } : { ...def };
      });
      setItems(merged);
      setTotalRs(bd.total_rs || "");
      setTotalPs(bd.total_ps || "");
      setAdvanceRs(bd.advance_rs || "");
      setAdvancePs(bd.advance_ps || "");
      setBalanceRs(bd.balance_rs || "");
      setBalancePs(bd.balance_ps || "");
      setAmountInWords(bd.amount_in_words || "");
      setDateOrdered(bd.date_ordered || "");
      setDateDelivery(bd.date_delivery || "");
    } else {
      setItems(structuredClone(DEFAULT_ITEMS));
      setTotalRs("");
      setTotalPs("");
      setAdvanceRs("");
      setAdvancePs("");
      setBalanceRs("");
      setBalancePs("");
      setAmountInWords("");
      setDateOrdered(
        booking.preferred_date
          ? format(new Date(booking.preferred_date), "yyyy-MM-dd")
          : "",
      );
      setDateDelivery(
        booking.delivery_date
          ? format(new Date(booking.delivery_date), "yyyy-MM-dd")
          : "",
      );
    }
  }, [open, booking]);

  // ─── Item change handler with auto-amount calc ────────────────────
  const handleItemChange = useCallback(
    (sn: number, field: keyof BillItem, value: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.sn !== sn) return item;
          const updated = { ...item, [field]: value };

          // Auto-calculate amount when qty or rate changes
          if (field === "qty" || field === "rate") {
            const qty = Number(field === "qty" ? value : updated.qty) || 0;
            const rate = Number(field === "rate" ? value : updated.rate) || 0;
            const amount = qty * rate;
            if (qty && rate) {
              updated.amount_rs = String(Math.floor(amount));
              const ps = Math.round((amount - Math.floor(amount)) * 100);
              updated.amount_ps = ps > 0 ? String(ps) : "";
            } else if (!qty && !rate) {
              updated.amount_rs = "";
              updated.amount_ps = "";
            }
          }

          return updated;
        }),
      );
    },
    [],
  );

  // ─── Auto-calculate total from items ──────────────────────────────
  useEffect(() => {
    let sumRs = 0;
    let sumPs = 0;
    items.forEach((item) => {
      sumRs += Number(item.amount_rs) || 0;
      sumPs += Number(item.amount_ps) || 0;
    });
    sumRs += Math.floor(sumPs / 100);
    sumPs = sumPs % 100;
    setTotalRs(sumRs ? String(sumRs) : "");
    setTotalPs(sumPs ? String(sumPs) : "");
  }, [items]);

  // ─── Auto-calculate balance ───────────────────────────────────────
  useEffect(() => {
    const tRs = Number(totalRs) || 0;
    const tPs = Number(totalPs) || 0;
    const aRs = Number(advanceRs) || 0;
    const aPs = Number(advancePs) || 0;
    let bRs = tRs - aRs;
    let bPs = tPs - aPs;
    if (bPs < 0) {
      bRs -= 1;
      bPs += 100;
    }
    setBalanceRs(bRs >= 0 ? String(bRs) : "0");
    setBalancePs(bPs >= 0 ? String(bPs) : "0");
  }, [totalRs, totalPs, advanceRs, advancePs]);

  // ─── Auto amount in words ─────────────────────────────────────────
  useEffect(() => {
    const rs = Number(totalRs) || 0;
    const ps = Number(totalPs) || 0;
    if (rs > 0 || ps > 0) {
      setAmountInWords(amountToWords(rs, ps));
    } else {
      setAmountInWords("");
    }
  }, [totalRs, totalPs]);

  // ─── Build bill data payload ──────────────────────────────────────
  const buildBillData = (): BillData => ({
    items: items.map((item) => ({ ...item })),
    total_rs: totalRs,
    total_ps: totalPs,
    advance_rs: advanceRs,
    advance_ps: advancePs,
    balance_rs: balanceRs,
    balance_ps: balancePs,
    amount_in_words: amountInWords,
    date_ordered: dateOrdered,
    date_delivery: dateDelivery,
  });

  // ─── Save / Update ────────────────────────────────────────────────
  const handleSaveClick = () => {
    if (hasSavedBill) {
      setConfirmOpen(true);
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    try {
      await updateBill({
        id: booking.id,
        data: { bill_data: buildBillData() },
        token: accessToken,
      }).unwrap();
      toast.success(
        hasSavedBill ? "Bill updated successfully" : "Bill saved successfully",
      );
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to save bill");
    }
  };

  // ─── Email ────────────────────────────────────────────────────────
  const handleEmail = async () => {
    if (!hasSavedBill) {
      toast.error("Please save the bill first before sending email.");
      return;
    }
    try {
      await sendBillEmail({
        id: booking.id,
        token: accessToken,
      }).unwrap();
      toast.success(`Bill sent to ${booking.email}`);
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to send bill email");
    }
  };

  // ─── Clean capture helper ─────────────────────────────────────────
  // Clones the bill, replaces all <input> with plain <span> text so
  // html2canvas renders crisp text instead of mangled input fields.
  const createCleanCapture = async () => {
    const el = printRef.current;
    if (!el) throw new Error("Bill element not found");

    const html2canvas = (await import("html2canvas")).default;

    // Deep-clone the bill element
    const clone = el.cloneNode(true) as HTMLElement;

    // Replace every <input> with a styled <span> containing its value
    clone.querySelectorAll("input").forEach((input) => {
      const span = document.createElement("span");
      span.textContent = input.value || "";
      // Copy over relevant computed styles from the input
      span.style.cssText = input.style.cssText;
      span.style.display = "inline-block";
      span.style.width = input.style.width || "100%";
      span.style.border = "none";
      span.style.outline = "none";
      span.style.background = "transparent";
      span.style.whiteSpace = "nowrap";
      span.style.overflow = "visible";
      input.parentNode?.replaceChild(span, input);
    });

    // Append off-screen for html2canvas to read
    clone.style.position = "fixed";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.zIndex = "-1";
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      return canvas;
    } finally {
      document.body.removeChild(clone);
    }
  };

  // ─── WhatsApp ─────────────────────────────────────────────────────
  const handleWhatsApp = async () => {
    if (!hasSavedBill) {
      toast.error("Please save the bill first before sharing on WhatsApp.");
      return;
    }

    try {
      toast.info("Generating bill image...");
      const canvas = await createCleanCapture();

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b: Blob | null) =>
            b ? resolve(b) : reject(new Error("Failed to create image")),
          "image/png",
        );
      });

      const fileName = `OrderSlip_${booking.bill_number || booking.id}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // Try Web Share API (works on mobile & some desktop browsers)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Order Slip - ${booking.name}`,
          text: `Alphasuits Order Slip${booking.bill_number ? ` #${booking.bill_number}` : ""} for ${booking.name}`,
          files: [file],
        });
        toast.success("Bill shared successfully!");
      } else {
        // Fallback: download image + open WhatsApp with text
        const link = document.createElement("a");
        link.download = fileName;
        link.href = canvas.toDataURL("image/png");
        link.click();

        const phone = booking.phone_number.replace(/[^0-9]/g, "");
        const fullPhone = phone.startsWith("977") ? phone : `977${phone}`;
        const message = `*ALPHASUITS — ORDER SLIP*${booking.bill_number ? `\nBill No: ${booking.bill_number}` : ""}\nName: ${booking.name}\nTotal: Rs.${totalRs || "0"}\nBalance: Rs.${balanceRs || "0"}\n\n_Please find the bill image downloaded on your device._`;

        setTimeout(() => {
          window.open(
            `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`,
            "_blank",
          );
        }, 500);

        toast.success(
          "Bill image downloaded! WhatsApp opened — attach the image manually.",
        );
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return; // User cancelled share
      toast.error("Failed to generate bill image for sharing.");
    }
  };

  // ─── Print ────────────────────────────────────────────────────────
  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for printing.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Slip - Bill #${booking.bill_number || ""}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            input { font-family: inherit; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // ─── Download as image ────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      const canvas = await createCleanCapture();
      const link = document.createElement("a");
      link.download = `OrderSlip_${booking.bill_number || booking.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error(
        "Download failed. Make sure html2canvas is installed: npm i html2canvas",
      );
    }
  };

  // ─── Formatted date display ───────────────────────────────────────
  const fmtDate = (d: string) => {
    if (!d) return "";
    try {
      return format(new Date(d), "MMM dd, yyyy");
    } catch {
      return d;
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[720px] max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-5 h-5" />
              Order Slip — Bill
              {booking.bill_number && (
                <span className="font-mono text-sm text-muted-foreground">
                  #{booking.bill_number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 px-6 py-2 border-b bg-muted/30">
            <Button
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving
                ? "Saving..."
                : hasSavedBill
                  ? "Update Bill"
                  : "Save Bill"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmail}
              disabled={isSending}
              className="gap-1.5"
            >
              <Mail className="w-4 h-4" />
              {isSending ? "Sending..." : "Email"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>

          {/* ── Printable Bill Content ─────────────────────────── */}
          <div className="px-4 pb-4">
            <div
              ref={printRef}
              style={{
                background: "#fff",
                color: "#000",
                padding: "0",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "13px",
                lineHeight: "1.4",
                maxWidth: "650px",
                margin: "0 auto",
              }}
            >
              {/* ── Header Image with Bill Number overlaid ─────── */}
              <div
                style={{
                  position: "relative",
                  textAlign: "center",
                  padding: "10px 15px 0",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assits/bill.webp"
                  alt="Alphasuits Order Slip"
                  style={{
                    width: "100%",
                    maxWidth: "620px",
                    height: "auto",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: "8%",
                    left: "18%",
                    fontSize: "16px",
                    fontWeight: "bold",
                    fontFamily: "monospace",
                    color: "#000",
                  }}
                >
                  {booking.bill_number || ""}
                </span>
              </div>

              {/* ── Customer Info ───────────────────────────────── */}
              <div style={{ padding: "10px 20px 6px" }}>
                {/* Name */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      minWidth: "90px",
                      flexShrink: 0,
                    }}
                  >
                    Name:
                  </span>
                  <span
                    style={{
                      flex: 1,
                      borderBottom: "1px dotted #666",
                      paddingBottom: "1px",
                      fontSize: "14px",
                      paddingLeft: "6px",
                    }}
                  >
                    {booking.name}
                  </span>
                </div>

                {/* Address + Phone */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    marginBottom: "6px",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      minWidth: "72px",
                      flexShrink: 0,
                    }}
                  >
                    Address:
                  </span>
                  <span
                    style={{
                      flex: 1,
                      borderBottom: "1px dotted #666",
                      paddingBottom: "1px",
                      fontSize: "14px",
                      paddingLeft: "6px",
                    }}
                  >
                    {booking.location}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    Phone.:
                  </span>
                  <span
                    style={{
                      borderBottom: "1px dotted #666",
                      paddingBottom: "1px",
                      fontSize: "14px",
                      minWidth: "110px",
                      paddingLeft: "6px",
                    }}
                  >
                    {booking.phone_number}
                  </span>
                </div>

                {/* Date Ordered + Delivery */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    marginBottom: "6px",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    Date: Ordered:
                  </span>
                  <span
                    style={{
                      flex: 1,
                      borderBottom: "1px dotted #666",
                      paddingBottom: "1px",
                      fontSize: "14px",
                      paddingLeft: "6px",
                    }}
                  >
                    {fmtDate(dateOrdered)}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    Delivery:
                  </span>
                  <span
                    style={{
                      borderBottom: "1px dotted #666",
                      paddingBottom: "1px",
                      fontSize: "14px",
                      minWidth: "110px",
                      paddingLeft: "6px",
                    }}
                  >
                    {fmtDate(dateDelivery)}
                  </span>
                </div>
              </div>

              {/* ── Main Table (Items + Totals all in one) ──────── */}
              <div style={{ padding: "0 20px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "2px solid #222",
                  }}
                >
                  {/* ─ Table Header ─ */}
                  <thead>
                    <tr>
                      <th
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                          width: "42px",
                        }}
                      >
                        S.N.
                      </th>
                      <th
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        Description
                      </th>
                      <th
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                          width: "50px",
                        }}
                      >
                        Qty.
                      </th>
                      <th
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                          width: "72px",
                        }}
                      >
                        Rate
                      </th>
                      <th
                        colSpan={2}
                        style={{
                          border,
                          padding: "0",
                          fontWeight: "bold",
                          textAlign: "center",
                          width: "136px",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ padding: "3px 0 0" }}>
                          <span style={{ fontSize: "11px" }}>Rs.</span>
                          <sup
                            style={{
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            Amount
                          </sup>{" "}
                          <span style={{ fontSize: "11px" }}>Ps.</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            borderTop: border,
                            marginTop: "3px",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              borderRight: border,
                              padding: "2px 0",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            Rs.
                          </span>
                          <span
                            style={{
                              flex: 1,
                              padding: "2px 0",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            Ps.
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ─ Item Rows ─ */}
                    {items.map((item) => (
                      <tr key={item.sn}>
                        <td
                          style={{
                            ...cellBase,
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          {item.sn}
                        </td>
                        <td style={{ ...cellBase, padding: "2px 4px" }}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                item.sn,
                                "description",
                                e.target.value,
                              )
                            }
                            style={{
                              ...inputStyle,
                              fontWeight: item.sn <= 7 ? "bold" : "normal",
                              fontSize: "14px",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            ...cellBase,
                            padding: "2px",
                            textAlign: "center",
                          }}
                        >
                          <input
                            type="text"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(item.sn, "qty", e.target.value)
                            }
                            style={{
                              ...inputStyle,
                              textAlign: "center",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            ...cellBase,
                            padding: "2px",
                            textAlign: "center",
                          }}
                        >
                          <input
                            type="text"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(item.sn, "rate", e.target.value)
                            }
                            style={{
                              ...inputStyle,
                              textAlign: "center",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            ...cellBase,
                            padding: "2px",
                            textAlign: "right",
                            width: "68px",
                            borderRight: border,
                          }}
                        >
                          <input
                            type="text"
                            value={item.amount_rs}
                            onChange={(e) =>
                              handleItemChange(
                                item.sn,
                                "amount_rs",
                                e.target.value,
                              )
                            }
                            style={{
                              ...inputStyle,
                              textAlign: "right",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            ...cellBase,
                            padding: "2px",
                            textAlign: "right",
                            width: "68px",
                          }}
                        >
                          <input
                            type="text"
                            value={item.amount_ps}
                            onChange={(e) =>
                              handleItemChange(
                                item.sn,
                                "amount_ps",
                                e.target.value,
                              )
                            }
                            style={{
                              ...inputStyle,
                              textAlign: "right",
                            }}
                          />
                        </td>
                      </tr>
                    ))}

                    {/* ─ Amount in Words + Total row ─ */}
                    <tr>
                      <td
                        colSpan={3}
                        rowSpan={3}
                        style={{
                          border,
                          padding: "6px 8px",
                          verticalAlign: "top",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>
                          Amount in Words:
                        </span>
                        <br />
                        <input
                          type="text"
                          value={amountInWords}
                          onChange={(e) => setAmountInWords(e.target.value)}
                          style={{
                            ...inputStyle,
                            width: "100%",
                            borderBottom: "1px dotted #999",
                            marginTop: "4px",
                            fontSize: "12px",
                            padding: "3px 0",
                          }}
                        />
                        <div
                          style={{
                            borderBottom: "1px dotted #999",
                            marginTop: "4px",
                            height: "16px",
                          }}
                        />
                      </td>
                      {/* Total */}
                      <td
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                          fontSize: "14px",
                        }}
                      >
                        Total
                      </td>
                      <td
                        style={{
                          ...cellBase,
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        {totalRs}
                      </td>
                      <td
                        style={{
                          ...cellBase,
                          textAlign: "right",
                        }}
                      >
                        {totalPs}
                      </td>
                    </tr>

                    {/* Advance */}
                    <tr>
                      <td
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                          fontSize: "14px",
                        }}
                      >
                        Advance
                      </td>
                      <td style={{ ...cellBase, padding: "2px" }}>
                        <input
                          type="text"
                          value={advanceRs}
                          onChange={(e) => setAdvanceRs(e.target.value)}
                          style={{
                            ...inputStyle,
                            textAlign: "right",
                          }}
                        />
                      </td>
                      <td style={{ ...cellBase, padding: "2px" }}>
                        <input
                          type="text"
                          value={advancePs}
                          onChange={(e) => setAdvancePs(e.target.value)}
                          style={{
                            ...inputStyle,
                            textAlign: "right",
                          }}
                        />
                      </td>
                    </tr>

                    {/* Balance */}
                    <tr>
                      <td
                        style={{
                          ...cellBase,
                          fontWeight: "bold",
                          textAlign: "center",
                          fontSize: "14px",
                        }}
                      >
                        Balance
                      </td>
                      <td
                        style={{
                          ...cellBase,
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        {balanceRs}
                      </td>
                      <td
                        style={{
                          ...cellBase,
                          textAlign: "right",
                        }}
                      >
                        {balancePs}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Terms & Conditions + Signature ──────────────── */}
              <div
                style={{
                  padding: "8px 20px 4px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "10px",
                }}
              >
                {/* Terms */}
                <div
                  style={{
                    flex: 1,
                    fontSize: "10px",
                    color: "#333",
                    lineHeight: "1.65",
                  }}
                >
                  ◆ कृपया सामान लिन आउँदा रसिद साथमा लिई आउनु होला ।
                  <br />
                  ◆ रसिद हराइमा तुरुन्त खबर गर्नु होला अन्यथा कसैले रसिद लिई
                  सामान डेलिभरी लगेमा हामी जिम्मेवार हुने छैनौ । साथै एक महिना
                  भित्र सामान नलगेमा हामी जिम्मेवार हुने छैन ।
                  <br />
                  ◆ कपडा पहिलेकै Damage मा हामी जिम्मेवारी लिने छैनौ ।
                  <br />
                  ◆ विद्युतीय समस्याले डेलिभरी ढिलो हुन पनि सक्नेछ ।
                  <br />
                  ◆ साटिङ, सुटिङ, कुर्ता, सुरुवाल, कपडा सुथ्र मूल्यमा पाउनुका
                  साथै स्तरीय सिलाई गरिन्छ ।
                  <br />◆ सामानको डेलिभरी ४ बजे पछि मात्र हुनेछ ।
                </div>

                {/* Signature */}
                <div
                  style={{
                    textAlign: "right",
                    minWidth: "100px",
                    paddingBottom: "2px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#999",
                      margin: "0 0 2px",
                      letterSpacing: "1px",
                    }}
                  >
                    ............................
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      fontStyle: "italic",
                      color: "#333",
                      margin: 0,
                    }}
                  >
                    Signature
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Update Confirmation AlertDialog ───────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Bill Amount?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you really want to update the bill amount? This will overwrite
              the existing bill data for this booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} disabled={isSaving}>
              {isSaving ? "Updating..." : "Yes, Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
