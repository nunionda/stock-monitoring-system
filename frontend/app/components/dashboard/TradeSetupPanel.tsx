import React from 'react';
import { TradingSignal } from '../../utils/strategy';

interface TradeSetupPanelProps {
    strategyResult: TradingSignal | null;
}

const POINT_VALUE = 50; // ES=F $50 per point

export const TradeSetupPanel: React.FC<TradeSetupPanelProps> = React.memo(({ strategyResult }) => {
    if (!strategyResult) return null;

    const {
        marketBias,
        entryLong,
        entryShort,
        volumeStatus,
        atr,
        config
    } = strategyResult; // Now utilizing the enhanced interface

    const isBullish = marketBias === 'BULLISH';
    const isBearish = marketBias === 'BEARISH';
    const isNeutral = marketBias === 'NEUTRAL';

    // Projected Risk Calculations (based on 1 contract)
    const atrValue = parseFloat(atr);
    const riskAmount = (atrValue * config.STOP_LOSS_MULTIPLIER * POINT_VALUE).toFixed(2);
    const rewardAmount = (atrValue * config.PROFIT_TAKE_MULTIPLIER * POINT_VALUE).toFixed(2);

    return (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>

            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-stone-800 pb-2 mb-4 flex justify-between items-center z-10 relative">
                Tactical Positioning Guide
                <span className="text-[9px] bg-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/50">V5 Setup</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 relative">
                {/* 1. Market Bias & Volume */}
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Market Bias (Triple Screen)</p>
                        <div className="flex items-center gap-3">
                            <span className={`text-2xl font-serif font-bold ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-500' : 'text-stone-400'
                                }`}>
                                {marketBias}
                            </span>
                            {isBullish && <span className="text-xs bg-emerald-900/30 text-emerald-300 px-2 py-0.5 rounded">Long Only</span>}
                            {isBearish && <span className="text-xs bg-rose-900/30 text-rose-300 px-2 py-0.5 rounded">Short Only</span>}
                            {isNeutral && <span className="text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded">Wait</span>}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Volume Confirmation</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${volumeStatus === 'ACCUMULATION' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            <p className="text-sm text-stone-300 font-medium">{volumeStatus}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Actionable Entry Zone */}
                <div className={`p-4 rounded border ${isBullish ? 'bg-emerald-900/10 border-emerald-900/30' :
                    isBearish ? 'bg-rose-900/10 border-rose-900/30' :
                        'bg-stone-800/30 border-stone-700/30'
                    }`}>
                    <p className="text-[10px] text-stone-400 font-bold uppercase mb-2 text-center">
                        {isBullish ? 'Next Long Entry Trigger' : isBearish ? 'Next Short Entry Trigger' : 'No Valid Setup'}
                    </p>

                    <div className="text-center">
                        <p className="text-3xl font-serif font-bold text-white mb-1">
                            {isBullish ? entryLong.toFixed(2) : isBearish ? entryShort.toFixed(2) : '---'}
                        </p>
                        <p className="text-[9px] text-stone-500 uppercase tracking-tight">
                            {isBullish ? 'Buy Stop / Breakout Level' : isBearish ? 'Sell Stop / Breakdown Level' : 'Waiting for trend alignment'}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Projected Trade Plan (Bottom Row) */}
            <div className="mt-6 pt-4 border-t border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-4 z-10 relative">
                <div className="space-y-1">
                    <p className="text-[9px] text-stone-500 font-bold uppercase">Projected Risk (1 ATR)</p>
                    <p className="text-lg font-mono text-rose-400">-${riskAmount}</p>
                    <p className="text-[8px] text-stone-600">Per 1 Contract</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] text-stone-500 font-bold uppercase">Projected Reward ({config.PROFIT_TAKE_MULTIPLIER}x ATR)</p>
                    <p className="text-lg font-mono text-emerald-400">+${rewardAmount}</p>
                    <p className="text-[8px] text-stone-600">Target 1</p>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-[9px] text-stone-500 font-bold uppercase">Rec. Position Size</p>
                    <p className="text-lg font-serif font-bold text-stone-200">{Math.round(strategyResult.positionSize * 100)}%</p>
                    <p className="text-[8px] text-stone-500">of Capital (Vol. Adj)</p>
                </div>
            </div>
        </div>
    );
});
