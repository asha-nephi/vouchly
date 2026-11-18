"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import ErrorScreen from "@/components/error-screen";

// Any page that fails shows a friendly screen with Try again, never a blank page.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("Page failed:", error.digest ?? error.message);
  }, [error]);
  const retry = useCallback(() => {
    router.refresh();
    reset();
  }, [router, reset]);
  return <ErrorScreen retry={retry} />;
}
