// ============================================
// TEAM PAGE - Apple Design
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import {
  Github,
  Linkedin,
  Twitter,
  Mail,
  Heart,
  Target,
  Users,
  Lightbulb,
  GraduationCap,
  Code,
  Palette,
  Server,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// Team Data
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

const TeamPage = () => {
  return (
    <div className="overflow-hidden">
      {/* ========== HERO ========== */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="absolute inset-0 bg-[#F5F5F7] dark:bg-black">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-100/50 via-transparent to-transparent dark:from-purple-900/20" />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/10 backdrop-blur-lg rounded-full border border-gray-200/50 dark:border-gray-700/50 mb-8">
            <Sparkles className="w-4 h-4 text-[#5856D6]" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              We're hiring!
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="text-gray-900 dark:text-white">Meet the</span>
            <br />
            <span className="bg-gradient-to-r from-[#5856D6] via-[#AF52DE] to-[#FF2D55] bg-clip-text text-transparent">
              Team
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We're building the future of research management — one feature at a
            time. Our small but passionate team is dedicated to helping
            researchers work smarter.
          </p>
        </div>
      </section>

      {/* ========== OUR STORY ========== */}
      <section className="py-20 px-6 bg-white dark:bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
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

              {/* Timeline */}
              <div className="mt-8 space-y-4">
                {milestones.map((milestone, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: milestone.color }}
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {milestone.year}
                    </span>
                    <span className="text-sm text-gray-500">
                      {milestone.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
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
                <div
                  key={idx}
                  className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl p-6 text-center hover:shadow-lg transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon
                      className="w-6 h-6"
                      style={{ color: card.color }}
                    />
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {card.title}
                  </p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== TEAM MEMBERS ========== */}
      <section className="py-20 px-6 bg-[#F5F5F7] dark:bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              The People Behind ResearchMate
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              A small team with big ambitions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 text-center hover:shadow-xl transition-all"
              >
                {/* Avatar */}
                <div
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-lg`}
                >
                  {member.avatar}
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-sm font-medium text-[#007AFF] mb-4">
                  {member.role}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                  {member.bio}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {member.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Social */}
                <div className="flex justify-center gap-2">
                  {member.social.github && (
                    <a
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl text-gray-400 hover:text-[#0077B5] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.email && (
                    <a
                      href={member.social.email}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-[#FF3B30] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Join Us Card */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col justify-center">
              <div className="w-24 h-24 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-3xl mx-auto mb-6">
                ?
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Join Our Team
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
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
      </section>

      {/* ========== VALUES ========== */}
      <section className="py-20 px-6 bg-white dark:bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Our Values
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <div
                key={idx}
                className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl p-6 text-center hover:shadow-lg transition-all"
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="py-20 px-6 bg-[#F5F5F7] dark:bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#5856D6] to-[#AF52DE] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Have Questions?
              </h2>
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
      </section>
    </div>
  );
};

export default TeamPage;
