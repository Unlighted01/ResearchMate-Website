import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Badge } from "../shared/UIComponents";
import { supabase } from "../../services/supabaseClient";
import {
  Zap,
  Smartphone,
  PenTool,
  Layout as LayoutIcon,
  CheckCircle2,
  Lock,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-200 via-gray-50 to-gray-50 dark:from-primary-900/20 dark:via-gray-950 dark:to-gray-950 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge className="mb-6 px-4 py-1 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            New: Smart Pen Integration Available 🚀
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 pb-2">
            Your Research,
            <br />
            Everywhere
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Capture, organize, and understand your research across all your
            devices with AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="rounded-full px-8 w-full sm:w-auto">
                Try Web App
              </Button>
            </Link>
            <Link to="/products">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 w-full sm:w-auto"
              >
                Download Extension
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "AI-Powered Summaries",
              desc: "Get instant 2-3 sentence summaries.",
            },
            {
              icon: Smartphone,
              title: "Multi-device Access",
              desc: "Sync across extension, mobile, and web.",
            },
            {
              icon: PenTool,
              title: "Smart Pen Integration",
              desc: "Digitize handwritten notes instantly.",
            },
            {
              icon: LayoutIcon,
              title: "Smart Organization",
              desc: "AI-generated tags and collections.",
            },
            {
              icon: CheckCircle2,
              title: "Real-time Sync",
              desc: "Research updates across devices instantly.",
            },
            {
              icon: Lock,
              title: "Secure & Private",
              desc: "End-to-end encryption standard.",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
