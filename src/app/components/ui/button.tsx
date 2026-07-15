import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

// ── LAGDA button variants ────────────────────────────────────────────────────
//
// primary    → Azure (#0078D4) — active eSignature + current-product actions
// enotary    → Burgundy (#67023B) — ONLY for eNotary waitlist / future-product
//              Must always be accompanied by Coming Soon context; never use
//              for ordinary active-product actions.
// secondary  → Azure ghost/outline — secondary active-product actions
// ghost      → Transparent — tertiary / low-emphasis
// destructive → Error Red — destructive or irreversible actions only
// link       → Text link style

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Shadcn defaults (now themed to LAGDA azure via --primary)
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link:
          "text-primary underline-offset-4 hover:underline",

        // LAGDA-specific variants
        //
        // Primary azure — same as default but named explicitly for clarity
        primary:
          "bg-[#0078D4] text-white hover:bg-[#006CC1] active:bg-[#005BA9] shadow-sm focus-visible:ring-[#0078D4]/40",

        // Outline azure — secondary active-product CTA
        "primary-outline":
          "border border-[#0078D4] text-[#0078D4] bg-transparent hover:bg-[#EAF6FF] active:bg-[#BAE0FA] focus-visible:ring-[#0078D4]/40",

        // eNotary — ONLY for waitlist / future-product actions
        // Color: Deep Legal Burgundy
        enotary:
          "bg-[#67023B] text-white hover:bg-[#B01262] active:bg-[#67023B] shadow-sm focus-visible:ring-[#67023B]/40",

        // eNotary outline
        "enotary-outline":
          "border border-[#67023B] text-[#67023B] bg-transparent hover:bg-[#FCE7F3] focus-visible:ring-[#67023B]/40",

        // Navy — for use on light backgrounds when a dark CTA is needed
        navy:
          "bg-[#07111F] text-white hover:bg-[#0B2344] active:bg-[#07111F] shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm:      "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        md:      "h-10 rounded-md px-5 has-[>svg]:px-4",
        lg:      "h-12 rounded-md px-7 text-base has-[>svg]:px-5",
        xl:      "h-14 rounded-lg px-8 text-base has-[>svg]:px-6",
        icon:    "size-9 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
