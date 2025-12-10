// ============================================
// ProductsPage.tsx - Products & Downloads Page
// ============================================

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Badge } from "./UIComponents";
import {
  Chrome,
  Smartphone,
  Globe,
  PenTool,
  Download,
  CheckCircle2,
  ArrowRight,
  Zap,
  Cloud,
  Lock,
  RefreshCw,
  Layers,
  Sparkles,
  BookOpen,
  FolderOpen,
  BarChart2,
  Bell,
  ExternalLink,
} from "lucide-react";

// ============================================
// PART 1: PRODUCT DATA
// ============================================

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  status: "available" | "coming_soon" | "beta";
  features: string[];
  downloadUrl?: string;
  learnMoreUrl?: string;
  isExternal?: boolean;
}

const products: Product[] = [
  {
    id: "extension",
    name: "Browser Extension",
    tagline: "Capture research from any webpage",
    description:
      "Highlight any text on the web and save it instantly. Our Chrome extension captures the content, source URL, and metadata â€” then syncs it to your dashboard in real-time.",
    icon: Chrome,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    status: "available",
    features: [
      "One-click text capture",
      "Automatic source tracking",
      "AI-powered summarization",
      "Tag suggestions",
      "Real-time sync to web app",
      "Works on any website",
    ],
    downloadUrl:
      "https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh",
    learnMoreUrl: "/products#extension",
    isExternal: true,
  },
  {
    id: "webapp",
    name: "Web Application",
    tagline: "Your research command center",
    description:
      "Access all your research from anywhere. Organize with collections, generate citations, chat with AI about your research, and export to any format.",
    icon: Globe,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    status: "available",
    features: [
      "Dashboard with real-time sync",
      "Collections & organization",
      "AI-powered insights",
      "Citation generator (APA, MLA, etc.)",
      "Export to JSON, CSV, TXT",
      "Dark mode support",
    ],
    downloadUrl: "/login",
    learnMoreUrl: "/products#webapp",
  },
  {
    id: "mobile",
    name: "Mobile App",
    tagline: "Research on the go",
    description:
      "Capture ideas, articles, and notes from your phone. Perfect for when inspiration strikes away from your desk. Syncs seamlessly with your other devices.",
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    status: "coming_soon",
    features: [
      "Share extension integration",
      "Camera OCR for documents",
      "Offline mode",
      "Push notifications",
      "Quick capture widget",
      "Cross-platform (iOS & Android)",
    ],
  },
  {
    id: "smartpen",
    name: "Smart Pen",
    tagline: "Bridge analog and digital",
    description:
      "Write naturally with pen and paper, and watch your notes appear digitally. Our smart pen integration uses OCR to convert handwritten notes into searchable text.",
    icon: PenTool,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    status: "coming_soon",
    features: [
      "Handwriting to text (OCR)",
      "Automatic sync on dock",
      "Preserve original scans",
      "Search handwritten notes",
      "AI summarization",
      "Compatible with popular smart pens",
    ],
  },
];

// ============================================
// PART 2: FEATURES DATA
// ============================================

const coreFeatures = [
  {
    icon: Cloud,
    title: "Real-time Sync",
    description: "Your research syncs instantly across all devices",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Get summaries, insights, and smart organization",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "Your data stays yours with end-to-end encryption",
  },
  {
    icon: Layers,
    title: "Multi-Platform",
    description: "Works on browser, web, mobile, and smart pen",
  },
];

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const ProductsPage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-200 via-gray-50 to-gray-50 dark:from-primary-900/20 dark:via-gray-950 dark:to-gray-950 -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 px-4 py-1 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            The Complete Research Ecosystem
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600">
            Our Products
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A suite of tools designed to capture, organize, and understand your
            research â€” no matter where you are or how you work.
          </p>
        </div>
      </section>

      {/* Core Features Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {coreFeatures.map((feature, idx) => (
            <div key={idx} className="text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 mx-auto mb-3">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {products.map((product) => (
            <Card
              key={product.id}
              id={product.id}
              className={`p-6 transition-all hover:shadow-lg ${
                selectedProduct === product.id ? "ring-2 ring-primary-500" : ""
              }`}
              onClick={() =>
                setSelectedProduct(
                  selectedProduct === product.id ? null : product.id
                )
              }
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 ${product.bgColor} rounded-xl flex items-center justify-center`}
                  >
                    <product.icon className={`w-7 h-7 ${product.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {product.name}
                    </h3>
                    <p className="text-gray-500 text-sm">{product.tagline}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    product.status === "available"
                      ? "success"
                      : product.status === "beta"
                      ? "warning"
                      : "default"
                  }
                >
                  {product.status === "available"
                    ? "Available"
                    : product.status === "beta"
                    ? "Beta"
                    : "Coming Soon"}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {product.description}
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {product.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {product.status === "available" &&
                  product.downloadUrl &&
                  (product.isExternal ? (
                    <a
                      href={product.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  ) : (
                    <Link to={product.downloadUrl} className="flex-1">
                      <Button className="w-full">
                        {product.id === "webapp" ? (
                          <>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Open App
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </Link>
                  ))}
                {product.status === "coming_soon" && (
                  <Button variant="outline" className="flex-1" disabled>
                    <Bell className="w-4 h-4 mr-2" />
                    Notify Me
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Extension Detailed Section */}
      <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Most Popular
              </Badge>
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                Browser Extension
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The fastest way to save research. Just highlight any text on any
                webpage and click â€” ResearchMate handles the rest.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      One-Click Capture
                    </h4>
                    <p className="text-sm text-gray-500">
                      Highlight text, click the extension, done. No forms, no
                      friction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Instant Sync
                    </h4>
                    <p className="text-sm text-gray-500">
                      Your captures appear in the web app immediately via
                      real-time sync.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      AI Enhancement
                    </h4>
                    <p className="text-sm text-gray-500">
                      Get instant summaries and smart tags generated
                      automatically.
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg">
                  <Chrome className="w-5 h-5 mr-2" />
                  Add to Chrome â€” It's Free
                </Button>
              </a>
            </div>

            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-8 flex items-center justify-center">
                <div className="text-center text-white">
                  <Chrome className="w-20 h-20 mx-auto mb-4 opacity-90" />
                  <p className="text-xl font-semibold">Extension Preview</p>
                  <p className="text-blue-100 text-sm mt-2">
                    Screenshot coming soon
                  </p>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg">
                <span className="text-sm font-semibold text-green-600">
                  âœ“ Free
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Web App Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <div className="aspect-video bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-2xl p-8 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
                  <FolderOpen className="w-8 h-8 text-white mb-2" />
                  <p className="text-white text-sm font-medium">Collections</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
                  <Sparkles className="w-8 h-8 text-white mb-2" />
                  <p className="text-white text-sm font-medium">AI Assistant</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
                  <BookOpen className="w-8 h-8 text-white mb-2" />
                  <p className="text-white text-sm font-medium">Citations</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
                  <BarChart2 className="w-8 h-8 text-white mb-2" />
                  <p className="text-white text-sm font-medium">Statistics</p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Full Featured
            </Badge>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
              Web Application
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your research command center. View everything you've saved,
              organize with collections, generate citations, and get AI-powered
              insights.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Dashboard with real-time sync from all devices",
                "Create collections to organize by project or topic",
                "Generate citations in APA, MLA, Chicago, and more",
                "AI assistant trained on your research",
                "Export your data anytime in multiple formats",
                "Beautiful dark mode for late-night research",
              ].map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>

            <Link to="/login">
              <Button size="lg">
                <ArrowRight className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We're constantly expanding the ResearchMate ecosystem
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Mobile App */}
          <Card className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mobile App
                </h3>
                <Badge>Coming Q2 2025</Badge>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Capture research on the go with our native iOS and Android apps.
              Perfect for saving articles, taking quick notes, and staying
              synced.
            </p>
            <Button variant="outline" size="sm" disabled>
              <Bell className="w-4 h-4 mr-2" />
              Get Notified
            </Button>
          </Card>

          {/* Smart Pen */}
          <Card className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <PenTool className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Smart Pen Integration
                </h3>
                <Badge>Coming Q3 2025</Badge>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Bridge the gap between analog and digital. Write with a smart pen
              and have your notes automatically digitized with OCR.
            </p>
            <Button variant="outline" size="sm" disabled>
              <Bell className="w-4 h-4 mr-2" />
              Get Notified
            </Button>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Card className="p-8 md:p-12 bg-gradient-to-r from-primary-600 to-purple-600 border-0">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Research?
          </h2>
          <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
            Join thousands of students and researchers who use ResearchMate to
            stay organized and work smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Create Free Account
              </Button>
            </Link>
            <a
              href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                <Chrome className="w-5 h-5 mr-2" />
                Download Extension
              </Button>
            </a>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default ProductsPage;
