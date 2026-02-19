'use client';

import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
    symbol: string;
}

declare global {
    interface Window {
        TradingView: any;
    }
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
    const container = useRef<HTMLDivElement>(null);

    // Map yfinance symbol format to TradingView format
    // yfinance: 005930.KS -> TradingView: KRX:005930
    // yfinance: AAPL -> TradingView: NASDAQ:AAPL (or just AAPL)
    const getTVSymbol = (s: string) => {
        if (s === 'ES=F') {
            return 'CME:ES1!';
        }
        if (s.endsWith('.KS')) {
            return `KRX:${s.replace('.KS', '')}`;
        }
        if (s.endsWith('.KQ')) {
            return `KOSDAQ:${s.replace('.KQ', '')}`;
        }
        return s;
    };

    const tvSymbol = getTVSymbol(symbol);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            if (container.current && window.TradingView) {
                new window.TradingView.widget({
                    "autosize": true,
                    "symbol": tvSymbol,
                    "interval": "D",
                    "timezone": "Asia/Seoul",
                    "theme": "light",
                    "style": "1",
                    "locale": "en",
                    "toolbar_bg": "#f1f3f6",
                    "enable_publishing": false,
                    "hide_top_toolbar": false,
                    "hide_legend": false,
                    "save_image": false,
                    "container_id": container.current.id,
                    "studies": [
                        "ATR@tv-basicstudies",
                        "EMA@tv-basicstudies",
                        "RSI@tv-basicstudies",
                        "Volume@tv-basicstudies"
                    ],
                    "show_popup_button": true,
                    "popup_width": "1000",
                    "popup_height": "650"
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup script if needed, though usually fine as it's a global library
        };
    }, [tvSymbol]);

    return (
        <div className='tradingview-widget-container' style={{ height: "500px", width: "100%" }}>
            <div id={`tv_chart_${tvSymbol.replace(':', '_')}`} ref={container} style={{ height: "100%", width: "100%" }} />
        </div>
    );
}
