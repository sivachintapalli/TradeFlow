import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import OrderEntryPanel from "@/components/trading/order-entry-panel";
import PositionsPanel from "@/components/trading/positions-panel";
import OrdersPanel from "@/components/trading/orders-panel";
import ChartPanel from "./chart-panel";
import { useMarketData } from "@/hooks/use-trading-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const timeframes = ['1M', '5M', '15M'];

export default function RealTimeTrading() {
  const [symbol, setSymbol] = useState("AAPL");
  const [activeTimeframe, setActiveTimeframe] = useState("1M");
  const { data: marketData } = useMarketData(symbol);
  
  // Fetch account data
  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ['/api/alpaca/account'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      // This would trigger real-time data updates in a real application
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6" data-testid="real-time-trading">
      {/* Account Balance Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Overview</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-bullish rounded-full pulse-dot"></div>
              <span className="text-xs text-gray-400">Paper Trading</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accountLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-primary"></div>
              <span className="text-sm text-gray-400">Loading account data...</span>
            </div>
          ) : accountData ? (
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Portfolio Value</p>
                <p className="text-xl font-bold text-green-bullish" data-testid="portfolio-value">
                  ${parseFloat(accountData.portfolio_value || '0').toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Buying Power</p>
                <p className="text-lg font-semibold" data-testid="buying-power">
                  ${parseFloat(accountData.buying_power || '0').toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Day P&L</p>
                <p className={`text-lg font-semibold ${
                  parseFloat(accountData.unrealized_pl || '0') >= 0 ? 'text-green-bullish' : 'text-red-bearish'
                }`} data-testid="day-pnl">
                  ${parseFloat(accountData.unrealized_pl || '0').toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Status</p>
                <p className="text-sm font-medium text-blue-primary" data-testid="account-status">
                  {accountData.status || 'Active'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-red-bearish">Failed to fetch account data. Please check your Alpaca credentials.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* First Row: Chart taking full width */}
      <div className="w-full">
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
                        ? 'bg-blue-primary text-white'
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
              timeframe={activeTimeframe}
            />
          </div>
        </div>
      
      {/* Second Row: Trading Panels */}
      <div className="grid grid-cols-12 gap-6">
        {/* Order Entry Panel */}
        <div className="col-span-4">
          <OrderEntryPanel />
        </div>
        
        {/* Positions Panel */}
        <div className="col-span-4">
          <PositionsPanel />
        </div>
        
        {/* Orders Panel */}
        <div className="col-span-4">
          <OrdersPanel />
        </div>
      </div>
    </div>
  );
}
