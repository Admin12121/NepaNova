"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trash as DeleteIcon, X } from "lucide-react";
import { DragEvent } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AvailableColor {
  code: string;
  name: string;
}

interface ImageUploadSectionProps {
  images: string[];
  productImages: File[];
  isDragging: boolean;
  draggingIndex: number | null;
  loadingIndex: number | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onImageUpload: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onRemoveAll: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  availableColors?: AvailableColor[];
  imageColors?: Record<number, string>;
  onSetImageColor?: (index: number, colorCode: string) => void;
  onClearImageColor?: (index: number) => void;
}

function ColorTag({
  index,
  availableColors,
  imageColors,
  onSetImageColor,
  onClearImageColor,
}: {
  index: number;
  availableColors: AvailableColor[];
  imageColors: Record<number, string>;
  onSetImageColor: (index: number, colorCode: string) => void;
  onClearImageColor: (index: number) => void;
}) {
  const assignedColor = imageColors[index];
  const assignedColorObj = availableColors.find(
    (c) => c.code === assignedColor,
  );

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      <TooltipProvider delayDuration={200}>
        {availableColors.map((color) => {
          const isSelected = assignedColor === color.code;
          return (
            <Tooltip key={color.code}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isSelected) {
                      onClearImageColor(index);
                    } else {
                      onSetImageColor(index, color.code);
                    }
                  }}
                  className={cn(
                    "w-4 h-4 rounded-full border transition-all flex-shrink-0",
                    isSelected
                      ? "ring-2 ring-offset-1 ring-blue-500 border-blue-500 scale-110"
                      : "border-neutral-300 dark:border-neutral-600 hover:scale-110 hover:border-neutral-500",
                  )}
                  style={{ backgroundColor: color.code }}
                  aria-label={`Tag image with ${color.name}`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isSelected ? `Remove ${color.name}` : `Tag as ${color.name}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
      {assignedColorObj && (
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-1 truncate max-w-[60px]">
          {assignedColorObj.name}
        </span>
      )}
    </div>
  );
}

export function ImageUploadSection({
  images,
  isDragging,
  draggingIndex,
  loadingIndex,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onImageUpload,
  onRemoveImage,
  onRemoveAll,
  onInputChange,
  availableColors = [],
  imageColors = {},
  onSetImageColor,
  onClearImageColor,
}: ImageUploadSectionProps) {
  const showColorTags =
    availableColors.length > 0 && onSetImageColor && onClearImageColor;

  return (
    <div className="flex gap-5 flex-wrap">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/png"
        onChange={onInputChange}
        multiple
      />
      <div className="flex w-full gap-5 flex-col h-full custom-md:flex-row">
        {/* Main image slot */}
        <div className="custom-md:w-[50%] w-full">
          <Button
            type="button"
            variant="secondary"
            className={`bg-white w-full h-80 flex justify-center items-center p-0 dark:bg-neutral-900 hover:dark:!bg-neutral-800 ${
              isDragging && draggingIndex === 0 ? "dragging" : ""
            }`}
            onDrop={(e: any) => onDrop(e, 0)}
            onDragOver={(e: any) => onDragOver(e, 0)}
            onDragLeave={onDragLeave}
            onClick={() => onImageUpload(0)}
          >
            {loadingIndex === 0 ? (
              <Spinner color="secondary" />
            ) : images[0] ? (
              <Image
                src={images[0]}
                className="h-80 w-full max-lg:h-full max-lg:w-full object-contain"
                alt="Uploaded"
                width={800}
                height={800}
              />
            ) : (
              "Click or Drop here"
            )}
          </Button>
          {images[0] && showColorTags && (
            <ColorTag
              index={0}
              availableColors={availableColors}
              imageColors={imageColors}
              onSetImageColor={onSetImageColor}
              onClearImageColor={onClearImageColor}
            />
          )}
        </div>

        {/* Secondary image slots */}
        <div className="flex items-center justify-center gap-3 custom-md:w-[50%] flex-wrap">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex flex-col">
              <div
                className={`relative bg-white w-20 h-20 items-center justify-center custom-md:w-[48%] custom-md:h-[48%] dark:bg-neutral-900 rounded-md ${
                  isDragging && draggingIndex === index
                    ? "dragging ring-2 ring-primary"
                    : ""
                }`}
                style={{ minWidth: "5rem", minHeight: "5rem" }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-full"
                  onDrop={(e: any) => onDrop(e, index)}
                  onDragOver={(e: any) => onDragOver(e, index)}
                  onDragLeave={onDragLeave}
                  onClick={() => onImageUpload(index)}
                >
                  {loadingIndex === index ? (
                    <Spinner color="secondary" />
                  ) : images[index] ? (
                    <Image
                      className="object-contain h-20 w-20 max-lg:h-full max-lg:w-full"
                      src={images[index]}
                      alt={`Uploaded ${index}`}
                      width={800}
                      height={800}
                    />
                  ) : (
                    "+"
                  )}
                </Button>
                {images[index] && (
                  <Button
                    type="button"
                    className="absolute top-1 right-1 h-8 w-8 p-0"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(index);
                    }}
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {images[index] && showColorTags && (
                <ColorTag
                  index={index}
                  availableColors={availableColors}
                  imageColors={imageColors}
                  onSetImageColor={onSetImageColor}
                  onClearImageColor={onClearImageColor}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
