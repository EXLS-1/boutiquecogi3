"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
            fontSize: "14px",
            padding: "16px",
            borderRadius: "8px",
          },
          success: {
            style: {
              background: "#10b981",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#10b981",
            },
          },
          error: {
            style: {
              background: "#ef4444",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#ef4444",
            },
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}
