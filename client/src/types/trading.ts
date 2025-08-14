export interface OrderFormData {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop-limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
}

export interface TimeframeOption {
  value: string;
  label: string;
}

export interface PeriodOption {
  value: string;
  label: string;
}

export interface TradingMode {
  HISTORICAL: 'historical';
  REALTIME: 'realtime';
}

export const TRADING_MODES = {
  HISTORICAL: 'historical' as const,
  REALTIME: 'realtime' as const,
} as const;

export type TradingModeType = typeof TRADING_MODES[keyof typeof TRADING_MODES];
