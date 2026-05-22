import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useProductImageMutation,
  useDeleteproductImageMutation,
} from "@/lib/store/Service/api";
import { toast } from "sonner";
import { cn, delay } from "@/lib/utils";
import { Settings, Check } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

interface AvailableColor {
  code: string;
  name: string;
}

const Uploader = ({
  token,
  product,
  className,
  images,
  availableColors = [],
}: {
  token?: string;
  product?: string;
  className?: string;
  images?: any;
  availableColors?: AvailableColor[];
}) => {
  const [productImage] = useProductImageMutation();
  const [deleteProductImage] = useDeleteproductImageMutation();
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    images?.color || null,
  );
  const [colorChanged, setColorChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync with incoming image color data
  useEffect(() => {
    if (images?.color) {
      setSelectedColor(images.color);
    }
  }, [images?.color]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorSelect = (colorCode: string) => {
    if (selectedColor === colorCode) {
      setSelectedColor(null);
    } else {
      setSelectedColor(colorCode);
    }
    setColorChanged(true);
  };

  const handleUpdateImage = async () => {
    if (!newImage && !colorChanged) {
      toast.error(
        "Please upload a new image or change the color before updating.",
      );
      return;
    }

    const formData = new FormData();
    if (newImage) {
      formData.append("image", newImage);
    }
    if (colorChanged) {
      if (selectedColor) {
        formData.append("color", selectedColor);
      } else {
        formData.append("color", "");
      }
    }

    try {
      const toastId = toast.loading("Updating Image...", {
        position: "top-center",
      });
      await delay(500);
      const res = await productImage({ formData, token, id: images.id });
      if (res.data) {
        setColorChanged(false);
        toast.success("Image updated successfully!", {
          id: toastId,
          position: "top-center",
        });
      } else {
        toast.error("Failed to update image", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (error) {
      toast.error("Error updating image", {
        position: "top-center",
      });
    }
  };

  const handleDeleteImage = async () => {
    try {
      const toastId = toast.loading("Deleting Image...", {
        position: "top-center",
      });
      await delay(500);
      const res = await deleteProductImage({ token, id: images.id });
      if (res.data) {
        toast.success("Image deleted successfully!", {
          id: toastId,
          position: "top-center",
        });
      } else {
        toast.error("Failed to delete image", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (error) {
      toast.error("Error deleting image", {
        position: "top-center",
      });
    }
  };

  const selectedColorObj = availableColors.find(
    (c) => c.code === selectedColor,
  );

  const isLightColor = (hexColor: string): boolean => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="relative">
          <Settings className={className} />
          <Image
            className={cn(
              "object-contain h-20 w-20 max-lg:h-full max-lg:w-full",
              product,
            )}
            src={images.src}
            alt={`Uploaded`}
            width={800}
            height={800}
          />
          {/* Color indicator dot on the thumbnail */}
          {selectedColor && (
            <span
              className="absolute bottom-1 left-1 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-800 shadow-sm"
              style={{ backgroundColor: selectedColor }}
              title={selectedColorObj?.name || selectedColor}
            />
          )}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-4">
        <div className="space-y-3">
          <DialogHeader className="flex flex-col gap-1">
            <DialogTitle>Update Image</DialogTitle>
          </DialogHeader>
          <div className="w-full flex gap-2 items-center justify-between h-48">
            <Image
              src={images.src}
              alt={`Uploaded`}
              width={400}
              height={400}
              className="w-1/2 h-44 object-contain"
            />
            {newImagePreview ? (
              <Image
                src={newImagePreview}
                alt="New Image"
                width={200}
                height={200}
                className="w-1/2 h-44 object-contain"
              />
            ) : (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button
                  className="h-44 w-1/2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload New Image
                </Button>
              </>
            )}
          </div>

          {/* Color assignment section */}
          {availableColors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Assign Color
                </p>
                {selectedColorObj && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedColorObj.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {availableColors.map((color) => {
                  const isSelected = selectedColor === color.code;
                  const lightText = isLightColor(color.code);
                  return (
                    <button
                      key={color.code}
                      type="button"
                      onClick={() => handleColorSelect(color.code)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                        "hover:scale-110 active:scale-95",
                        isSelected
                          ? "border-blue-500 ring-2 ring-offset-1 ring-blue-300"
                          : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-400",
                      )}
                      style={{ backgroundColor: color.code }}
                      title={`${isSelected ? "Remove" : "Assign"} ${color.name}`}
                      aria-label={`${isSelected ? "Remove" : "Assign"} ${color.name}`}
                    >
                      {isSelected && (
                        <Check
                          className={cn(
                            "w-4 h-4 font-bold drop-shadow-md",
                            lightText ? "text-gray-900" : "text-white",
                          )}
                        />
                      )}
                    </button>
                  );
                })}
                {/* No-color option */}
                {selectedColor && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedColor(null);
                      setColorChanged(true);
                    }}
                    className={cn(
                      "h-8 px-2 rounded-md border text-xs transition-all",
                      "border-neutral-300 dark:border-neutral-600",
                      "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
                      "hover:border-neutral-400",
                    )}
                    title="Remove color assignment"
                  >
                    No color
                  </button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 w-full">
            <Button className="w-full" onClick={handleUpdateImage}>
              Save
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteImage}
            >
              Delete
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Uploader;
