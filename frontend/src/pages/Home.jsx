import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  Terminal,
  Shield,
  ShieldCheck,
  Zap,
  Award,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Volume2,
  VolumeX,
  QrCode,
  ArrowRight,
  Calendar,
  MapPin,
  Flame,
  FileCheck,
  Cpu,
  Coffee,
  Wifi,
  Sparkles,
} from 'lucide-react';

export const Home = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  // 3D Parallax & Mouse Movement States (Video Background Only)
  const [parallax, setParallax] = useState({ bgX: 0, bgY: 0 });
  const [isMoving, setIsMoving] = useState(false);

  // Video State (Continuous Background Loop, Mute/Unmute Toggle Only)
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  // Live Countdown to Dec 8, 2026, 5:00 PM IST
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2026-12-08T17:00:00+05:30').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subtle Mouse Parallax calculation for background video only (Text remains 100% stationary)
  const handleHeroMouseMove = (e) => {
    setIsMoving(true);
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);

    setParallax({
      bgX: x * -10,
      bgY: y * -10,
    });
  };

  const handleHeroMouseLeave = () => {
    setIsMoving(false);
    setParallax({ bgX: 0, bgY: 0 });
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: FULLSCREEN 3D PARALLAX VIDEO BACKGROUND */}
      {/* ========================================================================= */}
      <section
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-3 pb-6 perspective-1200"
      >
        {/* Fullscreen Video Background */}
        <div
          style={{
            transform: `scale(1.08) translate3d(${parallax.bgX}px, ${parallax.bgY}px, 0)`,
            transition: isMoving ? 'transform 0.1s ease-out' : 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        >
          <video
            ref={videoRef}
            src="/doomsday.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover brightness-100 contrast-105"
          />

          {/* Clean Vignette Layer (Maintains High Video Visibility while Enhancing Text Contrast) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06080e] via-black/35 to-black/55" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(6,8,14,0.45)_0%,_rgba(6,8,14,0.85)_85%)]" />
        </div>

        {/* Minimal Audio Toggle (Top Right Corner) */}
        <div className="absolute top-6 right-6 z-30">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-zinc-300 hover:text-white border border-white/20 transition-all backdrop-blur-xl shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* ===================================================================== */}
        {/* CENTERED HERO CONTENT (STATIC, STABLE & ROCK-SOLID CENTERED) */}
        {/* ===================================================================== */}
        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center px-4">
          {/* Standard Institutional Eyebrow */}
          <div className="flex flex-col items-center gap-1 mb-2 select-none">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-black/85 border border-emerald-500/35 text-[11px] sm:text-xs text-zinc-200 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">Adi Shankara (ASIET)</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300">Dept. of Computer Applications</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-semibold">TCS Collaboration</span>
            </div>
          </div>

          {/* Centered Main Title: Build Ops */}
          <div className="relative mb-1">
            <h1 className="poster-title-halftone text-4xl sm:text-6xl md:text-7xl lg:text-[5.8rem] font-black tracking-tight text-white select-none leading-none drop-shadow-[0_15px_40px_rgba(0,0,0,0.95)]">
              Build Ops
            </h1>
          </div>

          {/* Event Subheading & High-Contrast Time/Date Specs Capsule */}
          <div className="flex flex-col items-center gap-1.5 mb-3.5">
            <p className="text-xs sm:text-sm md:text-base font-bold text-white tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              The 12-Hour Buildathon
            </p>

            {/* High-Contrast Floating Capsule (Overcomes video background brightness) */}
            <div className="inline-flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-1.5 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.95)] text-[11px] sm:text-xs text-white flex-wrap justify-center">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Calendar size={12} className="text-emerald-400" />
                <span>Dec 8 – 9, 2026</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-amber-300 font-bold flex items-center gap-1.5 font-mono-tech">
                <Clock size={12} className="text-amber-400" />
                <span>5:00 PM – 8:00 AM</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-400/35 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px]">
                ₹500 / Team
              </span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* HIGH-TECH REDESIGNED COUNTDOWN CHRONOMETER */}
          {/* =================================================================== */}
          <div className="relative mb-4 w-full max-w-md group">
            {/* Ambient Neon Glow Aura behind Timer */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-emerald-500/25 blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

            <div className="bg-black/80 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl p-2.5 sm:p-3 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] transition-all">
              {/* Chronometer Pods with Animated Glowing LED Colons */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                {/* 1. Days */}
                <div className="flex-1 bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent border border-white/10 hover:border-emerald-400/40 rounded-xl py-2 sm:py-2.5 px-1.5 flex flex-col items-center justify-center shadow-inner transition-all">
                  <span className="font-mono-tech text-xl sm:text-3xl md:text-4xl font-black bg-gradient-to-b from-white via-zinc-100 to-emerald-200 bg-clip-text text-transparent tracking-tight drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono-tech text-emerald-400/90 font-bold uppercase tracking-widest mt-0.5">
                    Days
                  </span>
                </div>

                {/* Animated Glowing Colon 1 */}
                <div className="flex flex-col gap-1 items-center justify-center px-0.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                </div>

                {/* 2. Hours */}
                <div className="flex-1 bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent border border-white/10 hover:border-emerald-400/40 rounded-xl py-2 sm:py-2.5 px-1.5 flex flex-col items-center justify-center shadow-inner transition-all">
                  <span className="font-mono-tech text-xl sm:text-3xl md:text-4xl font-black bg-gradient-to-b from-white via-zinc-100 to-emerald-200 bg-clip-text text-transparent tracking-tight drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono-tech text-emerald-400/90 font-bold uppercase tracking-widest mt-0.5">
                    Hours
                  </span>
                </div>

                {/* Animated Glowing Colon 2 */}
                <div className="flex flex-col gap-1 items-center justify-center px-0.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                </div>

                {/* 3. Minutes */}
                <div className="flex-1 bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent border border-white/10 hover:border-emerald-400/40 rounded-xl py-2 sm:py-2.5 px-1.5 flex flex-col items-center justify-center shadow-inner transition-all">
                  <span className="font-mono-tech text-xl sm:text-3xl md:text-4xl font-black bg-gradient-to-b from-white via-zinc-100 to-emerald-200 bg-clip-text text-transparent tracking-tight drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono-tech text-emerald-400/90 font-bold uppercase tracking-widest mt-0.5">
                    Mins
                  </span>
                </div>

                {/* Animated Glowing Colon 3 */}
                <div className="flex flex-col gap-1 items-center justify-center px-0.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                </div>

                {/* 4. Seconds */}
                <div className="flex-1 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-400/40 hover:border-emerald-400 rounded-xl py-2 sm:py-2.5 px-1.5 flex flex-col items-center justify-center shadow-inner transition-all">
                  <span className="font-mono-tech text-xl sm:text-3xl md:text-4xl font-black text-emerald-300 tracking-tight drop-shadow-[0_0_18px_rgba(52,211,153,0.7)]">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono-tech text-emerald-300 font-bold uppercase tracking-widest mt-0.5">
                    Secs
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action: Clean "Register Now" Button (100% Above the Fold) */}
          <div className="flex flex-col items-center justify-center gap-2 w-full">
            {isAuthenticated ? (
              <Link
                to={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
                className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.45)] hover:shadow-[0_0_45px_rgba(16,185,129,0.7)] transition-all transform hover:-translate-y-0.5"
              >
                <span>Go to {isAdmin ? 'Admin Dashboard' : 'Student Dashboard'}</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-primary group px-8 sm:px-10 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:shadow-[0_0_55px_rgba(16,185,129,0.75)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>Register Now</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                  <Link
                    to="/login"
                    className="hover:text-emerald-300 transition underline underline-offset-4 decoration-white/20 hover:decoration-emerald-400"
                  >
                    Already registered? Participant Sign In
                  </Link>
                  <span className="text-zinc-600">•</span>
                  <a href="#rules" className="hover:text-white transition flex items-center gap-1">
                    <span>Rules & Guidelines</span>
                    <ChevronDown size={11} />
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. OFFICIAL RULES & REGULATIONS (AUTHENTIC HUMAN DIRECTIVES) */}
      {/* ========================================================================= */}
      <section id="rules" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/[0.08] relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck size={14} />
            <span>Event Guidelines</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Rules & Regulations
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            Standard participation guidelines and evaluation criteria formulated by the Department of Computer Applications, ASIET in collaboration with Tata Consultancy Services.
          </p>
        </div>

        {/* 2-Column Professional Guidelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rule Card 1: Eligibility & Team Formation */}
          <div className="clean-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] bg-[#080d14]/80 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    Eligibility & Team Composition
                  </h3>
                  <p className="text-[11px] text-zinc-400">Team limits, institution criteria & ID requirements</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong>Team Size:</strong> Exactly 2 students per team (Team Leader + 1 Member). Solo participation or teams of 3+ are strictly not permitted.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong>Student Eligibility:</strong> Open to all currently enrolled undergraduate and postgraduate students from any recognized college or university.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong>Inter-College Teams:</strong> Cross-college and cross-department teams are fully permitted and welcomed.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong>Mandatory Identification:</strong> Both participants must present their original, physical college student ID cards at the gate registration desk for verification.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Rule Card 2: Schedule & Check-in Logistics */}
          <div className="clean-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] bg-[#080d14]/80 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    Schedule & Onboarding
                  </h3>
                  <p className="text-[11px] text-zinc-400">Reporting window, sprint duration & timeline</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Event Dates:</strong> December 8 – 9, 2026.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Reporting Window:</strong> Teams must report between <strong>04:00 PM and 04:45 PM IST on Dec 8</strong> at the Innovation Arena, ASIET campus for desk clearance.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>12-Hour Build Window:</strong> The buildathon starts promptly at <strong>5:00 PM (Dec 8)</strong> and concludes at <strong>8:00 AM (Dec 9)</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Pitching & Jury Defense:</strong> Project presentations, live code reviews, and jury defenses commence from 08:30 AM onwards on Dec 9.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Rule Card 3: Code Development & Integrity */}
          <div className="clean-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] bg-[#080d14]/80 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Code2 size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    Development & Code Integrity
                  </h3>
                  <p className="text-[11px] text-zinc-400">Original development, repositories & open-source policy</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <span><strong>Fresh Codebase:</strong> All project code must be authored during the continuous 12-hour sprint. Repositories must be initialized after problem statements are unveiled.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <span><strong>Permitted Assets:</strong> Open-source packages, public libraries, frameworks, and publicly documented developer APIs are permitted.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <span><strong>Prohibited Work:</strong> Pre-built applications, pre-coded proprietary templates, or existing academic projects will result in automatic disqualification.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <span><strong>Git Commit History:</strong> All code must be pushed to a public GitHub/GitLab repository with regular commits demonstrating progress across the 12 hours.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Rule Card 4: Evaluation & TCS Jury Defense */}
          <div className="clean-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] bg-[#080d14]/80 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    Evaluation & TCS Jury Defense
                  </h3>
                  <p className="text-[11px] text-zinc-400">Independent judging rubric and demo requirements</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span><strong>Technical Jury:</strong> Solutions will be independently evaluated by senior technical architects and solution consultants from <strong>Tata Consultancy Services (TCS)</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span><strong>Evaluation Rubric:</strong> Technical Rigor & Architecture (30%), Innovation & Real-World Utility (25%), UI/UX Usability (25%), Live Pitch & Demo Defense (20%).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span><strong>Mandatory Live Demo:</strong> Teams must demonstrate a functioning prototype or deployment. Static slide decks without running software will not be evaluated.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span><strong>Jury Decisions:</strong> Decisions made by the TCS jury and faculty convenors are final and binding on all participating teams.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 5: Facilities, Passes & Official Coordination (Full Width) */}
        <div className="mt-6 clean-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] bg-[#080d14]/80 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06] mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-white">
                  Registration, Entry Passes & Campus Amenities
                </h3>
                <p className="text-[11px] text-zinc-400">All-inclusive ₹500 fee covers credentials, connectivity & catering</p>
              </div>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-xs font-semibold shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
            >
              <span>Register Team — ₹500</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="font-semibold text-white block mb-1">🎫 Digital E-Ticket & QR Pass</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Confirmed registration instantly generates an encrypted gate QR pass and downloadable PDF ticket in the student dashboard.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="font-semibold text-white block mb-1">⚡ Workstations & Connectivity</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Innovation Arena provides gigabit high-speed Wi-Fi, dedicated power extensions, and emergency technical support throughout the night.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="font-semibold text-white block mb-1">☕ Sustenance & Security</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Full dinner, midnight tea/coffee, snacks, and morning breakfast are provided. 24/7 campus security and first-aid support on standby.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CLEAN MINIMALIST FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-white/[0.08] bg-[#04060a] py-10 px-4 sm:px-6 lg:px-8 text-xs text-zinc-400 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Code2 size={13} />
              </div>
              <span className="font-display font-bold text-sm text-white">
                BUILD OPS 2026
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Department of Computer Applications • Adi Shankara Institute × TCS
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#rules" className="hover:text-white transition">Rules & Guidelines</a>
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition">Register Team</Link>
          </div>

          <div className="text-[11px] text-zinc-400 text-center md:text-right">
            <span>© 2026 BuildOps. Adi Shankara Institute of Engineering & Technology.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
