"use client";

import { Download, Mail, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatVariantSummary } from "@/lib/variant-attributes";
import { formatMoney } from "@/lib/money";

type ReceiptAddress = {
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
};

type ReceiptOrder = {
  transactionuid: string;
  status?: string | null;
  total_amt?: number | string | null;
  sub_total?: number | string | null;
  discount?: number | string | null;
  payment_method?: string | null;
  created?: string | null;
  shipping?: ReceiptAddress | null;
};

type ReceiptProduct = {
  product_name?: string | null;
  categoryname?: string | null;
  pcs?: number;
  qty?: number;
  price?: number | string | null;
  total?: number | string | null;
  variantDetails?: Record<string, unknown> | null;
};

const organization = {
  name: "NepaNova Impact",
  address: "Kathmandu, Nepal",
  email: "info@nepanova.com",
  pan: "623596672",
  registration: "390352/82/83",
};

const money = (value?: number | string | null) => formatMoney(value);

const dateTime = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString("en-GB");
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildReceiptHtml = ({
  order,
  products,
  createdBy,
}: {
  order: ReceiptOrder;
  products: ReceiptProduct[];
  createdBy?: string;
}) => {
  const shipping = order.shipping;
  const itemRows = products
    .map((product) => {
      const quantity = product.pcs ?? product.qty ?? 0;
      const variant = formatVariantSummary(product.variantDetails as any);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(product.product_name || "Product")}</strong>
            <span>${escapeHtml(product.categoryname || "")}${variant ? ` / ${escapeHtml(variant)}` : ""}</span>
          </td>
          <td>${quantity}</td>
          <td>${escapeHtml(money(product.price))}</td>
          <td>${escapeHtml(money(product.total))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(order.transactionuid)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111; font-family: "Courier New", monospace; }
    .receipt { width: 360px; margin: 0 auto; padding: 24px 18px; }
    .center { text-align: center; }
    .muted { color: #555; }
    h1 { margin: 8px 0 4px; font-size: 18px; letter-spacing: 0; }
    p { margin: 2px 0; }
    .rule { border-top: 1px dashed #111; margin: 14px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 6px 0; text-align: left; vertical-align: top; font-size: 13px; }
    th:nth-child(2), td:nth-child(2) { text-align: center; width: 34px; }
    th:nth-child(3), th:nth-child(4), td:nth-child(3), td:nth-child(4) { text-align: right; width: 70px; }
    td span { display: block; color: #555; font-size: 11px; }
    .total { font-size: 24px; font-weight: 700; }
    @media print {
      body { width: 80mm; }
      .receipt { width: 80mm; padding: 10mm 5mm; }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <section class="center">
      <h1>${organization.name}</h1>
      <p>${organization.address}</p>
      <p>${organization.email}</p>
      <p>PAN: ${organization.pan}</p>
      <p>Reg No: ${organization.registration}</p>
    </section>
    <div class="rule"></div>
    <section>
      <div class="row"><span>Receipt</span><strong>${escapeHtml(order.transactionuid)}</strong></div>
      <div class="row"><span>Date/time</span><span>${escapeHtml(dateTime(order.created))}</span></div>
      <div class="row"><span>Status</span><span>${escapeHtml(order.status || "Unknown")}</span></div>
      <div class="row"><span>Payment</span><span>${escapeHtml(order.payment_method || "Not recorded")}</span></div>
      ${createdBy ? `<div class="row"><span>Created by</span><span>${escapeHtml(createdBy)}</span></div>` : ""}
    </section>
    <div class="rule"></div>
    <section>
      <p><strong>Bill to / Delivery</strong></p>
      <p>${escapeHtml([shipping?.address, shipping?.city, shipping?.country].filter(Boolean).join(", ") || "Direct purchase")}</p>
      ${shipping?.phone ? `<p>Phone: ${escapeHtml(shipping.phone)}</p>` : ""}
    </section>
    <div class="rule"></div>
    <table>
      <thead>
        <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="rule"></div>
    <section>
      <div class="row"><span>Subtotal</span><span>${escapeHtml(money(order.sub_total))}</span></div>
      <div class="row"><span>Discount</span><span>${escapeHtml(money(order.discount))}</span></div>
      <div class="row"><span>Total</span><span class="total">${escapeHtml(money(order.total_amt))}</span></div>
    </section>
    <div class="rule"></div>
    <section class="center muted">
      <p>Thank you for shopping with NepaNova Impact.</p>
      <p>This receipt is valid for customer and internal records.</p>
    </section>
  </main>
</body>
</html>`;
};

export const OrderReceiptActions = ({
  order,
  products,
  createdBy,
  onEmail,
  emailLoading,
}: {
  order: ReceiptOrder;
  products: ReceiptProduct[];
  createdBy?: string;
  onEmail?: () => void;
  emailLoading?: boolean;
}) => {
  const filename = `receipt-${order.transactionuid}.html`;

  const printReceipt = () => {
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return;
    popup.document.write(buildReceiptHtml({ order, products, createdBy }));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const downloadReceipt = () => {
    const blob = new Blob([buildReceiptHtml({ order, products, createdBy })], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={printReceipt}>
        <Printer className="mr-2 h-4 w-4" />
        Print bill
      </Button>
      <Button type="button" size="sm" onClick={downloadReceipt}>
        <Download className="mr-2 h-4 w-4" />
        Download bill
      </Button>
      {onEmail ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onEmail}
          disabled={emailLoading}
        >
          <Mail className="mr-2 h-4 w-4" />
          {emailLoading ? "Sending" : "Email bill"}
        </Button>
      ) : null}
    </div>
  );
};
