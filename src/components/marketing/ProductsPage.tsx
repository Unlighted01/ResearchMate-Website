// ============================================
// LANDING PAGE - Apple Design (Clean)
// ============================================

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";

const LandingPage = () => {
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
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Very subtle gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 30%, rgba(0, 122, 255, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 20%, rgba(88, 86, 214, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 50% 50% at 50% 80%, rgba(175, 82, 222, 0.05) 0%, transparent 50%)
            `,
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200/50 shadow-sm mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-[#007AFF]" />
            <span className="text-sm font-medium text-gray-700">
              Now with Smart Pen Integration
            </span>
          </div>

          {/* Headline */}
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

          {/* Subheadline */}
          <p
            className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Capture, organize, and understand your research across all your
            devices with AI-powered insights.
          </p>

          {/* CTAs */}
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
            <Link to="/products">
              <button className="flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-medium rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <Chrome className="w-4 h-4" />
                Download Extension
              </button>
            </Link>
          </div>

          {/* Trust Indicators */}
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
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for better research
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you capture, organize, and
              understand your research.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 bg-[#F5F5F7] rounded-2xl hover:bg-[#EBEBF0] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* ========== ECOSYSTEM SECTION ========== */}
      <section className="py-24 px-6 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full text-purple-700 text-sm font-medium mb-6">
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

              {/* Device List */}
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
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
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
                          ? "bg-green-100 text-green-700"
                          : device.status === "Beta"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {device.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 rounded-3xl flex items-center justify-center">
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
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-24 px-6 bg-white">
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
            <Link to="/products">
              <button className="px-8 py-4 text-[#007AFF] font-medium rounded-full hover:bg-blue-50 transition-all duration-300">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
