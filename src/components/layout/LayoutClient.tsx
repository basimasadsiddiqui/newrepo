"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Enter key → move focus to next focusable input/select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const type = (target as HTMLInputElement).type?.toLowerCase();

      if (tag !== "INPUT" && tag !== "SELECT") return;
      if (type === "submit" || type === "button" || type === "checkbox" || type === "radio") return;

      e.preventDefault();

      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      ).filter(
        (el) =>
          getComputedStyle(el).display !== "none" &&
          getComputedStyle(el).visibility !== "hidden"
      );

      const idx = focusable.indexOf(target);
      if (idx > -1 && idx < focusable.length - 1) {
        focusable[idx + 1].focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focusing a number field selects its current value so typing replaces it directly
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === "INPUT" && target.type === "number") {
        target.select();
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="app-content">{children}</main>
      </div>
    </>
  );
}
