// ============================================
// CTA SECTION - Final call-to-action banner
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

// No external props — self-contained section

// ============================================
// PART 3: COMPONENT
// ============================================

const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-white/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="theme-title text-3xl md:text-5xl font-bold text-gray-900 mb-6">
          Ready to transform your research?
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Join thousands of researchers who've already upgraded their workflow.
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
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default CTASection;
