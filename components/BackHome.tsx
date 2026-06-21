// components/BackHome.tsx
import Link from "next/link";
import type { ReactNode } from "react";

type BackHomeProps = {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  children?: ReactNode;
};

export default function BackHome({
  className,
  style,
  label = "Back",
  children,
}: BackHomeProps) {
  return (
    <Link
      href="/"
      className={className}
      style={style}
      aria-label={label}
    >
      {children ?? label}
    </Link>
  );
}