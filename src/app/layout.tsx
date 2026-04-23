/**
 * ============================================================================
 * ROOT LAYOUT
 * ============================================================================
 *
 * The main layout wrapper for the entire application.
 * Includes:
 * - Global CSS import
 * - Sidebar (persistent left navigation)
 * - Header (top bar with clock)
 * - Main content area
 * - Toast notifications
 *
 * All pages are rendered inside <main className="app-content">.
 * ============================================================================
 */

import type { Metadata } from "next";
import "./globals.css";
import LayoutClient from "@/components/layout/LayoutClient";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Akhtar Jewellers ERP – Invoice Module",
  description:
    "Modern cloud-based Jewellery ERP system for Akhtar Jewellers. Invoice management with real-time gold calculations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--maroon)",
              color: "var(--text-on-maroon)",
              fontSize: "0.8125rem",
              borderRadius: "var(--radius-sm)",
            },
          }}
        />
        <div className="app-layout">
          <LayoutClient>{children}</LayoutClient>
        </div>
      </body>
    </html>
  );
}
