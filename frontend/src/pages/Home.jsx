import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Tilt3D } from '../components/Tilt3D';
import { ArrowUpRight, Volume2, VolumeX, Plus, Minus } from 'lucide-react';

const SCHEDULE_ITEMS = [
  {
    index: '01',
    day: 'DEC 08',
    time: '17:00',
    title: 'Gate Check-In & QR Scan',
    note: 'Both team members verify college IDs and scan their digital pass.',
  },
  {
    index: '02',
    day: 'DEC 08',
    time: '18:00',
    title: 'Problem Statement Briefing',
    note: 'Live release of official buildathon tracks and evaluation criteria.',
  },
  {
    index: '03',
    day: 'DEC 08',
    time: '18:30',
    title: 'Build Phase Begins',
    note: 'Teams design, engineer, and deploy through the night on campus.',
  },
  {
    index: '04',
    day: 'DEC 09',
    time: '09:00',
    title: 'Mentor Reviews & Checkpoints',
    note: 'Technical architecture feedback and prototype stability checks.',
  },
  {
    index: '05',
    day: 'DEC 09',
    time: '19:00',
    title: 'Live Demos & Final Judging',
    note: 'Working product presentations before the ASIET × TCS jury until 21:00.',
  },
];

const RULES_ITEMS = [
  {
    id: '01',
    title: 'Strictly Two Members Per Team',
    detail: 'Every squad must register with exactly 2 participants — one Team Leader and one Team Member. Solo or 3+ entries are not accepted.',
  },
  {
    id: '02',
    title: 'Valid College Photo ID Required',
    detail: 'Both members must carry their physical institutional ID card at check-in alongside the team QR pass.',
  },
  {
    id: '03',
    title: 'Single Registration Fee of ₹500 Per Team',
    detail: 'One confirmed ₹500 Razorpay payment covers both team members, venue access, power, Wi-Fi, and event meals.',
  },
  {
    id: '04',
    title: 'Original Work Built On-Site',
    detail: 'Open-source frameworks and APIs are allowed, but project architecture and code must be written during the official build window.',
  },
  {
    id: '05',
    title: 'One QR Gate Pass Per Squad',
    detail: 'Upon payment confirmation, your Doomsday Collector Pass is emailed to both members and unlocked inside your portal.',
  },
];

export const Home = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [openRule, setOpenRule] = useState('01');
  const videoRef = useRef(null);
  const heroBgRef = useRef(null);
  const heroStageRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  // Live countdown to Dec 8, 2026, 5:00 PM IST
  useEffect(() => {
    const target = new Date('2026-12-08T17:00:00+05:30').getTime();
    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        return;
      }
      setTimeLeft({
        days: pad(Math.floor(diff / 86400000)),
        hours: pad(Math.floor((diff % 86400000) / 3600000)),
        minutes: pad(Math.floor((diff % 3600000) / 60000)),
        seconds: pad(Math.floor((diff % 60000) / 1000)),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Silky rAF-lerped 3D parallax for Hero video & foreground stage
  useEffect(() => {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isCoarse || reduced) return;

    let rafId;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

    const onMove = (e) => {
      ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onLeave = () => {
      ptr.tx = 0;
      ptr.ty = 0;
    };

    const loop = () => {
      ptr.x += (ptr.tx - ptr.x) * 0.055;
      ptr.y += (ptr.ty - ptr.y) * 0.055;

      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `scale(1.08) translate3d(${(-ptr.x * 16).toFixed(2)}px, ${(-ptr.y * 12).toFixed(2)}px, 0)`;
      }
      if (heroStageRef.current) {
        heroStageRef.current.style.transform = `perspective(1200px) rotateX(${(-ptr.y * 4.5).toFixed(2)}deg) rotateY(${(ptr.x * 5.5).toFixed(2)}deg)`;
      }

      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Scroll reveal observer for clean staggered section entrances
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal-block');
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="bg-[#030504] text-[#eef2ee] relative">
      {/* =====================================================================
          HERO — FULL-VIEWPORT 3D CINEMA STAGE
         ===================================================================== */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden border-b border-white/[0.08]">
        {/* Fullscreen 3D Parallax Video Backdrop */}
        <div
          ref={heroBgRef}
          className="absolute inset-0 z-0 will-change-transform pointer-events-none"
          style={{ transform: 'scale(1.08)' }}
        >
          <video
            ref={videoRef}
            src="/doomsday.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover opacity-55 contrast-[1.08] brightness-[0.82]"
          />
          {/* Deep Cinema Vignette & Emerald Atmospheric Underglow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 65% 55% at 50% 48%, rgba(16,185,129,0.08) 0%, rgba(3,5,4,0.68) 60%, rgba(3,5,4,0.96) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#030504] to-transparent" />
        </div>

        {/* Subtle 3D Tilted Orbital Ring Behind Title */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 w-[560px] h-[560px] sm:w-[760px] sm:h-[760px] rounded-full border border-emerald-500/15 animate-orbit-3d z-[1]"
        >
          <div className="absolute inset-8 rounded-full border border-dashed border-[#d4b46a]/15" />
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400/70 shadow-[0_0_12px_#10b981]" />
        </div>

        {/* Top Coordinates Strip */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 pt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-[2px] h-5 sm:h-6 bg-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.65)]" />
            <span
              className="font-imperial font-extrabold text-xs sm:text-sm md:text-[15px] tracking-[0.2em] text-[#eef2ee] uppercase leading-tight"
              style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.9)' }}
            >
              Department of Computer Applications
            </span>
          </div>
          <span className="hidden lg:inline font-mono-tech text-[10px] tracking-[0.24em] text-[#d4b46a]/85 uppercase">
            10.1782° N, 76.4305° E
          </span>
          <img
            src="/tcs-logo.png"
            alt="Tata Consultancy Services"
            className="h-6 sm:h-8 w-auto object-contain opacity-95 hover:opacity-100 transition-opacity select-none shrink-0"
          />
        </div>

        {/* Center 3D Layered Title Stage */}
        <div className="relative z-10 max-w-5xl w-full mx-auto px-5 sm:px-8 py-10 flex flex-col items-center text-center">
          <div
            ref={heroStageRef}
            className="w-full flex flex-col items-center will-change-transform [transform-style:preserve-3d]"
          >
            {/* Official Halftone Doomsday Poster Title */}
            <div
              className="w-full max-w-[680px] mb-5 select-none"
              style={{ transform: 'translateZ(42px)' }}
            >
              <img
                src="/buildops_poster_title_2x.png"
                alt="Build Ops"
                className="w-full h-auto object-contain mx-auto drop-shadow-[0_14px_38px_rgba(0,0,0,0.95)]"
              />
            </div>

            {/* Sharp Minimal Fact Hairline */}
            <div
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono-tech text-[11px] sm:text-xs tracking-[0.22em] text-[#c8d4cb] uppercase border-y border-white/15 py-2.5 px-6 bg-[#030504]/55 backdrop-blur-sm"
              style={{ transform: 'translateZ(20px)' }}
            >
              <span>DEC 08 – 09, 2026</span>
              <span className="text-emerald-500">/</span>
              <span>5:00 PM – 9:00 PM</span>
              <span className="text-emerald-500">/</span>
              <span>TEAMS OF TWO</span>
              <span className="text-emerald-500">/</span>
              <span className="text-[#d4b46a]">₹500 PER TEAM</span>
            </div>

            {/* Mechanical Monospace Countdown */}
            <div
              className="mt-8 grid grid-cols-4 gap-3 sm:gap-5"
              style={{ transform: 'translateZ(30px)' }}
            >
              {[
                { val: timeLeft.days, label: 'DAYS' },
                { val: timeLeft.hours, label: 'HRS' },
                { val: timeLeft.minutes, label: 'MIN' },
                { val: timeLeft.seconds, label: 'SEC' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="w-[68px] sm:w-[92px] py-3 border border-white/[0.12] bg-[#040806]/80 backdrop-blur-md"
                >
                  <div className="font-mono-tech text-2xl sm:text-4xl font-bold tracking-tight text-[#eef2ee] tabular-nums leading-none">
                    {unit.val}
                  </div>
                  <div className="font-mono-tech text-[9px] tracking-[0.24em] text-emerald-400/90 mt-1.5">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Primary Actions */}
            <div
              className="mt-9 flex flex-wrap items-center justify-center gap-3.5"
              style={{ transform: 'translateZ(36px)' }}
            >
              {isAuthenticated ? (
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
                  className="doom-btn-primary font-mono-tech text-xs uppercase tracking-[0.2em] px-8 py-3.5 gap-2"
                >
                  <span>{isAdmin ? 'Open Admin Dashboard' : 'Open Team Pass'}</span>
                  <ArrowUpRight size={15} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="doom-btn-primary font-mono-tech text-xs uppercase tracking-[0.2em] px-8 py-3.5 gap-2"
                  >
                    <span>Register Team</span>
                    <ArrowUpRight size={15} />
                  </Link>
                  <Link
                    to="/login"
                    className="doom-btn-secondary font-mono-tech text-xs uppercase tracking-[0.2em] px-7 py-3.5"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Cinema Utility Bar */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 pb-6 flex items-center justify-between font-mono-tech text-[10px] tracking-[0.22em] text-[#8b9b90] uppercase">
          <a href="#overview" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
            <span className="w-4 h-px bg-emerald-500/70 inline-block" />
            <span>Scroll</span>
          </a>

          <span className="hidden md:inline text-[#5a685e]">
            ADI SHANKARA INSTITUTE OF ENGINEERING &amp; TECHNOLOGY • KALADY
          </span>

          <button
            onClick={toggleMute}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/15 bg-[#030504]/70 hover:border-emerald-500/60 hover:text-[#eef2ee] transition cursor-pointer"
          >
            {isMuted ? <VolumeX size={12} className="text-emerald-400" /> : <Volume2 size={12} className="text-emerald-400" />}
            <span>{isMuted ? 'Sound Off' : 'Sound On'}</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          KINETIC TICKER TAPE
         ===================================================================== */}
      <div className="border-b border-white/[0.08] bg-[#060a08] overflow-hidden py-3 select-none">
        <div className="animate-doomsday-marquee font-mono-tech text-[11px] tracking-[0.26em] uppercase text-[#8b9b90]">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-10 pr-10 shrink-0">
              <span>BUILD OPS 2026</span>
              <span className="text-emerald-500">◆</span>
              <span>DECEMBER 08 – 09</span>
              <span className="text-emerald-500">◆</span>
              <span>ASIET × TCS</span>
              <span className="text-emerald-500">◆</span>
              <span className="text-[#eef2ee]">TEAMS OF TWO</span>
              <span className="text-emerald-500">◆</span>
              <span className="text-[#d4b46a]">₹500 PER TEAM</span>
              <span className="text-emerald-500">◆</span>
              <span>ON-CAMPUS BUILDATHON</span>
              <span className="text-emerald-500">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          SECTION 01 — EVENT DOSSIER + INTERACTIVE 3D CONCERT PASS
         ===================================================================== */}
      <section id="overview" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left: Architectural Fact Index */}
          <div className="lg:col-span-6 space-y-8 reveal-block">
            <div>
              <span className="font-mono-tech text-[10px] tracking-[0.26em] text-emerald-400 uppercase block mb-3">
                01 // OVERVIEW
              </span>
              <h2 className="font-poster text-3xl sm:text-4xl text-[#eef2ee] leading-tight tracking-tight">
                Two builders. One live problem. Zero shortcuts.
              </h2>
            </div>

            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {[
                {
                  num: '01',
                  label: 'FORMAT',
                  value: 'Teams of 2 — on-campus engineering sprint hosted by Dept. of Computer Applications, ASIET × TCS.',
                },
                {
                  num: '02',
                  label: 'WINDOW',
                  value: 'December 8, 5:00 PM through December 9, 9:00 PM, 2026.',
                },
                {
                  num: '03',
                  label: 'REGISTRATION',
                  value: '₹500 per team via Razorpay. Single payment covers both participants.',
                },
                {
                  num: '04',
                  label: 'GATE PASS',
                  value: 'Confirmed teams instantly receive a signed QR concert pass by email and in their portal.',
                },
              ].map((row) => (
                <div key={row.num} className="py-4 grid grid-cols-12 gap-4 items-baseline">
                  <span className="col-span-3 sm:col-span-3 font-mono-tech text-[10px] tracking-[0.2em] text-[#d4b46a]">
                    {row.num} / {row.label}
                  </span>
                  <p className="col-span-9 sm:col-span-9 text-sm text-[#c8d4cb] leading-relaxed">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive 3D Collector's Concert Pass Preview */}
          <div className="lg:col-span-6 reveal-block">
            <div className="font-mono-tech text-[10px] tracking-[0.22em] text-[#8b9b90] uppercase mb-3 flex items-center justify-between">
              <span>COLLECTOR GATE PASS PREVIEW</span>
              <span className="text-emerald-400">MOVE CURSOR TO TILT 3D</span>
            </div>

            <Tilt3D maxTilt={11} perspective={1100} className="w-full">
              <div className="relative bg-[#050a08] border border-emerald-500/55 shadow-[0_30px_70px_rgba(0,0,0,0.9)] overflow-hidden select-none">
                {/* Inner fine metallic gold border */}
                <div className="pointer-events-none absolute inset-[4px] border border-[#d4b46a]/35 z-20" />

                {/* Architectural grid */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(16,185,129,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.16) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                <div className="relative z-10 flex flex-col sm:flex-row">
                  {/* Main Left Pass */}
                  <div className="flex-1 p-6 flex flex-col justify-between gap-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tech text-[9px] tracking-[0.2em] text-[#d4b46a] uppercase">
                        ASIET × TCS
                      </span>
                      <span className="font-mono-tech text-[9px] tracking-[0.18em] text-emerald-300 border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 uppercase">
                        VIP • ADMIT 02
                      </span>
                    </div>

                    <div style={{ transform: 'translateZ(24px)' }}>
                      <div
                        className="font-poster text-3xl sm:text-4xl text-[#eef2ee] tracking-tight leading-none"
                        style={{ textShadow: '2px 2px 0 #064e3b' }}
                      >
                        BUILD OPS
                      </div>
                      <div className="mt-2 h-[2px] flex">
                        <span className="w-2/3 bg-emerald-500" />
                        <span className="w-1/3 bg-[#d4b46a]/80 ml-1" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono-tech text-[10px] border-t border-white/10 pt-3">
                      <div>
                        <span className="text-[#8b9b90] block text-[9px]">DATE</span>
                        <span className="text-[#eef2ee] font-bold">DEC 08 – 09, 2026</span>
                      </div>
                      <div>
                        <span className="text-[#8b9b90] block text-[9px]">PASS ID</span>
                        <span className="text-[#d4b46a] font-bold">BUILD-XXXXXXXX</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono-tech text-[9px] text-emerald-400 tracking-widest uppercase">
                      <span>■ CONFIRMED ENTRY</span>
                      <span className="text-[#8b9b90]">INR 500</span>
                    </div>
                  </div>

                  {/* Perforation Line + Notches */}
                  <div className="relative flex sm:flex-col items-center justify-center shrink-0">
                    <div className="w-full h-px border-t border-dashed border-[#d4b46a]/60 sm:hidden" />
                    <div className="hidden sm:block h-full w-px border-l border-dashed border-[#d4b46a]/60" />
                    <div className="hidden sm:block absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#030504] border border-emerald-500/50 z-30" />
                    <div className="hidden sm:block absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#030504] border border-emerald-500/50 z-30" />
                  </div>

                  {/* Right QR Stub */}
                  <div className="sm:w-44 shrink-0 bg-[#040806] p-5 flex flex-col items-center justify-center gap-3 text-center">
                    <span className="font-mono-tech text-[9px] tracking-[0.2em] text-[#d4b46a] uppercase">
                      GATE STUB
                    </span>

                    {/* Minimal Tactical QR Graphic */}
                    <div className="relative p-1.5" style={{ transform: 'translateZ(20px)' }}>
                      <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#d4b46a]" />
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#d4b46a]" />
                      <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#d4b46a]" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-[#d4b46a]" />
                      <div className="w-24 h-24 bg-[#eef2ee] p-2 grid grid-cols-5 grid-rows-5 gap-0.5">
                        {[
                          1, 1, 1, 0, 1,
                          1, 0, 1, 1, 0,
                          1, 1, 1, 0, 1,
                          0, 1, 0, 1, 1,
                          1, 0, 1, 1, 1,
                        ].map((cell, idx) => (
                          <span
                            key={idx}
                            className={cell ? 'bg-[#030504]' : 'bg-transparent'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Barcode Strip */}
                    <div className="flex items-stretch justify-center gap-[2px] h-4 w-full opacity-75">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span
                          key={i}
                          className={i % 7 === 0 ? 'bg-emerald-400' : 'bg-[#8b9b90]'}
                          style={{ width: i % 3 === 0 ? '2.5px' : '1px' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 02 — SCHEDULE INDEX
         ===================================================================== */}
      <section id="schedule" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 reveal-block">
          <div>
            <span className="font-mono-tech text-[10px] tracking-[0.26em] text-emerald-400 uppercase block mb-3">
              02 // SCHEDULE
            </span>
            <h2 className="font-poster text-3xl sm:text-4xl text-[#eef2ee] tracking-tight">
              Run of Show
            </h2>
          </div>
          <span className="font-mono-tech text-xs tracking-[0.18em] text-[#8b9b90] uppercase">
            DEC 08, 17:00 — DEC 09, 21:00 IST
          </span>
        </div>

        <div className="border-t border-white/[0.1] reveal-block">
          {SCHEDULE_ITEMS.map((item) => (
            <div
              key={item.index}
              className="group grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 py-6 border-b border-white/[0.08] hover:bg-emerald-500/[0.03] px-3 -mx-3 transition-colors"
            >
              <div className="md:col-span-3 flex items-center gap-4 font-mono-tech text-xs">
                <span className="text-[#5a685e] group-hover:text-emerald-400 transition-colors">
                  {item.index}
                </span>
                <span className="text-[#d4b46a] tracking-widest">{item.day}</span>
                <span className="text-[#eef2ee] font-semibold">{item.time}</span>
              </div>
              <div className="md:col-span-4 font-display text-lg font-semibold text-[#eef2ee] group-hover:text-emerald-300 transition-colors">
                {item.title}
              </div>
              <div className="md:col-span-5 text-sm text-[#8b9b90] leading-relaxed">
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 03 — RULES ACCORDION
         ===================================================================== */}
      <section id="rules" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 reveal-block">
            <span className="font-mono-tech text-[10px] tracking-[0.26em] text-emerald-400 uppercase block mb-3">
              03 // PROTOCOL
            </span>
            <h2 className="font-poster text-3xl sm:text-4xl text-[#eef2ee] tracking-tight mb-4">
              Rules &amp; Entry
            </h2>
            <p className="text-sm text-[#8b9b90] leading-relaxed">
              Clear terms for every registered squad. Read before completing payment.
            </p>
          </div>

          <div className="lg:col-span-8 border-t border-white/[0.1] reveal-block">
            {RULES_ITEMS.map((rule) => {
              const isOpen = openRule === rule.id;
              return (
                <div key={rule.id} className="border-b border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setOpenRule(isOpen ? '' : rule.id)}
                    className="w-full py-5 flex items-center justify-between gap-4 text-left group cursor-pointer"
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono-tech text-xs text-emerald-400/90">{rule.id}</span>
                      <span className="font-display text-base sm:text-lg font-semibold text-[#eef2ee] group-hover:text-emerald-300 transition-colors">
                        {rule.title}
                      </span>
                    </div>
                    <span className="text-[#8b9b90] group-hover:text-emerald-400 transition-colors shrink-0">
                      {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-5 pl-8 pr-6 text-sm text-[#8b9b90] leading-relaxed animate-fade-in-up">
                      {rule.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 04 — MONUMENTAL CLOSING CTA
         ===================================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center reveal-block">
        <span className="font-mono-tech text-[10px] tracking-[0.28em] text-[#d4b46a] uppercase block mb-4">
          REGISTRATIONS OPEN • ₹500 PER TEAM
        </span>
        <h2 className="font-poster text-4xl sm:text-6xl md:text-7xl text-[#eef2ee] tracking-tight mb-8">
          DEC 08, 2026.
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/student/dashboard') : '/register'}
            className="doom-btn-primary font-mono-tech text-xs uppercase tracking-[0.22em] px-9 py-4 gap-2"
          >
            <span>{isAuthenticated ? 'Go to Portal' : 'Register Your Team'}</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      {/* =====================================================================
          MINIMALIST FOOTER
         ===================================================================== */}
      <footer className="border-t border-white/[0.08] bg-[#020403] py-8 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono-tech text-[11px] text-[#5a685e]">
          <span className="text-[#8b9b90] tracking-wider uppercase">
            BUILD OPS 2026 — ASIET × TCS
          </span>
          <div className="flex items-center gap-6 uppercase tracking-wider">
            <a href="#schedule" className="hover:text-[#eef2ee] transition-colors">Schedule</a>
            <a href="#rules" className="hover:text-[#eef2ee] transition-colors">Rules</a>
            <Link to="/login" className="hover:text-[#eef2ee] transition-colors">Sign In</Link>
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">Register</Link>
          </div>
          <span>© 2026 Adi Shankara Institute of Engineering &amp; Technology</span>
        </div>
      </footer>
    </div>
  );
};
