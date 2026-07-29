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

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && mounted) {
          navigate("/app/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    checkAuth();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FAFBFD]">
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
