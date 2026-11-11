"use client";

import { useEffect } from "react";

import { APP_NAME } from "@/constants/app";

/**
 * Detail pages are prerendered with a generic `<title>` (the record is only known in the
 * browser); once it has loaded, the tab shows the record's name.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
