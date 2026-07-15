import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // Shadcn defaults
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",

        // LAGDA-specific
        azure:
          "border-transparent bg-[#0078D4] text-white",
        "azure-subtle":
          "border-[#BAE0FA] bg-[#EAF6FF] text-[#005BA9]",
        navy:
          "border-transparent bg-[#07111F] text-white",
        "navy-subtle":
          "border-[#0B2344]/20 bg-[#0B2344]/08 text-[#07111F]",
        burgundy:
          "border-transparent bg-[#67023B] text-white",
        "burgundy-subtle":
          "border-[#F9A8D4] bg-[#FCE7F3] text-[#67023B]",
        success:
          "border-transparent bg-[#16A34A] text-white",
        "success-subtle":
          "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]",
        warning:
          "border-transparent bg-[#D97706] text-white",
        "warning-subtle":
          "border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]",
        error:
          "border-transparent bg-[#DC2626] text-white",
        "error-subtle":
          "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
        gold:
          "border-transparent bg-[#C9960C] text-white",
        "gold-subtle":
          "border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]",
        // Neutral
        muted:
          "border-[rgba(0,0,0,0.09)] bg-[#f3f3f5] text-[#64748B]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
