import { Wifi, WifiOff, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarketData, useEmergencyStop } from "@/hooks/use-trading-data";
import { useToast } from "@/hooks/use-toast";

interface HeaderBarProps {
  showEmergencyStop?: boolean;
}

export default function HeaderBar({ showEmergencyStop = false }: HeaderBarProps) {
  const { data: spyData, isLoading: spyLoading } = useMarketData("SPY");
  const emergencyStop = useEmergencyStop();
  const { toast } = useToast();

  const handleEmergencyStop = () => {
    emergencyStop.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: "Emergency Stop Executed",
          description: `Cancelled ${data.cancelledOrders} pending orders`,
          variant: "destructive",
        });
      },
      onError: () => {
        toast({
          title: "Emergency Stop Failed",
          description: "Failed to execute emergency stop",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <header 
      className="glass-panel border-b border-white/10 px-6 py-4"
      data-testid="header-bar"
    >
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-primary to-purple-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-line text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AlgoTrade Pro</h1>
              <p className="text-xs text-gray-400">Professional Trading Platform</p>
            </div>
          </div>
        </div>
        
        {/* Market Status */}
        <div className="flex items-center space-x-6">
          <div className="glass-card px-4 py-2 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-300">SPY</span>
              {spyLoading ? (
                <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
              ) : (
                <>
                  <span 
                    className="font-mono font-semibold text-lg"
                    data-testid="spy-price"
                  >
                    ${spyData?.price || "0.00"}
                  </span>
                  <span 
                    className={`font-mono text-sm ${
                      spyData && parseFloat(spyData.change) >= 0 ? 'price-up' : 'price-down'
                    }`}
                    data-testid="spy-change"
                  >
                    {spyData?.change && parseFloat(spyData.change) >= 0 ? '+' : ''}
                    {spyData?.change || '0.00'} ({spyData?.changePercent || '0.00'}%)
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-bullish rounded-full pulse-dot"></div>
              <span className="text-sm text-gray-300">Market Data</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-bullish rounded-full pulse-dot"></div>
              <span className="text-sm text-gray-300">Trading API</span>
            </div>
          </div>
          
          {/* Emergency Stop - Only show in Real-Time Trading */}
          {showEmergencyStop && (
            <Button
              onClick={handleEmergencyStop}
              disabled={emergencyStop.isPending}
              className="bg-red-bearish hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition-all duration-200 glow-red flex items-center space-x-2"
              data-testid="button-emergency-stop"
            >
              <StopCircle className="w-4 h-4" />
              <span>EMERGENCY STOP</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
