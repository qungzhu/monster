import { useState, useEffect } from 'react';
import { useLang } from '../../contexts/LanguageContext';

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t.nav.home, href: '#home' },
    { label: t.nav.features, href: '#features' },
    { label: t.nav.howItWorks, href: '#how-it-works' },
    { label: t.nav.community, href: '#testimonials' },
    { label: t.nav.partners, href: '#brands' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'py-3 bg-[#0C0E14]/90 backdrop-blur-xl border-b border-white/5' : 'py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B9E8B] to-[#7A8FA0] flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-[#E8E4DC] font-semibold text-xl tracking-wide group-hover:text-[#8B9E8B] transition-colors">
            MOVA
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[#A09890] hover:text-[#E8E4DC] text-sm font-medium transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#8B9E8B] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* Right Controls */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                lang === 'en'
                  ? 'bg-[#8B9E8B] text-white'
                  : 'text-[#A09890] hover:text-[#E8E4DC]'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('my')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                lang === 'my'
                  ? 'bg-[#8B9E8B] text-white'
                  : 'text-[#A09890] hover:text-[#E8E4DC]'
              }`}
            >
              MY
            </button>
          </div>

          <a
            href="#cta"
            className="px-5 py-2 bg-[#8B9E8B] hover:bg-[#7A8E7A] text-white text-sm font-medium rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-[#8B9E8B]/20"
          >
            {t.nav.joinNow}
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-[#A09890] hover:text-[#E8E4DC] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0C0E14]/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-[#A09890] hover:text-[#E8E4DC] text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${lang === 'en' ? 'bg-[#8B9E8B] text-white' : 'text-[#A09890]'}`}
              >EN</button>
              <button
                onClick={() => setLang('my')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${lang === 'my' ? 'bg-[#8B9E8B] text-white' : 'text-[#A09890]'}`}
              >MY</button>
            </div>
            <a
              href="#cta"
              onClick={() => setMenuOpen(false)}
              className="flex-1 text-center px-5 py-2 bg-[#8B9E8B] text-white text-sm font-medium rounded-full"
            >
              {t.nav.joinNow}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
