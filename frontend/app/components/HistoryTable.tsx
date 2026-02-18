import React from 'react';

interface HistoryTableProps {
    symbol: string;
    history: any[];
}

export default function HistoryTable({ symbol, history }: HistoryTableProps) {
    if (history.length === 0) return null;

    return (
        <div className="bg-stone-50 p-4 rounded-lg border border-stone-100 overflow-hidden shadow-inner mt-4">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-3 tracking-widest">Historical Database ({history.length})</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="text-left text-stone-400 border-b border-stone-200">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Price</th>
                            <th className="pb-2 font-medium">ATR</th>
                            <th className="pb-2 font-medium text-right">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {[...history].reverse().slice(0, 5).map((h, i) => (
                            <tr key={i} className="text-stone-600">
                                <td className="py-2">{new Date(h.date).toLocaleDateString()}</td>
                                <td className="py-2 font-medium">{symbol.endsWith('.KS') ? '₩' : '$'}{h.price.toLocaleString()}</td>
                                <td className="py-2">{symbol.endsWith('.KS') ? '₩' : '$'}{h.atr?.toLocaleString() || '-'}</td>
                                <td className={`py-2 text-right font-bold ${h.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {h.change_percent > 0 ? '+' : ''}{h.change_percent}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {history.length > 5 && <p className="text-[9px] text-stone-400 mt-2 italic">Showing last 5 entries</p>}
        </div>
    );
}
