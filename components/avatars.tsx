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
}

export const TeamAvatar: React.FC<TeamAvatarProps> = ({ team, size = 'sm', onClick, className = '', playerCount, countText }) => {
    const sizeClassesMap = {
        xxs: { container: 'w-6 h-6' },
        xs: { container: 'w-8 h-8' },
        sm: { container: 'w-12 h-12' },
        md: { container: 'w-16 h-16' },
        lg: { container: 'w-20 h-20' },
        xl: { container: 'w-28 h-28' },
    };
    const selectedSize = sizeClassesMap[size] || sizeClassesMap['sm'];
    const teamColor = team.color || '#A9B1BD';
    const showCircularText = !team.logo && (size === 'lg' || size === 'xl');

    const baseClasses = `relative flex items-center justify-center rounded-full font-bold transition-transform transform active:scale-95 shadow-lg bg-dark-surface`;
    
    const badge = playerCount !== undefined && (
        <div className="absolute -top-1 -right-1 bg-dark-accent-start text-dark-bg rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm border-2 border-dark-bg">
            {playerCount}
        </div>
    );
    
    const clickableProps = onClick ? { onClick, role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && onClick() } : {};

    return (
        <div {...clickableProps} className={`relative ${selectedSize.container} ${className} ${onClick ? 'cursor-pointer' : ''}`}>
            {team.logo ? (
                 <img 
                    src={team.logo} 
                    alt={team.name || 'Team logo'} 
                    className={`${baseClasses} w-full h-full object-cover`}
                    style={{
                      border: `2px solid ${teamColor}`
                    }}
                />
            ) : (
                <div className="relative w-full h-full">
                    <div 
                        className={`${baseClasses} w-full h-full`}
                        style={{ boxShadow: `0 0 10px ${teamColor}` }}
                    >
                         <svg width="80%" height="80%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: teamColor, filter: `drop-shadow(0 0 2px ${teamColor})` }}>
                            <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99 .84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" stroke={teamColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                    </div>
                    {showCircularText && (
                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
                          <defs>
                            <path id="circlePath" d="M -2 50 a 52 52 0 1 1 104 0" />
                          </defs>
                          <text transform="translate(0, -4)" fill={teamColor} style={{ filter: `drop-shadow(0 0 2px ${teamColor})` }} className="text-[11px] font-bold uppercase tracking-wider">
                            <textPath href="#circlePath" startOffset="50%" textAnchor="middle">
                              532 Playground
                            </textPath>
                          </text>
                        </svg>
                    )}
                </div>
            )}
            {countText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-sm font-black" style={{ textShadow: '0 0 5px #000, 0 0 5px #000' }}>
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

    const containerClasses = `relative group ${sizeClasses[size]} ${className}`;

    const commonAvatarClasses = `rounded-full bg-dark-surface border-2 border-white/20 w-full h-full overflow-hidden`;
    
    const bgColor = React.useMemo(() => {
        if (!player?.id) return 'bg-gray-700';
        const colors = ['bg-red-500/80', 'bg-green-500/80', 'bg-blue-500/80', 'bg-yellow-500/80', 'bg-indigo-500/80', 'bg-pink-500/80', 'bg-purple-500/80'];
        let hash = 0;
        if (player.id.length === 0) return colors[0];
        for (let i = 0; i < player.id.length; i++) {
            const char = player.id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return colors[Math.abs(hash) % colors.length];
    }, [player?.id]);

    return (
        <div className={containerClasses} draggable={draggable}>
             {player?.photo ? (
                <div
                    className={`${commonAvatarClasses} bg-cover bg-no-repeat`}
                    style={{
                        backgroundImage: `url(${player.photo})`,
                        backgroundPosition: 'center 20%',
                    }}
                />
            ) : (
                <div className={`flex items-center justify-center font-bold text-dark-text-secondary ${bgColor} ${commonAvatarClasses}`}>
                    <User className={`${iconSizeClasses[size]}`} />
                </div>
            )}
        </div>
    );
};