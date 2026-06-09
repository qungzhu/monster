import { Navbar } from '../components/mova/Navbar';
import { Hero } from '../components/mova/Hero';
import { Features } from '../components/mova/Features';
import { UseCases } from '../components/mova/UseCases';
import { HowItWorks } from '../components/mova/HowItWorks';
import { Testimonials } from '../components/mova/Testimonials';
import { Brands } from '../components/mova/Brands';
import { JoinCTA } from '../components/mova/JoinCTA';
import { Footer } from '../components/mova/Footer';

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#0C0E14] text-[#E8E4DC]">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <UseCases />
        <HowItWorks />
        <Testimonials />
        <Brands />
        <JoinCTA />
      </main>
      <Footer />
    </div>
  );
}
