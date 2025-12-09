// ============================================
// TeamPage.tsx - Team & About Page
// ============================================

import React from "react";
import { Card } from "./UIComponents";
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
} from "lucide-react";

// ============================================
// PART 1: TYPES
// ============================================

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  skills: string[];
  social?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

// ============================================
// PART 2: TEAM DATA
// ============================================

// Update this with your actual team information!
const teamMembers: TeamMember[] = [
  {
    name: "Kian",
    role: "Founder & Full-Stack Developer",
    bio: "Passionate about building tools that help researchers and students organize their knowledge. Leading the development of ResearchMate from concept to reality.",
    avatar: "K",
    skills: ["React", "TypeScript", "Node.js", "Supabase", "AI Integration"],
    social: {
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      email: "mailto:hello@researchmate.app",
    },
  },
  // Add more team members here as your team grows!
  // {
  //   name: "Team Member",
  //   role: "Role",
  //   bio: "Bio...",
  //   avatar: "T",
  //   skills: ["Skill 1", "Skill 2"],
  // },
];

// ============================================
// PART 3: VALUES DATA
// ============================================

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "We believe everyone deserves powerful research tools, not just those at well-funded institutions.",
  },
  {
    icon: Users,
    title: "User-First",
    description:
      "Every feature we build starts with understanding how researchers actually work.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We leverage cutting-edge AI to make research organization smarter, not harder.",
  },
  {
    icon: Heart,
    title: "Privacy Focused",
    description:
      "Your research is yours. We never sell data or compromise on security.",
  },
];

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const TeamPage: React.FC = () => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-200 via-gray-50 to-gray-50 dark:from-purple-900/20 dark:via-gray-950 dark:to-gray-950 -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-primary-600 to-purple-600">
            Meet the Team
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            We're building the future of research management — one feature at a
            time. Our small but passionate team is dedicated to helping
            researchers work smarter.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
              Our Story
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                ResearchMate started from a simple frustration: as students and
                researchers, we found ourselves drowning in bookmarks, scattered
                notes, and endless browser tabs.
              </p>
              <p>
                We dreamed of a tool that could capture research from anywhere —
                our browser, our phone, even handwritten notes — and bring it
                all together in one place with AI-powered insights.
              </p>
              <p>
                Today, ResearchMate is that dream realized. Our ecosystem
                includes a browser extension, web platform, mobile app, and even
                smart pen integration — all synced in real-time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 text-center bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800">
              <GraduationCap className="w-8 h-8 text-primary-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                For Students
              </div>
              <p className="text-sm text-gray-500 mt-1">& Academics</p>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800">
              <Code className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                Open Source
              </div>
              <p className="text-sm text-gray-500 mt-1">Minded</p>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
              <Server className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                Self-Hosted
              </div>
              <p className="text-sm text-gray-500 mt-1">Backend Option</p>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800">
              <Palette className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                Modern UI
              </div>
              <p className="text-sm text-gray-500 mt-1">Dark Mode</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Members */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            The People Behind ResearchMate
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            A small team with big ambitions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {teamMembers.map((member, idx) => (
            <Card
              key={idx}
              className="p-6 text-center hover:shadow-lg transition-shadow"
            >
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {member.avatar}
              </div>

              {/* Info */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {member.name}
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm font-medium mb-3">
                {member.role}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {member.bio}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {member.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Social Links */}
              {member.social && (
                <div className="flex justify-center gap-3">
                  {member.social.github && (
                    <a
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.twitter && (
                    <a
                      href={member.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-sky-500 transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.email && (
                    <a
                      href={member.social.email}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </Card>
          ))}

          {/* Join Us Card */}
          <Card className="p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-3xl mx-auto mb-4">
              ?
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Join Our Team
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 mb-4">
              We're always looking for passionate people to help build the
              future of research.
            </p>
            <a
              href="mailto:hello@researchmate.app"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Get in touch →
            </a>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Our Values
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 mx-auto mb-4">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Card className="p-8 md:p-12 bg-gradient-to-r from-primary-600 to-purple-600 border-0">
          <h2 className="text-3xl font-bold text-white mb-4">
            Have Questions?
          </h2>
          <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
            We'd love to hear from you. Whether it's feedback, feature requests,
            or just saying hi — drop us a line.
          </p>
          <a
            href="mailto:hello@researchmate.app"
            className="inline-flex items-center px-6 py-3 bg-white text-primary-600 font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            <Mail className="w-5 h-5 mr-2" />
            Contact Us
          </a>
        </Card>
      </section>
    </div>
  );
};

export default TeamPage;
