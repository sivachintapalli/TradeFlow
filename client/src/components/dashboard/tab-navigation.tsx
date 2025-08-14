import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";
import { TRADING_MODES, type TradingModeType } from "@/types/trading";

interface TabNavigationProps {
  activeMode: TradingModeType;
  onModeChange: (mode: TradingModeType) => void;
}

export default function TabNavigation({ activeMode, onModeChange }: TabNavigationProps) {
  return (
    <div className="mb-6" data-testid="tab-navigation">
      <div className="glass-panel rounded-xl p-2 inline-flex space-x-2">
        <Button
          onClick={() => onModeChange(TRADING_MODES.HISTORICAL)}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
            activeMode === TRADING_MODES.HISTORICAL 
              ? 'tab-active text-white' 
              : 'bg-transparent hover:bg-white/10 text-gray-300'
          }`}
          data-testid="tab-historical"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Historical Analysis</span>
          <div className={`px-2 py-1 rounded text-xs ${
            activeMode === TRADING_MODES.HISTORICAL 
              ? 'bg-white/20' 
              : 'bg-mocha/30'
          }`}>
            {activeMode === TRADING_MODES.HISTORICAL ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </Button>
        
        <Button
          onClick={() => onModeChange(TRADING_MODES.REALTIME)}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
            activeMode === TRADING_MODES.REALTIME 
              ? 'tab-active text-white' 
              : 'bg-transparent hover:bg-white/10 text-gray-300'
          }`}
          data-testid="tab-realtime"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Real-Time Trading</span>
          <div className={`px-2 py-1 rounded text-xs ${
            activeMode === TRADING_MODES.REALTIME 
              ? 'bg-white/20' 
              : 'bg-mocha/30'
          }`}>
            {activeMode === TRADING_MODES.REALTIME ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </Button>
      </div>
    </div>
  );
}
