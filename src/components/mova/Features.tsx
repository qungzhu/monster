import { useLang } from '../../contexts/LanguageContext';

const icons = [
  // AI Content
  <svg key="ai" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.7-1.388 2.43l-1.358-.258m-12.908 0l-1.358.258c-1.418.27-2.388-1.43-1.388-2.43L5 14.5" />
  </svg>,
  // Link Tracking
  <svg key="link" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>,
  // Multi Platform
  <svg key="multi" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>,
  // Commission
  <svg key="commission" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  // Intelligence
  <svg key="intel" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>,
  // Community
  <svg key="community" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>,
];

const accentColors = [
  { bg: 'bg-[#8B9E8B]/10', border: 'border-[#8B9E8B]/20', icon: 'text-[#8B9E8B]', glow: 'group-hover:shadow-[#8B9E8B]/10' },
  { bg: 'bg-[#7A8FA0]/10', border: 'border-[#7A8FA0]/20', icon: 'text-[#7A8FA0]', glow: 'group-hover:shadow-[#7A8FA0]/10' },
  { bg: 'bg-[#B8A882]/10', border: 'border-[#B8A882]/20', icon: 'text-[#B8A882]', glow: 'group-hover:shadow-[#B8A882]/10' },
  { bg: 'bg-[#B89393]/10', border: 'border-[#B89393]/20', icon: 'text-[#B89393]', glow: 'group-hover:shadow-[#B89393]/10' },
  { bg: 'bg-[#9B8FB0]/10', border: 'border-[#9B8FB0]/20', icon: 'text-[#9B8FB0]', glow: 'group-hover:shadow-[#9B8FB0]/10' },
  { bg: 'bg-[#8B9E8B]/10', border: 'border-[#8B9E8B]/20', icon: 'text-[#8B9E8B]', glow: 'group-hover:shadow-[#8B9E8B]/10' },
];

export function Features() {
  const { t } = useLang();

  return (
    <section id="features" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0E14] via-[#0E1016] to-[#0C0E14]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7A8FA0]/10 border border-[#7A8FA0]/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#7A8FA0] rounded-full" />
            <span className="text-[#7A8FA0] text-xs font-medium tracking-widest uppercase">
              {t.features.sectionBadge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#E8E4DC] mb-4">
            {t.features.title}{' '}
            <span className="bg-gradient-to-r from-[#8B9E8B] to-[#B8A882] bg-clip-text text-transparent">
              {t.features.titleHighlight}
            </span>
          </h2>
          <p className="text-[#A09890] text-lg max-w-2xl mx-auto leading-relaxed">
            {t.features.subtitle}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.items.map((feature, i) => {
            const colors = accentColors[i];
            return (
              <div
                key={i}
                className={`group relative bg-white/[0.025] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${colors.glow}`}
              >
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl ${colors.bg} border ${colors.border} ${colors.icon} mb-5`}>
                  {icons[i]}
                </div>

                <h3 className="text-[#E8E4DC] font-semibold text-lg mb-3">{feature.title}</h3>
                <p className="text-[#A09890] text-sm leading-relaxed">{feature.desc}</p>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden rounded-tr-2xl">
                  <div className={`absolute top-0 right-0 w-40 h-40 ${colors.bg} rounded-full -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
