import { useLang } from '../../contexts/LanguageContext';

export function JoinCTA() {
  const { t } = useLang();

  return (
    <section id="cta" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C0E14]" />

      {/* Decorative glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#8B9E8B]/6 rounded-full blur-[120px]" />
      <div className="absolute left-1/4 top-1/4 w-64 h-64 bg-[#7A8FA0]/5 rounded-full blur-[80px]" />
      <div className="absolute right-1/4 bottom-1/4 w-64 h-64 bg-[#B8A882]/5 rounded-full blur-[80px]" />

      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8B9E8B]/30 to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B9E8B]/10 border border-[#8B9E8B]/20 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-[#8B9E8B] rounded-full animate-pulse" />
          <span className="text-[#8B9E8B] text-xs font-medium tracking-widest uppercase">
            {t.cta.badge}
          </span>
        </div>

        <h2 className="text-4xl md:text-6xl font-bold text-[#E8E4DC] leading-tight mb-6">
          {t.cta.title}{' '}
          <span className="bg-gradient-to-r from-[#8B9E8B] via-[#B8A882] to-[#7A8FA0] bg-clip-text text-transparent">
            {t.cta.titleHighlight}
          </span>
        </h2>

        <p className="text-[#A09890] text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          {t.cta.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href="#"
            className="group w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#8B9E8B] to-[#7A8FA0] hover:from-[#7A8E7A] hover:to-[#6A7F90] text-white font-semibold rounded-full transition-all duration-300 hover:shadow-2xl hover:shadow-[#8B9E8B]/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {t.cta.btn1}
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#"
            className="w-full sm:w-auto px-10 py-4 border border-white/10 hover:border-[#8B9E8B]/40 text-[#E8E4DC] font-medium rounded-full transition-all duration-300 hover:bg-white/5 text-center"
          >
            {t.cta.btn2}
          </a>
        </div>

        <p className="text-[#706860] text-sm">{t.cta.note}</p>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <div className="flex -space-x-2">
            {['#8B9E8B', '#7A8FA0', '#B8A882', '#B89393', '#9B8FB0'].map((color, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-[#0C0E14] flex items-center justify-center text-white text-xs font-semibold"
                style={{ background: `linear-gradient(135deg, ${color}80, ${color}40)` }}
              >
                {['S', 'J', 'P', 'A', 'K'][i]}
              </div>
            ))}
          </div>
          <span className="text-[#A09890] text-sm">50,000+ creators already earning</span>
        </div>
      </div>
    </section>
  );
}
