type AttributeValue = string | number | boolean | null | undefined;

export type VariantAttributeMap = Record<string, AttributeValue>;

export type VariantAttributeLike = {
  attributes?: VariantAttributeMap | null;
  color_name?: string | null;
  color_code?: string | null;
  size?: string | number | null;
};

const SKIPPED_ATTRIBUTE_KEYS = new Set(["color", "color_code"]);

const ATTRIBUTE_LABELS: Record<string, string> = {
  color_name: "Color",
  size: "Size",
};

const formatAttributeLabel = (key: string) =>
  ATTRIBUTE_LABELS[key] ||
  key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatAttributeValue = (value: AttributeValue) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
};

const pushUniqueEntry = (
  entries: Array<{ label: string; value: string }>,
  label: string,
  value: string,
) => {
  if (!value || entries.some((entry) => entry.label === label)) {
    return;
  }

  entries.push({ label, value });
};

export const getVariantAttributeEntries = (
  variant?: VariantAttributeLike | null,
  options: { includeColor?: boolean } = {},
) => {
  if (!variant) {
    return [];
  }

  const entries: Array<{ label: string; value: string }> = [];
  const attributes =
    variant.attributes &&
    typeof variant.attributes === "object" &&
    !Array.isArray(variant.attributes)
      ? variant.attributes
      : {};

  Object.entries(attributes).forEach(([key, value]) => {
    if (SKIPPED_ATTRIBUTE_KEYS.has(key)) {
      return;
    }

    if (!options.includeColor && key === "color_name") {
      return;
    }

    pushUniqueEntry(
      entries,
      formatAttributeLabel(key),
      formatAttributeValue(value),
    );
  });

  pushUniqueEntry(entries, "Size", formatAttributeValue(variant.size));

  if (options.includeColor) {
    pushUniqueEntry(entries, "Color", formatAttributeValue(variant.color_name));
  }

  return entries;
};

export const formatVariantSummary = (
  variant?: VariantAttributeLike | null,
  options: { includeColor?: boolean } = { includeColor: true },
) =>
  getVariantAttributeEntries(variant, options)
    .map(({ label, value }) => `${label}: ${value}`)
    .join(" / ");
