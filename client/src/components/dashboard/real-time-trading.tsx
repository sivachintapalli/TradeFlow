import { useState, useEffect } from "react";
import OrderEntry from "./order-entry";
import ChartPanel from "./chart-panel";
import PortfolioPanel from "./portfolio-panel";
import { useMarketData } from "@/hooks/use-trading-data";

const timeframes = ['1M', '5M', '15M'];

export default function RealTimeTrading() {
  const [symbol, setSymbol] = useState("AAPL");
  const [activeTimeframe, setActiveTimeframe] = useState("1M");
  const { data: marketData } = useMarketData(symbol);

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      // This would trigger real-time data updates in a real application
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6" data-testid="real-time-trading">
      <div className="grid grid-cols-12 gap-6">
        {/* Order Entry Panel */}
        <div className="col-span-3">
          <OrderEntry symbol={symbol} onSymbolChange={setSymbol} />
        </div>
        
        {/* Live Trading Chart */}
        <div className="col-span-6">
          <div className="chart-container rounded-xl p-6 h-96">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold">{symbol} - Live Trading</h3>
                <div className="flex items-center space-x-3">
                  <span 
                    className="font-mono text-2xl font-bold"
                    data-testid="live-price"
                  >
                    ${marketData?.price || "0.00"}
                  </span>
                  <span 
                    className={`font-mono text-sm ${
                      marketData && parseFloat(marketData.change) >= 0 ? 'price-up' : 'price-down'
                    }`}
                    data-testid="live-change"
                  >
                    {marketData?.change && parseFloat(marketData.change) >= 0 ? '+' : ''}
                    {marketData?.change || '0.00'} ({marketData?.changePercent || '0.00'}%)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-bullish rounded-full pulse-dot"></div>
                  <span className="text-xs text-gray-400">Live</span>
                </div>
              </div>
              
              {/* Live Data Controls */}
              <div className="flex items-center space-x-2">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      activeTimeframe === tf
                        ? 'bg-purple-primary text-white'
                        : 'bg-navy-700 hover:bg-navy-600 text-gray-300'
                    }`}
                    data-testid={`button-live-timeframe-${tf.toLowerCase()}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            
            <ChartPanel 
              symbol={symbol}
              marketData={marketData}
              isHistorical={false}
            />
          </div>
        </div>
        
        {/* Portfolio and Order Book */}
        <div className="col-span-3">
          <PortfolioPanel />
        </div>
      </div>
    </div>
  );
}
