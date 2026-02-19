import React from 'react';
import { TradingSignal } from '../../utils/strategy';

interface RiskMetricsProps {
    strategyResult: TradingSignal | null;
}

export const RiskMetrics: React.FC<RiskMetricsProps> = ({ strategyResult }) => {
    if (!strategyResult) return null;

    return (
        <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2 flex justify-between items-center">
                Risk Metrics
                <span className="text-[8px] bg-stone-100 px-1 rounded text-stone-500">Live</span>
            </h3>
            <div className="grid grid-cols-1 gap-6">
                <div className="group">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Wilder ATR (14d)</p>
                    <p className="text-2xl font-serif font-bold text-stone-800 transition-colors group-hover:text-blue-600">${strategyResult.atr}</p>
                </div>
                <div className="group">
                    <div className="flex justify-between items-baseline">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">
                            Initial Stop Loss {strategyResult.price > parseFloat(strategyResult.stopLoss || '0') ? '(Long)' : '(Short)'}
                        </p>
                        <span className="text-[8px] text-stone-300">1.0x ATR</span>
                    </div>
                    <p className={`text-2xl font-serif font-bold transition-transform group-hover:scale-105 origin-left ${strategyResult.price > parseFloat(strategyResult.stopLoss || '0') ? 'text-rose-500' : 'text-rose-600'}`}>
                        ${(strategyResult.stopLoss || '0')}
                    </p>
                </div>
                <div className="group">
                    <div className="flex justify-between items-baseline">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">
                            Chandelier Exit {strategyResult.price > parseFloat(strategyResult.chandelierStop || '0') ? '(Long)' : '(Short)'}
                        </p>
                        <span className="text-[8px] text-stone-300">3.0x ATR</span>
                    </div>
                    <p className={`text-2xl font-serif font-bold transition-transform group-hover:scale-105 origin-left ${strategyResult.price > parseFloat(strategyResult.chandelierStop || '0') ? 'text-orange-600' : 'text-blue-600'}`}>
                        ${(strategyResult.chandelierStop || '0')}
                    </p>
                </div>
                <div className="pt-4 mt-2 border-t border-stone-50 grid grid-cols-2 gap-4">
                    <div className="group">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Regime Confidence</p>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-serif font-bold text-indigo-600">{Math.round(strategyResult.regimeConfidence * 100)}%</p>
                            <div className="h-1.5 w-12 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${strategyResult.regimeConfidence * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="group text-right">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Risk Heat</p>
                        <p className={`text-lg font-serif font-bold ${strategyResult.riskHeat === 'HIGH' ? 'text-rose-600' :
                            strategyResult.riskHeat === 'NORMAL' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                            {strategyResult.riskHeat}
                        </p>
                    </div>
                </div>
                <div className="group pt-2">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Position Size</p>
                    <p className="text-lg font-serif font-bold text-stone-800">{Math.round(strategyResult.positionSize * 100)}%</p>
                    <p className="text-[8px] text-stone-400">V5 Adaptive Scaling (1% Risk Cap)</p>
                </div>
            </div>
        </div>
    );
};
