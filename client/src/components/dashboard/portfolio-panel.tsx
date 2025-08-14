import { Briefcase, List } from "lucide-react";
import { usePortfolio, usePositions, useOrders } from "@/hooks/use-trading-data";

export default function PortfolioPanel() {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { data: positions, isLoading: positionsLoading } = usePositions();
  const { data: orders } = useOrders();

  const recentOrders = orders?.slice(0, 4) || [];

  return (
    <div className="space-y-6" data-testid="portfolio-panel">
      {/* Portfolio Metrics */}
      <div className="glass-card rounded-xl p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Briefcase className="w-5 h-5" />
          <span>Portfolio</span>
        </h4>
        
        <div className="space-y-4">
          <div className="bg-navy-800/50 rounded-lg p-4">
            <div className="text-center">
              {portfolioLoading ? (
                <div className="animate-pulse">
                  <div className="bg-gray-600 h-8 w-32 rounded mx-auto mb-2"></div>
                  <div className="bg-gray-600 h-4 w-24 rounded mx-auto"></div>
                </div>
              ) : (
                <>
                  <div 
                    className="text-2xl font-bold font-mono mb-1"
                    data-testid="text-portfolio-value"
                  >
                    ${portfolio?.totalValue || "0.00"}
                  </div>
                  <div className="text-sm text-gray-400">Total Portfolio Value</div>
                  <div 
                    className={`text-sm font-mono mt-1 ${
                      portfolio && parseFloat(portfolio.dayChange) >= 0 ? 'price-up' : 'price-down'
                    }`}
                    data-testid="text-portfolio-change"
                  >
                    {portfolio?.dayChange && parseFloat(portfolio.dayChange) >= 0 ? '+' : ''}
                    ${portfolio?.dayChange || "0.00"} ({portfolio?.dayChangePercent || "0.00"}%)
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Positions */}
          {positionsLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-navy-800/50 rounded-lg p-3 animate-pulse">
                  <div className="bg-gray-600 h-4 w-16 rounded mb-2"></div>
                  <div className="bg-gray-600 h-3 w-24 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {positions?.map((position) => (
                <div 
                  key={position.id} 
                  className="bg-navy-800/50 rounded-lg p-3"
                  data-testid={`position-${position.symbol.toLowerCase()}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono font-semibold">{position.symbol}</span>
                    <span 
                      className={`text-sm font-mono ${
                        parseFloat(position.pnl) >= 0 ? 'price-up' : 'price-down'
                      }`}
                    >
                      {parseFloat(position.pnl) >= 0 ? '+' : ''}${position.pnl}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{position.quantity} shares</span>
                    <span>${position.avgPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Order Book */}
      <div className="glass-card rounded-xl p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <List className="w-5 h-5" />
          <span>Recent Orders</span>
        </h4>
        
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-semibold">
            <span>Symbol</span>
            <span>Side</span>
            <span>Status</span>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              <p className="text-sm">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`grid grid-cols-3 gap-2 text-xs font-mono rounded p-2 ${
                    order.side === 'buy' 
                      ? 'bg-green-bullish/10' 
                      : 'bg-red-bearish/10'
                  }`}
                  data-testid={`order-${order.symbol.toLowerCase()}`}
                >
                  <span className="font-semibold">{order.symbol}</span>
                  <span 
                    className={
                      order.side === 'buy' ? 'text-green-bullish' : 'text-red-bearish'
                    }
                  >
                    {order.side.toUpperCase()}
                  </span>
                  <span 
                    className={`text-xs ${
                      order.status === 'filled' 
                        ? 'text-green-bullish' 
                        : order.status === 'cancelled'
                        ? 'text-red-bearish'
                        : 'text-yellow-400'
                    }`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
