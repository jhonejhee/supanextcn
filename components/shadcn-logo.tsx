import type * as React from "react";

export function ShadcnLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="shadcn/ui logo"
      role="img"
      viewBox="0 0 256 256"
      width="40"
      height="40"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="256" height="256" fill="none" />
      <line
        x1="208"
        y1="128"
        x2="128"
        y2="208"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <line
        x1="192"
        y1="40"
        x2="40"
        y2="192"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </svg>
  );
}
