import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, User, BookHeart, Settings, Gamepad2 } from 'lucide-react';

const navItems = [
  { path: '/', icon: Gamepad2, label: '主界面' },
  { path: '/chat', icon: MessageCircle, label: '对话' },
  { path: '/profile', icon: User, label: '档案' },
  { path: '/mood', icon: BookHeart, label: '心情' },
  { path: '/settings', icon: Settings, label: '设置' },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div
        className="max-w-lg mx-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 10, 25, 0.85) 0%, rgba(10, 8, 20, 0.98) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-around py-1.5 px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'var(--char-gradient, linear-gradient(135deg, #d97706, #fbbf24))',
                      opacity: 0.12,
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-line"
                    className="absolute -top-0.5 w-6 h-0.5 rounded-full"
                    style={{ background: 'var(--char-primary, #d97706)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  size={20}
                  className={isActive ? '' : 'text-text-muted'}
                  style={isActive ? { color: 'var(--char-primary, #d97706)' } : undefined}
                />
                <span
                  className={`text-[9px] ${isActive ? 'font-bold' : 'text-text-muted'}`}
                  style={isActive ? { color: 'var(--char-primary, #d97706)' } : undefined}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
