
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context';
import { Page, PageHeader, Card, useTranslation, Button } from '../ui';
import { get, set, del } from 'idb-keyval';
import { Player, Session } from '../types';

type PaymentMethod = 'cash' | 'qr' | null;
type LedgerData = Record<string, PaymentMethod>;

export const LedgerScreen: React.FC = () => {
    const t = useTranslation();
    const { activeSession, history } = useApp();
    const [payments, setPayments] = useState<LedgerData>({});

    // 1. ОПРЕДЕЛЯЕМ ЦЕЛЕВУЮ СЕССИЮ
    // Если есть активная — берем её. Если нет — берем самую последнюю из истории.
    const subjectSession = useMemo(() => {
        if (activeSession) return activeSession;
        if (history && history.length > 0) return history[0];
        return null;
    }, [activeSession, history]);

    // Ключ в базе данных жестко привязан к ID конкретной сессии
    const getLedgerKey = () => {
        return subjectSession ? `ledger_v4_session_${subjectSession.id}` : 'ledger_default';
    };

    // 2. ЗАГРУЗКА ДАННЫХ
    useEffect(() => {
        const loadLedger = async () => {
            const key = getLedgerKey();
            const data = await get<LedgerData>(key);
            if (data) setPayments(data);
            else setPayments({});
        };
        loadLedger();
    }, [subjectSession?.id]);

    // 3. ОБРАБОТКА ОПЛАТЫ
    const handleTogglePayment = async (playerId: string, method: PaymentMethod) => {
        const current = payments[playerId];
        const nextMethod = current === method ? null : method;
        
        const updated = { ...payments, [playerId]: nextMethod };
        setPayments(updated);
        
        await set(getLedgerKey(), updated);
    };

    // 4. ОЧИСТКА (только статусов оплаты для текущей сессии)
    const handleClear = async () => {
        if (window.confirm("Очистить все отметки об оплате для этой сессии?")) {
            setPayments({});
            await del(getLedgerKey());
        }
    };

    const playersToDisplay = subjectSession?.playerPool || [];
    const collectedCount = Object.values(payments).filter(v => v !== null).length;
    const totalCount = playersToDisplay.length;

    // Состояние "Пусто" только если вообще никогда не было сессий и нет активной
    if (!subjectSession) {
        return (
            <Page>
                <PageHeader title={t.ledgerTitle} />
                <div className="flex flex-col items-center justify-center h-80 opacity-30 text-center space-y-2">
                    <p className="text-xl font-black uppercase tracking-[0.2em]">{t.ledgerEmpty}</p>
                    <p className="text-[10px] font-mono italic">AWAITING FIRST SESSION DATA</p>
                </div>
            </Page>
        );
    }

    return (
        <Page className="!pb-32">
            <PageHeader title={t.ledgerTitle} />

            {/* Шапка с названием сессии */}
            <div className="mb-4 text-center px-4">
                <div className="inline-flex flex-col">
                    <span className="text-[9px] font-black text-dark-accent-start uppercase tracking-[0.3em] mb-1">
                        {activeSession ? 'CURRENT SESSION' : 'LATEST RECORDED SESSION'}
                    </span>
                    <span className="text-sm font-bold text-white uppercase tracking-wider truncate max-w-[250px]">
                        {subjectSession.sessionName}
                    </span>
                    <span className="text-[8px] text-dark-text-secondary font-mono mt-1 opacity-50">
                        {new Date(subjectSession.date).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Виджет статистики (Счетчик) */}
            <Card className="mb-4 !p-3 border-dark-accent-start/30 bg-dark-surface/60 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
                <div className="flex justify-between items-center px-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-dark-accent-start uppercase tracking-[0.2em]">{t.ledgerCollected}</span>
                        <span className="text-[8px] text-dark-text-secondary uppercase opacity-50 font-mono italic">Terminal Ver. 5.3.2</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white tabular-nums" style={{ textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
                            {collectedCount}
                        </span>
                        <span className="text-sm font-bold text-dark-text-secondary">/ {totalCount}</span>
                    </div>
                </div>
            </Card>

            {/* Список игроков */}
            <div className="space-y-1.5 mb-8">
                {playersToDisplay.map(player => {
                    const status = payments[player.id];
                    return (
                        <div 
                            key={player.id} 
                            className={`flex items-center justify-between p-2 rounded-xl transition-all duration-300 border ${
                                status 
                                ? 'bg-dark-surface border-dark-accent-start/20 shadow-sm' 
                                : 'bg-dark-bg/40 border-white/5 opacity-80'
                            }`}
                        >
                            <span className={`font-chakra font-bold text-sm truncate flex-1 pr-2 uppercase tracking-wide transition-colors ${status ? 'text-white' : 'text-dark-text-secondary'}`}>
                                {player.nickname}
                            </span>
                            
                            <div className="flex gap-1.5">
                                {/* Кнопка Наличные */}
                                <button
                                    onClick={() => handleTogglePayment(player.id, 'cash')}
                                    className={`w-11 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-300 border ${
                                        status === 'cash' 
                                        ? 'bg-green-500/20 border-green-500 shadow-[0_0_12px_rgba(76,255,95,0.4)]' 
                                        : 'bg-black/20 border-white/5 grayscale opacity-30 hover:opacity-60'
                                    }`}
                                >
                                    💵
                                </button>

                                {/* Кнопка Перевод/QR */}
                                <button
                                    onClick={() => handleTogglePayment(player.id, 'qr')}
                                    className={`w-11 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-300 border ${
                                        status === 'qr' 
                                        ? 'bg-dark-accent-start/20 border-dark-accent-start shadow-[0_0_12px_rgba(0,242,254,0.4)]' 
                                        : 'bg-black/20 border-white/5 grayscale opacity-30 hover:opacity-60'
                                    }`}
                                >
                                    📱
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Кнопка Очистки (только отметок) */}
            <div className="max-w-[200px] mx-auto">
                <Button 
                    variant="ghost" 
                    onClick={handleClear} 
                    className="w-full !py-2 !text-[9px] font-black uppercase tracking-[0.3em] border border-red-500/20 text-red-500/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all active:scale-95"
                >
                    {t.ledgerClear}
                </Button>
            </div>
        </Page>
    );
};
