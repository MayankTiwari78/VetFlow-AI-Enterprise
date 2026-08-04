"use client";

import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams
} from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type NavigateTarget = string | number;
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> & {
  children: ReactNode;
  to: string;
};

export const normalizeClientHref = (target: unknown): string =>
  typeof target === "string" && target.startsWith("/") ? target : "/";

export const Link = ({ to, children, ...props }: LinkProps) => (
  <NextLink href={normalizeClientHref(to)} {...props}>
    {children}
  </NextLink>
);

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
    <NextLink href={normalizeClientHref(to)} className={resolvedClassName || undefined} {...props}>
      {children}
    </NextLink>
  );
};

export const useNavigate = () => {
  const router = useRouter();

  return (target: NavigateTarget) => {
    if (typeof target === "number") {
      if (target < 0) router.back();
      if (target > 0) router.forward();
      return;
    }

    router.push(normalizeClientHref(target));
  };
};

export const useParams = <T extends Record<string, string | string[]>>() => useNextParams<T>();
export const useSearchParams = () => [useNextSearchParams(), () => undefined] as const;
