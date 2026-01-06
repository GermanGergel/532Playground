
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
  isLight?: boolean; // New prop for light backgrounds
  hollow?: boolean; // If true, the T-shirt fill will be transparent
}

export const TeamAvatar: React.FC<TeamAvatarProps> = ({ team, size = 'sm', onClick, className = '', playerCount, countText, isLight = false, hollow = false }) => {
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

    // Updated baseClasses to handle isLight prop
    const baseClasses = `relative flex items-center justify-center rounded-full font-bold transition-transform transform active:scale-95 shadow-lg ${isLight ? 'bg-transparent' : 'bg-dark-surface'}`;
    
    const badge = playerCount !== undefined && (
        <div className="absolute -top-1 -right-1 bg-dark-accent-start text-dark-bg rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm border-2 border-dark-bg">
            {playerCount}
        </div>
    );
    
    const clickableProps = onClick ? { onClick, role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' && onClick) onClick(); } } : {};

    // --- UNIFIED BORDER LOGIC ---
    // Apply a border to all avatars, scaling its thickness with size for better visuals.
    const borderWidth = size === 'xxs' ? '2px' : '3px';
    const containerStyle = { border: `${borderWidth} solid ${teamColor}` };
    const imgStyle = {}; // The border is now on the container, not the image itself.

    return (
        <div 
            {...clickableProps} 
            className={`relative ${selectedSize.container} ${className} ${onClick ? 'cursor-pointer' : ''} rounded-full`}
            style={containerStyle}
        >
            {team.logo ? (
                 <img 
                    src={team.logo} 
                    alt={team.name || 'Team logo'} 
                    className={`${baseClasses} w-full h-full object-cover`}
                    style={imgStyle}
                />
            ) : (
                <div className="relative w-full h-full">
                    <div 
                        className={`${baseClasses} w-full h-full flex items-center justify-center`}
                    >
                         {/* UPDATED: Added conditional fillOpacity based on hollow prop */}
                         <svg className="w-2/3 h-2/3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: teamColor }}>
                            <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99 .84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" fill={teamColor} fillOpacity={hollow ? "0" : "0.35"} stroke={teamColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                    </div>
                    {showCircularText && (
                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
                          <defs>
                            <path id="circlePath" d="M -2 50 a 52 52 0 1 1 104 0" />
                          </defs>
                          <text transform="translate(0, -4)" fill={teamColor} className="text-[11px] font-bold uppercase tracking-wider">
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
  className?: string; // This className applies to the outermost div of the PlayerAvatar component
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

    // The core properties for making it a circle that hides overflow.
    const baseShapeClasses = `w-full h-full rounded-full overflow-hidden`;
    
    // --- SYNC LOGIC FIX ---
    // Ensure the avatar URL (little circle) is strictly synchronized with the player card (profile) version.
    let imageUrl = player?.photo || player?.playerCard;

    if (player?.playerCard && player?.playerCard.includes('?t=')) {
        const timestamp = player.playerCard.split('?t=')[1];
        
        // If avatar (photo) exists but has old/no timestamp, force it to match the Card's timestamp
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
            hash = hash & hash; // Convert to 32bit integer
        }
        return colors[Math.abs(hash) % colors.length];
    }, [player?.id]);

    return (
        // The outermost div defines the overall size and gets the custom styling (border/shadow) from the parent.
        // It also ensures the circular shape and hides overflow.
        // ADDED: key={imageUrl} to force React to re-mount the component if the URL (timestamp) changes.
        <div key={imageUrl} className={`relative group ${sizeClasses[size]} ${baseShapeClasses} ${className}`} draggable={draggable}>
             {imageUrl ? (
                // This inner div is just for the background image, no additional styling that would create a visible square.
                <div
                    className={`${baseShapeClasses} bg-cover bg-no-repeat`} // baseShapeClasses ensure it fills the parent and is circular.
                    style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundPosition: 'center 20%',
                    }}
                />
            ) : (
                // The fallback placeholder div. This needs its own background and border for the "empty" state.
                <div className={`flex items-center justify-center font-bold text-dark-text-secondary ${bgColor} ${baseShapeClasses} border-2 border-white/20`}>
                    <User className={`${iconSizeClasses[size]}`} />
                </div>
            )}
        </div>
    );
};
