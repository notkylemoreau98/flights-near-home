import type { SVGProps } from "react";

/** Top-down airliner pointing north; rotate by heading. */
export function PlaneIcon({ size = 22, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2c.8 0 1.3.9 1.3 2v5.2l7.7 4.4v2l-7.7-2.2v4.3l2.2 1.6v1.6L12 20l-3.5.9v-1.6l2.2-1.6v-4.3L3 15.6v-2l7.7-4.4V4c0-1.1.5-2 1.3-2z" />
    </svg>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </svg>
);

export const PencilIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={3} {...p}>
    <path d="M12 17v5" />
    <path d="M9 3h6l-1 7 4 4H6l4-4z" />
  </svg>
);

export const RadarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 12l6-6" />
  </svg>
);

export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const CrosshairIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const CursorIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M9 3l-6 18 7-4 4 7 3-2-4-7 8-1z" />
  </svg>
);

export const ArrowRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
