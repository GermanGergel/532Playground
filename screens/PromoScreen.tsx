
import React, { useState, useEffect, useRef } from 'react';
import { PublicPlayerCard } from '../components/PublicPlayerCard';
import { LastSessionBreakdown } from '../components/PlayerCardAnalytics';
import { Player, PlayerStatus, PlayerTier } from '../types';
import { WhatsApp, TrophyIcon, VideoCamera, BarChartDynamic } from '../icons';
import { BrandedHeader } from './utils';
import { loadPromoData, getSessionAnthemUrl } from '../db';

// --- CONFIGURATION ---
const SOCIAL_LINKS = {
    whatsapp: "https://chat.whatsapp.com/CAJnChuM4lQFf3s2YUnhQr",
    facebook: "https://www.facebook.com/share/g/1ANVC1p1K5/",
    instagram: "https://www.instagram.com/532playground?igsh=MTdzdHpwMjY3aHN4cg%3D%3D&utm_source=qr",
    youtube: "https://youtube.com/@playground532?si=_NqI_aOcvmjlSMFn",
    tiktok: "https://www.tiktok.com/@532playground",
};

// Default Fallback if no DB data
const DEFAULT_PROMO_PLAYER: Player = {
    id: 'promo_hero',
    nickname: 'MAVERICK',
    surname: 'LEGEND',
    createdAt: new Date().toISOString(),
    status: PlayerStatus.Confirmed,
    countryCode: 'VN',
    rating: 94,
    tier: PlayerTier.Legend,
    playerCard: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop", 
    totalGoals: 142,
    totalAssists: 88,
    totalGames: 200,
    totalWins: 150,
    totalDraws: 20,
    totalLosses: 30,
    totalSessionsPlayed: 45,
    monthlyGoals: 12,
    monthlyAssists: 8,
    monthlyGames: 10,
    monthlyWins: 9,
    monthlySessionsPlayed: 2,
    form: 'hot_streak',
    skills: ['finisher', 'power_shot', 'leader', 'technique'],
    badges: { 'goleador': 5, 'mvp': 10, 'dynasty': 2, 'sniper': 4, 'club_legend_goals': 1 },
    lastPlayedAt: new Date().toISOString(),
    lastRatingChange: {
        previousRating: 92.5,
        teamPerformance: 0.8,
        individualPerformance: 0.5,
        badgeBonus: 0.2,
        finalChange: 1.5,
        newRating: 94,
        badgesEarned: ['mvp', 'goleador']
    },
    sessionHistory: [{winRate: 60}, {winRate: 80}, {winRate: 100}, {winRate: 80}, {winRate: 100}],
    records: {
        bestGoalsInSession: { value: 12, sessionId: 'demo' },
        bestAssistsInSession: { value: 9, sessionId: 'demo' },
        bestWinRateInSession: { value: 100, sessionId: 'demo' },
    },
    historyData: [
        { date: 'Jan', rating: 88, winRate: 60, goals: 10, assists: 5 },
        { date: 'Feb', rating: 90, winRate: 75, goals: 15, assists: 8 },
        { date: 'Mar', rating: 94, winRate: 85, goals: 12, assists: 10 }
    ]
};

// --- CONTENT TRANSLATIONS ---
type Lang = 'en' | 'vn' | 'ru';
const TEXT = {
    en: {
        hero_title: "PLAY LIKE A PRO",
        hero_subtitle: "The most advanced futsal community in Da Nang.",
        feature_card: "Your Personal FUT Card",
        feature_card_desc: "Get your own card. Rating updates automatically after every match based on your real performance.",
        feature_live: "Live Rating Updates",
        feature_live_desc: "See exactly how your performance impacts your rating after every session.",
        feature_stats: "Detailed Statistics",
        feature_stats_desc: "We track everything: goals, assists, wins, and clean sheets. Numbers establish your status.",
        feature_fair: "Smart Balance System",
        feature_fair_desc: "Teams are balanced by algorithm. New players undergo a 3-game calibration phase to establish their true rating.",
        roadmap_title: "THE FUTURE IS HERE",
        roadmap_video: "Video Highlights",
        roadmap_video_desc: "AI-generated clips of your best goals (Coming Soon).",
        roadmap_leagues: "Leagues & Tournaments",
        roadmap_leagues_desc: "Compete for the seasonal cup and prizes.",
        cta_join: "JOIN THE SQUAD",
        cta_desc: "Connect with us on WhatsApp to book your slot.",
        tap_to_enter: "TAP TO ENTER"
    },
    vn: {
        hero_title: "CHƠI NHƯ CHUYÊN NGHIỆP",
        hero_subtitle: "Cộng đồng futsal hiện đại nhất tại Đà Nẵng.",
        feature_card: "Thẻ Cầu Thủ Của Bạn",
        feature_card_desc: "Sở hữu thẻ riêng. Chỉ số cập nhật tự động sau mỗi trận dựa trên phong độ thực tế.",
        feature_live: "Cập Nhật Rating Tức Thì",
        feature_live_desc: "Xem chính xác hiệu suất của bạn ảnh hưởng thế nào đến xếp hạng sau mỗi buổi tập.",
        feature_stats: "Thống Kê Chi Tiết",
        feature_stats_desc: "Theo dõi bàn thắng, kiến tạo, trận thắng. Con số khẳng định đẳng cấp.",
        feature_fair: "Hệ Thống Cân Bằng",
        feature_fair_desc: "Chia đội bằng thuật toán. Người chơi mới cần qua 3 trận định vị (calibration) để có xếp hạng chuẩn.",
        roadmap_title: "TƯƠNG LAI CỦA BÓNG ĐÁ",
        roadmap_video: "Video Highlights",
        roadmap_video_desc: "Clip bàn thắng đẹp nhất của bạn (Sắp ra mắt).",
        roadmap_leagues: "Giải Đấu & Cup",
        roadmap_leagues_desc: "Cạnh tranh cho cúp mùa giải và giải thưởng.",
        cta_join: "THAM GIA NGAY",
        cta_desc: "Liên hệ qua WhatsApp để đặt chỗ.",
        tap_to_enter: "CHẠM ĐỂ VÀO"
    },
    ru: {
        hero_title: "ИГРАЙ КАК ПРОФИ",
        hero_subtitle: "Самое технологичное футбольное комьюнити в Дананге.",
        feature_card: "Твоя Личная Карточка",
        feature_card_desc: "Как в FIFA. Рейтинг обновляется автоматически после каждой игры на основе реальных результатов.",
        feature_live: "Живое Обновление Рейтинга",
        feature_live_desc: "Смотри, как именно твоя игра влияет на рейтинг сразу после сессии.",
        feature_stats: "Детальная Статистика",
        feature_stats_desc: "Мы считаем всё: голы, ассисты, победы. Цифры определяют твой статус в клубе.",
        feature_fair: "Умный Баланс Команд",
        feature_fair_desc: "Алгоритм делит составы по силе. Новички проходят калибровку (3 игры), чтобы система определила их точный уровень.",
        roadmap_title: "ПЛАНЫ НА БУДУЩЕЕ",
        roadmap_video: "Видео Хайлайты",
        roadmap_video_desc: "Нарезки твоих лучших голов после матча (Скоро).",
        roadmap_leagues: "Турниры и Лиги",
        roadmap_leagues_desc: "Борись за кубок сезона и призы.",
        cta_join: "ВСТУПИТЬ В КЛУБ",
        cta_desc: "Напиши нам в WhatsApp, чтобы записаться на игру.",
        tap_to_enter: "НАЖМИ, ЧТОБЫ ВОЙТИ"
    }
};

// Unified Intro Component (Matches Public Profile Style)
const PromoIntro: React.FC<{ onEnter: () => void, lang: Lang }> = ({ onEnter, lang }) => (
    <div 
        onClick={onEnter}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1D24] cursor-pointer group select-none animate-in fade-in duration-500"
    >
        <div className="relative flex flex-col items-center justify-center w-64 h-64 transition-transform duration-300 group-active:scale-95">
            {/* Rotating Ring */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs><linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00F2FE" stopOpacity="1" /><stop offset="100%" stopColor="#00F2FE" stopOpacity="0" /></linearGradient></defs>
                    <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 300" />
                </svg>
            </div>
            
            {/* Content - Just Text, No Icon */}
            <div className="flex flex-col items-center justify-center z-10">
                <h1 className="text-5xl font-black text-[#00F2FE] tracking-tighter" style={{ textShadow: '0 0 15px rgba(0, 242, 254, 0.5)' }}>532</h1>
                <h2 className="text-xl font-bold text-white tracking-[0.2em] mt-1">PLAYGROUND</h2>
            </div>
            
            {/* CTA Text */}
            <p className="absolute -bottom-10 text-lg font-bold text-white animate-pulse tracking-widest text-center whitespace-nowrap drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]">
                {TEXT[lang].tap_to_enter}
            </p>
        </div>
    </div>
);

export const PromoScreen: React.FC = () => {
    const [lang, setLang] = useState<Lang>('en');
    const [showcasePlayer, setShowcasePlayer] = useState<Player>(DEFAULT_PROMO_PLAYER);
    const [isLoading, setIsLoading] = useState(true);
    const [showIntro, setShowIntro] = useState(true); // Control the entry screen
    const [anthemUrl, setAnthemUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const t = TEXT[lang];

    const LangBtn = ({ l, label }: { l: Lang, label: string }) => (
        <button 
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${lang === l ? 'bg-[#00F2FE] text-black shadow-[0_0_10px_#00F2FE]' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
        >
            {label}
        </button>
    );

    useEffect(() => {
        const initData = async () => {
            const [promoData, musicUrl] = await Promise.all([
                loadPromoData(),
                getSessionAnthemUrl()
            ]);

            if (promoData) {
                setShowcasePlayer(prev => ({
                    ...prev,
                    nickname: promoData.nickname,
                    surname: promoData.surname,
                    playerCard: promoData.photoUrl || prev.playerCard
                }));
            }
            if (musicUrl) {
                setAnthemUrl(musicUrl);
            }
            setIsLoading(false);
        };
        initData();

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleEnter = () => {
        setShowIntro(false);
        if (anthemUrl) {
            const audio = new Audio(anthemUrl);
            audio.loop = true;
            audio.volume = 0.6; // Slightly lower volume for background
            audio.play().catch(e => console.error("Audio autoplay prevented", e));
            audioRef.current = audio;
        }
    };

    return (
        <div className="min-h-screen bg-[#1A1D24] text-white font-sans overflow-x-hidden selection:bg-[#00F2FE] selection:text-black">
            
            {showIntro && <PromoIntro onEnter={handleEnter} lang={lang} />}

            {/* 1. HEADER SECTION */}
            <div className="relative pt-6 pb-2 px-4 text-center z-20">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#00F2FE] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

                {/* 1. Language Switcher (Top Center) */}
                <div className="flex justify-center gap-2 mb-3 relative z-10">
                    <LangBtn l="en" label="EN" />
                    <LangBtn l="vn" label="VN" />
                    <LangBtn l="ru" label="RU" />
                </div>

                {/* 2. Logo (Centered below Lang) */}
                <div className="relative z-10 mb-2 transform scale-90">
                    <BrandedHeader className="justify-center" />
                </div>

                {/* 3. Hero Text (Lowered & Smaller) */}
                <div className="relative z-10 mt-3">
                    <h1 className="text-xl font-black font-russo uppercase leading-none mb-2 tracking-wide text-white drop-shadow-lg">
                        {t.hero_title}
                    </h1>
                    <p className="text-xs text-[#A9B1BD] max-w-xs mx-auto leading-relaxed">
                        {t.hero_subtitle}
                    </p>
                </div>
            </div>

            {/* 2. THE CARD SHOWCASE (Full Size Standard Card) */}
            <div className="relative px-4 pb-8">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-30"></div>
                
                <div className="mb-4 text-center pt-4">
                    <h2 className="text-lg font-bold font-orbitron text-[#00F2FE] mb-1">{t.feature_card}</h2>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-tight">{t.feature_card_desc}</p>
                </div>

                <div className="relative max-w-sm mx-auto">
                    {isLoading ? (
                        <div className="h-[440px] w-full flex items-center justify-center bg-white/5 rounded-3xl border border-white/10">
                            <div className="animate-spin w-8 h-8 border-2 border-[#00F2FE] rounded-full border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="transform scale-95 origin-top animate-in fade-in zoom-in duration-500">
                            <PublicPlayerCard player={showcasePlayer} />
                        </div>
                    )}
                </div>
            </div>

            {/* 2.5 LAST SESSION BREAKDOWN (NEW ADDITION) */}
            <div className="relative px-4 pb-8 max-w-sm mx-auto">
                <div className="mb-3 text-center">
                    <h2 className="text-lg font-bold font-orbitron text-[#4CFF5F] mb-1">{t.feature_live}</h2>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-tight">{t.feature_live_desc}</p>
                </div>
                {/* Reusing the component, ensuring it renders fully visible */}
                <div className="bg-[#1A1D24] p-1 rounded-2xl">
                    <LastSessionBreakdown player={showcasePlayer} />
                </div>
            </div>

            {/* 3. FEATURES GRID */}
            <div className="px-6 py-10 bg-black/20 relative">
                <div className="grid gap-6 max-w-md mx-auto">
                    
                    {/* Stats */}
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shrink-0">
                            <BarChartDynamic className="w-5 h-5 text-[#00F2FE]" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white mb-1">{t.feature_stats}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">{t.feature_stats_desc}</p>
                        </div>
                    </div>

                    {/* Fair Play & Equipment */}
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 shrink-0">
                            <TrophyIcon className="w-5 h-5 text-[#4CFF5F]" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white mb-1">{t.feature_fair}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">{t.feature_fair_desc}</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* 4. ROADMAP (Coming Soon) */}
            <div className="px-6 py-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00F2FE]/5 to-transparent pointer-events-none"></div>
                <h2 className="text-lg font-black font-orbitron tracking-widest text-white/80 mb-8 border-b border-white/10 pb-3 inline-block">
                    {t.roadmap_title}
                </h2>

                <div className="grid gap-4 max-w-sm mx-auto">
                    <div className="bg-[#242831] border border-white/10 p-4 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">SOON</div>
                        <VideoCamera className="w-6 h-6 text-red-500 mb-2 mx-auto" />
                        <h3 className="font-bold text-sm text-white mb-1">{t.roadmap_video}</h3>
                        <p className="text-[10px] text-gray-400">{t.roadmap_video_desc}</p>
                    </div>

                    <div className="bg-[#242831] border border-white/10 p-4 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-1 rounded-bl-lg">PLANNED</div>
                        <TrophyIcon className="w-6 h-6 text-yellow-500 mb-2 mx-auto" />
                        <h3 className="font-bold text-sm text-white mb-1">{t.roadmap_leagues}</h3>
                        <p className="text-[10px] text-gray-400">{t.roadmap_leagues_desc}</p>
                    </div>
                </div>
            </div>

            {/* 5. CTA / SOCIALS (Updated with REAL LINKS) */}
            <div className="px-6 pt-6 pb-20 bg-gradient-to-t from-black via-[#1A1D24] to-[#1A1D24]">
                <div className="max-w-sm mx-auto text-center">
                    <h2 className="text-2xl font-black font-russo text-white mb-2">{t.cta_join}</h2>
                    <p className="text-xs text-gray-400 mb-6">{t.cta_desc}</p>

                    {/* WhatsApp Button (Primary) */}
                    <a 
                        href={SOCIAL_LINKS.whatsapp} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg py-3.5 rounded-xl shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 mb-4"
                    >
                        <WhatsApp className="w-5 h-5 fill-current" />
                        WhatsApp
                    </a>

                    {/* Facebook Button (Secondary) */}
                    <a 
                        href={SOCIAL_LINKS.facebook} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-3 w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-base py-3 rounded-xl shadow-lg transition-all active:scale-95 mb-8"
                    >
                        {/* Facebook Icon SVG */}
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </a>

                    {/* Small Icons Row */}
                    <div className="flex justify-center gap-8 opacity-70">
                        <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="hover:text-[#E1306C] transition-colors"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
                        <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noreferrer" className="hover:text-[#FF0000] transition-colors"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg></a>
                        <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.35-1.17 1.09-1.07 1.93.03.58.01 1.16.44 1.57.48.46 1.16.51 1.79.61 1.62.25 3.13-.59 3.63-2.26.29-1.33.17-2.73.19-4.08.02-4.01 0-8.01 0-12.01z"/></svg></a>
                    </div>
                </div>
            </div>
        </div>
    );
};
