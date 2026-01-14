// ============================================
// PAIR SMART PEN PAGE
// Wrapper page for the SmartPenPairing modal
// ============================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import SmartPenPairing from "./SmartPenPairing";
import { PenTool, ArrowLeft } from "lucide-react";

const PairSmartPen: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const handleClose = () => {
    navigate("/app/smart-pen");
  };

  const handleSuccess = () => {
    // Navigate to smart pen gallery after successful pairing
    setTimeout(() => {
      navigate("/app/smart-pen");
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <button
          onClick={() => navigate("/app/smart-pen")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Smart Pen Gallery
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PenTool className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pair Your Smart Pen
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your ResearchMate Smart Pen to sync your handwritten notes
          </p>
        </div>
      </div>

      {/* Pairing Modal - Always open on this page */}
      <SmartPenPairing
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        userId={userId}
      />
    </div>
  );
};

export default PairSmartPen;
