import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import Price from "./slider";
import { X } from "lucide-react";
import { VariantFilterDefinition } from "@/types/product";

interface Item {
  id: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}

interface Color {
  id: string;
  name: string;
  color: string;
}

const fallbackSizes: Item[] = [
  { id: "size-xs", value: "xs", label: "XS" },
  { id: "size-s", value: "s", label: "S" },
  { id: "size-m", value: "m", label: "M" },
  { id: "size-l", value: "l", label: "L" },
  { id: "size-xl", value: "xl", label: "XL" },
  { id: "size-xxl", value: "xxl", label: "XXL" },
  { id: "size-3xl", value: "3xl", label: "3XL" },
];

const availability: Item[] = [
  { id: "radio-13-r1", value: "in", label: "In stock" },
  { id: "radio-13-r3", value: "out", label: "Out of Stock" },
];

const optionClassName =
  "relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-input px-2 py-3 text-center shadow-sm shadow-black/5 outline-offset-2 transition-colors text-foreground has-[[data-state=checked]]:text-white has-[[data-disabled]]:cursor-not-allowed bg-white dark:bg-transparent has-[[data-state=checked]]:dark:bg-main has-[[data-state=checked]]:border-ring ring-transparent has-[[data-state=checked]]:ring-main/50 ring-2 ring-offset-2 ring-offset-transparent has-[[data-state=checked]]:ring-offset-slate-50 has-[[data-state=checked]]:dark:ring-offset-slate-900 has-[[data-state=checked]]:bg-main has-[[data-disabled]]:opacity-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70";

const Sidebar = ({
  state,
  dispatch,
  handleClose,
  materials,
  attributeFilters = [],
}: {
  state: any;
  dispatch: any;
  handleClose: any;
  materials: any;
  attributeFilters?: VariantFilterDefinition[];
}) => {
  const colorFilter = attributeFilters.find((item) => item.key === "color");
  const sizeFilter = attributeFilters.find((item) => item.key === "size");
  const dynamicFilters = attributeFilters.filter(
    (item) => item.key !== "color" && item.key !== "size" && item.values.length > 0,
  );
  const colorItems: Color[] =
    colorFilter && colorFilter.values.length > 0
      ? colorFilter.values.map((item, index) => ({
          id: `color-${index}`,
          name: item.label,
          color: item.color || item.value,
        }))
      : materials.color;
  const sizeItems: Item[] =
    sizeFilter && sizeFilter.values.length > 0
      ? sizeFilter.values.map((item, index) => ({
          id: `size-${index}`,
          value: item.value,
          label: item.label,
        }))
      : fallbackSizes;

  const toggleFilter = (filterKey: string, value: string) => {
    dispatch({
      type: "multiple",
      value: [
        { type: filterKey, value },
        { type: "page", value: 1 },
      ],
    });
  };

  const renderOptionGrid = (
    filterKey: string,
    filterItems: Item[],
    columns = "grid-cols-3",
  ) => (
    <fieldset className="space-y-4">
      <div className={`grid ${columns} p-1 gap-2`}>
        {filterItems.map((item) => (
          <label key={item.id} className={optionClassName}>
            <Checkbox
              id={item.id}
              value={item.value}
              className="sr-only after:absolute after:inset-0"
              checked={(state[filterKey] || []).includes(item.value)}
              onClick={() => toggleFilter(filterKey, item.value)}
              disabled={item?.disabled}
            />
            <p className="text-sm font-medium leading-none ">{item.label}</p>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const items = [
    ...(colorItems.length > 0
      ? [
          {
            id: "1",
            title: colorFilter?.label || "Colors",
            content: (
              <fieldset className="space-y-4">
                <div className="grid grid-cols-3 p-1 gap-3">
                  {colorItems.map((item, index) => (
                    <label key={item.id || `color-${index}`} className={optionClassName}>
                      <Checkbox
                        id={item.id || `color-${index}`}
                        value={item.color}
                        className="sr-only after:absolute after:inset-0"
                        checked={(state.color || []).includes(item.color)}
                        onClick={() => toggleFilter("color", item.color)}
                      />
                      <p className="text-sm font-medium leading-none ">{item.name}</p>
                    </label>
                  ))}
                </div>
              </fieldset>
            ),
          },
        ]
      : []),
    ...(sizeItems.length > 0
      ? [
          {
            id: "2",
            title: sizeFilter?.label || "Size",
            content: renderOptionGrid("size", sizeItems, "grid-cols-4"),
          },
        ]
      : []),
    ...dynamicFilters.map((filter, index) => ({
      id: `attr-${filter.key}-${index}`,
      title: filter.label,
      content: renderOptionGrid(
        `attr:${filter.key}`,
        filter.values.map((item, valueIndex) => ({
          id: `${filter.key}-${valueIndex}`,
          value: item.value,
          label: item.label,
        })),
      ),
    })),
    {
      id: "3",
      title: "Availability",
      content: renderOptionGrid("availability", availability, "grid-cols-2"),
    },
  ];

  return (
    <div className="w-full px-3 py-1 bg-neutral-100/90 dark:bg-neutral-900/90 lg:bg-transparent rounded-md backdrop-blur-md h-full">
      <span className="h-5 w-full lg:hidden flex items-center justify-end">
        <span
          className="absolute right-2 top-2 w-5 h-5 cursor-pointer"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </span>
      </span>
      <Price dispatch={dispatch} />
      <Accordion type="multiple" className="w-full" defaultValue={["1"]}>
        {items.map((item) => (
          <AccordionItem value={item.id} key={item.id} className="py-1">
            <AccordionTrigger
              icon={<></>}
              className="py-2 text-[15px] leading-6 hover:no-underline"
            >
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="pb-2 text-muted-foreground">
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default Sidebar;
