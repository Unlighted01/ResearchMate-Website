// ============================================
// SUPPORT PAGE - Help & Contact
// ============================================

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  FileText,
  Chrome,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Bug,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";

const SupportPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I install the browser extension?",
      answer:
        "Visit the Chrome Web Store and search for 'ResearchMate' or click the 'Add to Chrome' button on our Products page. Once installed, you'll see the ResearchMate icon in your browser toolbar.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes! Your data is encrypted and stored securely using Supabase. We never sell or share your personal information. You can delete your data at any time from the Settings page.",
    },
    {
      question: "How does AI summarization work?",
      answer:
        "Our AI analyzes the text you've saved and generates concise summaries highlighting key points. The AI runs on secure servers and doesn't store your content after processing.",
    },
    {
      question: "Can I use ResearchMate offline?",
      answer:
        "The browser extension supports offline mode for viewing previously saved items. New saves will sync automatically once you're back online.",
    },
    {
      question: "How do I sync across devices?",
      answer:
        "Simply sign in with the same account on all your devices. Your research library syncs automatically in real-time across the browser extension, web dashboard, and mobile app.",
    },
    {
      question: "Is there a free plan?",
      answer:
        "Yes! ResearchMate offers a generous free tier with core features. Premium plans unlock additional AI credits, unlimited storage, and advanced features.",
    },
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email within 24 hours",
      action: "netnetku21@gmail.com",
      href: "mailto:netnetku21@gmail.com",
      color: "#007AFF",
    },
    {
      icon: Bug,
      title: "Report a Bug",
      description: "Found an issue? Let us know",
      action: "GitHub Issues",
      href: "https://github.com/Unlighted01/ResearchMate-Website/issues",
      color: "#FF3B30",
    },
    {
      icon: Lightbulb,
      title: "Feature Request",
      description: "Suggest new features",
      action: "Submit Idea",
      href: "mailto:netnetku21@gmail.com?subject=Feature%20Request",
      color: "#FF9500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="relative pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-lg mb-8">
              <HelpCircle className="w-4 h-4 text-[#007AFF]" />
              <span className="text-sm font-medium text-gray-700">
                Help Center
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              <span className="text-gray-900">How can we </span>
              <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
                help you?
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions or reach out to our support team.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-md rounded-xl border border-white/50 hover:bg-white/70 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                <Chrome className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Get Extension</p>
                <p className="text-sm text-gray-500">Chrome Web Store</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>

            <Link
              to="/app/dashboard"
              className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-md rounded-xl border border-white/50 hover:bg-white/70 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 bg-[#5856D6]/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#5856D6]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Dashboard</p>
                <p className="text-sm text-gray-500">Access your research</p>
              </div>
            </Link>

            <a
              href="mailto:netnetku21@gmail.com"
              className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-md rounded-xl border border-white/50 hover:bg-white/70 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#34C759]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Contact Us</p>
                <p className="text-sm text-gray-500">Get in touch</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white/50 backdrop-blur-md rounded-xl border border-white/50 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/30 transition-colors"
                >
                  <span className="font-medium text-gray-900">
                    {faq.question}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Options */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Need More Help?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {contactOptions.map((option, idx) => (
              <a
                key={idx}
                href={option.href}
                target={option.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  option.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="group p-6 bg-white/50 backdrop-blur-md rounded-2xl border border-white/50 hover:bg-white/70 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${option.color}15` }}
                >
                  <option.icon
                    className="w-6 h-6"
                    style={{ color: option.color }}
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {option.description}
                </p>
                <span
                  className="text-sm font-medium"
                  style={{ color: option.color }}
                >
                  {option.action} →
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Still have questions?
              </h3>
              <p className="text-lg opacity-90 mb-6 max-w-lg mx-auto">
                Our team is here to help. Reach out and we'll get back to you as
                soon as possible.
              </p>
              <a href="mailto:netnetku21@gmail.com">
                <button className="px-8 py-3 bg-white text-[#007AFF] font-semibold rounded-full hover:bg-gray-100 transition-all active:scale-95">
                  Contact Support
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
