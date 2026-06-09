import { useLang } from '../../contexts/LanguageContext';

export function HowItWorks() {
  const { t } = useLang();

  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0C0E14]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8B9E8B]/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8B9E8B]/20 to-transparent" />

      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#8B9E8B]/4 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#B8A882]/10 border border-[#B8A882]/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#B8A882] rounded-full" />
            <span className="text-[#B8A882] text-xs font-medium tracking-widest uppercase">
              {t.howItWorks.sectionBadge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#E8E4DC] mb-4">
            {t.howItWorks.title}{' '}
            <span className="bg-gradient-to-r from-[#B8A882] to-[#8B9E8B] bg-clip-text text-transparent">
              {t.howItWorks.titleHighlight}
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-px bg-gradient-to-r from-[#8B9E8B]/30 via-[#B8A882]/30 to-[#7A8FA0]/30" />
          <div className="hidden md:block absolute top-16 left-0 right-2/3 h-px bg-gradient-to-r from-[#8B9E8B]/30 to-[#8B9E8B]/30" />

          {t.howItWorks.steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              {/* Step number circle */}
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#8B9E8B]/15 to-[#7A8FA0]/10 border border-[#8B9E8B]/20 flex items-center justify-center">
                  <span className="text-4xl font-bold bg-gradient-to-br from-[#8B9E8B] to-[#B8A882] bg-clip-text text-transparent">
                    {step.number}
                  </span>
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full border border-[#8B9E8B]/10 scale-110 animate-ping" style={{ animationDuration: '3s', animationDelay: `${i * 0.5}s` }} />
              </div>

              <h3 className="text-[#E8E4DC] text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-[#A09890] text-sm leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
