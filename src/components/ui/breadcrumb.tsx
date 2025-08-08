"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumb({
  items,
  className,
  showHome = true,
}: BreadcrumbProps) {
  const allItems = showHome
    ? [{ label: "Home", href: "/dashboard" }, ...items]
    : items;

  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-sm text-gray-600",
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <li>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </li>
            )}
            <li>
              {item.href && !item.isCurrentPage ? (
                <Link
                  href={item.href}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  {index === 0 && showHome ? (
                    <Home className="h-4 w-4 mr-1" />
                  ) : null}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center",
                    item.isCurrentPage
                      ? "text-gray-900 font-medium"
                      : "text-gray-600"
                  )}
                  aria-current={item.isCurrentPage ? "page" : undefined}
                >
                  {index === 0 && showHome ? (
                    <Home className="h-4 w-4 mr-1" />
                  ) : null}
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
