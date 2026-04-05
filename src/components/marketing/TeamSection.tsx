// ============================================
// TEAM SECTION - Team members, story, values, and team CTA
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  Sparkles,
  ArrowRight,
  Mail,
  Heart,
  Target,
  Users,
  Lightbulb,
  GraduationCap,
  Code,
  Palette,
  Server,
  Facebook,
} from "lucide-react";
import { AnimateOnScroll } from "../shared/AnimateOnScroll";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  gradient: string;
  skills: string[];
  social: {
    facebook?: string;
    email?: string;
  };
}

interface Value {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

interface Milestone {
  year: string;
  event: string;
  color: string;
}

interface AboutCard {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Kenneth Ian Ramos Uson",
    role: "Founder & Full-Stack Developer",
    bio: "Passionate about building tools that help researchers and students organize their knowledge. Leading the development of ResearchMate from concept to reality.",
    avatar: "K",
    gradient: "from-[#007AFF] to-[#5856D6]",
    skills: ["React", "TypeScript", "Node.js", "Supabase", "AI"],
    social: {
      facebook: "#",
      email: "mailto:kera.uson.up@phinmaed.com",
    },
  },
  {
    name: "Jhazell Tantay Elcano",
    role: "Co-Founder / Researcher",
    bio: "Dedicated to improving the research workflow through innovative tools and ensuring our product meets the needs of modern students.",
    avatar: "J",
    gradient: "from-[#5856D6] to-[#AF52DE]",
    skills: ["Research", "Product Strategy", "User Experience"],
    social: {
      facebook: "#",
      email: "mailto:jhta.elcano.up@phinmaed.com",
    },
  },
  {
    name: "Xyrhielle Mhie Maramba Honrado",
    role: "Co-Founder / UI Designer",
    bio: "Focused on creating intuitive and beautiful interfaces that make organizing complex research a delightful experience.",
    avatar: "X",
    gradient: "from-[#AF52DE] to-[#FF2D55]",
    skills: ["UI/UX Design", "Figma", "User Research"],
    social: {
      facebook: "#",
      email: "mailto:xyma.honrado.up@phinmaed.com",
    },
  },
  {
    name: "Kyla Shane Vinluan Payas",
    role: "Co-Founder / QA Engineer",
    bio: "Ensuring ResearchMate is bug-free, reliable, and smooth across all platforms before it reaches our users' hands.",
    avatar: "K",
    gradient: "from-[#FF9500] to-[#FF3B30]",
    skills: ["Quality Assurance", "Testing", "Product Management"],
    social: {
      facebook: "#",
      email: "mailto:kyvi.payas.up@phinmaed.com",
    },
  },
  {
    name: "Yiesha Bataller Soriano",
    role: "Co-Founder / Marketing & Strategy",
    bio: "Crafting narratives and outreach strategies that connect ResearchMate with academics and students across the globe.",
    avatar: "Y",
    gradient: "from-[#34C759] to-[#30D158]",
    skills: ["Marketing", "Strategy", "Public Relations"],
    social: {
      facebook: "#",
      email: "mailto:yiba.soriano.up@phinmaed.com",
    },
  },
];

const VALUES: Value[] = [
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

const MILESTONES: Milestone[] = [
  { year: "2024", event: "ResearchMate founded", color: "#007AFF" },
  { year: "2024", event: "Browser extension launched", color: "#34C759" },
  { year: "2024", event: "AI summaries released", color: "#5856D6" },
  { year: "2025", event: "Mobile app (Coming)", color: "#FF9500" },
];

const ABOUT_CARDS: AboutCard[] = [
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
];

// ============================================
// PART 4: COMPONENT
// ============================================

const TeamSection: React.FC = () => {
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

          <h2 className="theme-title text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
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
              <h3 className="theme-title text-3xl font-bold text-gray-900 mb-6">
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
                {MILESTONES.map((milestone, idx) => (
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
              {ABOUT_CARDS.map((card, idx) => (
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
            <h3 className="theme-title text-3xl font-bold text-gray-900 mb-4">
              The People Behind ResearchMate
            </h3>
            <p className="text-gray-600">A small team with big ambitions</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TEAM_MEMBERS.map((member, idx) => (
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
                  {member.social.facebook && (
                    <a
                      href={member.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name}'s Facebook profile`}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-[#1877F2] hover:bg-blue-500/10 transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.email && (
                    <a
                      href={member.social.email}
                      aria-label={`Email ${member.name}`}
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
            <h3 className="theme-title text-3xl font-bold text-gray-900 mb-4">
              Our Values
            </h3>
            <p className="text-gray-600">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((value, idx) => (
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

      {/* Team CTA */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#5856D6] to-[#AF52DE] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h3 className="theme-title text-3xl md:text-4xl font-bold mb-4">
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
// PART 5: EXPORTS
// ============================================

export default TeamSection;
