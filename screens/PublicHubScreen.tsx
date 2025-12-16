
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    GlobeIcon, TrophyIcon, StarIcon, Users, History, WhatsApp,
    FacebookIcon, InstagramIcon, YouTubeIcon, TikTokIcon, GaugeIcon
} from '../icons';
import { useApp } from '../context';
import { Language } from '../translations/index';
import { useTranslation } from '../ui';
import { Player, PlayerStatus } from '../types';
import { PublicPlayerCard } from '../components/PublicPlayerCard';

// --- COMPONENTS ---

const BackgroundEffect: React.FC<{ mousePos: { x: number, y: number } }> = ({ mousePos }) => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020204]">
        {/* 1. Subtle Top Spotlight (White/Blue tint) - Creates depth behind text */}
        <div 
            className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-white rounded-full blur-[150px] opacity-[0.03] transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${mousePos.x * -50}px) translateY(${mousePos.y * -30}px)` }}
        ></div>

        {/* 2. Very subtle bottom glow (Brand Cyan) - Anchors the page */}
        <div 
            className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-[#00F2FE] rounded-full blur-[180px] opacity-[0.05] transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${mousePos.x * 30}px) translateY(${mousePos.y * 20}px)` }}
        ></div>

        {/* 3. Noise Texture (Ultra subtle) to prevent color banding */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
    </div>
);

const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const languages: { code: Language; label: string }[] = [
        { code: 'en', label: 'EN' },
        { code: 'ua', label: 'UA' },
        { code: 'vn', label: 'VN' },
        { code: 'ru', label: 'RU' }
    ];

    const selectLang = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={wrapperRef}>
            {/* The Trigger: Simplified Text & Icon */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors duration-300"
            >
                <GlobeIcon className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wider uppercase">Language</span>
            </button>

            {/* The Expanded HUD Grid - Repositioned to be a dropdown */}
            <div 
                className={`
                    absolute top-full mt-2 right-0 flex items-center gap-2
                    transition-all duration-300 ease-out origin-top-right
                    ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}
                `}
            >
                {languages.map((lang, index) => (
                    <button
                        key={lang.code}
                        onClick={() => selectLang(lang.code)}
                        className={`
                            relative w-10 h-10 flex items-center justify-center
                            border rounded-lg text-[10px] font-bold font-mono tracking-widest uppercase
                            transition-all duration-300 hover:scale-110 active:scale-95
                            ${language === lang.code 
                                ? 'bg-[#00F2FE]/10 border-[#00F2FE] text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.3)]' 
                                : 'bg-black/60 border-white/10 text-zinc-500 hover:text-white hover:border-white/30'
                            }
                        `}
                        style={{ 
                            transitionDelay: `${index * 50}ms` 
                        }}
                    >
                        {lang.code}
                    </button>
                ))}
            </div>
        </div>
    );
};

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const navItems = ['Hub', 'Rankings', 'History', 'News'];
    
    return (
        <header className="fixed top-4 left-4 right-4 z-50">
            <div className="bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
                <nav className="px-8 h-20 flex items-center justify-between">
                    {/* LOGO AREA (Left) */}
                    <div 
                        className="inline-flex items-center gap-3 cursor-pointer group" 
                        onClick={() => navigate('/')}
                    >
                        {/* 532 Box with Glow Effect */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#00F2FE] blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative px-2.5 h-9 bg-white/5 border border-white/10 rounded-md flex items-center justify-center font-black text-white font-orbitron tracking-tight text-lg shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <span className="text-[#00F2FE]">532</span>
                            </div>
                        </div>
                        
                        {/* PLAYGROUND Text */}
                        <div className="flex flex-col">
                            <span className="font-bold text-white tracking-[0.3em] text-xs leading-none group-hover:text-[#00F2FE] transition-colors duration-300">
                                Club
                            </span>
                            <span className="text-[8px] text-zinc-600 font-mono tracking-widest leading-none mt-1 group-hover:text-zinc-400 transition-colors">
                                PUBLIC HUB
                            </span>
                        </div>
                    </div>

                    {/* NAVIGATION LINKS (Center) - Hidden on mobile */}
                    <div className="hidden md:flex items-center justify-center flex-grow px-12">
                        {navItems.map((item, index) => (
                            <a
                                key={item}
                                href={item === 'Rankings' ? '#/player-database' : '#'} // Placeholder link
                                className={`
                                    relative text-sm font-semibold uppercase tracking-wider transition-all duration-300 px-3 py-1.5 rounded-lg border
                                    ${item === 'Hub'
                                        ? 'text-white border-[#00F2FE] bg-[#00F2FE]/10 shadow-[0_0_10px_rgba(0,242,254,0.3)]' 
                                        : 'text-zinc-400 border-transparent hover:text-white'
                                    }
                                `}
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    {/* LANGUAGE SELECTOR (Right) */}
                    <LanguageSelector />
                </nav>
            </div>
        </header>
    );
};

const HeroSection: React.FC = () => {
    const t = useTranslation();
    const rotatingWords = useMemo(() => [
        t.hub_word_legacy || "LEGACY",
        t.hub_word_game || "GAME",
        t.hub_word_skill || "SKILL",
        t.hub_word_victory || "VICTORY"
    ], [t]);
    const [wordIndex, setWordIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        setWordIndex(0); // Reset index on language change to be safe
        const wordInterval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setWordIndex(prev => (prev + 1) % rotatingWords.length);
                setIsFading(false);
            }, 500); // animation duration (must match transition duration)
        }, 4000); // Time between changes
        return () => clearInterval(wordInterval);
    }, [rotatingWords]);


    return (
        <section className="relative z-10 w-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4 pt-40 pb-8">
            {/* Main Title - Clean & High Contrast (Parallax effect removed) */}
            <h1 
                className="max-w-7xl mx-auto font-russo text-6xl md:text-8xl lg:text-9xl uppercase leading-none text-white drop-shadow-2xl animate-in fade-in zoom-in duration-1000"
            >
                <span className="tracking-wider">{t.hub_slogan_1}</span> <br />
                <span 
                    className={`
                        text-transparent bg-clip-text bg-gradient-to-b from-[#00F2FE] to-[#00F2FE]/60 
                        transition-all duration-500 ease-in-out inline-block
                        ${isFading ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}
                    `}
                >
                    {rotatingWords[wordIndex]}
                </span>
            </h1>

            {/* Subtext - Improved Readability & Translatable */}
            <p className="mt-8 max-w-lg text-zinc-400 text-sm md:text-base leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                {t.hub_description}
            </p>

        </section>
    );
};

// --- PLACEHOLDER CARD FOR EMPTY SLOTS ---
// Minimalist "Empty State" card with matching styles
const PlaceholderCard: React.FC<{ rank: string; height: string; style?: React.CSSProperties }> = ({ rank, height, style }) => (
    <div 
        className="relative rounded-[2rem] overflow-hidden bg-dark-surface/30 flex flex-col items-center justify-center gap-4 group backdrop-blur-sm"
        style={{ height, ...style }}
    >
        {/* Animated Skeleton Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
        
        {/* Subtle Brand Watermark */}
        <div className="opacity-10 text-center">
            <span className="block font-black text-6xl text-white font-orbitron">532</span>
        </div>

        <div className="text-center absolute bottom-10 w-full">
            <p className="text-white/20 font-bold tracking-[0.3em] text-xs uppercase">Available</p>
            <p className="text-[#00F2FE]/30 text-[10px] font-mono mt-1">RANK #{rank}</p>
        </div>
    </div>
);

const LeadersSection: React.FC = () => {
    const t = useTranslation();
    const { allPlayers } = useApp();

    // 1. Get Top 3 Players
    const topPlayers = React.useMemo(() => {
        return allPlayers
            .filter(p => p.status === PlayerStatus.Confirmed)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 3);
    }, [allPlayers]);

    // Construct the podium data (Always 3 slots, filled with real players or nulls)
    const podiumSlots = [
        topPlayers[1] || null, // 2nd (Left)
        topPlayers[0] || null, // 1st (Center)
        topPlayers[2] || null  // 3rd (Right)
    ];

    return (
        <section className="relative z-10 w-full px-4 pb-20">
            {/* Section Header */}
            <div className="flex flex-col items-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#00F2FE]"></div>
                    <TrophyIcon className="w-5 h-5 text-[#00F2FE]" />
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#00F2FE]"></div>
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-orbitron uppercase tracking-widest text-white text-center">
                    {t.hub_leaders_title}
                </h2>
            </div>

            {/* Podium Container - Responsive Grid/Flex */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-4 max-w-6xl mx-auto min-h-[440px]">
                {podiumSlots.map((player, index) => {
                    // Index 0 = Silver (Left), 1 = Gold (Center), 2 = Bronze (Right)
                    const isCenter = index === 1; 
                    const isLeft = index === 0;
                    
                    // Determine styling based on rank
                    let zIndex = isCenter ? 30 : 20; // Default Z-index
                    let style: React.CSSProperties = {};
                    
                    // Specific Color Definitions - mimicking button glow
                    if (isCenter) { // Gold (1st)
                        style = {
                            borderColor: 'rgba(255, 215, 0, 0.4)',
                            boxShadow: '0 20px 50px -10px rgba(255, 215, 0, 0.25)',
                            borderWidth: '1px'
                        };
                    } else if (isLeft) { // Silver (2nd)
                        style = {
                            borderColor: 'rgba(226, 232, 240, 0.3)', // Slate-200 like color
                            boxShadow: '0 20px 40px -10px rgba(226, 232, 240, 0.15)',
                            borderWidth: '1px'
                        };
                    } else { // Bronze (3rd)
                        style = {
                            borderColor: 'rgba(249, 115, 22, 0.4)', // Orange/Bronze
                            boxShadow: '0 20px 40px -10px rgba(249, 115, 22, 0.2)',
                            borderWidth: '1px'
                        };
                    }

                    // Positioning Classes (Vertical Stepping)
                    const positionClass = isCenter ? 'translate-y-0' : 'translate-y-10';
                    const baseScaleClass = isCenter ? 'scale-100' : 'scale-95';
                    
                    // Sizes
                    const maxWidth = isCenter ? 'max-w-[300px]' : 'max-w-[270px]';

                    // Mobile adjustments: Stack vertically, Gold on top
                    const mobileOrder = isCenter ? 1 : (isLeft ? 2 : 3);

                    return (
                        <div 
                            key={player ? player.id : `placeholder-${index}`} 
                            className={`
                                relative w-full ${maxWidth} 
                                transition-all duration-300 ease-out 
                                ${positionClass} ${baseScaleClass}
                                hover:scale-105 hover:-translate-y-2 hover:z-50
                                order-${mobileOrder} md:order-none
                                cursor-pointer
                            `}
                            style={{ 
                                zIndex: zIndex,
                            }}
                        >
                            {/* Rank Indicator Badge */}
                            <div className={`
                                absolute -top-5 left-1/2 -translate-x-1/2 z-50
                                flex items-center gap-1 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg
                                ${isCenter ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 
                                  isLeft ? 'bg-gray-300/20 border-gray-300 text-gray-200' :
                                  'bg-orange-700/20 border-orange-600 text-orange-400'}
                            `}>
                                <StarIcon className="w-3 h-3 fill-current" />
                                <span className="text-xs font-black tracking-widest">
                                    {isCenter ? '1ST' : (isLeft ? '2ND' : '3RD')}
                                </span>
                            </div>

                            {/* The Card or Placeholder */}
                            {player ? (
                                <PublicPlayerCard 
                                    player={player} 
                                    cardStyle={{
                                        height: isCenter ? '430px' : '390px', 
                                        ...style
                                    }}
                                    showNavigation={false}
                                />
                            ) : (
                                <PlaceholderCard 
                                    rank={isCenter ? '1' : (isLeft ? '2' : '3')} 
                                    height={isCenter ? '430px' : '390px'} 
                                    style={style}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const StatGaugeWidget: React.FC<{
    value: string;
    label: string;
}> = ({ value, label }) => {
    return (
        <div className="relative rounded-3xl p-px group cursor-pointer overflow-hidden bg-white/5 border border-white/10 shadow-lg">
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-dark-accent-start/30 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative h-44 w-full bg-[#0A0B0F]/90 backdrop-blur-md rounded-[23px] overflow-hidden p-4 flex flex-col items-center justify-center">
                {/* 1. Base Layer (Glass) */}
                <div className="absolute inset-0 border border-white/10 rounded-[23px]"></div>
                
                {/* 2. Content - SVG Gauge */}
                <div className="relative w-full h-full flex items-center justify-center">
                    <svg viewBox="0 0 100 60" className="absolute w-full h-full -top-4 overflow-visible">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#00F2FE" stopOpacity="0" />
                                <stop offset="50%" stopColor="#00F2FE" stopOpacity="1" />
                                <stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
                            </linearGradient>
                            <filter id="gaugeGlow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* Background Arc */}
                        <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                         {/* Foreground Arc */}
                        <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="125.6"
                            strokeDashoffset="0"
                            filter="url(#gaugeGlow)"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>

                    <div className="relative z-10 text-center">
                        <span className="font-teko font-bold text-5xl text-white transition-all duration-300 group-hover:text-dark-accent-start group-hover:[text-shadow:0_0_15px_rgba(0,242,254,0.7)] leading-none">
                            {value}
                        </span>
                        <span className="block text-xs font-semibold text-dark-text-secondary uppercase tracking-widest mt-2">
                            {label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ClubStatsSection: React.FC = () => {
    const t = useTranslation();
    const { allPlayers, history, fetchHistory } = useApp();
    const [stats, setStats] = useState({
        activeMembers: 0,
        averageRating: 0,
        sessionsPlayed: 0
    });

    useEffect(() => {
        // Fetch full history to get accurate session count
        fetchHistory(); 
    }, [fetchHistory]);

    useEffect(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const memberCount = confirmedPlayers.length;
        const avgRating = memberCount > 0 
            ? Math.round(confirmedPlayers.reduce((sum, p) => sum + p.rating, 0) / memberCount)
            : 0;
        
        // Use history.length AFTER it's been fetched
        const sessionCount = history.length;

        setStats({
            activeMembers: memberCount,
            averageRating: avgRating,
            sessionsPlayed: sessionCount
        });

    }, [allPlayers, history]);


    return (
        <section className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-20 -mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
                <StatGaugeWidget value={String(stats.activeMembers)} label={t.hub_active_members} />
                <StatGaugeWidget value={String(stats.averageRating)} label={t.hub_avg_rating} />
                <StatGaugeWidget value={String(stats.sessionsPlayed)} label={t.hub_sessions_played} />
            </div>
        </section>
    );
};

const Footer: React.FC = () => {
    const t = useTranslation();
    const SOCIAL_LINKS = {
        whatsapp: "https://chat.whatsapp.com/CAJnChuM4lQFf3s2YUnhQr",
        facebook: "https://www.facebook.com/share/g/1ANVC1p1K5/",
        instagram: "https://www.instagram.com/532playground?igsh=MTdzdHpwMjY3aHN4cg%3D%3D&utm_source=qr",
        youtube: "https://youtube.com/@playground532?si=_NqI_aOcvmjlSMFn",
        tiktok: "https://www.tiktok.com/@532playground",
    };

    const socialIcons = [
        { name: 'YouTube', href: SOCIAL_LINKS.youtube, Icon: YouTubeIcon },
        { name: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
        { name: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon },
        { name: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
    ];

    return (
        <footer className="relative z-10 mt-12 pb-8">
            {/* Neon Separator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#00F2FE]/50 to-transparent mb-8" />

            <div className="max-w-4xl mx-auto px-4 text-center">
                {/* Main CTA */}
                <h2 className="font-russo text-3xl uppercase tracking-wider text-white mb-2">
                    {t.footer_cta_title}
                </h2>
                <p className="text-zinc-400 text-xs mb-6 max-w-md mx-auto">
                    {t.footer_cta_desc}
                </p>

                {/* WhatsApp Button */}
                <div className="animate-in fade-in zoom-in duration-500 delay-100">
                    <a 
                        href={SOCIAL_LINKS.whatsapp} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-base py-2.5 px-6 rounded-lg shadow-[0_0_20px_rgba(37,211,102,0.3)] transition-all transform hover:scale-105 active:scale-95"
                    >
                        <WhatsApp className="w-5 h-5 fill-current" />
                        <span>WhatsApp</span>
                    </a>
                </div>

                {/* Other Socials */}
                <div className="flex justify-center gap-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    {socialIcons.map(({ name, href, Icon }) => (
                        <a 
                            key={name} 
                            href={href} 
                            target="_blank" 
                            rel="noreferrer"
                            aria-label={`Visit our ${name}`}
                            className="text-zinc-500 hover:text-white transition-colors duration-300 transform hover:scale-110"
                        >
                            <Icon className="w-5 h-5" />
                        </a>
                    ))}
                </div>

                {/* Copyright */}
                <p className="text-[10px] text-zinc-600 mt-10 font-mono animate-in fade-in duration-500 delay-400">
                     {t.footer_copyright.replace('{year}', new Date().getFullYear().toString())}
                </p>
            </div>
        </footer>
    );
};

export const PublicHubScreen: React.FC = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            const { innerWidth, innerHeight } = window;
            const x = (event.clientX / innerWidth) - 0.5; // -0.5 to 0.5
            const y = (event.clientY / innerHeight) - 0.5; // -0.5 to 0.5
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#020204] text-white font-sans relative overflow-x-hidden selection:bg-[#00F2FE] selection:text-black">
            
            <BackgroundEffect mousePos={mousePos} />
            
            <Navbar />

            {/* MAIN CONTENT CONTAINER */}
            <main className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-12">
                <HeroSection />
                
                <LeadersSection />

                <ClubStatsSection />
                
                {/* Placeholder for Next Blocks (News) */}
                <div className="w-full text-center opacity-30 -mt-10">
                    <p className="text-xs font-mono tracking-widest">MORE STATS COMING SOON</p>
                </div> 
            </main>

            <Footer />

        </div>
    );
};