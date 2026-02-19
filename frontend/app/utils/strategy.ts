export interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type SignalType = 'STRONG_BUY' | 'STRONG_SELL' | 'EXIT_LONG' | 'EXIT_SHORT' | 'HOLD';

export interface TradingSignal {
    price: number;
    atr: string;
    signal: SignalType;
    stopLoss: string;
    chandelierStop: string;
    config: StrategyConfig;
}

export interface StrategyConfig {
    ATR_PERIOD: number;
    ENTRY_MULTIPLIER: number;
    ENTRY_2_MULTIPLIER: number; // Pyramiding level
    CHANDELIER_MULTIPLIER: number;
    STOP_LOSS_MULTIPLIER: number;
    VOLUME_THRESHOLD: number;
    COSTS: {
        SLIPPAGE: number;
        TRANSACTION_FEE: number;
        ROLLOVER_FRICTION: number;
    };
}

export const DEFAULT_CONFIG: StrategyConfig = {
    ATR_PERIOD: 14,
    ENTRY_MULTIPLIER: 1.0, // Aggressive 1st entry
    ENTRY_2_MULTIPLIER: 1.5, // 2nd entry (pyramiding)
    CHANDELIER_MULTIPLIER: 3.0,
    STOP_LOSS_MULTIPLIER: 1.0,
    VOLUME_THRESHOLD: 1.1, // Relaxed volume filter (110%)
    COSTS: {
        SLIPPAGE: 0.0002,
        TRANSACTION_FEE: 5.0,
        ROLLOVER_FRICTION: 0.001
    }
};

/**
 * Anti-Gravity V2: Pyramiding ATR breakout and trend following
 */
export class AntiGravityStrategy {
    private config: StrategyConfig;

    constructor(config: Partial<StrategyConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // 1. Calculate TR (True Range)
    private calculateTR(high: number, low: number, prevClose: number | null): number {
        if (prevClose === null) return high - low;
        return Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
    }

    // 2. Calculate ATR (Average True Range) - Wilder's Smoothing method
    private calculateATR(candles: Candle[]): number {
        const period = this.config.ATR_PERIOD;
        if (candles.length < period) return 0;

        const trs: number[] = [];
        for (let i = 0; i < candles.length; i++) {
            const prevClose = i > 0 ? candles[i - 1].close : null;
            trs.push(this.calculateTR(candles[i].high, candles[i].low, prevClose));
        }

        // First ATR is a simple average
        let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // Apply Wilder's Smoothing for subsequent values (effectively EMA with alpha = 1/period)
        for (let i = period; i < trs.length; i++) {
            atr = (atr * (period - 1) + trs[i]) / period;
        }
        return atr;
    }

    // 3. Generate Trading Signal Logic
    public generateSignal(candles: Candle[]): TradingSignal | null {
        if (candles.length < 22) return null;

        const current = candles[candles.length - 1];
        const { ENTRY_MULTIPLIER, ENTRY_2_MULTIPLIER, CHANDELIER_MULTIPLIER, STOP_LOSS_MULTIPLIER, VOLUME_THRESHOLD } = this.config;
        const atr = this.calculateATR(candles);

        // Simple Moving Average (20-day) - Channel centerline
        const sma20 = candles.slice(-20).reduce((a, b) => a + b.close, 0) / 20;

        // Volume SMA (20-day) for spike detection
        const volumeSma = candles.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;

        // Volume Spike Filter
        const isVolumeSpike = current.volume > volumeSma * VOLUME_THRESHOLD;

        // Entry Levels
        const longEntry1 = current.close > (sma20 + (atr * ENTRY_MULTIPLIER)) && isVolumeSpike;
        const longEntry2 = current.close > (sma20 + (atr * ENTRY_2_MULTIPLIER)) && isVolumeSpike;

        const shortEntry1 = current.close < (sma20 - (atr * ENTRY_MULTIPLIER)) && isVolumeSpike;
        const shortEntry2 = current.close < (sma20 - (atr * ENTRY_2_MULTIPLIER)) && isVolumeSpike;

        // Chandelier Exit
        const recentHigh = Math.max(...candles.slice(-22).map(c => c.high));
        const chandelierStopLong = recentHigh - (atr * CHANDELIER_MULTIPLIER);
        const longExit = current.close < chandelierStopLong;

        const recentLow = Math.min(...candles.slice(-22).map(c => c.low));
        const chandelierStopShort = recentLow + (atr * CHANDELIER_MULTIPLIER);
        const shortExit = current.close > chandelierStopShort;

        let signal: SignalType = 'HOLD';

        // Signal logic for the caller to interpret
        if (longEntry2) signal = 'STRONG_BUY'; // Priority to higher level
        else if (longEntry1) signal = 'STRONG_BUY';
        else if (shortEntry2) signal = 'STRONG_SELL';
        else if (shortEntry1) signal = 'STRONG_SELL';
        else if (longExit) signal = 'EXIT_LONG';
        else if (shortExit) signal = 'EXIT_SHORT';

        const activeStopLoss = (current.close > sma20)
            ? (current.close - (atr * STOP_LOSS_MULTIPLIER)).toFixed(2)
            : (current.close + (atr * STOP_LOSS_MULTIPLIER)).toFixed(2);

        const activeChandelier = (current.close > sma20)
            ? chandelierStopLong.toFixed(2)
            : chandelierStopShort.toFixed(2);

        return {
            price: current.close,
            atr: atr.toFixed(2),
            signal,
            stopLoss: activeStopLoss,
            chandelierStop: activeChandelier,
            config: this.config
        };
    }
}
