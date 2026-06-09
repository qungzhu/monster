import { useLang } from '../../contexts/LanguageContext';

const avatarColors = ['#8B9E8B', '#7A8FA0', '#B8A882'];

export function Testimonials() {
  const { t } = useLang();

  return (
    <section id="testimonials" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0E14] via-[#0D1018] to-[#0C0E14]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#B89393]/10 border border-[#B89393]/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#B89393] rounded-full" />
            <span className="text-[#B89393] text-xs font-medium tracking-widest uppercase">
              {t.testimonials.sectionBadge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#E8E4DC] mb-4">
            {t.testimonials.title}{' '}
            <span className="bg-gradient-to-r from-[#B89393] to-[#9B8FB0] bg-clip-text text-transparent">
              {t.testimonials.titleHighlight}
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {t.testimonials.items.map((item, i) => (
            <div
              key={i}
              className="group bg-white/[0.025] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Quote mark */}
              <div className="absolute top-4 right-6 text-6xl font-serif text-white/5 select-none">"</div>

              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <svg key={s} className="w-4 h-4 text-[#B8A882]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              <p className="text-[#C0BCB4] text-sm leading-relaxed mb-6 italic">"{item.text}"</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ background: `linear-gradient(135deg, ${avatarColors[i]}90, ${avatarColors[i]}50)` }}
                  >
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[#E8E4DC] text-sm font-medium">{item.name}</div>
                    <div className="text-[#A09890] text-xs">{item.role}</div>
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: `${avatarColors[i]}15`, color: avatarColors[i] }}
                >
                  {item.earnings}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
