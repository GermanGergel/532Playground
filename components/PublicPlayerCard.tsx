
import React from 'react';
import { Player } from '../types';
import { useTranslation, Card } from '../ui';
import { FormArrowIndicator, BadgeIcon, getBadgePriority } from '../features';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';

// Fix: Reconstructed PublicPlayerCard and ensured it is exported to resolve multiple errors.
export const PublicPlayerCard: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);

    const topBadges = React.useMemo(() => {
        return Object.entries(player.badges || {})
            .map(([badge]) => badge as any)
            .sort((a, b) => getBadgePriority(b) - getBadgePriority(a))
            .slice(0, 5);
    }, [player.badges]);

    return (
        <Card className="relative overflow-hidden !p-0 border-2 border-dark-accent-start/30 shadow-[0_0_25px_rgba(0,242,254,0.15)]">
            <div 
                className="aspect-[3/4] w-full bg-cover bg-center"
                style={{ backgroundImage: `url("${player.playerCard || 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop'}")` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D24] via-[#1A1D24]/40 to-transparent" />
            
            <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p style={{ color: '#00F2FE' }} className="text-xl font-black leading-none">532</p>
                        <p className="text-white text-[8px] font-bold tracking-[0.2em] mt-1">PLAYGROUND</p>
                        {countryCodeAlpha2 && (
                            <img 
                                src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`}
                                alt={`${player.countryCode} flag`}
                                className="w-8 h-auto mt-4 rounded-sm shadow-md"
                            />
                        )}
                    </div>
                    <div className="flex flex-col items-center max-w-[50%]">
                        <div className="text-4xl font-black leading-none" style={{ color: '#00F2FE', textShadow: 'none' }}>{Math.round(player.rating)}</div>
                        <p className="font-bold text-white tracking-widest text-sm">OVG</p>
                        <div className="mt-1"><FormArrowIndicator form={player.form} /></div>
                        
                        <div className="flex gap-1 mt-3 flex-wrap justify-center">
                            {topBadges.map(badge => (
                                <BadgeIcon key={badge} badge={badge} className="w-6 h-6" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-1 drop-shadow-lg italic">
                        {player.nickname}
                    </h2>
                    <p className="text-sm font-bold text-dark-accent-start uppercase tracking-[0.3em] opacity-80">
                        {player.surname}
                    </p>
                </div>
            </div>
        </Card>
    );
};
