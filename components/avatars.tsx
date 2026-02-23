
import React from 'react';
import { Team, Player } from '../types';
import { User } from '../icons';

interface TeamAvatarProps {
  team: Partial<Team>;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
  playerCount?: number;
  countText?: string;
  isLight?: boolean;
  hollow?: boolean;
  customEmblem?: string;
  minimal?: boolean;
}

export const TeamAvatar: React.FC<TeamAvatarProps> = ({ team, size = 'sm', onClick, className = '', playerCount, countText, isLight = false, hollow = false, customEmblem, minimal }) => {
    const sizeClassesMap = {
        xxs: { container: 'w-6 h-6', fontSize: 'text-[4px]', labelPos: '-top-1' },
        xs: { container: 'w-8 h-8', fontSize: 'text-[5px]', labelPos: '-top-1' },
        sm: { container: 'w-12 h-12', fontSize: 'text-[7px]', labelPos: '-top-2' },
        md: { container: 'w-16 h-16', fontSize: 'text-[9px]', labelPos: '-top-2' },
        lg: { container: 'w-20 h-20', fontSize: 'text-[11px]', labelPos: '-top-3' },
        xl: { container: 'w-28 h-28', fontSize: 'text-[14px]', labelPos: '-top-4' },
    };
    const selectedSize = sizeClassesMap[size] || sizeClassesMap['sm'];
    const teamColor = team.color || '#A9B1BD';

    const baseClasses = `relative flex items-center justify-center rounded-full font-bold transition-transform transform active:scale-95 shadow-lg ${isLight ? 'bg-transparent' : 'bg-dark-surface'}`;
    
    const badge = playerCount !== undefined && (
        <div className="absolute -top-1 -right-1 bg-dark-accent-start text-dark-bg rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm border-2 border-dark-bg">
            {playerCount}
        </div>
    );
    
    const clickableProps = onClick ? { onClick, role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' && onClick) onClick(); } } : {};

    const borderWidth = size === 'xxs' ? '2px' : '3px';
    const containerStyle = minimal ? {} : { border: `${borderWidth} solid ${teamColor}` };
    const logo = customEmblem || team.logo;

    return (
        <div 
            {...clickableProps} 
            className={`relative ${selectedSize.container} ${className} ${onClick ? 'cursor-pointer' : ''} ${minimal ? '' : 'rounded-full'}`}
            style={containerStyle}
        >
            {logo ? (
                 <img 
                    src={logo} 
                    alt={team.name || 'Team logo'} 
                    className={`w-full h-full ${minimal ? 'object-contain' : 'object-cover rounded-full ' + baseClasses}`}
                />
            ) : (
                <div className="relative w-full h-full">
                    <div 
                        className={`w-full h-full flex items-center justify-center ${minimal ? '' : baseClasses}`}
                    >
                         <svg className="w-2/3 h-2/3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: teamColor }}>
                            <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99 .84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" fill={teamColor} fillOpacity={hollow ? "0" : "0.35"} stroke={teamColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <text 
                                x="12" 
                                y="9" 
                                textAnchor="middle" 
                                fill="currentColor" 
                                style={{ 
                                    fontSize: '5px', 
                                    fontWeight: 900, 
                                    fontFamily: 'Russo One, sans-serif'
                                }}
                                className="uppercase"
                            >
                                UNIT
                            </text>
                         </svg>
                    </div>
                </div>
            )}
            {countText && (
                <div className={`absolute ${selectedSize.labelPos} left-1/2 -translate-x-1/2 pointer-events-none z-10`}>
                    <span className="text-white text-[10px] sm:text-xs font-black bg-dark-bg/80 px-1.5 py-0.5 rounded-full border border-white/10" style={{ textShadow: '0 0 5px rgba(0,242,254,0.3)' }}>
                        {countText}
                    </span>
                </div>
            )}
            {badge}
        </div>
    );
};


interface PlayerAvatarProps {
  player?: Player;
  className?: string; 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  draggable?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, className = '', size = 'md', draggable }) => {
    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-10 h-10',
        lg: 'w-20 h-20',
        xl: 'w-28 h-28',
    };
    const iconSizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-5 h-5',
        lg: 'w-10 h-10',
        xl: 'w-14 h-14',
    };

    const baseShapeClasses = `w-full h-full rounded-full overflow-hidden`;
    
    let imageUrl = player?.photo || player?.playerCard;

    if (player?.playerCard && player?.playerCard.includes('?t=')) {
        const timestamp = player.playerCard.split('?t=')[1];
        if (player.photo) {
            const currentAvatarTs = player.photo.includes('?t=') ? player.photo.split('?t=')[1] : null;
            if (currentAvatarTs !== timestamp) {
                const cleanBase = player.photo.split('?')[0];
                imageUrl = `${cleanBase}?t=${timestamp}`;
            }
        }
    }

    const bgColor = React.useMemo(() => {
        if (!player?.id) return 'bg-gray-700';
        const colors = ['bg-red-500/80', 'bg-green-500/80', 'bg-blue-500/80', 'bg-yellow-500/80', 'bg-indigo-500/80', 'bg-pink-500/80', 'bg-purple-500/80'];
        let hash = 0;
        if (player.id.length === 0) return colors[0];
        for (let i = 0; i < player.id.length; i++) {
            const char = player.id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; 
        }
        return colors[Math.abs(hash) % colors.length];
    }, [player?.id]);

    return (
        <div key={imageUrl} className={`relative group ${sizeClasses[size]} ${baseShapeClasses} ${className}`} draggable={draggable}>
             {imageUrl ? (
                <div
                    className={`${baseShapeClasses} bg-cover bg-no-repeat`} 
                    style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundPosition: 'center 20%',
                    }}
                />
            ) : (
                <div className={`flex items-center justify-center font-bold text-dark-text-secondary ${bgColor} ${baseShapeClasses} border-2 border-white/20`}>
                    <User className={`${iconSizeClasses[size]}`} />
                </div>
            )}
        </div>
    );
};
