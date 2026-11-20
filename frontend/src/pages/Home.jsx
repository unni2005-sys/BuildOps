import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowUpRight,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Trophy,
  Crown,
  Medal,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// Plays once per fresh page load/refresh; navigating back from /login or /register skips replay
let hasPlayedIntroReveal = false;

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
  {
    id: '06',
    title: 'Prize Pool & Evaluation Criteria',
    detail: 'The ₹8,000 cash bounty (₹5,000 for 1st Place, ₹3,000 for 2nd Place) will be evaluated on technical architecture, originality, execution completeness, and final pitch presentation.',
  },
];

export const Home = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [openRule, setOpenRule] = useState('01');

  // Intro reveal state: 'entering' -> 'holding' (huge full-screen title) -> 'settled' (full home screen)
  const [introPhase, setIntroPhase] = useState(() => {
    if (hasPlayedIntroReveal) return 'settled';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hasPlayedIntroReveal = true;
      return 'settled';
    }
    return 'entering';
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const userMutedRef = useRef(false);
  const heroBgRef = useRef(null);
  const heroStageRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  const isRevealing = introPhase !== 'settled';

  // Cinema intro reveal sequence
  useEffect(() => {
    if (hasPlayedIntroReveal) return;

    // Lock scroll briefly while the full-screen name reveal plays
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t1 = setTimeout(() => {
      setIntroPhase('holding');
    }, 250);

    const t2 = setTimeout(() => {
      hasPlayedIntroReveal = true;
      setIntroPhase('settled');
      document.body.style.overflow = prevOverflow;
    }, 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const skipIntro = () => {
    if (!isRevealing) return;
    hasPlayedIntroReveal = true;
    setIntroPhase('settled');
    document.body.style.overflow = '';
  };

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

  // Scroll reveal observer for smooth section entrances
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

  // Auto-launch Avengers Doomsday theme music on site load (with graceful browser autoplay unlock on first tap/click)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.55;
    audio.loop = true;

    const tryPlay = () => {
      if (userMutedRef.current) return;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setIsMusicPlaying(true);
            removeUnlockListeners();
          })
          .catch(() => {
            // Browser blocked unmuted autoplay; will unlock automatically on first pointer/key gesture
            setIsMusicPlaying(false);
          });
      }
    };

    const removeUnlockListeners = () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };

    window.addEventListener('pointerdown', tryPlay, { passive: true });
    window.addEventListener('keydown', tryPlay, { passive: true });

    tryPlay();

    return () => {
      removeUnlockListeners();
      audio.pause();
    };
  }, []);

  const toggleMusic = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isMusicPlaying) {
      userMutedRef.current = true;
      audio.pause();
      setIsMusicPlaying(false);
    } else {
      userMutedRef.current = false;
      audio.volume = 0.55;
      audio
        .play()
        .then(() => setIsMusicPlaying(true))
        .catch(() => setIsMusicPlaying(false));
    }
  };

  const uiStateClass = isRevealing ? 'ui-hidden' : 'ui-visible';

  return (
    <div className="bg-[#030504] text-[#eef2ee] relative">
      {/* Avengers Doomsday Epic Theme Soundtrack */}
      <audio ref={audioRef} src="/doomsday-theme.mp3" loop preload="auto" />

      {/* =====================================================================
          HERO — FULL-SCREEN CINEMA REVEAL -> INTERACTIVE 3D HOME STAGE
         ===================================================================== */}
      <section
        onClick={isRevealing ? skipIntro : undefined}
        className={`relative min-h-[100dvh] flex flex-col justify-between overflow-hidden border-b border-white/[0.08] ${
          isRevealing ? 'cursor-pointer' : ''
        }`}
      >
        {/* Continuous Fullscreen 3D Parallax Video Backdrop (muted so MP3 theme plays cleanly) */}
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
            muted
            playsInline
            className={`w-full h-full object-cover contrast-[1.08] transition-all duration-[2400ms] ease-out ${
              isRevealing ? 'opacity-80 brightness-[0.9]' : 'opacity-55 brightness-[0.82]'
            }`}
          />
          <div
            className="absolute inset-0 transition-opacity duration-[1200ms]"
            style={{
              background: isRevealing
                ? 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.12) 0%, rgba(3,5,4,0.48) 58%, rgba(3,5,4,0.94) 100%)'
                : 'radial-gradient(ellipse 65% 55% at 50% 48%, rgba(16,185,129,0.08) 0%, rgba(3,5,4,0.68) 60%, rgba(3,5,4,0.96) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#030504] to-transparent" />
        </div>

        {/* Subtle 3D Tilted Orbital Ring Behind Title */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 left-1/2 w-[560px] h-[560px] sm:w-[760px] sm:h-[760px] rounded-full border border-emerald-500/15 animate-orbit-3d z-[1] transition-opacity duration-[1400ms] ${
            introPhase === 'entering' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="absolute inset-8 rounded-full border border-dashed border-[#d4b46a]/15" />
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400/70 shadow-[0_0_12px_#10b981]" />
        </div>

        {/* Top Institutional Header Strip (fades in after name reveal) */}
        <div
          className={`relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-4 sm:pt-6 hero-ui-fade ${uiStateClass}`}
          style={{ transitionDelay: isRevealing ? '0ms' : '450ms' }}
        >
          {/* Row 1: Full-width justified college title */}
          <div className="w-full pb-2.5 sm:pb-3 border-b border-white/[0.1] flex items-center justify-center gap-3 sm:gap-5">
            <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-transparent to-[#d4b46a]/45" />
            <h2
              className="font-imperial font-bold text-[clamp(9px,2.35vw,15px)] tracking-[0.12em] sm:tracking-[0.26em] text-[#d4b46a] uppercase text-center whitespace-nowrap"
              style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.9)' }}
            >
              Adi Shankara Institute of Engineering and Technology
            </h2>
            <span className="hidden sm:block flex-1 h-px bg-gradient-to-l from-transparent to-[#d4b46a]/45" />
          </div>

          {/* Row 2: Department of Computer Applications (Left) & TCS Logo (Right) */}
          <div className="pt-2.5 sm:pt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-[2px] h-5 sm:h-6 bg-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.65)]" />
              <span
                className="font-imperial font-extrabold text-[10px] sm:text-sm md:text-[15px] tracking-[0.12em] sm:tracking-[0.2em] text-[#eef2ee] uppercase leading-tight"
                style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.9)' }}
              >
                Department of Computer Applications
              </span>
            </div>
            <img
              src="/tcs-logo.png"
              alt="Tata Consultancy Services"
              className="h-5 sm:h-8 w-auto object-contain opacity-95 hover:opacity-100 transition-opacity select-none shrink-0"
            />
          </div>
        </div>

        {/* Center 3D Layered Title Stage — evenly distributed across viewport */}
        <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-8 flex flex-col items-center justify-center text-center">
          <div
            ref={heroStageRef}
            className="w-full flex-1 flex flex-col items-center justify-evenly gap-4 sm:gap-6 max-h-[620px] will-change-transform [transform-style:preserve-3d]"
          >
            {/* Official Halftone Doomsday Poster Title — Appears Huge Full-Screen First, Then Settles */}
            <div className={`w-full max-w-[680px] select-none title-reveal-stage phase-${introPhase}`}>
              <img
                src="/buildops_poster_title_2x.png?v=2"
                alt="Build Ops"
                className="w-full h-auto object-contain mx-auto"
              />
            </div>

            {/* Structured Architectural Spec Bar with Prize Pool Ribbon */}
            <div
              className={`w-full max-w-[680px] border border-white/15 bg-[#040806]/85 backdrop-blur-md hero-ui-fade overflow-hidden ${uiStateClass}`}
              style={{
                transitionDelay: isRevealing ? '0ms' : '700ms',
              }}
            >
              {/* Prize Pool Ribbon */}
              <a
                href="#prizes"
                className="group flex items-center justify-between px-3.5 sm:px-4 py-2 border-b border-[#d4b46a]/30 bg-gradient-to-r from-[#d4b46a]/15 via-[#d4b46a]/[0.08] to-[#10b981]/15 hover:from-[#d4b46a]/25 hover:to-[#10b981]/25 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4b46a] shadow-[0_0_8px_#d4b46a] animate-pulse" />
                  <Trophy size={13} className="text-[#d4b46a]" />
                  <span className="font-mono-tech text-[10px] sm:text-xs font-bold tracking-[0.22em] text-[#d4b46a] uppercase">
                    Total Prize Pool
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono-tech text-xs sm:text-sm font-bold tracking-[0.16em] text-[#d4b46a]">
                  <span>₹8,000</span>
                  <ArrowUpRight
                    size={13}
                    className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </div>
              </a>

              {/* 4-Cell Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <div className="px-3 py-2.5 sm:py-3 border-b border-r border-white/10 sm:border-b-0">
                  <span className="block font-mono-tech text-[9px] tracking-[0.22em] text-[#8b9b90] uppercase">
                    Date
                  </span>
                  <span className="block font-mono-tech text-[11px] sm:text-xs font-semibold tracking-[0.1em] text-[#eef2ee] mt-1">
                    DEC 08 – 09, 2026
                  </span>
                </div>
                <div className="px-3 py-2.5 sm:py-3 border-b border-white/10 sm:border-b-0 sm:border-r">
                  <span className="block font-mono-tech text-[9px] tracking-[0.22em] text-[#8b9b90] uppercase">
                    Time
                  </span>
                  <span className="block font-mono-tech text-[11px] sm:text-xs font-semibold tracking-[0.1em] text-[#eef2ee] mt-1">
                    5:00 PM – 9:00 AM
                  </span>
                </div>
                <div className="px-3 py-2.5 sm:py-3 border-r border-white/10">
                  <span className="block font-mono-tech text-[9px] tracking-[0.22em] text-[#8b9b90] uppercase">
                    Format
                  </span>
                  <span className="block font-mono-tech text-[11px] sm:text-xs font-semibold tracking-[0.1em] text-emerald-300 mt-1">
                    TEAMS OF TWO
                  </span>
                </div>
                <div className="px-3 py-2.5 sm:py-3">
                  <span className="block font-mono-tech text-[9px] tracking-[0.22em] text-[#8b9b90] uppercase">
                    Entry Fee
                  </span>
                  <span className="block font-mono-tech text-[11px] sm:text-xs font-semibold tracking-[0.1em] text-[#d4b46a] mt-1">
                    ₹500 / TEAM
                  </span>
                </div>
              </div>
            </div>

            {/* Mechanical Monospace Countdown */}
            <div
              className={`w-full max-w-[340px] sm:max-w-[420px] grid grid-cols-4 gap-2 sm:gap-4 hero-ui-fade ${uiStateClass}`}
              style={{
                transitionDelay: isRevealing ? '0ms' : '1000ms',
              }}
            >
              {[
                { val: timeLeft.days, label: 'DAYS' },
                { val: timeLeft.hours, label: 'HRS' },
                { val: timeLeft.minutes, label: 'MIN' },
                { val: timeLeft.seconds, label: 'SEC' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="py-3 border border-white/[0.12] bg-[#040806]/80 backdrop-blur-md"
                >
                  <div className="font-mono-tech text-2xl sm:text-4xl font-bold tracking-tight text-[#eef2ee] tabular-nums leading-none">
                    {unit.val}
                  </div>
                  <div className="font-mono-tech text-[9px] tracking-[0.22em] text-emerald-400/90 mt-1.5">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Primary Actions */}
            <div
              className={`flex flex-wrap items-center justify-center gap-3.5 hero-ui-fade ${uiStateClass}`}
              style={{
                transitionDelay: isRevealing ? '0ms' : '1300ms',
              }}
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
        <div
          className={`relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 pb-5 sm:pb-6 flex items-center justify-between font-mono-tech text-[10px] tracking-[0.22em] text-[#8b9b90] uppercase hero-ui-fade ${uiStateClass}`}
          style={{ transitionDelay: isRevealing ? '0ms' : '1500ms' }}
        >
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href="#prizes"
              className="text-[#d4b46a] hover:text-[#e5c77e] transition-colors flex items-center gap-1.5 font-bold"
            >
              <Trophy size={11} className="text-[#d4b46a]" />
              <span>Prize Pool: ₹8,000</span>
            </a>
            <span className="text-white/20 hidden sm:inline">•</span>
            <a href="#rules" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
              <span className="w-4 h-px bg-emerald-500/70 inline-block" />
              <span>Rules &amp; Entry</span>
            </a>
          </div>

          <span className="hidden md:inline text-[#5a685e]">
            ADI SHANKARA INSTITUTE OF ENGINEERING &amp; TECHNOLOGY • KALADY
          </span>

          <button
            onClick={toggleMusic}
            className={`inline-flex items-center gap-2 px-3 py-1.5 border bg-[#030504]/70 hover:border-emerald-500/60 hover:text-[#eef2ee] transition cursor-pointer ${
              isMusicPlaying ? 'border-emerald-500/50 text-emerald-300' : 'border-white/15 text-[#8b9b90]'
            }`}
          >
            {isMusicPlaying ? (
              <Volume2 size={12} className="text-emerald-400" />
            ) : (
              <VolumeX size={12} className="text-emerald-400" />
            )}
            <span>{isMusicPlaying ? 'Sound On' : 'Sound Off'}</span>
          </button>
        </div>

        {/* Subtle Skip Hint During Initial 2.4s Title Reveal */}
        {isRevealing && (
          <div className="pointer-events-none absolute bottom-7 inset-x-0 z-20 text-center">
            <span className="font-mono-tech text-[10px] tracking-[0.32em] text-[#8b9b90]/75 uppercase animate-pulse">
              ASIET × TCS • DEC 08, 2026
            </span>
          </div>
        )}
      </section>

      {/* =====================================================================
          PRIZE POOL & PODIUM (₹8,000 TOTAL: ₹5,000 1ST & ₹3,000 2ND)
         ===================================================================== */}
      <section
        id="prizes"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/[0.08] relative"
      >
        <div className="reveal-block mb-12 sm:mb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-white/[0.08] pb-8">
            <div>
              <span className="font-mono-tech text-[10px] tracking-[0.28em] text-[#d4b46a] uppercase block mb-3 font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#d4b46a] inline-block shadow-[0_0_8px_#d4b46a]" />
                BOUNTY ALLOCATION // CASH PRIZE POOL
              </span>
              <h2 className="font-poster text-3xl sm:text-5xl text-[#eef2ee] tracking-tight">
                Prize Pool: <span className="text-[#d4b46a]">₹8,000</span>
              </h2>
              <p className="text-sm text-[#8b9b90] mt-3 max-w-2xl leading-relaxed">
                Direct cash disbursements awarded to the highest-scoring engineering squads. Evaluated by an industry jury from TCS and ASIET faculty.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono-tech text-[11px]">
              <div className="px-3.5 py-2 border border-[#d4b46a]/30 bg-[#d4b46a]/[0.08] text-[#d4b46a] flex items-center gap-2">
                <Trophy size={13} className="text-[#d4b46a]" />
                <span>TOTAL: ₹8,000 INR</span>
              </div>
              <div className="px-3.5 py-2 border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300 flex items-center gap-2">
                <Sparkles size={13} className="text-emerald-400" />
                <span>2 PODIUM TIERS</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Podium Showcase (First & Second Prize) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          {/* Card 1: 1st Prize — ₹5,000 */}
          <div className="reveal-block">
            <Tilt3D maxTilt={5} perspective={1200} className="h-full">
              <div className="h-full bg-[#070c09]/90 border border-[#d4b46a]/40 p-7 sm:p-9 relative flex flex-col justify-between shadow-[0_0_35px_rgba(212,180,106,0.12)] group hover:border-[#d4b46a]/70 transition-all">
                {/* Burnished Gold Top Hairline Accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#d4b46a] via-[#e5c77e] to-emerald-500" />

                {/* Corner Decorative Ticks */}
                <span className="absolute top-2.5 right-3 font-mono-tech text-[9px] text-[#d4b46a]/50 select-none">
                  +01
                </span>
                <span className="absolute bottom-2.5 left-3 font-mono-tech text-[9px] text-[#d4b46a]/50 select-none">
                  CHAMPION_TIER
                </span>

                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#d4b46a]/15 border border-[#d4b46a]/40 text-[#d4b46a] font-mono-tech text-[10px] sm:text-[11px] tracking-[0.22em] font-bold uppercase">
                      <Crown size={13} className="text-[#d4b46a]" />
                      1st Prize // Champions
                    </span>
                    <span className="font-mono-tech text-xs text-[#8b9b90] tracking-wider uppercase">
                      PODIUM I
                    </span>
                  </div>

                  {/* Cash Amount Display */}
                  <div className="mb-4">
                    <span className="font-mono-tech text-[10px] tracking-[0.24em] text-[#8b9b90] uppercase block mb-1">
                      Cash Bounty
                    </span>
                    <div className="font-poster text-5xl sm:text-6xl text-[#d4b46a] tracking-tight leading-none drop-shadow-[0_4px_16px_rgba(212,180,106,0.25)]">
                      ₹5,000
                    </div>
                  </div>

                  <p className="text-sm text-[#8b9b90] leading-relaxed mb-6">
                    Awarded to the overall winning squad demonstrating the most innovative concept, rock-solid architecture, and production-grade on-site execution.
                  </p>

                  {/* Perks Checklist */}
                  <div className="space-y-2.5 pt-5 border-t border-white/[0.08]">
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-[#d4b46a] shrink-0 mt-0.5" />
                      <span>
                        <strong>₹5,000 Direct Cash Prize</strong> transferred to squad
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-[#d4b46a] shrink-0 mt-0.5" />
                      <span>
                        Official <strong>Build Ops 2026 Champion Trophy</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-[#d4b46a] shrink-0 mt-0.5" />
                      <span>
                        Winner Certificates of Excellence endorsed by <strong>ASIET &amp; TCS</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-[#d4b46a] shrink-0 mt-0.5" />
                      <span>Direct technical recognition from industry jury panel</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-[#d4b46a]/20 flex items-center justify-between font-mono-tech text-[10px] text-[#d4b46a] tracking-wider">
                  <span>DISBURSEMENT: POST-EVALUATION</span>
                  <span className="uppercase">RANK #01</span>
                </div>
              </div>
            </Tilt3D>
          </div>

          {/* Card 2: 2nd Prize — ₹3,000 */}
          <div className="reveal-block">
            <Tilt3D maxTilt={5} perspective={1200} className="h-full">
              <div className="h-full bg-[#070c09]/90 border border-white/[0.14] p-7 sm:p-9 relative flex flex-col justify-between hover:border-emerald-500/40 transition-all group shadow-[0_0_30px_rgba(16,185,129,0.06)]">
                {/* Brushed Steel & Emerald Hairline Accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />

                {/* Corner Decorative Ticks */}
                <span className="absolute top-2.5 right-3 font-mono-tech text-[9px] text-[#8b9b90]/40 select-none">
                  +02
                </span>
                <span className="absolute bottom-2.5 left-3 font-mono-tech text-[9px] text-[#8b9b90]/40 select-none">
                  RUNNERUP_TIER
                </span>

                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.08] border border-white/20 text-[#eef2ee] font-mono-tech text-[10px] sm:text-[11px] tracking-[0.22em] font-semibold uppercase">
                      <Medal size={13} className="text-emerald-400" />
                      2nd Prize // Runner-Up
                    </span>
                    <span className="font-mono-tech text-xs text-[#8b9b90] tracking-wider uppercase">
                      PODIUM II
                    </span>
                  </div>

                  {/* Cash Amount Display */}
                  <div className="mb-4">
                    <span className="font-mono-tech text-[10px] tracking-[0.24em] text-[#8b9b90] uppercase block mb-1">
                      Cash Bounty
                    </span>
                    <div className="font-poster text-5xl sm:text-6xl text-[#eef2ee] tracking-tight leading-none drop-shadow-[0_4px_16px_rgba(255,255,255,0.1)]">
                      ₹3,000
                    </div>
                  </div>

                  <p className="text-sm text-[#8b9b90] leading-relaxed mb-6">
                    Awarded to the second-place squad for outstanding technical merit, clean implementation, and resilience throughout the overnight build.
                  </p>

                  {/* Perks Checklist */}
                  <div className="space-y-2.5 pt-5 border-t border-white/[0.08]">
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>₹3,000 Direct Cash Prize</strong> transferred to squad
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        Official <strong>Build Ops 2026 Runner-Up Trophy</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        Merit Certificates endorsed by <strong>ASIET &amp; TCS</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#eef2ee]">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Featured in Build Ops 2026 Innovation Showcase</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-white/[0.1] flex items-center justify-between font-mono-tech text-[10px] text-[#8b9b90] tracking-wider">
                  <span>DISBURSEMENT: POST-EVALUATION</span>
                  <span className="uppercase">RANK #02</span>
                </div>
              </div>
            </Tilt3D>
          </div>
        </div>

        {/* Universal Perks Bar for all attendees */}
        <div className="mt-8 p-5 sm:p-6 border border-white/[0.1] bg-[#040806]/70 backdrop-blur-md reveal-block">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono-tech text-[11px]">
            <div className="flex items-center gap-2.5 text-[#eef2ee]">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
              <span className="tracking-[0.16em] uppercase font-bold text-emerald-300 shrink-0">
                Universal Squad Amenities:
              </span>
              <span className="text-[#8b9b90]">
                Every registered squad receives participation certificates, high-speed Wi-Fi, dinner &amp; midnight refreshments.
              </span>
            </div>
            <a
              href="#rules"
              className="text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-[0.18em] shrink-0 flex items-center gap-1.5"
            >
              <span>View Rulebook</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* =====================================================================
          RULES & ENTRY
         ===================================================================== */}
      <section id="rules" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 reveal-block">
            <span className="font-mono-tech text-[10px] tracking-[0.26em] text-emerald-400 uppercase block mb-3">
              PROTOCOL
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
          MINIMALIST FOOTER
         ===================================================================== */}
      <footer className="bg-[#020403] py-8 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono-tech text-[11px] text-[#5a685e]">
            <span className="text-[#8b9b90] tracking-wider uppercase">
              BUILD OPS 2026 — ASIET × TCS
            </span>
            <div className="flex items-center gap-6 uppercase tracking-wider">
              <a href="#prizes" className="text-[#d4b46a] hover:text-[#e5c77e] transition-colors">Prizes</a>
              <a href="#rules" className="hover:text-[#eef2ee] transition-colors">Rules</a>
              <Link to="/login" className="hover:text-[#eef2ee] transition-colors">Sign In</Link>
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">Register</Link>
            </div>
            <span className="text-[clamp(8px,2.35vw,11px)] sm:text-[11px] whitespace-nowrap tracking-tight sm:tracking-normal text-center">
              © 2026 Adi Shankara Institute of Engineering &amp; Technology
            </span>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-center font-mono-tech text-[11px] text-[#8b9b90] tracking-wide">
            <span>For technical support, contact: </span>
            <a
              href="tel:+919497290648"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              9497290648
            </a>
            <span className="text-white/25 mx-2">•</span>
            <span className="text-[#eef2ee]">Unnikrishnan M</span>
            <span className="text-[#d4b46a]"> (Tech Lead)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
