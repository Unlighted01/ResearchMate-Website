// ============================================
// MARKETING HOME - Single Page with All Sections
// Combines Landing, Products, and Team sections
// ============================================

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimateOnScroll } from "../shared/AnimateOnScroll";
import { supabase } from "../../services/supabaseClient";
import {
  Zap,
  Smartphone,
  PenTool,
  Layers,
  Shield,
  RefreshCw,
  ArrowRight,
  Chrome,
  Sparkles,
  Globe,
  CheckCircle2,
  Cloud,
  Check,
  Download,
  ExternalLink,
  Star,
  Github,
  Linkedin,
  Mail,
  Heart,
  Target,
  Users,
  Lightbulb,
  GraduationCap,
  Code,
  Palette,
  Server,
} from "lucide-react";

// ============================================
// SECTION: HOME (Hero + Features + Ecosystem)
// ============================================

const HomeSection = () => {
  const features = [
    {
      icon: Zap,
      title: "AI-Powered Summaries",
      desc: "Instantly distill lengthy research into key insights with advanced AI.",
      color: "#007AFF",
    },
    {
      icon: RefreshCw,
      title: "Real-time Sync",
      desc: "Your research stays updated across all devices, automatically.",
      color: "#34C759",
    },
    {
      icon: Smartphone,
      title: "Multi-Platform",
      desc: "Access from browser extension, mobile app, or web dashboard.",
      color: "#5856D6",
    },
    {
      icon: PenTool,
      title: "Smart Pen Ready",
      desc: "Digitize handwritten notes with OCR-powered smart pen support.",
      color: "#FF9500",
    },
    {
      icon: Layers,
      title: "Smart Collections",
      desc: "AI-generated tags and intelligent organization for your research.",
      color: "#AF52DE",
    },
    {
      icon: Shield,
      title: "Privacy First",
      desc: "Your data is encrypted and never shared. You own your research.",
      color: "#FF3B30",
    },
  ];

  return (
    <section id="home" className="scroll-mt-12">
      {/* Hero */}
      <div className="relative min-h-[90vh] flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-lg mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-[#007AFF]" />
            <span className="text-sm font-medium text-gray-700">
              Now with Smart Pen Integration
            </span>
          </div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-gray-900">Your Research.</span>
            <br />
            <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
              Everywhere.
            </span>
          </h1>

          <p
            className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Capture, organize, and understand your research across all your
            devices with AI-powered insights.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link to="/signup">
              <button className="group flex items-center gap-2 px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]">
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <button
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex items-center gap-2 px-8 py-4 bg-white/70 backdrop-blur-md text-gray-900 font-medium rounded-full border border-white/50 shadow-lg hover:bg-white/90 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Chrome className="w-4 h-4" />
              Download Extension
            </button>
          </div>

          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            {["Free to start", "No credit card required", "Cancel anytime"].map(
              (text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                  <span>{text}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for better research
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you capture, organize, and
              understand your research.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <AnimateOnScroll key={idx} delay={idx * 100} className="h-full">
                <div className="group h-full p-6 bg-white/50 backdrop-blur-md rounded-2xl border border-white/50 hover:bg-white/70 transition-all duration-300 hover-lift hover:shadow-xl">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon
                      className="w-6 h-6"
                      style={{ color: feature.color }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>

      {/* Ecosystem */}
      <div className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 backdrop-blur-md rounded-full text-purple-700 text-sm font-medium mb-6">
                <Globe className="w-4 h-4" />
                Ecosystem
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                One platform.
                <br />
                Every device.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Research flows seamlessly between your browser, phone, and desk.
                Save an article on your laptop, annotate it on your phone, and
                reference it anywhere.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: Chrome,
                    name: "Browser Extension",
                    desc: "Save and highlight while you browse",
                    status: "Available",
                  },
                  {
                    icon: Smartphone,
                    name: "Mobile App",
                    desc: "Research on the go with iOS & Android",
                    status: "Coming Soon",
                  },
                  {
                    icon: PenTool,
                    name: "Smart Pen",
                    desc: "Digitize handwritten notes instantly",
                    status: "Beta",
                  },
                ].map((device, idx) => (
                  <AnimateOnScroll
                    key={idx}
                    delay={idx * 150}
                    animation="fade-in"
                  >
                    <div className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-md rounded-xl border border-white/50 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-300 hover-lift">
                      <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                        <device.icon className="w-5 h-5 text-[#007AFF]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {device.name}
                        </h4>
                        <p className="text-sm text-gray-500">{device.desc}</p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          device.status === "Available"
                            ? "bg-green-500/10 text-green-700"
                            : device.status === "Beta"
                              ? "bg-orange-500/10 text-orange-700"
                              : "bg-gray-500/10 text-gray-600"
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                  </AnimateOnScroll>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                    <span className="text-4xl font-bold text-white">R</span>
                  </div>
                  <p className="text-gray-600 font-medium">
                    Synced across all devices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// SECTION: PRODUCTS
// ============================================

const ProductsSection = () => {
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
    <section id="products" className="scroll-mt-12">
      {/* Hero */}
      <div className="relative pt-24 pb-16 px-6">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            One ecosystem.
            <br />
            <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
              Every device.
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            ResearchMate works seamlessly across your browser, phone, and desk.
            Your research flows with you.
          </p>

          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: "4", label: "Products" },
              { value: "10K+", label: "Users" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/50 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/50"
              >
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="py-20 px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {products.map((product, idx) => (
              <AnimateOnScroll key={product.id} delay={idx * 150}>
                <div className="group bg-white/50 backdrop-blur-md rounded-3xl p-8 hover:bg-white/70 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 border border-white/50 hover-lift">
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
                            : "bg-gray-500/10 text-gray-600"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  <p
                    className="text-sm font-medium mb-3"
                    style={{ color: product.color }}
                  >
                    {product.tagline}
                  </p>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {product.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <Check
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: product.color }}
                        />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>

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
                    <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-gray-500/10 text-gray-600 transition-all active:scale-[0.98]">
                      {product.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>

      {/* Features Bar */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-white/50">
                  <feature.icon className="w-6 h-6 text-[#007AFF]" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Extension Spotlight */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
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
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  Get the Browser Extension
                </h3>
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
      </div>
    </section>
  );
};

// ============================================
// SECTION: TEAM
// ============================================

const TeamSection = () => {
  const teamMembers = [
    {
      name: "Kian",
      role: "Founder & Full-Stack Developer",
      bio: "Passionate about building tools that help researchers and students organize their knowledge. Leading the development of ResearchMate from concept to reality.",
      avatar: "K",
      gradient: "from-[#007AFF] to-[#5856D6]",
      skills: ["React", "TypeScript", "Node.js", "Supabase", "AI"],
      social: {
        github: "https://github.com",
        linkedin: "https://linkedin.com",
        email: "mailto:hello@researchmate.app",
      },
    },
  ];

  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description:
        "We believe everyone deserves powerful research tools, not just those at well-funded institutions.",
      color: "#007AFF",
    },
    {
      icon: Users,
      title: "User-First",
      description:
        "Every feature we build starts with understanding how researchers actually work.",
      color: "#5856D6",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description:
        "We leverage cutting-edge AI to make research organization smarter, not harder.",
      color: "#FF9500",
    },
    {
      icon: Heart,
      title: "Privacy Focused",
      description:
        "Your research is yours. We never sell data or compromise on security.",
      color: "#FF3B30",
    },
  ];

  const milestones = [
    { year: "2024", event: "ResearchMate founded", color: "#007AFF" },
    { year: "2024", event: "Browser extension launched", color: "#34C759" },
    { year: "2024", event: "AI summaries released", color: "#5856D6" },
    { year: "2025", event: "Mobile app (Coming)", color: "#FF9500" },
  ];

  return (
    <section id="team" className="scroll-mt-12">
      {/* Hero */}
      <div className="relative pt-24 pb-16 px-6">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-lg mb-8">
            <Sparkles className="w-4 h-4 text-[#5856D6]" />
            <span className="text-sm font-medium text-gray-700">
              We're hiring!
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="text-gray-900">Meet the</span>
            <br />
            <span className="bg-gradient-to-r from-[#5856D6] via-[#AF52DE] to-[#FF2D55] bg-clip-text text-transparent">
              Team
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're building the future of research management — one feature at a
            time. Our small but passionate team is dedicated to helping
            researchers work smarter.
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="py-20 px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Our Story
              </h3>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  ResearchMate started from a simple frustration: as students
                  and researchers, we found ourselves drowning in bookmarks,
                  scattered notes, and endless browser tabs.
                </p>
                <p>
                  We dreamed of a tool that could capture research from anywhere
                  — our browser, our phone, even handwritten notes — and bring
                  it all together in one place with AI-powered insights.
                </p>
                <p>
                  Today, ResearchMate is that dream realized. Our ecosystem
                  includes a browser extension, web platform, mobile app, and
                  even smart pen integration — all synced in real-time.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                {milestones.map((milestone, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: milestone.color }}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {milestone.year}
                    </span>
                    <span className="text-sm text-gray-500">
                      {milestone.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: GraduationCap,
                  title: "For Students",
                  subtitle: "& Academics",
                  color: "#007AFF",
                },
                {
                  icon: Code,
                  title: "Open Source",
                  subtitle: "Minded",
                  color: "#5856D6",
                },
                {
                  icon: Server,
                  title: "Self-Hosted",
                  subtitle: "Option",
                  color: "#34C759",
                },
                {
                  icon: Palette,
                  title: "Modern UI",
                  subtitle: "Dark Mode",
                  color: "#FF9500",
                },
              ].map((card, idx) => (
                <AnimateOnScroll key={idx} delay={idx * 100}>
                  <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 text-center hover:bg-white/70 hover:shadow-lg transition-all border border-white/50 hover-lift h-full">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: `${card.color}15` }}
                    >
                      <card.icon
                        className="w-6 h-6"
                        style={{ color: card.color }}
                      />
                    </div>
                    <p className="font-bold text-gray-900">{card.title}</p>
                    <p className="text-sm text-gray-500">{card.subtitle}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              The People Behind ResearchMate
            </h3>
            <p className="text-gray-600">A small team with big ambitions</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-white/50 backdrop-blur-md rounded-3xl p-8 text-center hover:bg-white/70 hover:shadow-xl transition-all border border-white/50"
              >
                <div
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-lg`}
                >
                  {member.avatar}
                </div>

                <h4 className="text-xl font-bold text-gray-900 mb-1">
                  {member.name}
                </h4>
                <p className="text-sm font-medium text-[#007AFF] mb-4">
                  {member.role}
                </p>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  {member.bio}
                </p>

                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {member.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-500/10 text-gray-600 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex justify-center gap-2">
                  {member.social.github && (
                    <a
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name}'s GitHub profile`}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-500/10 transition-colors"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name}'s LinkedIn profile`}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-[#0077B5] hover:bg-blue-500/10 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.email && (
                    <a
                      href={member.social.email}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-[#FF3B30] hover:bg-red-500/10 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Join Us Card */}
            <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 text-center border-2 border-dashed border-gray-300/50 flex flex-col justify-center">
              <div className="w-24 h-24 rounded-3xl bg-gray-500/10 flex items-center justify-center text-gray-400 text-3xl mx-auto mb-6">
                ?
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                Join Our Team
              </h4>
              <p className="text-gray-600 text-sm mb-6">
                We're always looking for passionate people to help build the
                future of research.
              </p>
              <a
                href="mailto:hello@researchmate.app"
                className="inline-flex items-center justify-center gap-2 text-[#007AFF] font-medium hover:underline"
              >
                Get in touch
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="py-20 px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Values
            </h3>
            <p className="text-gray-600">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <div
                key={idx}
                className="bg-white/50 backdrop-blur-md rounded-2xl p-6 text-center hover:bg-white/70 hover:shadow-lg transition-all border border-white/50"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${value.color}15` }}
                >
                  <value.icon
                    className="w-7 h-7"
                    style={{ color: value.color }}
                  />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#5856D6] to-[#AF52DE] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Have Questions?
              </h3>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                We'd love to hear from you. Whether it's feedback, feature
                requests, or just saying hi — drop us a line.
              </p>
              <a href="mailto:hello@researchmate.app">
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#5856D6] font-semibold rounded-full hover:bg-gray-100 transition-all active:scale-95">
                  <Mail className="w-5 h-5" />
                  Contact Us
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const MarketingHome = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) navigate("/app/dashboard", { replace: true });
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HomeSection />
      <ProductsSection />
      <TeamSection />

      {/* Final CTA */}
      <section className="py-24 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to transform your research?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of researchers who've already upgraded their
            workflow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <button className="group flex items-center gap-2 px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]">
                Start for Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <button
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-8 py-4 text-[#007AFF] font-medium rounded-full hover:bg-blue-500/10 transition-all duration-300"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarketingHome;
