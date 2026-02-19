export interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type SignalType = 'STRONG_BUY' | 'STRONG_SELL' | 'PYRAMID_BUY' | 'PYRAMID_SELL' | 'EXIT_LONG' | 'EXIT_SHORT' | 'HOLD';

export interface TradingSignal {
    price: number;
    atr: string;
    signal: SignalType;
    positionSize: number;     // 1% Fixed Risk Recommended weight (0.0 - 1.0)
    regime: 'BULL' | 'BEAR' | 'RANGING';
    regimeConfidence: number; // 0.0 - 1.0
    riskHeat: 'LOW' | 'NORMAL' | 'HIGH';
    riskRewardRatio: number;
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
    EMA_TREND_PERIOD: number;   // Macro Trend (200)
    EMA_FAST_PERIOD: number;    // Signal Verification (50)
    VOLUME_EMA_FAST: number;    // Volume Trend Fast (5)
    VOLUME_EMA_SLOW: number;    // Volume Trend Slow (20)
    PROFIT_TAKE_MULTIPLIER: number; // Base target
    COSTS: {
        SLIPPAGE: number;
        TRANSACTION_FEE: number;
        ROLLOVER_FRICTION: number;
    };
}

export const DEFAULT_CONFIG: StrategyConfig = {
    ATR_PERIOD: 14,
    ENTRY_MULTIPLIER: 1.0,
    ENTRY_2_MULTIPLIER: 1.5,
    CHANDELIER_MULTIPLIER: 3.0,
    STOP_LOSS_MULTIPLIER: 1.0,
    VOLUME_THRESHOLD: 1.1,
    EMA_TREND_PERIOD: 200,
    EMA_FAST_PERIOD: 50,
    VOLUME_EMA_FAST: 5,
    VOLUME_EMA_SLOW: 20,
    PROFIT_TAKE_MULTIPLIER: 2.5,
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
    private state = {
        lastCandlesLength: 0,
        atr: 0,
        ema: new Map<number, number>(),
        tr: 0
    };

    constructor(config: Partial<StrategyConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public reset() {
        this.state = {
            lastCandlesLength: 0,
            atr: 0,
            ema: new Map<number, number>(),
            tr: 0
        };
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

        // Optimized incremental update
        if (this.state.atr > 0 && this.state.lastCandlesLength === candles.length - 1) {
            const current = candles[candles.length - 1];
            const prev = candles[candles.length - 2];
            const tr = this.calculateTR(current.high, current.low, prev.close);
            const newAtr = (this.state.atr * (period - 1) + tr) / period;
            // Note: Don't update this.state.atr here to prevent corruption on re-renders
            // Instead, we'll return the new value and let generateSignal update the state
            return newAtr;
        }

        if (this.state.atr > 0 && this.state.lastCandlesLength === candles.length) {
            return this.state.atr;
        }

        // Full calculation (only if cache missed or reset)
        const trs: number[] = [];
        for (let i = 0; i < candles.length; i++) {
            const prevClose = i > 0 ? candles[i - 1].close : null;
            trs.push(this.calculateTR(candles[i].high, candles[i].low, prevClose));
        }

        let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < trs.length; i++) {
            atr = (atr * (period - 1) + trs[i]) / period;
        }
        return atr;
    }

    // 2b. Calculate EMA (Exponential Moving Average)
    private calculateEMA(candles: Candle[], period: number): number {
        if (candles.length < period) return 0;

        const k = 2 / (period + 1);
        const cached = this.state.ema.get(period);

        // Incremental update
        if (cached !== undefined && this.state.lastCandlesLength === candles.length - 1) {
            const newEma = (candles[candles.length - 1].close - cached) * k + cached;
            return newEma;
        }

        // Full calculation
        let ema = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
        for (let i = period; i < candles.length; i++) {
            ema = (candles[i].close - ema) * k + ema;
        }
        return ema;
    }

    private calculateEMASlope(candles: Candle[], period: number): { slope: number; regime: 'BULL' | 'BEAR' | 'RANGING', currentEma: number } {
        if (candles.length < period + 5) return { slope: 0, regime: 'RANGING', currentEma: 0 };

        const currentEma = this.calculateEMA(candles, period);
        const prevEma = this.calculateEMA(candles.slice(0, -5), period);

        const slope = ((currentEma - prevEma) / prevEma) * 100; // % change over 5 bars

        let regime: 'BULL' | 'BEAR' | 'RANGING' = 'RANGING';
        if (slope > 0.05) regime = 'BULL';
        else if (slope < -0.05) regime = 'BEAR';

        return { slope, regime, currentEma };
    }

    // 2c. Calculate Volume EMA
    private calculateVolumeEMA(candles: Candle[], period: number): number {
        if (candles.length < period) return 0;
        const k = 2 / (period + 1);
        let ema = candles.slice(0, period).reduce((acc, c) => acc + c.volume, 0) / period;
        for (let i = period; i < candles.length; i++) {
            ema = (candles[i].volume - ema) * k + ema;
        }
        return ema;
    }

    // 3. Generate Trading Signal Logic (V5: Institutional Alpha)
    public generateSignal(candles: Candle[], currentWeight: number = 0): TradingSignal | null {
        if (candles.length < 200) return null; // V5 requires more history for stable EMA200

        const current = candles[candles.length - 1];
        let {
            ENTRY_MULTIPLIER, ENTRY_2_MULTIPLIER, CHANDELIER_MULTIPLIER,
            STOP_LOSS_MULTIPLIER, VOLUME_THRESHOLD, EMA_TREND_PERIOD,
            EMA_FAST_PERIOD, VOLUME_EMA_FAST, VOLUME_EMA_SLOW, PROFIT_TAKE_MULTIPLIER
        } = this.config;

        const atr = this.calculateATR(candles);
        const { slope, regime, currentEma: emaTrend } = this.calculateEMASlope(candles, EMA_TREND_PERIOD);
        const emaFast = this.calculateEMA(candles, EMA_FAST_PERIOD);

        // Update state
        this.state.lastCandlesLength = candles.length;
        this.state.ema.set(EMA_TREND_PERIOD, emaTrend);
        this.state.ema.set(EMA_FAST_PERIOD, emaFast);
        this.state.atr = atr;

        // --- V5: Triple Screen EMA Filter ---
        // Trend is valid only if current price is above/below BOTH EMAs
        const isBullishAlignment = current.close > emaTrend && current.close > emaFast && emaFast > emaTrend;
        const isBearishAlignment = current.close < emaTrend && current.close < emaFast && emaFast < emaTrend;

        // --- V5: Volume Trend Confirmation ---
        const volFast = this.calculateVolumeEMA(candles, VOLUME_EMA_FAST);
        const volSlow = this.calculateVolumeEMA(candles, VOLUME_EMA_SLOW);
        const isVolumeTrending = volFast > volSlow; // Sustained participation
        const isVolumeSpike = current.volume > (volSlow * VOLUME_THRESHOLD);

        // --- Regime Confidence ---
        // Normalized intensity of the EMA slope (0.0 to 1.0)
        const regimeConfidence = Math.min(1.0, Math.abs(slope) / 0.2);

        // Dynamic Scaling: If ranging, widen entry filters
        if (regime === 'RANGING') {
            ENTRY_MULTIPLIER *= 1.5;
            ENTRY_2_MULTIPLIER *= 1.5;
        }

        // --- Adaptive Profit Target ---
        // If momentum is high (confidence > 0.7), extend profit target
        const adaptivePT = regimeConfidence > 0.7 ? PROFIT_TAKE_MULTIPLIER * 1.5 : PROFIT_TAKE_MULTIPLIER;

        // Channel centerline (SMA 20)
        const sma20 = candles.slice(-20).reduce((a, b) => a + b.close, 0) / 20;

        // Entry Levels with V5 Filters
        const long1 = current.close > (sma20 + (atr * ENTRY_MULTIPLIER)) && isVolumeTrending && isVolumeSpike && isBullishAlignment;
        const long2 = current.close > (sma20 + (atr * ENTRY_2_MULTIPLIER)) && isVolumeTrending && isVolumeSpike && isBullishAlignment;

        const short1 = current.close < (sma20 - (atr * ENTRY_MULTIPLIER)) && isVolumeTrending && isVolumeSpike && isBearishAlignment;
        const short2 = current.close < (sma20 - (atr * ENTRY_2_MULTIPLIER)) && isVolumeTrending && isVolumeSpike && isBearishAlignment;

        // Chandelier Exit
        const recentHigh = Math.max(...candles.slice(-22).map(c => c.high));
        const chandelierStopLong = recentHigh - (atr * CHANDELIER_MULTIPLIER);
        const longExit = current.close < chandelierStopLong;

        const recentLow = Math.min(...candles.slice(-22).map(c => c.low));
        const chandelierStopShort = recentLow + (atr * CHANDELIER_MULTIPLIER);
        const shortExit = current.close > chandelierStopShort;

        let signal: SignalType = 'HOLD';

        // Signal Differentiation
        if (long2 && currentWeight > 0 && currentWeight < 1.0) signal = 'PYRAMID_BUY';
        else if (long1 && currentWeight === 0) signal = 'STRONG_BUY';
        else if (short2 && currentWeight > 0 && currentWeight < 1.0) signal = 'PYRAMID_SELL';
        else if (short1 && currentWeight === 0) signal = 'STRONG_SELL';
        else if (longExit) signal = 'EXIT_LONG';
        else if (shortExit) signal = 'EXIT_SHORT';

        // --- Risk Circuit Breaker / Sizing ---
        // 1% Risk Model with Volatility normalization
        const riskPerTrade = 0.01;
        const volatilityPct = atr / current.close;
        let positionSize = Math.min(1.0, riskPerTrade / volatilityPct);

        // V5: Scale down risk if regime confidence is low
        if (regimeConfidence < 0.3) positionSize *= 0.5;

        const riskHeat: 'LOW' | 'NORMAL' | 'HIGH' = positionSize > 0.8 ? 'HIGH' : positionSize > 0.4 ? 'NORMAL' : 'LOW';

        // Risk Reward Ratio using current price to PT target
        const risk = atr * STOP_LOSS_MULTIPLIER;
        const reward = atr * adaptivePT;
        const rr = reward / risk;

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
            positionSize: Number(positionSize.toFixed(2)),
            regime,
            regimeConfidence: Number(regimeConfidence.toFixed(2)),
            riskHeat,
            riskRewardRatio: Number(rr.toFixed(2)),
            stopLoss: activeStopLoss,
            chandelierStop: activeChandelier,
            config: this.config
        };
    }
}
