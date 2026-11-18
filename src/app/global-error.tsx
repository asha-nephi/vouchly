"use client";

import "./globals.css";
import ErrorScreen from "@/components/error-screen";

// Last safety net, if even the main layout fails. A full reload is the surest retry here.
export default function GlobalError() {
  return (
    <html lang="en-NG">
      <body className="antialiased">
        <ErrorScreen retry={() => location.reload()} />
      </body>
    </html>
  );
}
