import { useLang } from '../../contexts/LanguageContext';

const content = {
  en: {
    badge: 'Affiliate Partners Commission',
    title: 'Transparent',
    titleHighlight: 'Commission Structure',
    subtitle: 'Two income streams, one platform. Earn sales commissions and multi-level cashback commissions simultaneously.',
    salesTitle: 'Sales Commission',
    cashbackTitle: 'Cashback Commission',
    salesNote: 'Earned when your referred members purchase or upgrade their membership plan.',
    cashbackNote: '* Cashback rates are determined by individual sellers/merchants on each platform — not fixed by Mova.',
    layers: 'layers',
    layer: 'layer',
    roles: {
      agent: { name: 'Agent', badge: 'Standard' },
      agentStar: { name: 'Agent Star', badge: 'Star ⭐' },
      partner: { name: 'Partner', badge: 'Partner' },
    },
    salesData: [
      { role: 'Agent', badge: 'Standard', pct: '20%', desc: 'Fixed 20% on every direct sales referral.' },
      { role: 'Partner', badge: 'Partner', pct: '20–50%', desc: 'Higher tier unlocks up to 50% sales commission.' },
    ],
    cashbackData: [
      {
        role: 'Agent',
        badge: 'Standard',
        layers: 1,
        pct: '10%',
        desc: 'Earn cashback from 1 level down in your network.',
        highlight: false,
      },
      {
        role: 'Agent Star',
        badge: '⭐ Star',
        layers: 3,
        pct: '20%',
        desc: 'Unlock 3-level deep cashback commissions across your entire downline.',
        highlight: true,
      },
      {
        role: 'Partner',
        badge: 'Partner',
        layers: 3,
        pct: '20%',
        desc: '3-level cashback commission — same depth as Agent Star, with higher sales rates.',
        highlight: true,
      },
    ],
    howLayers: 'How Multi-Level Cashback Works',
    layerExplain: [
      { label: 'Level 1 (You)', desc: 'Your direct audience buys via your link → you earn cashback.' },
      { label: 'Level 2', desc: 'Your recruited Agent\'s audience buys → you earn a share too.' },
      { label: 'Level 3', desc: 'Their recruited Agent\'s audience buys → you still earn (Star & Partner only).' },
    ],
  },
  my: {
    badge: 'Komisen Rakan Kongsi Afiliasi',
    title: 'Struktur Komisen',
    titleHighlight: 'Yang Telus',
    subtitle: 'Dua aliran pendapatan, satu platform. Jana komisen jualan dan komisen cashback berbilang peringkat serentak.',
    salesTitle: 'Komisen Jualan',
    cashbackTitle: 'Komisen Cashback',
    salesNote: 'Diperoleh apabila ahli yang anda rujuk membeli atau menaik taraf pelan keahlian mereka.',
    cashbackNote: '* Kadar cashback ditentukan oleh penjual/pedagang individu di setiap platform — bukan ditetapkan oleh Mova.',
    layers: 'peringkat',
    layer: 'peringkat',
    roles: {
      agent: { name: 'Agent', badge: 'Standard' },
      agentStar: { name: 'Agent Star', badge: 'Star ⭐' },
      partner: { name: 'Partner', badge: 'Partner' },
    },
    salesData: [
      { role: 'Agent', badge: 'Standard', pct: '20%', desc: 'Tetap 20% untuk setiap rujukan jualan langsung.' },
      { role: 'Partner', badge: 'Partner', pct: '20–50%', desc: 'Peringkat lebih tinggi membuka sehingga 50% komisen jualan.' },
    ],
    cashbackData: [
      {
        role: 'Agent',
        badge: 'Standard',
        layers: 1,
        pct: '10%',
        desc: 'Jana cashback dari 1 peringkat di bawah dalam rangkaian anda.',
        highlight: false,
      },
      {
        role: 'Agent Star',
        badge: '⭐ Star',
        layers: 3,
        pct: '20%',
        desc: 'Buka komisen cashback 3 peringkat merentasi keseluruhan downline anda.',
        highlight: true,
      },
      {
        role: 'Partner',
        badge: 'Partner',
        layers: 3,
        pct: '20%',
        desc: 'Komisen cashback 3 peringkat — kedalaman sama seperti Agent Star, dengan kadar jualan lebih tinggi.',
        highlight: true,
      },
    ],
    howLayers: 'Cara Cashback Berbilang Peringkat Berfungsi',
    layerExplain: [
      { label: 'Peringkat 1 (Anda)', desc: 'Audiens langsung anda membeli melalui pautan anda → anda dapat cashback.' },
      { label: 'Peringkat 2', desc: 'Audiens Agent yang anda rekrut membeli → anda turut mendapat bahagian.' },
      { label: 'Peringkat 3', desc: 'Audiens Agent mereka membeli → anda masih dapat (Star & Partner sahaja).' },
    ],
  },
  zh: {
    badge: '联盟伙伴佣金结构',
    title: '清晰透明的',
    titleHighlight: '佣金体系',
    subtitle: '两大收入来源，一个平台同步获取。销售佣金 + 多层返券佣金，双轨并行。',
    salesTitle: '销售佣金',
    cashbackTitle: '返券佣金',
    salesNote: '当你推荐的成员购买或升级会员方案时获得。',
    cashbackNote: '* 返券比例由各平台卖家/商家自行设定，Mova 不设固定费率。',
    layers: '层',
    layer: '层',
    roles: {
      agent: { name: 'Agent（代理）', badge: '标准' },
      agentStar: { name: 'Agent Star（星级代理）', badge: 'Star ⭐' },
      partner: { name: 'Partner（合伙人）', badge: 'Partner' },
    },
    salesData: [
      { role: 'Agent（代理）', badge: '标准', pct: '20%', desc: '每笔直接销售推荐固定获得 20% 佣金。' },
      { role: 'Partner（合伙人）', badge: 'Partner', pct: '20–50%', desc: '更高等级解锁最高 50% 的销售佣金。' },
    ],
    cashbackData: [
      {
        role: 'Agent（代理）',
        badge: '标准',
        layers: 1,
        pct: '10%',
        desc: '从网络中向下1层获取返券佣金分成。',
        highlight: false,
      },
      {
        role: 'Agent Star（星级代理）',
        badge: '⭐ Star',
        layers: 3,
        pct: '20%',
        desc: '解锁3层深度返券佣金，覆盖你的整个下线网络。',
        highlight: true,
      },
      {
        role: 'Partner（合伙人）',
        badge: 'Partner',
        layers: 3,
        pct: '20%',
        desc: '3层返券佣金——深度与星级代理相同，销售佣金比例更高。',
        highlight: true,
      },
    ],
    howLayers: '多层返券佣金如何运作',
    layerExplain: [
      { label: '第1层（你）', desc: '你的粉丝通过你的链接购买 → 你获得返券佣金。' },
      { label: '第2层', desc: '你招募的代理的粉丝购买 → 你也能分得一份佣金。' },
      { label: '第3层', desc: '他们招募的代理的粉丝购买 → 你仍可获益（仅限 Star & Partner）。' },
    ],
  },
};

const salesColors = ['#8B9E8B', '#B8A882'];
const cashbackColors = ['#7A8FA0', '#9B8FB0', '#B8A882'];

export function Commission() {
  const { lang } = useLang() as { lang: 'en' | 'my' | 'zh' };
  const c = content[lang];

  return (
    <section id="commission" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C0E14]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9B8FB0]/20 to-transparent" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#9B8FB0]/4 rounded-full blur-[130px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#9B8FB0]/10 border border-[#9B8FB0]/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#9B8FB0] rounded-full animate-pulse" />
            <span className="text-[#9B8FB0] text-xs font-medium tracking-widest uppercase">
              {c.badge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#E8E4DC] mb-4">
            {c.title}{' '}
            <span className="bg-gradient-to-r from-[#9B8FB0] to-[#7A8FA0] bg-clip-text text-transparent">
              {c.titleHighlight}
            </span>
          </h2>
          <p className="text-[#A09890] text-lg max-w-2xl mx-auto">{c.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">

          {/* Sales Commission */}
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#8B9E8B]/15 border border-[#8B9E8B]/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#8B9E8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[#E8E4DC] text-xl font-bold">{c.salesTitle}</h3>
            </div>
            <p className="text-[#706860] text-xs mb-6 italic">{c.salesNote}</p>

            <div className="space-y-4">
              {c.salesData.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-5 rounded-2xl border"
                  style={{
                    background: `${salesColors[i]}08`,
                    borderColor: `${salesColors[i]}25`,
                  }}
                >
                  <div
                    className="text-3xl font-bold tabular-nums min-w-[80px]"
                    style={{ color: salesColors[i] }}
                  >
                    {item.pct}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#E8E4DC] font-semibold text-sm">{item.role}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${salesColors[i]}20`, color: salesColors[i] }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[#A09890] text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cashback Commission */}
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#9B8FB0]/15 border border-[#9B8FB0]/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#9B8FB0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-[#E8E4DC] text-xl font-bold">{c.cashbackTitle}</h3>
            </div>
            <p className="text-[#706860] text-xs mb-6 italic">{c.cashbackNote}</p>

            <div className="space-y-4">
              {c.cashbackData.map((item, i) => (
                <div
                  key={i}
                  className="relative p-5 rounded-2xl border transition-all"
                  style={{
                    background: item.highlight ? `${cashbackColors[i]}10` : `${cashbackColors[i]}05`,
                    borderColor: item.highlight ? `${cashbackColors[i]}35` : `${cashbackColors[i]}15`,
                  }}
                >
                  {item.highlight && (
                    <div
                      className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${cashbackColors[i]}25`, color: cashbackColors[i] }}
                    >
                      3 {c.layers}
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    {/* Layer dots */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      {Array.from({ length: item.layers }).map((_, d) => (
                        <div
                          key={d}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: cashbackColors[i], opacity: 1 - d * 0.2 }}
                        />
                      ))}
                      {Array.from({ length: 3 - item.layers }).map((_, d) => (
                        <div key={d} className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#E8E4DC] font-semibold text-sm">{item.role}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${cashbackColors[i]}20`, color: cashbackColors[i] }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold" style={{ color: cashbackColors[i] }}>
                          {item.pct}
                        </span>
                        <span className="text-[#706860] text-xs">
                          · {item.layers} {item.layers === 1 ? c.layer : c.layers}
                        </span>
                      </div>
                      <p className="text-[#A09890] text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-level explanation */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8">
          <h3 className="text-[#E8E4DC] text-lg font-bold mb-8 text-center">{c.howLayers}</h3>
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {c.layerExplain.map((layer, i) => (
              <div key={i} className="flex-1 flex flex-col md:flex-row items-center">
                <div className="flex-1 flex flex-col items-center text-center px-4 py-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-3"
                    style={{ background: `linear-gradient(135deg, ${cashbackColors[i]}60, ${cashbackColors[i]}30)`, border: `1px solid ${cashbackColors[i]}40` }}
                  >
                    {i + 1}
                  </div>
                  <div className="text-[#E8E4DC] font-semibold text-sm mb-2">{layer.label}</div>
                  <div className="text-[#A09890] text-xs leading-relaxed">{layer.desc}</div>
                </div>
                {i < c.layerExplain.length - 1 && (
                  <div className="flex items-center justify-center md:px-2">
                    <svg className="w-5 h-5 text-white/15 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
