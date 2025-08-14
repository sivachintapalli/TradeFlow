import { Activity } from "lucide-react";
import type { TechnicalIndicators } from "@shared/schema";

interface TechnicalIndicatorsProps {
  symbol: string;
  indicators?: TechnicalIndicators;
}

export default function TechnicalIndicators({ symbol, indicators }: TechnicalIndicatorsProps) {
  const rsiValue = indicators?.rsi ? parseFloat(indicators.rsi) : 0;
  const rsiWidth = Math.min(Math.max(rsiValue, 0), 100);

  return (
    <div className="glass-card rounded-xl p-6 h-96" data-testid="technical-indicators">
      <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
        <Activity className="w-5 h-5" />
        <span>Technical Indicators</span>
      </h4>
      
      <div className="space-y-4 custom-scrollbar overflow-y-auto h-80">
        {/* RSI */}
        <div className="bg-navy-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">RSI (14)</span>
            <span 
              className="font-mono text-sm font-semibold"
              data-testid="indicator-rsi"
            >
              {indicators?.rsi || "0.00"}
            </span>
          </div>
          <div className="w-full bg-navy-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-bullish to-yellow-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${rsiWidth}%` }}
            ></div>
          </div>
        </div>
        
        {/* MACD */}
        <div className="bg-navy-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">MACD</span>
            <span 
              className={`font-mono text-sm font-semibold ${
                indicators?.macd && parseFloat(indicators.macd) >= 0 ? 'price-up' : 'price-down'
              }`}
              data-testid="indicator-macd"
            >
              {indicators?.macd && parseFloat(indicators.macd) >= 0 ? '+' : ''}
              {indicators?.macd || "0.00"}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Signal: {indicators?.macdSignal || "0.00"} • 
            Histogram: {indicators?.macdHistogram || "0.00"}
          </div>
        </div>
        
        {/* Bollinger Bands */}
        <div className="bg-navy-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Bollinger Bands</span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Upper:</span>
              <span data-testid="indicator-bb-upper">
                ${indicators?.bollingerUpper || "0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Middle:</span>
              <span data-testid="indicator-bb-middle">
                ${indicators?.bollingerMiddle || "0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Lower:</span>
              <span data-testid="indicator-bb-lower">
                ${indicators?.bollingerLower || "0.00"}
              </span>
            </div>
          </div>
        </div>
        
        {/* Volume */}
        <div className="bg-navy-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Volume</span>
            <span 
              className="font-mono text-sm font-semibold"
              data-testid="indicator-volume"
            >
              {indicators?.volume ? `${(indicators.volume / 1000000).toFixed(1)}M` : "0.0M"}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Avg: {indicators?.avgVolume ? `${(indicators.avgVolume / 1000000).toFixed(1)}M` : "0.0M"}
          </div>
        </div>
      </div>
    </div>
  );
}
