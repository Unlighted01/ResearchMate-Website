// ============================================
// PRODUCTS PAGE - Apple Design
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import {
  Chrome,
  Smartphone,
  PenTool,
  Globe,
  Zap,
  Shield,
  RefreshCw,
  Cloud,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Star,
} from "lucide-react";

const ProductsPage = () => {
  const products = [
    {
      id: "extension",
      name: "Browser Extension",
      tagline: "Research while you browse",
      description:
        "Capture highlights, save articles, and generate AI summaries directly from any webpage. Works seamlessly with Chrome, Firefox, and Edge.",
      icon: Chrome,
      color: "#007AFF",
      gradient: "from-[#007AFF] to-[#0051D5]",
      status: "Available",
      features: [
        "One-click save from any website",
        "Highlight and annotate text",
        "AI-powered summaries",
        "Auto-sync to cloud",
        "Keyboard shortcuts",
        "Context menu integration",
      ],
      cta: "Add to Chrome",
      ctaLink:
        "https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh",
    },
    {
      id: "mobile",
      name: "Mobile App",
      tagline: "Research on the go",
      description:
        "Access your entire research library from your pocket. Capture content, take photos, and sync seamlessly with your other devices.",
      icon: Smartphone,
      color: "#5856D6",
      gradient: "from-[#5856D6] to-[#AF52DE]",
      status: "Coming Soon",
      features: [
        "Full research library access",
        "Offline mode support",
        "Camera capture with OCR",
        "Push notifications",
        "Share extension integration",
        "Widget for quick access",
      ],
      cta: "Join Waitlist",
      ctaLink: "#",
    },
    {
      id: "smartpen",
      name: "Smart Pen",
      tagline: "Handwriting meets digital",
      description:
        "Bridge the gap between paper and digital. Your handwritten notes are automatically digitized, transcribed, and synced to your library.",
      icon: PenTool,
      color: "#FF9500",
      gradient: "from-[#FF9500] to-[#FF6B00]",
      status: "Beta",
      features: [
        "Real-time sync while writing",
        "OCR text recognition",
        "Sketch and diagram support",
        "Multiple pen compatibility",
        "Cloud backup",
        "Search handwritten notes",
      ],
      cta: "Join Beta",
      ctaLink: "#",
    },
    {
      id: "web",
      name: "Web Dashboard",
      tagline: "Your research command center",
      description:
        "The central hub for all your research. Organize, search, and analyze your entire library with powerful tools and AI assistance.",
      icon: Globe,
      color: "#34C759",
      gradient: "from-[#34C759] to-[#30D158]",
      status: "Available",
      features: [
        "Unified research library",
        "Advanced search & filters",
        "Collections & tags",
        "AI assistant chat",
        "Citation generator",
        "Statistics & insights",
      ],
      cta: "Open Dashboard",
      ctaLink: "/app/dashboard",
    },
  ];

  const features = [
    {
      icon: RefreshCw,
      title: "Real-time Sync",
      description: "Changes sync instantly across all your devices",
    },
    {
      icon: Zap,
      title: "AI Powered",
      description: "Intelligent summaries and insights from your research",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data is encrypted and never shared",
    },
    {
      icon: Cloud,
      title: "Cloud Storage",
      description: "Access your research from anywhere, anytime",
    },
  ];

  return (
    <div className="overflow-hidden">
      {/* ========== HERO ========== */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="absolute inset-0 bg-[#F5F5F7] dark:bg-black">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-100/50 via-transparent to-transparent dark:from-purple-900/20" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            One ecosystem.
            <br />
            <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
              Every device.
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            ResearchMate works seamlessly across your browser, phone, and desk.
            Your research flows with you.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: "4", label: "Products" },
              { value: "10K+", label: "Users" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat, idx) => (
              <div key={idx}>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRODUCTS GRID ========== */}
      <section className="py-20 px-6 bg-white dark:bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-3xl p-8 hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 transition-all duration-500"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.gradient} flex items-center justify-center shadow-lg`}
                    style={{ boxShadow: `0 8px 24px ${product.color}30` }}
                  >
                    <product.icon className="w-7 h-7 text-white" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                      product.status === "Available"
                        ? "bg-[#34C759]/10 text-[#34C759]"
                        : product.status === "Beta"
                        ? "bg-[#FF9500]/10 text-[#FF9500]"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {product.name}
                </h3>
                <p
                  className="text-sm font-medium mb-3"
                  style={{ color: product.color }}
                >
                  {product.tagline}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {product.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {product.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <Check
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: product.color }}
                      />
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {product.status === "Available" ? (
                  product.id === "web" ? (
                    <Link to={product.ctaLink}>
                      <button
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-all active:scale-[0.98]"
                        style={{ backgroundColor: product.color }}
                      >
                        {product.cta}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                  ) : (
                    <a
                      href={product.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-all active:scale-[0.98]"
                        style={{ backgroundColor: product.color }}
                      >
                        {product.cta}
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </a>
                  )
                ) : (
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-[0.98]">
                    {product.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES BAR ========== */}
      <section className="py-16 px-6 bg-[#F5F5F7] dark:bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 bg-white dark:bg-[#1C1C1E] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <feature.icon className="w-6 h-6 text-[#007AFF]" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== EXTENSION SPOTLIGHT ========== */}
      <section className="py-20 px-6 bg-white dark:bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="text-sm font-medium opacity-90">
                    Featured Product
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Get the Browser Extension
                </h2>
                <p className="text-lg opacity-90 mb-6 max-w-lg">
                  The fastest way to save and organize research. One click to
                  capture any content from the web.
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="flex items-center gap-2 px-6 py-3 bg-white text-[#007AFF] font-semibold rounded-full hover:bg-gray-100 transition-all active:scale-95">
                    <Download className="w-5 h-5" />
                    Download for Chrome
                  </button>
                </a>
              </div>

              {/* Extension Preview */}
              <div className="w-full md:w-80 bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <span className="text-[#007AFF] font-bold">R</span>
                  </div>
                  <div>
                    <p className="font-semibold">ResearchMate</p>
                    <p className="text-xs opacity-75">Chrome Extension</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {["Save to library", "Generate summary", "Add tags"].map(
                    (action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-sm"
                      >
                        <Check className="w-4 h-4" />
                        {action}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="py-20 px-6 bg-[#F5F5F7] dark:bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to upgrade your research workflow?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Get started for free. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <button className="flex items-center gap-2 px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/team">
              <button className="px-8 py-4 text-[#007AFF] font-medium rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                Meet the Team
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductsPage;
