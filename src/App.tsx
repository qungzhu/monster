import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <LanguageProvider>
      <HomePage />
    </LanguageProvider>
  );
}
