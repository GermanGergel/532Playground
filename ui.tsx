
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from './context';
import { translations } from './translations/index';
import { 
    Home, VideoCamera, BarChartDynamic, History, Settings, ChevronLeft 
} from './icons';

// Translation Hook
export const useTranslation = () => {
    const { language } = useApp();
    return translations[language];
}

// UI Components
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
  const baseClasses = "font-bold text-lg py-3 px-6 rounded-xl focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100";
  const variantClasses = {
    primary: 'gradient-bg animate-gradient-bg text-dark-bg focus:ring-dark-accent-start',
    secondary: 'bg-dark-surface/80 backdrop-blur-sm text-dark-text border border-white/10 hover:bg-white/10 focus:ring-dark-text-secondary',
    danger: 'bg-dark-danger text-dark-text focus:ring-dark-danger',
    ghost: 'bg-transparent text-current hover:bg-dark-surface/80'
  };
  return <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>{children}</button>;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
  hideCloseButton?: boolean;
  containerClassName?: string;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', hideCloseButton = false, containerClassName }) => {
  if (!isOpen) return null;
  const sizeClasses = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
  };
  const paddingClass = size === 'xs' ? 'p-4' : 'p-6';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
      <div className={`relative bg-dark-surface/80 backdrop-blur-xl text-dark-text rounded-2xl shadow-xl w-full ${sizeClasses[size]} ${paddingClass} border border-white/10 ${containerClassName}`}>
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            {!hideCloseButton && <button onClick={onClose} className="text-3xl text-dark-text-secondary hover:text-dark-text transition-colors">&times;</button>}
          </div>
        )}
        {!title && !hideCloseButton && (
            <button onClick={onClose} className="absolute top-3 right-4 text-3xl text-dark-text-secondary hover:text-dark-text transition-colors leading-none z-10">&times;</button>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export const BottomNav: React.FC = () => {
    const t = useTranslation();
    const { activeSession, language } = useApp();
    
    const commonClass = "flex flex-col items-center justify-center flex-1 text-dark-text-secondary transition-colors duration-300";
    const activeClass = "text-dark-text";
    const disabledClass = "opacity-40 pointer-events-none";

    const isMatchReady = activeSession && activeSession.games.length > 0;
    const navTextSize = (language === 'ru' || language === 'vn') ? 'text-[8px]' : 'text-xs';

    return (
        <div className="fixed bottom-4 inset-x-0 px-4 z-50">
            <nav className="max-w-md mx-auto h-16 flex justify-around items-center bg-dark-surface/40 backdrop-blur-xl border border-dark-accent-start/40 rounded-full shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <NavLink to="/" className={({isActive}) => `${commonClass} ${isActive ? activeClass : ''}`}>
                    <Home className="mb-1"/>
                    <span className={`${navTextSize} font-medium`}>{t.navHome}</span>
                </NavLink>
                <NavLink to="/match" className={({isActive}) => `${commonClass} ${isActive ? activeClass : ''} ${!isMatchReady ? disabledClass : ''}`}>
                    <VideoCamera className="mb-1"/>
                    <span className={`${navTextSize} font-medium`}>{t.navLive}</span>
                </NavLink>
                <NavLink to="/statistics" className={({isActive}) => `${commonClass} ${isActive ? activeClass : ''} ${!isMatchReady ? disabledClass : ''}`}>
                    <BarChartDynamic className="mb-1"/>
                    <span className={`${navTextSize} font-medium`}>{t.navStatistics}</span>
                </NavLink>
                <NavLink to="/history" className={({isActive}) => `${commonClass} ${isActive ? activeClass : ''}`}>
                    <History className="mb-1"/>
                    <span className={`${navTextSize} font-medium`}>{t.navHistory}</span>
                </NavLink>
                <NavLink to="/settings" className={({isActive}) => `${commonClass} ${isActive ? activeClass : ''}`}>
                    <Settings className="mb-1"/>
                    <span className={`${navTextSize} font-medium`}>{t.navSettings}</span>
                </NavLink>
            </nav>
        </div>
    );
};

export const Page: React.FC<{children: React.ReactNode, title?: string, className?: string} & React.HTMLAttributes<HTMLDivElement>> = ({children, title, className = '', ...props}) => (
    // FIX: Added 'w-full overflow-x-hidden' to strictly prevent horizontal scrolling/swiping
    <div className={`p-4 pb-28 w-full overflow-x-hidden box-border ${className}`} {...props}>
        {title && <h1 className="text-4xl font-bold mb-6">{title}</h1>}
        <div className="max-w-sm mx-auto w-full">
            {children}
        </div>
    </div>
);

export const PageHeader: React.FC<{ title: string; children?: React.ReactNode; hideBack?: boolean }> = ({ title, children, hideBack }) => {
    const navigate = useNavigate();
    return (
        <div className="flex items-center justify-between mb-8">
            {hideBack ? (
                <div className="w-9" />
            ) : (
                <Button variant="ghost" className="!p-2 -ml-2" onClick={() => navigate(-1)}>
                    <ChevronLeft className="w-7 h-7" />
                </Button>
            )}
            <h1 className="text-2xl font-bold text-center absolute left-1/2 -translate-x-1/2">{title}</h1>
            <div className="w-9">{children}</div> {/* Spacer to balance the back button */}
        </div>
    );
};

export const Card: React.FC<{title?: string, children: React.ReactNode, className?: string} & React.HTMLAttributes<HTMLDivElement>> = ({title, children, className, ...props}) => (
    <div className={`relative rounded-2xl bg-dark-surface/80 backdrop-blur-sm border border-white/10 p-3 sm:p-4 ${className}`} {...props}>
        {title && <h2 className="text-xs font-bold mb-2">{title}</h2>}
        {children}
    </div>
);

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
}
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
        isOn ? 'gradient-bg focus:ring-dark-accent-start' : 'bg-gray-600 focus:ring-gray-400'
      }`}
    >
      <span
        className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 ${
          isOn ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

export const SessionModeIndicator: React.FC = () => {
    const { activeSession } = useApp();
    if (!activeSession) return null;

    const isTest = activeSession.isTestMode === true;
    const color = isTest ? '#FF4136' : '#00F2FE'; // Red for test, Neon for real
    const glowColor = isTest ? 'rgba(255, 65, 54, 0.5)' : 'rgba(0, 242, 254, 0.5)';

    return (
        <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ 
                backgroundColor: color,
                boxShadow: `0 0 4px ${glowColor}`,
            }}
            title={isTest ? 'Test Mode' : 'Real Session'}
        />
    );
};
