// ============================================
// MarketingLayout.tsx - Apple-style marketing layout
// Always uses light mode regardless of user theme preference
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { ResearchMateLogo } from "./ResearchMateLogo";

// ============================================
// PART 2: COMPONENT
// ============================================

export const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { visualTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isBubbleTheme = visualTheme === "bubble";
  const isGlassTheme = visualTheme === "glass";

  // Force light mode for marketing pages
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");

    // Remove dark mode for marketing pages
    root.classList.remove("dark");

    // Restore dark mode when leaving marketing pages (if it was set)
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (
        savedTheme === "dark" ||
        (savedTheme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        root.classList.add("dark");
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-900 font-sans relative">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between h-14 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <ResearchMateLogo size={28} />
              <span className="text-base font-semibold font-title text-slate-900">
                ResearchMate
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() =>
                  document
                    .getElementById("home")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Overview
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Platform
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Workflow
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <button className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5">
                  Sign In
                </button>
              </Link>
              <Link to="/signup">
                <button className="text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-all active:scale-[0.98] shadow-2xs">
                  Start Free
                </button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className={`md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                isMobileMenuOpen ? "hamburger-open" : ""
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <div className="flex flex-col gap-1.5">
                <span className="hamburger-line" />
                <span className="hamburger-line" />
                <span className="hamburger-line" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/50 animate-slide-down">
            <div className="px-6 py-4 space-y-1">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  document
                    .getElementById("home")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="block py-3 text-base font-medium text-gray-900 w-full text-left"
              >
                Home
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="block py-3 text-base font-medium text-gray-900 w-full text-left"
              >
                Products
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="block py-3 text-base font-medium text-gray-900 w-full text-left"
              >
                How It Works
              </button>
              <div className="pt-4 flex gap-3">
                <Link to="/login" className="flex-1">
                  <button className="theme-btn theme-btn-outline w-full py-2.5 text-sm font-medium border border-gray-300">
                    Sign In
                  </button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <button className="theme-btn theme-btn-primary w-full py-2.5 text-sm font-medium bg-[#007AFF] text-white">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-12 content-above-bubbles">{children}</main>

      {/* Footer - Semi-transparent */}
      <footer className="border-t border-white/30 bg-white/40 backdrop-blur-sm content-above-bubbles bubble-clickthrough">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ResearchMateLogo size={24} />
                <span className="font-semibold text-slate-900">ResearchMate</span>
              </div>
              <p className="text-sm text-gray-500">
                Your research, everywhere.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: "Product",
                links: ["Features", "Literature Matrix", "Mobile OCR", "Pricing"],
              },
              {
                title: "Company",
                links: ["About", "Team", "Careers", "Press"],
              },
              {
                title: "Support",
                links: ["Help Center", "Contact", "Status", "Terms"],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              © 2024 ResearchMate. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
                Privacy
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
                Terms
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
