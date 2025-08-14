import { useState } from "react";
import HeaderBar from "@/components/dashboard/header-bar";
import TabNavigation from "@/components/dashboard/tab-navigation";
import HistoricalAnalysis from "@/components/dashboard/historical-analysis";
import RealTimeTrading from "@/components/dashboard/real-time-trading";
import { TRADING_MODES, type TradingModeType } from "@/types/trading";

export default function TradingDashboard() {
  const [activeMode, setActiveMode] = useState<TradingModeType>(TRADING_MODES.HISTORICAL);

  return (
    <div className="min-h-screen bg-navy-900 text-white font-inter">
      <HeaderBar />
      
      <main className="flex-1 p-6">
        <TabNavigation 
          activeMode={activeMode} 
          onModeChange={setActiveMode} 
        />
        
        {activeMode === TRADING_MODES.HISTORICAL ? (
          <HistoricalAnalysis />
        ) : (
          <RealTimeTrading />
        )}
      </main>
    </div>
  );
}
