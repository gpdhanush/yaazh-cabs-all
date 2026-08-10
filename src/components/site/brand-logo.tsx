import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** nav: theme-aware horizontal; footer: always light-on-dark; mark: icon only */
  variant?: "nav" | "footer" | "mark";
  className?: string;
};

/**
 * Brand logo crops from the Yaazh identity sheet.
 * Uses CSS `.dark` so light/dark swap matches the FOUC theme script (no flash).
 */
export function BrandLogo({ variant = "nav", className }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <span className={cn("relative inline-grid shrink-0", className)}>
        <img
          src="/logo-mark.png"
          alt=""
          aria-hidden
          className="size-9 object-contain dark:hidden md:size-10"
          width={40}
          height={40}
        />
        <img
          src="/logo-mark-light.png"
          alt=""
          aria-hidden
          className="hidden size-9 object-contain dark:block md:size-10"
          width={40}
          height={40}
        />
        <span className="sr-only">Yaazh Cabs</span>
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <img
        src="/logo-horizontal-dark.png"
        alt="Yaazh Cabs"
        className={cn("h-11 w-auto max-w-[220px] object-contain object-left", className)}
        width={220}
        height={50}
      />
    );
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <img
        src="/logo-horizontal.png"
        alt="Yaazh Cabs"
        className="h-9 w-auto max-w-[168px] object-contain object-left dark:hidden sm:max-w-[200px] md:h-10 md:max-w-[230px]"
        width={230}
        height={52}
      />
      <img
        src="/logo-horizontal-dark.png"
        alt="Yaazh Cabs"
        className="hidden h-9 w-auto max-w-[168px] object-contain object-left dark:block sm:max-w-[200px] md:h-10 md:max-w-[230px]"
        width={230}
        height={52}
      />
    </span>
  );
}
