import { useEffect, useRef } from 'react';
import { useLang } from '../../contexts/LanguageContext';

export function Hero() {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 158, 139, ${p.a})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139, 158, 139, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8B9E8B]/8 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#7A8FA0]/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#B8A882]/4 rounded-full blur-[150px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(139,158,139,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,158,139,1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B9E8B]/10 border border-[#8B9E8B]/20 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-[#8B9E8B] rounded-full animate-pulse" />
          <span className="text-[#8B9E8B] text-xs font-medium tracking-widest uppercase">
            {t.hero.badge}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
          <span className="text-[#E8E4DC]">{t.hero.title1} </span>
          <span className="relative">
            <span className="bg-gradient-to-r from-[#8B9E8B] via-[#B8A882] to-[#7A8FA0] bg-clip-text text-transparent">
              {t.hero.title2}
            </span>
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 8C50 4 100 2 150 6C200 10 250 8 298 4"
                stroke="url(#underline-grad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="underline-grad" x1="0" y1="0" x2="300" y2="0">
                  <stop offset="0%" stopColor="#8B9E8B" />
                  <stop offset="100%" stopColor="#7A8FA0" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <br />
          <span className="text-[#E8E4DC]">{t.hero.title3}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#A09890] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          {t.hero.subtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#cta"
            className="group px-8 py-4 bg-[#8B9E8B] hover:bg-[#7A8E7A] text-white font-semibold rounded-full transition-all duration-300 hover:shadow-2xl hover:shadow-[#8B9E8B]/25 hover:-translate-y-0.5 flex items-center gap-2"
          >
            {t.hero.cta1}
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-white/10 hover:border-[#8B9E8B]/40 text-[#E8E4DC] font-medium rounded-full transition-all duration-300 hover:bg-white/5 flex items-center gap-2"
          >
            <svg className="w-5 h-5 text-[#8B9E8B]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {t.hero.cta2}
          </a>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { value: '50K+', label: t.hero.stat1 },
            { value: '120+', label: t.hero.stat2 },
            { value: '$2,400', label: t.hero.stat3 },
            { value: '5', label: t.hero.stat4 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-4 backdrop-blur-sm"
            >
              <div className="text-2xl font-bold text-[#E8E4DC] mb-1">{stat.value}</div>
              <div className="text-[#A09890] text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0C0E14] to-transparent" />
    </section>
  );
}
