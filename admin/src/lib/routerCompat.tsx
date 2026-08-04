"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> & {
  children: ReactNode;
  to: string;
};

export const NavLink = ({
  to,
  children,
  className,
  ...props
}: LinkProps & {
  className?: string | ((state: { isActive: boolean }) => string | undefined);
}) => {
  const pathname = usePathname() ?? "";
  const isActive = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
  const resolvedClassName =
    typeof className === "function"
      ? className({ isActive })
      : [className, isActive ? "active" : ""].filter(Boolean).join(" ");

  return (
    <NextLink href={to} className={resolvedClassName || undefined} {...props}>
      {children}
    </NextLink>
  );
};

export const useNavigate = () => {
  const router = useRouter();

  return (target: string | number) => {
    if (typeof target === "number") {
      if (target < 0) router.back();
      if (target > 0) router.forward();
      return;
    }

    router.push(target);
  };
};

export const useParams = <T extends Record<string, string | string[]>>() => useNextParams<T>();
