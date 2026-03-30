import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, User, BookHeart, Settings, Sparkles } from 'lucide-react';

const navItems = [
  { path: '/', icon: Sparkles, label: '首页' },
  { path: '/chat', icon: MessageCircle, label: '聊天' },
  { path: '/profile', icon: User, label: '档案' },
  { path: '/mood', icon: BookHeart, label: '心情' },
  { path: '/settings', icon: Settings, label: '设置' },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 w-8 h-1 rounded-full"
                  style={{ background: 'var(--char-gradient, linear-gradient(135deg, #e91e8c, #ff6eb4))' }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                size={20}
                className={isActive ? 'text-primary-light' : 'text-text-muted'}
                style={isActive ? { color: 'var(--char-primary, #e91e8c)' } : undefined}
              />
              <span
                className={`text-[10px] ${isActive ? 'text-text-primary font-medium' : 'text-text-muted'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
