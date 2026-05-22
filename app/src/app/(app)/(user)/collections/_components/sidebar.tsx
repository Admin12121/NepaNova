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
import { toPascalCase } from "@/lib/utils";

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

const size: Item[] = [
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

const Sidebar = ({
  state,
  dispatch,
  handleClose,
  materials,
}: {
  state: any;
  dispatch: any;
  handleClose: any;
  materials: any;
}) => {
  const items = [
    {
      id: "1",
      title: "Colors",
      content: (
        <fieldset className="space-y-4">
          <div className="grid grid-cols-3 p-1 gap-3">
            {materials.color.map((item: Color, index: number) => (
              <label
                key={item.id || `color-${index}`}
                className="relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-input px-2 py-3 text-center shadow-sm shadow-black/5 outline-offset-2 transition-colors text-foreground has-[[data-state=checked]]:text-white has-[[data-disabled]]:cursor-not-allowed bg-white dark:bg-transparent has-[[data-state=checked]]:dark:bg-amber-600 has-[[data-state=checked]]:border-ring ring-transparent has-[[data-state=checked]]:ring-amber-500/50 ring-2 ring-offset-2 ring-offset-transparent has-[[data-state=checked]]:ring-offset-slate-50 has-[[data-state=checked]]:dark:ring-offset-slate-900 has-[[data-state=checked]]:bg-amber-500 has-[[data-disabled]]:opacity-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70"
              >
                <Checkbox
                  id={item.id || `color-${index}`}
                  value={item.color}
                  className="sr-only after:absolute after:inset-0"
                  checked={state.color.includes(item.color)}
                  onClick={() => dispatch({ type: "color", value: item.color })}
                />
                <p className="text-sm font-medium leading-none ">{item.name}</p>
              </label>
            ))}
          </div>
        </fieldset>
      ),
    },
    {
      id: "2",
      title: "Size",
      content: (
        <fieldset className="space-y-4">
          <div className="grid grid-cols-4 p-1 gap-2">
            {size.map((item) => (
              <label
                key={item.id}
                className="relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-input px-2 py-3 text-center shadow-sm shadow-black/5 outline-offset-2 transition-colors text-foreground has-[[data-state=checked]]:text-white has-[[data-disabled]]:cursor-not-allowed bg-white dark:bg-transparent has-[[data-state=checked]]:dark:bg-amber-600 has-[[data-state=checked]]:border-ring ring-transparent has-[[data-state=checked]]:ring-amber-500/50 ring-2 ring-offset-2 ring-offset-transparent has-[[data-state=checked]]:ring-offset-slate-50 has-[[data-state=checked]]:dark:ring-offset-slate-900 has-[[data-state=checked]]:bg-amber-500 has-[[data-disabled]]:opacity-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70"
              >
                <Checkbox
                  id={item.id}
                  value={item.value}
                  className="sr-only after:absolute after:inset-0"
                  checked={state.size.includes(item.value)}
                  onClick={() =>
                    dispatch({
                      type: "multiple",
                      value: [
                        { type: "size", value: item.value },
                        { type: "page", value: 1 },
                      ],
                    })
                  }
                  disabled={item?.disabled}
                />
                <p className="text-sm font-medium leading-none ">
                  {item.label}
                </p>
              </label>
            ))}
          </div>
        </fieldset>
      ),
    },
    {
      id: "3",
      title: "Availability",
      content: (
        <fieldset className="space-y-4">
          <div className="grid grid-cols-2 p-1 gap-3">
            {availability.map((item) => (
              <label
                key={item.id}
                className="relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-input px-2 py-3 text-center shadow-sm shadow-black/5 outline-offset-2 transition-colors text-foreground has-[[data-state=checked]]:text-white has-[[data-disabled]]:cursor-not-allowed bg-white dark:bg-transparent has-[[data-state=checked]]:dark:bg-amber-600 has-[[data-state=checked]]:border-ring ring-transparent has-[[data-state=checked]]:ring-amber-500/50 ring-2 ring-offset-2 ring-offset-transparent has-[[data-state=checked]]:ring-offset-slate-50 has-[[data-state=checked]]:dark:ring-offset-slate-900 has-[[data-state=checked]]:bg-amber-500 has-[[data-disabled]]:opacity-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70"
              >
                <Checkbox
                  id={item.id}
                  value={item.value}
                  className="sr-only after:absolute after:inset-0"
                  checked={state.availability.includes(item.value)}
                  onClick={() =>
                    dispatch({
                      type: "multiple",
                      value: [
                        { type: "availability", value: item.value },
                        { type: "page", value: 1 },
                      ],
                    })
                  }
                />
                <p className="text-sm font-medium leading-none text-nowrap ">
                  {item.label}
                </p>
              </label>
            ))}
          </div>
        </fieldset>
      ),
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
