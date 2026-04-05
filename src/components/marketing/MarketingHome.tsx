// ============================================
// MARKETING HOME - Thin compositor for all marketing sections
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import ProductsSection from "./ProductsSection";
import TeamSection from "./TeamSection";
import CTASection from "./CTASection";

// ============================================
// PART 2: MAIN COMPONENT
// ============================================

const MarketingHome: React.FC = () => {
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
      <section id="home" className="scroll-mt-12">
        <HeroSection />
        <FeaturesSection />
      </section>
      <ProductsSection />
      <TeamSection />
      <CTASection />
    </div>
  );
};

// ============================================
// PART 3: EXPORTS
// ============================================

export default MarketingHome;
