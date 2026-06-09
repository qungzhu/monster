import { useLang } from '../../contexts/LanguageContext';

const platforms = [
  {
    name: 'Shopee',
    category: { en: 'E-Commerce', my: 'E-Dagang', zh: '电商平台' },
    commission: 'Up to 10%',
    color: '#E8724A',
    desc: {
      en: 'Share Shopee product links. Earn commission every time your audience buys.',
      my: 'Kongsi pautan produk Shopee. Jana komisen setiap kali audiens anda membeli.',
      zh: '分享Shopee商品链接，粉丝购买即得佣金，支持马来西亚、印尼、泰国等多国站点。',
    },
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <circle cx="20" cy="20" r="20" fill="#E8724A" opacity="0.15" />
        <path d="M20 8c-4.4 0-8 3.6-8 8h2c0-3.3 2.7-6 6-6s6 2.7 6 6h2c0-4.4-3.6-8-8-8z" fill="#E8724A" />
        <rect x="10" y="16" width="20" height="14" rx="2" fill="#E8724A" opacity="0.8" />
        <circle cx="16" cy="23" r="2" fill="white" />
        <circle cx="24" cy="23" r="2" fill="white" />
      </svg>
    ),
  },
  {
    name: 'TikTok Shop',
    category: { en: 'Short Video', my: 'Video Pendek', zh: '短视频电商' },
    commission: 'Up to 20%',
    color: '#FF004F',
    desc: {
      en: 'Add affiliate links to TikTok videos, livestreams, and bio. Highest commission rates.',
      my: 'Tambah pautan afiliasi ke video TikTok, siaran langsung, dan bio. Kadar komisen tertinggi.',
      zh: '在TikTok视频、直播和主页添加联盟链接，佣金比例最高，流量转化最强。',
    },
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <circle cx="20" cy="20" r="20" fill="#FF004F" opacity="0.12" />
        <path d="M22 10c.5 3.5 2.5 5 5 5v3.5c-2 0-3.8-.7-5-1.8V26a7 7 0 11-7-7v3.5a3.5 3.5 0 103.5 3.5V10H22z" fill="#FF004F" opacity="0.8" />
      </svg>
    ),
  },
  {
    name: 'Lazada',
    category: { en: 'E-Commerce', my: 'E-Dagang', zh: '电商平台' },
    commission: 'Up to 8%',
    color: '#0F146D',
    desc: {
      en: 'Promote Lazada products across Southeast Asia. Great for electronics, fashion & more.',
      my: 'Promosikan produk Lazada merentasi Asia Tenggara. Sesuai untuk elektronik, fesyen & lagi.',
      zh: '推广Lazada东南亚商品，覆盖马来西亚、印尼、菲律宾等多国，品类丰富。',
    },
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <circle cx="20" cy="20" r="20" fill="#0F146D" opacity="0.15" />
        <path d="M12 28V14l8-4 8 4v14l-8 4-8-4z" fill="#0F146D" opacity="0.7" />
        <path d="M12 14l8 4 8-4" stroke="#0F146D" strokeWidth="1.5" fill="none" />
        <path d="M20 18v10" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: 'Tiket.com',
    category: { en: 'Travel', my: 'Pelancongan', zh: '旅游出行' },
    commission: 'Up to 5%',
    color: '#2196F3',
    desc: {
      en: 'Earn on every flight, hotel, and experience booking made via your Tiket.com link.',
      my: 'Jana pendapatan untuk setiap tempahan penerbangan, hotel & pengalaman melalui pautan anda.',
      zh: '通过你的链接完成每笔机票、酒店、景点预订，即可获得返佣，适合旅游类博主。',
    },
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <circle cx="20" cy="20" r="20" fill="#2196F3" opacity="0.12" />
        <path d="M10 22l4-8 6 4 6-6 4 4" stroke="#2196F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        <path d="M8 28h24" stroke="#2196F3" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <circle cx="20" cy="14" r="3" fill="#2196F3" opacity="0.7" />
      </svg>
    ),
  },
  {
    name: 'Trip.com',
    category: { en: 'Travel', my: 'Pelancongan', zh: '旅游出行' },
    commission: 'Up to 6%',
    color: '#1E88E5',
    desc: {
      en: 'Global travel affiliate — hotels, flights, trains worldwide. Ideal for travel creators.',
      my: 'Afiliasi perjalanan global — hotel, penerbangan, kereta api seluruh dunia.',
      zh: '全球旅游联盟——推广全球酒店、机票、火车票，尤其适合境外旅游内容创作者。',
    },
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <circle cx="20" cy="20" r="20" fill="#1E88E5" opacity="0.12" />
        <circle cx="20" cy="20" r="9" stroke="#1E88E5" strokeWidth="1.5" fill="none" opacity="0.7" />
        <path d="M20 11v18M11 20h18" stroke="#1E88E5" strokeWidth="1" opacity="0.4" />
        <path d="M13 14c2 1.5 4 2 7 2s5-.5 7-2M13 26c2-1.5 4-2 7-2s5 .5 7 2" stroke="#1E88E5" strokeWidth="1" fill="none" opacity="0.6" />
      </svg>
    ),
  },
];

const useCaseContent = {
  en: {
    badge: 'Where to Use Mova',
    title: 'Earn Cashback & Commissions',
    titleHighlight: 'on Every Platform',
    subtitle: 'Share your Mova affiliate links across any platform below — when your audience clicks and buys, you earn.',
    howTitle: 'How Cashback & Commissions Work',
    steps: [
      { icon: '🔗', title: 'Get Your Link', desc: 'Mova generates a unique tracked affiliate link for any product on supported platforms.' },
      { icon: '📲', title: 'Share on Social Media', desc: 'Post on TikTok, Instagram, Xiaohongshu, YouTube, Telegram, or any channel.' },
      { icon: '🛍️', title: 'Audience Shops', desc: 'Your followers click your link and make a purchase within the cookie window.' },
      { icon: '💰', title: 'You Get Paid', desc: 'Commission is credited to your Mova wallet automatically. Withdraw anytime.' },
    ],
  },
  my: {
    badge: 'Di Mana Menggunakan Mova',
    title: 'Jana Cashback & Komisen',
    titleHighlight: 'di Setiap Platform',
    subtitle: 'Kongsi pautan afiliasi Mova anda di mana-mana platform di bawah — apabila audiens anda klik dan beli, anda jana pendapatan.',
    howTitle: 'Cara Cashback & Komisen Berfungsi',
    steps: [
      { icon: '🔗', title: 'Dapatkan Pautan Anda', desc: 'Mova menjana pautan afiliasi unik untuk sebarang produk di platform yang disokong.' },
      { icon: '📲', title: 'Kongsi di Media Sosial', desc: 'Siar di TikTok, Instagram, YouTube, Telegram atau mana-mana saluran.' },
      { icon: '🛍️', title: 'Audiens Membeli', desc: 'Pengikut anda klik pautan anda dan membuat pembelian dalam tempoh cookie.' },
      { icon: '💰', title: 'Anda Dibayar', desc: 'Komisen dikreditkan ke dompet Mova anda secara automatik. Keluarkan bila-bila masa.' },
    ],
  },
  zh: {
    badge: '在哪里使用 Mova',
    title: '在每个平台赚取',
    titleHighlight: '返券与佣金',
    subtitle: '将你的 Mova 专属推广链接分享到任意平台——粉丝点击购买，你就自动入账。',
    howTitle: '返券与佣金如何运作',
    steps: [
      { icon: '🔗', title: '获取专属链接', desc: 'Mova 为支持平台上的任意商品生成带追踪功能的专属联盟链接。' },
      { icon: '📲', title: '分享到社交平台', desc: '发布到抖音、小红书、Instagram、YouTube、微信、Telegram 等任意渠道。' },
      { icon: '🛍️', title: '粉丝下单购买', desc: '粉丝点击你的链接，在 Cookie 有效期内完成购买即可触发佣金。' },
      { icon: '💰', title: '自动到账提现', desc: '佣金自动存入你的 Mova 钱包，随时发起提现，多币种支持。' },
    ],
  },
};

export function UseCases() {
  const { lang } = useLang() as { lang: 'en' | 'my' | 'zh' };
  const content = useCaseContent[lang];

  return (
    <section id="use-cases" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0E14] via-[#0D1016] to-[#0C0E14]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B8A882]/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#B8A882]/10 border border-[#B8A882]/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#B8A882] rounded-full animate-pulse" />
            <span className="text-[#B8A882] text-xs font-medium tracking-widest uppercase">
              {content.badge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#E8E4DC] mb-4">
            {content.title}{' '}
            <span className="bg-gradient-to-r from-[#B8A882] to-[#8B9E8B] bg-clip-text text-transparent">
              {content.titleHighlight}
            </span>
          </h2>
          <p className="text-[#A09890] text-lg max-w-2xl mx-auto leading-relaxed">
            {content.subtitle}
          </p>
        </div>

        {/* Platform grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="group flex gap-5 p-6 bg-white/[0.025] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{ '--p-color': p.color } as React.CSSProperties}
            >
              <div className="flex-shrink-0">{p.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#E8E4DC] font-semibold text-base">{p.name}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${p.color}20`, color: p.color }}
                  >
                    {p.commission}
                  </span>
                </div>
                <div
                  className="text-[10px] font-medium mb-2 uppercase tracking-widest"
                  style={{ color: p.color + 'aa' }}
                >
                  {p.category[lang]}
                </div>
                <p className="text-[#A09890] text-xs leading-relaxed">{p.desc[lang]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works — cashback flow */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 md:p-12">
          <h3 className="text-[#E8E4DC] text-2xl font-bold text-center mb-10">
            {content.howTitle}
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {content.steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {/* Connector */}
                {i < content.steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-1/2 w-full h-px border-t border-dashed border-white/10" />
                )}
                <div className="relative z-10 w-14 h-14 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center text-2xl mb-4">
                  {step.icon}
                </div>
                <div className="text-[#E8E4DC] font-semibold text-sm mb-2">{step.title}</div>
                <div className="text-[#A09890] text-xs leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
