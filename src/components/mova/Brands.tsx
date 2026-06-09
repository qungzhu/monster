import { useLang } from '../../contexts/LanguageContext';

const brandNames = [
  'Shopee', 'Lazada', 'Amazon', 'Zalora', 'Grab', 'AirAsia',
  'Klook', 'Agoda', 'Shein', 'Temu', 'eBay', 'Rakuten',
];

export function Brands() {
  const { t } = useLang();

  return (
    <section id="brands" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C0E14]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7A8FA0]/15 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#9B8FB0]/10 border border-[#9B8FB0]/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#9B8FB0] rounded-full" />
            <span className="text-[#9B8FB0] text-xs font-medium tracking-widest uppercase">
              {t.brands.sectionBadge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#E8E4DC] mb-4">
            {t.brands.title}{' '}
            <span className="bg-gradient-to-r from-[#9B8FB0] to-[#7A8FA0] bg-clip-text text-transparent">
              {t.brands.titleHighlight}
            </span>
          </h2>
          <p className="text-[#A09890] text-lg max-w-xl mx-auto">{t.brands.subtitle}</p>
        </div>

        {/* Scrolling brand ticker */}
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0C0E14] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0C0E14] to-transparent z-10" />

          <div className="flex gap-4 brand-scroll">
            {[...brandNames, ...brandNames].map((brand, i) => (
              <div
                key={i}
                className="flex-shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-xl px-8 py-4 flex items-center justify-center min-w-[140px] hover:border-[#8B9E8B]/20 transition-colors duration-300"
              >
                <span className="text-[#A09890] font-medium text-sm tracking-wide whitespace-nowrap">
                  {brand}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">
          {[
            { value: '500+', label: 'Partner Brands' },
            { value: '15%', label: 'Avg Commission' },
            { value: '30-day', label: 'Cookie Window' },
            { value: '24/7', label: 'Support Available' },
          ].map((item) => (
            <div key={item.label} className="text-center py-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <div className="text-2xl font-bold text-[#E8E4DC] mb-1">{item.value}</div>
              <div className="text-[#A09890] text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
