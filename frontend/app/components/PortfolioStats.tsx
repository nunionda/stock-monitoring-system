import React from 'react';

interface PortfolioStatsProps {
    roi: number;
    netPL: number;
    realizedPL: number;
    unrealizedPL: number;
}

export default function PortfolioStats({ roi, netPL, realizedPL, unrealizedPL }: PortfolioStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">ROI (%)</p>
                <p className={`text-2xl font-serif font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Net P/L</p>
                <p className={`text-2xl font-serif font-bold ${netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netPL >= 0 ? '+' : ''}${Math.abs(netPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Realized P/L</p>
                <p className="text-xl font-serif font-bold text-stone-700">
                    ${realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Unrealized P/L</p>
                <p className={`text-xl font-serif font-bold ${unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
}
