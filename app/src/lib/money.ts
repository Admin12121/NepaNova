export const roundMoney = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const formatMoney = (
  value: number | string | null | undefined,
  options: { symbol?: string } = {},
) => {
  const symbol = options.symbol ?? "रु";
  const amount = roundMoney(value);
  const formatted = amount.toLocaleString("en-NP", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formatted}`;
};
