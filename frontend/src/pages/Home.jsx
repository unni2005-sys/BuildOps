import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight, Volume2, VolumeX, Plus, Minus } from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// Plays once per fresh page load/refresh; navigating back from /login or /register skips replay
let hasPlayedIntroReveal = false;

const RULES_ITEMS = [
  {
    id: '01',
    title: 'Strictly Two Members Per Team',
    detail: 'Every team must register with exactly 2 participants: one Team Leader and one Team Member. Solo or larger entries are not accepted.',
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
    title: 'Prize Pool and Evaluation Criteria',
    detail: 'The ₹8,000 cash prize pool (₹5,000 for 1st Place, ₹3,000 for 2nd Place) will be evaluated on technical architecture, originality, execution completeness, and final pitch presentation.',
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
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#d4b46a]/25 bg-[#d4b46a]/[0.06] hover:bg-[#d4b46a]/[0.1] transition-colors cursor-pointer"
              >
                <span className="font-display text-xs tracking-wider text-[#d4b46a] uppercase font-semibold">
                  Total Prize Pool
                </span>
                <span className="font-display text-sm tracking-wider text-[#d4b46a] font-bold">
                  ₹8,000
                </span>
              </a>

              {/* 4-Cell Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <div className="px-3 py-2.5 sm:py-3 border-b border-r border-white/10 sm:border-b-0">
                  <span className="block font-display text-[10px] tracking-wider text-[#8b9b90] uppercase font-medium">
                    Date
                  </span>
                  <span className="block font-display text-xs font-semibold tracking-wide text-[#eef2ee] mt-1">
                    Dec 8 to 9, 2026
                  </span>
                </div>
                <div className="px-3 py-2.5 sm:py-3 border-b border-white/10 sm:border-b-0 sm:border-r">
                  <span className="block font-display text-[10px] tracking-wider text-[#8b9b90] uppercase font-medium">
                    Time
                  </span>
                  <span className="block font-display text-xs font-semibold tracking-wide text-[#eef2ee] mt-1">
                    5:00 PM to 9:00 AM
                  </span>
                </div>
                <div className="px-3 py-2.5 sm:py-3 border-r border-white/10">
                  <span className="block font-display text-[10px] tracking-wider text-[#8b9b90] uppercase font-medium">
                    Format
                  </span>
                  <span className="block font-display text-xs font-semibold tracking-wide text-emerald-300 mt-1">
                    Teams of 2
                  </span>
                </div>
                <div className="px-3 py-2.5 sm:py-3">
                  <span className="block font-display text-[10px] tracking-wider text-[#8b9b90] uppercase font-medium">
                    Entry Fee
                  </span>
                  <span className="block font-display text-xs font-semibold tracking-wide text-[#d4b46a] mt-1">
                    ₹500 per team
                  </span>
                </div>
              </div>
            </div>

            {/* Countdown */}
            <div
              className={`w-full max-w-[340px] sm:max-w-[420px] grid grid-cols-4 gap-2 sm:gap-4 hero-ui-fade ${uiStateClass}`}
              style={{
                transitionDelay: isRevealing ? '0ms' : '1000ms',
              }}
            >
              {[
                { val: timeLeft.days, label: 'DAYS' },
                { val: timeLeft.hours, label: 'HOURS' },
                { val: timeLeft.minutes, label: 'MINUTES' },
                { val: timeLeft.seconds, label: 'SECONDS' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="py-3 border border-white/[0.12] bg-[#040806]/80 backdrop-blur-md"
                >
                  <div className="font-mono-tech text-2xl sm:text-4xl font-bold tracking-tight text-[#eef2ee] tabular-nums leading-none">
                    {unit.val}
                  </div>
                  <div className="font-display text-[9px] tracking-widest text-emerald-400 font-semibold mt-1.5">
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
                  className="doom-btn-primary font-display text-xs uppercase tracking-[0.2em] px-8 py-3.5 gap-2"
                >
                  <span>{isAdmin ? 'Open Admin Dashboard' : 'Open Team Pass'}</span>
                  <ArrowUpRight size={15} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="doom-btn-primary font-display text-xs uppercase tracking-[0.2em] px-8 py-3.5 gap-2"
                  >
                    <span>Register Team</span>
                    <ArrowUpRight size={15} />
                  </Link>
                  <Link
                    to="/login"
                    className="doom-btn-secondary font-display text-xs uppercase tracking-[0.2em] px-7 py-3.5"
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
          className={`relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 pb-5 sm:pb-6 flex items-center justify-between font-display text-xs text-[#8b9b90] hero-ui-fade ${uiStateClass}`}
          style={{ transitionDelay: isRevealing ? '0ms' : '1500ms' }}
        >
          <div className="flex items-center gap-5">
            <a
              href="#prizes"
              className="text-[#d4b46a] hover:text-[#e5c77e] transition-colors font-medium"
            >
              Prize Pool ₹8,000
            </a>
            <a
              href="#rules"
              className="hover:text-emerald-400 transition-colors font-medium"
            >
              Rules
            </a>
          </div>

          <span className="hidden md:inline text-[#5a685e]">
            Adi Shankara Institute of Engineering and Technology, Kalady
          </span>

          <button
            onClick={toggleMusic}
            className={`inline-flex items-center gap-2 px-3 py-1.5 border bg-[#030504]/70 hover:border-emerald-500/60 hover:text-[#eef2ee] transition cursor-pointer ${
              isMusicPlaying ? 'border-emerald-500/50 text-emerald-300' : 'border-white/15 text-[#8b9b90]'
            }`}
          >
            {isMusicPlaying ? (
              <Volume2 size={13} className="text-emerald-400" />
            ) : (
              <VolumeX size={13} className="text-emerald-400" />
            )}
            <span>{isMusicPlaying ? 'Sound On' : 'Sound Off'}</span>
          </button>
        </div>

        {/* Subtle Skip Hint During Initial 2.4s Title Reveal */}
        {isRevealing && (
          <div className="pointer-events-none absolute bottom-7 inset-x-0 z-20 text-center">
            <span className="font-display text-xs tracking-widest text-[#8b9b90]/75 uppercase">
              ASIET and TCS, Dec 8, 2026
            </span>
          </div>
        )}
      </section>

      {/* =====================================================================
          PRIZE POOL & PODIUM
         ===================================================================== */}
      <section
        id="prizes"
        className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16 border-b border-white/[0.08] relative"
      >
        <div className="reveal-block mb-10 sm:mb-12">
          <span className="font-imperial text-xs tracking-[0.2em] text-[#d4b46a] uppercase block mb-2 font-semibold">
            Prize Pool
          </span>
          <h2 className="font-poster text-3xl sm:text-4xl text-[#eef2ee] tracking-tight">
            ₹8,000 Total Cash Awards
          </h2>
          <p className="text-sm text-[#8b9b90] mt-2 max-w-xl font-display leading-relaxed">
            Direct cash awards will be distributed to the winning teams following jury evaluation.
          </p>
        </div>

        {/* 2-Column Podium Showcase (First & Second Prize) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: 1st Prize */}
          <div className="reveal-block">
            <Tilt3D maxTilt={4} perspective={1200} className="h-full">
              <div className="h-full bg-[#070c09]/90 border border-[#d4b46a]/30 p-6 sm:p-8 relative flex flex-col justify-between shadow-[0_0_30px_rgba(212,180,106,0.08)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#d4b46a]" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-imperial text-xs tracking-[0.16em] text-[#d4b46a] font-bold uppercase">
                      First Prize
                    </span>
                    <span className="font-display text-xs text-[#8b9b90]">
                      Winner
                    </span>
                  </div>

                  <div className="font-poster text-4xl sm:text-5xl text-[#d4b46a] tracking-tight mb-6">
                    ₹5,000
                  </div>

                  <div className="space-y-3 pt-5 border-t border-white/[0.08] font-display text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Cash Prize</span>
                      <span className="text-[#d4b46a] font-semibold">₹5,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Awards</span>
                      <span className="text-[#eef2ee]">Build Ops Champion Trophy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Certification</span>
                      <span className="text-[#eef2ee]">Certificate of Excellence</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Endorsement</span>
                      <span className="text-[#eef2ee]">ASIET and TCS</span>
                    </div>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </div>

          {/* Card 2: 2nd Prize */}
          <div className="reveal-block">
            <Tilt3D maxTilt={4} perspective={1200} className="h-full">
              <div className="h-full bg-[#070c09]/90 border border-white/15 p-6 sm:p-8 relative flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-imperial text-xs tracking-[0.16em] text-[#eef2ee] font-bold uppercase">
                      Second Prize
                    </span>
                    <span className="font-display text-xs text-[#8b9b90]">
                      Runner Up
                    </span>
                  </div>

                  <div className="font-poster text-4xl sm:text-5xl text-[#eef2ee] tracking-tight mb-6">
                    ₹3,000
                  </div>

                  <div className="space-y-3 pt-5 border-t border-white/[0.08] font-display text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Cash Prize</span>
                      <span className="text-emerald-400 font-semibold">₹3,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Awards</span>
                      <span className="text-[#eef2ee]">Build Ops Runner Up Trophy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Certification</span>
                      <span className="text-[#eef2ee]">Certificate of Merit</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8b9b90]">Endorsement</span>
                      <span className="text-[#eef2ee]">ASIET and TCS</span>
                    </div>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </div>
        </div>

        {/* Amenities Banner */}
        <div className="mt-6 sm:mt-8 p-5 border border-white/10 bg-[#040806]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-display text-xs text-[#8b9b90] reveal-block">
          <span>
            All registered participants receive official certificates, high-speed Wi-Fi, dinner, and event refreshments.
          </span>
          <a
            href="#rules"
            className="text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider font-semibold whitespace-nowrap"
          >
            View Rules
          </a>
        </div>
      </section>

      {/* =====================================================================
          RULES & ENTRY
         ===================================================================== */}
      <section id="rules" className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-20 sm:pb-28 border-b border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 reveal-block">
            <span className="font-imperial text-xs tracking-[0.2em] text-emerald-400 uppercase block mb-2 font-semibold">
              Guidelines
            </span>
            <h2 className="font-poster text-3xl sm:text-4xl text-[#eef2ee] tracking-tight mb-3">
              Rules and Entry
            </h2>
            <p className="text-sm text-[#8b9b90] leading-relaxed font-display">
              Clear terms for every registered team. Please review before registration.
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
                      <span className="font-display text-xs font-semibold text-emerald-400/90">{rule.id}</span>
                      <span className="font-display text-base sm:text-lg font-semibold text-[#eef2ee] group-hover:text-emerald-300 transition-colors">
                        {rule.title}
                      </span>
                    </div>
                    <span className="text-[#8b9b90] group-hover:text-emerald-400 transition-colors shrink-0">
                      {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-5 pl-8 pr-6 text-sm text-[#8b9b90] leading-relaxed font-display animate-fade-in-up">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-display text-xs text-[#5a685e]">
            <span className="text-[#8b9b90] tracking-wider uppercase">
              BUILD OPS 2026 | ASIET AND TCS
            </span>
            <div className="flex items-center gap-6 uppercase tracking-wider">
              <a href="#prizes" className="text-[#d4b46a] hover:text-[#e5c77e] transition-colors">Prizes</a>
              <a href="#rules" className="hover:text-[#eef2ee] transition-colors">Rules</a>
              <Link to="/login" className="hover:text-[#eef2ee] transition-colors">Sign In</Link>
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">Register</Link>
            </div>
            <span className="text-[clamp(8px,2.35vw,11px)] sm:text-xs whitespace-nowrap tracking-tight sm:tracking-normal text-center">
              © 2026 Adi Shankara Institute of Engineering and Technology
            </span>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-center font-display text-xs text-[#8b9b90] tracking-wide">
            <span>Technical support: </span>
            <a
              href="tel:+919497290648"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              9497290648
            </a>
            <span className="mx-2 text-white/20">|</span>
            <span className="text-[#eef2ee]">Unnikrishnan M</span>
            <span className="text-[#d4b46a]">, Tech Lead</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
