import React, { useState, useEffect, useRef } from 'react';
import { PublicPlayerCard } from '../components/PublicPlayerCard';
import { LastSessionBreakdown } from '../components/PlayerCardAnalytics';
import { Player, PlayerStatus, PlayerTier } from '../types';
import { WhatsApp, TrophyIcon, VideoCamera, BarChartDynamic, ZaloIcon, YouTubeIcon, TikTokIcon, LayoutDashboard, Target, Zap, Cloud, MapPinIcon, History } from '../icons'; 
import { BrandedHeader } from './utils';
import { loadPromoData, getSessionAnthemUrl } from '../db';
import { useApp } from '../context';
import { Language } from '../translations/index';

// --- CONFIGURATION ---
const SOCIAL_LINKS = {
    whatsapp: "https://chat.whatsapp.com/CAJnChuM4lQFf3s2YUnhQr",
    zalo: "https://zalo.me/g/pjdfxl571", // Updated to Group Link
    youtube: "https://www.youtube.com/@UnitFootball",
    tiktok: "https://www.tiktok.com/@532club?_r=1",
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
    initialRating: 94,
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

// --- CONTENT TRANSLATIONS (REFINED) ---
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
        cta_desc: "Connect with us on WhatsApp or Zalo to book your slot.",
        tap_to_enter: "TAP TO ENTER",
        
        // Hub Section
        hub_section_title: "CLUB INTELLIGENCE",
        hub_section_desc: "The central nervous system of the club. Access restricted to active players.",
        hub_badge: "MEMBER EXCLUSIVE",
        hub_f1: "Global Rankings",
        hub_f2: "Match Archive",
        hub_f3: "Live Updates",
        hub_f4: "Deep Analytics"
    },
    vn: {
        hero_title: "CHƠI NHƯ DÂN CHUYÊN",
        hero_subtitle: "Cộng đồng Futsal hiện đại nhất tại Đà Nẵng.",
        feature_card: "Thẻ Cầu Thủ Riêng",
        feature_card_desc: "Sở hữu tấm thẻ độc bản. Chỉ số cập nhật tự động sau mỗi trận dựa trên phong độ thực tế của bạn.",
        feature_live: "Cập Nhật Rating Tức Thì",
        feature_live_desc: "Theo dõi trực tiếp hiệu suất của bạn ảnh hưởng thế nào đến rating ngay sau buổi tập.",
        feature_stats: "Thống Kê Chi Tiết",
        feature_stats_desc: "Chúng tôi ghi lại mọi thông số: bàn thắng, kiến tạo, trận thắng. Con số khẳng định đẳng cấp.",
        feature_fair: "Hệ Thống Cân Bằng",
        feature_fair_desc: "Chia đội bằng thuật toán thông minh. Người chơi mới có 3 trận định vị để xác định trình độ chuẩn.",
        roadmap_title: "TƯƠNG LAI CỦA BÓNG ĐÁ",
        roadmap_video: "Video Highlights",
        roadmap_video_desc: "Clip AI ghi lại những siêu phẩm của bạn (Sắp ra mắt).",
        roadmap_leagues: "Giải Đấu & Cúp",
        roadmap_leagues_desc: "Tranh tài giành cúp vô địch mùa giải và nhiều phần quà hấp dẫn.",
        cta_join: "THAM GIA NGAY",
        cta_desc: "Liên hệ qua WhatsApp hoặc Zalo để đặt slot thi đấu.",
        tap_to_enter: "NHẤN ĐỂ VÀO",

        // Hub Section
        hub_section_title: "HỆ SINH THÁI CLB",
        hub_section_desc: "Hệ thống dữ liệu trung tâm của câu lạc bộ. Đặc quyền dành cho thành viên chính thức.",
        hub_badge: "DÀNH CHO THÀNH VIÊN",
        hub_f1: "Bảng Xếp Hạng",
        hub_f2: "Lịch Sử Đấu",
        hub_f3: "Cập Nhật Live",
        hub_f4: "Phân Tích Sâu"
    },
    ru: {
        hero_title: "ИГРАЙ КАК ПРОФИ",
        hero_subtitle: "Самое технологичное футбольное комьюнити в Дананге.",
        feature_card: "Твоя личная карта",
        feature_card_desc: "Получи свою карточку. Рейтинг обновляется автоматически после каждой игры на основе твоих реальных успехов.",
        feature_live: "Живое обновление рейтинга",
        feature_live_desc: "Смотри, как именно твоя игра повлияла на рейтинг сразу после финального свистка.",
        feature_stats: "Детальная статистика",
        feature_stats_desc: "Мы считаем всё: голы, пасы, победы и сухие матчи. Цифры определяют твой статус.",
        feature_fair: "Умный баланс команд",
        feature_fair_desc: "Алгоритм делит составы по силе. Новички проходят калибровку из 3 игр для определения точного уровня.",
        roadmap_title: "ПЛАНИ НА БУДУЩЕЕ",
        roadmap_video: "Видео-хайлайты",
        roadmap_video_desc: "Нарезки твоих лучших голов, созданные нейросетью (Скоро).",
        roadmap_leagues: "Турниры и Лиги",
        roadmap_leagues_desc: "Борись за кубок сезона и ценные призы от клуба.",
        cta_join: "ВСТУПИТЬ В КЛУБ",
        cta_desc: "Напиши нам в WhatsApp или Zalo, чтобы записаться на игру.",
        tap_to_enter: "НАЖМИ, ЧТОБЫ ВОЙТИ",

        // Hub Section
        hub_section_title: "ЭКОСИСТЕМА КЛУБА",
        hub_section_desc: "Центральный интеллект. Доступ только для действующих игроков.",
        hub_badge: "ТОЛЬКО ДЛЯ УЧАСНИКОВ",
        hub_f1: "Рейтинги Клуба",
        hub_f2: "Архив Матчей",
        hub_f3: "Live Данные",
        hub_f4: "Аналитика"
    },
    ua: {
        hero_title: "ГРАЙ ЯК ПРОФІ",
        hero_subtitle: "Найтехнологічніша футбольна спільнота в Данангу.",
        feature_card: "Твоя Особиста Картка",
        feature_card_desc: "Як у FIFA. Рейтинг оновлюється автоматично після кожної гри на основі реальних результатів.",
        feature_live: "Живе Оновлення Рейтингу",
        feature_live_desc: "Дивись, як саме твоя гра впливає на рейтинг відразу після сесії.",
        feature_stats: "Детальна Статистика",
        feature_stats_desc: "Ми рахуємо все: голи, асисти, перемоги. Цифри визначають твій статус у клубі.",
        feature_fair: "Розумний Баланс Команд",
        feature_fair_desc: "Алгоритм ділить склади за силою. Новачки проходять калібрування (3 гри).",
        roadmap_title: "ПЛАНИ НА МАЙБУТНЄ",
        roadmap_video: "Відео Хайлайти",
        roadmap_video_desc: "Нарізки твоїх найкращих голів (Скоро).",
        roadmap_leagues: "Турніри та Ліги",
        roadmap_leagues_desc: "Борись за кубок сезону та призи.",
        cta_join: "ВСТУПИТЬ В КЛУБ",
        cta_desc: "Напиши нам у WhatsApp або Zalo, щоб записатися на гру.",
        tap_to_enter: "НАТИСНИ, ЩОБ УВІЙТИ",

        // Hub Section
        hub_section_title: "ЕКОСИСТЕМА КЛУБУ",
        hub_section_desc: "Центральний інтелект. Доступ тільки для діючих гравців.",
        hub_badge: "ТІЛЬКИ ДЛЯ УЧАСНИКІВ",
        hub_f1: "Рейтинги Клубу",
        hub_f2: "Архів Матчів",
        hub_f3: "Live Дані",
        hub_f4: "Аналітика"
    }
};

const PromoIntro: React.FC<{ onEnter: () => void, lang: Language }> = ({ onEnter, lang }) => (
    <div 
        onClick={onEnter}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1D24] cursor-pointer group select-none animate-in fade-in duration-500"
    >
        <div className="relative flex flex-col items-center justify-center w-64 h-64 transition-transform duration-300 group-active:scale-95">
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs><linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00F2FE" stopOpacity="1" /><stop offset="100%" stopColor="#00F2FE" stopOpacity="0" /></linearGradient></defs>
                    <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 300" />
                </svg>
            </div>
            
            <div className="flex flex-col items-center justify-center z-10">
                <h1 
                    className="text-6xl font-black uppercase leading-none font-russo tracking-[0.1em] animate-pulse"
                    style={{ 
                        background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: `
                            drop-shadow(1px 1px 0px #0E7490) 
                            drop-shadow(2px 2px 0px #000000) 
                            drop-shadow(0 0 20px rgba(72, 207, 203, 0.3))
                        `,
                    }}
                >
                    UNIT
                </h1>
            </div>
            
            <p className="absolute -bottom-10 text-lg font-bold text-white animate-pulse tracking-widest text-center whitespace-nowrap drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]">
                {TEXT[lang]?.tap_to_enter || TEXT['en'].tap_to_enter}
            </p>
        </div>
    </div>
);

// --- BENTO STYLE CARD (Replicated from Club Hub) ---
const PromoBento: React.FC<{ children: React.ReactNode, className?: string, accent?: string }> = ({ children, className = "", accent = "#00F2FE" }) => (
    <div className={`
        relative overflow-hidden rounded-3xl 
        bg-gradient-to-br from-[#161b22] to-[#0a0d14]
        border border-white/[0.06]
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)]
        group
        ${className}
    `}>
        {/* Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ 
            backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`,
            backgroundSize: '4px 4px'
        }}></div>

        {/* Ambient Glow */}
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-[50px] opacity-10 pointer-events-none z-0 transition-opacity duration-700 group-hover:opacity-20" style={{ backgroundColor: accent }}></div>
        
        {/* Hover Shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>

        <div className="relative z-10">
            {children}
        </div>
    </div>
);

// --- CLUB HUB PROMO BLOCK (UPDATED COMPACT DESIGN) ---
const HubPromoSection: React.FC<{ t: any }> = ({ t }) => {
    
    const FeatureItem = ({ icon: Icon, text }: { icon: any, text: string }) => (
        <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#00F2FE]/30 transition-all group backdrop-blur-sm h-16 w-16">
            <Icon className="w-4 h-4 text-white/40 group-hover:text-[#00F2FE] mb-1 transition-colors" />
            <span className="text-[7px] font-bold text-white/60 uppercase tracking-wider text-center leading-tight group-hover:text-white transition-colors">
                {text}
            </span>
        </div>
    );

    return (
        <div className="px-4 py-4 relative max-w-sm mx-auto">
            {/* Cinematic Container - COMPACT */}
            <div className="relative rounded-3xl overflow-hidden border border-[#00F2FE]/20 bg-[#0a0c10] shadow-[0_0_30px_rgba(0,242,254,0.1)]">
                
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#00F2FE]/5 via-transparent to-transparent"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

                <div className="p-5 relative z-10 flex flex-col items-center">
                    
                    {/* Header Row */}
                    <div className="flex items-center gap-3 w-full mb-4 border-b border-white/5 pb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 flex items-center justify-center border border-[#00F2FE]/50 shadow-[0_0_15px_rgba(0,242,254,0.3)] shrink-0">
                            <LayoutDashboard className="w-5 h-5 text-[#00F2FE]" />
                        </div>
                        <div className="flex flex-col items-start">
                            <h2 className="font-russo text-lg uppercase text-white tracking-wider leading-none">
                                {t.hub_section_title}
                            </h2>
                            <p className="font-chakra text-[9px] text-white/50 mt-1 max-w-[200px] text-left">
                                {t.hub_section_desc}
                            </p>
                        </div>
                    </div>

                    {/* Features Grid - Horizontal Row */}
                    <div className="flex justify-between w-full gap-2 mb-4 px-1">
                        <FeatureItem icon={TrophyIcon} text={t.hub_f1} />
                        <FeatureItem icon={History} text={t.hub_f2} />
                        <FeatureItem icon={Zap} text={t.hub_f3} />
                        <FeatureItem icon={BarChartDynamic} text={t.hub_f4} />
                    </div>

                    {/* Footer Badge */}
                    <div className="w-full flex justify-center">
                        <div className="px-4 py-1.5 rounded-full bg-[#00F2FE]/5 border border-[#00F2FE]/20 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse"></div>
                            <span className="text-[8px] font-black text-[#00F2FE] tracking-[0.2em] uppercase">
                                {t.hub_badge}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PromoScreen: React.FC = () => {
    const { language, setLanguage } = useApp();
    const [showcasePlayer, setShowcasePlayer] = useState<Player>(DEFAULT_PROMO_PLAYER);
    const [isLoading, setIsLoading] = useState(true);
    const [showIntro, setShowIntro] = useState(true); 
    const [anthemUrl, setAnthemUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const t = TEXT[language] || TEXT['en'];

    const LangBtn = ({ l, label }: { l: Language, label: string }) => (
        <button 
            onClick={() => setLanguage(l)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${language === l ? 'bg-[#00F2FE] text-black shadow-[0_0_10px_#00F2FE]' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
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
            audio.volume = 0.6; 
            audio.play().catch(e => console.error("Audio autoplay prevented", e));
            audioRef.current = audio;
        }
    };

    return (
        <div className="relative min-h-screen bg-[#0a0c10] text-white font-sans overflow-hidden selection:bg-[#00F2FE] selection:text-black">
            
            {/* Background Layers - ABSOLUTE to this container */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {/* Main Content Wrapper (z-10 to stay above background) */}
            <div className="relative z-10">
                {showIntro && <PromoIntro onEnter={handleEnter} lang={language} />}

                {/* HEADER SECTION */}
                <div className="relative pt-6 pb-2 px-4 text-center z-20">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#00F2FE] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

                    <div className="flex justify-center gap-2 mb-3 relative z-10">
                        <LangBtn l="en" label="EN" />
                        <LangBtn l="vn" label="VN" />
                        <LangBtn l="ru" label="RU" />
                        <LangBtn l="ua" label="UA" />
                    </div>

                    <div className="relative z-10 mb-2 transform scale-90">
                        <BrandedHeader className="justify-center" />
                    </div>

                    <div className="relative z-10 mt-3">
                        <h1 className="text-xl font-black font-russo uppercase leading-none mb-2 tracking-wide text-white drop-shadow-lg">
                            {t.hero_title}
                        </h1>
                        <p className="text-xs text-[#A9B1BD] max-w-xs mx-auto leading-relaxed">
                            {t.hero_subtitle}
                        </p>
                    </div>
                </div>

                {/* THE CARD SHOWCASE */}
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
                                <PublicPlayerCard player={showcasePlayer} isPromo={true} />
                            </div>
                        )}
                    </div>
                </div>

                {/* LAST SESSION BREAKDOWN (UPDATED TO BENTO STYLE) */}
                <div className="relative px-4 pb-4 max-w-sm mx-auto">
                    <div className="mb-3 text-center">
                        <h2 className="text-lg font-bold font-orbitron text-[#4CFF5F] mb-1">{t.feature_live}</h2>
                        <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-tight">{t.feature_live_desc}</p>
                    </div>
                    {/* BENTO WRAPPER APPLIED HERE */}
                    <PromoBento className="p-2" accent="#4CFF5F">
                        <LastSessionBreakdown player={showcasePlayer} usePromoStyle={true} />
                    </PromoBento>
                </div>

                {/* --- NEW SECTION: CLUB ECOSYSTEM (COMPACT) --- */}
                <HubPromoSection t={t} />

                {/* FEATURES GRID (UPDATED TO BENTO STYLE) */}
                <div className="px-6 py-10 border-y border-white/5 relative">
                    <div className="grid gap-4 max-w-md mx-auto">
                        {/* FEATURE 1 */}
                        <PromoBento className="p-4 flex items-start gap-4 hover:border-[#00F2FE]/30 transition-colors" accent="#00F2FE">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shrink-0">
                                <BarChartDynamic className="w-5 h-5 text-[#00F2FE]" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white mb-1">{t.feature_stats}</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">{t.feature_stats_desc}</p>
                            </div>
                        </PromoBento>

                        {/* FEATURE 2 */}
                        <PromoBento className="p-4 flex items-start gap-4 hover:border-[#4CFF5F]/30 transition-colors" accent="#4CFF5F">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 shrink-0">
                                <TrophyIcon className="w-5 h-5 text-[#4CFF5F]" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white mb-1">{t.feature_fair}</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">{t.feature_fair_desc}</p>
                            </div>
                        </PromoBento>
                    </div>
                </div>

                {/* ROADMAP (UPDATED TO BENTO STYLE) */}
                <div className="px-6 py-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00F2FE]/5 to-transparent pointer-events-none"></div>
                    <h2 className="text-lg font-black font-orbitron tracking-widest text-white/80 mb-8 border-b border-white/10 pb-3 inline-block">
                        {t.roadmap_title}
                    </h2>

                    <div className="grid gap-4 max-sm mx-auto">
                        <PromoBento className="p-4 relative" accent="#ef4444">
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg z-10">SOON</div>
                            <VideoCamera className="w-6 h-6 text-red-500 mb-2 mx-auto" />
                            <h3 className="font-bold text-sm text-white mb-1">{t.roadmap_video}</h3>
                            <p className="text-[10px] text-gray-400">{t.roadmap_video_desc}</p>
                        </PromoBento>

                        <PromoBento className="p-4 relative" accent="#fbbf24">
                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-1 rounded-bl-lg z-10">PLANNED</div>
                            <TrophyIcon className="w-6 h-6 text-yellow-500 mb-2 mx-auto" />
                            <h3 className="font-bold text-sm text-white mb-1">{t.roadmap_leagues}</h3>
                            <p className="text-[10px] text-gray-400">{t.roadmap_leagues_desc}</p>
                        </PromoBento>
                    </div>
                </div>

                {/* CTA / SOCIALS */}
                <div className="px-6 pt-6 pb-20 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="max-w-sm mx-auto text-center">
                        <h2 className="text-2xl font-black font-russo text-white mb-2">{t.cta_join}</h2>
                        <p className="text-xs text-gray-400 mb-6">{t.cta_desc}</p>

                        <a 
                            href={SOCIAL_LINKS.whatsapp} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg py-3.5 rounded-xl shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 mb-4"
                        >
                            <WhatsApp className="w-5 h-5 fill-current" />
                            WhatsApp
                        </a>

                        <a 
                            href={SOCIAL_LINKS.zalo} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center gap-3 w-full bg-[#0068FF] hover:bg-[#0057d8] text-white font-bold text-lg py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,104,255,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 mb-8"
                        >
                            <ZaloIcon className="w-5 h-5 fill-current" />
                            Zalo
                        </a>

                        <div className="flex justify-center gap-8 opacity-70">
                            <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noreferrer" className="hover:text-[#FF0000] transition-colors"><YouTubeIcon className="w-7 h-7" /></a>
                            <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><TikTokIcon className="w-7 h-7" /></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};