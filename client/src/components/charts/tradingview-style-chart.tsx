import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZoomIn, ZoomOut, RotateCcw, TrendingUp, BarChart3, Crosshair, Move } from "lucide-react";

interface CandleData {
  id: string;
  symbol: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  timeframe: string;
}

interface TradingViewStyleChartProps {
  data: CandleData[];
  symbol: string;
  height?: string;
  onZoomChange?: (start: number, end: number) => void;
  onDataRangeChange?: (direction: 'older' | 'newer') => void;
}

export default function TradingViewStyleChart({ 
  data, 
  symbol, 
  height = "600px",
  onZoomChange,
  onDataRangeChange
}: TradingViewStyleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [timeframe, setTimeframe] = useState('1M');
  const [indicators, setIndicators] = useState<string[]>([]);
  const [crosshairEnabled, setCrosshairEnabled] = useState(true);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Initialize or get chart instance
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    // Sort data chronologically
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Prepare time axis
    const timeAxis = sortedData.map(item => new Date(item.timestamp));
    
    // Prepare OHLCV data
    const candlestickData = sortedData.map(item => [
      parseFloat(item.open),
      parseFloat(item.close),
      parseFloat(item.low),
      parseFloat(item.high)
    ]);

    const volumeData = sortedData.map(item => item.volume);
    const lineData = sortedData.map(item => parseFloat(item.close));

    // Calculate moving averages
    const ma20 = calculateMA(lineData, 20);
    const ma50 = calculateMA(lineData, 50);

    // TradingView-style color scheme
    const upColor = '#26a69a';
    const downColor = '#ef5350';
    const ma20Color = '#ffa726';
    const ma50Color = '#42a5f5';

    const option: any = {
      backgroundColor: '#131722',
      textStyle: {
        color: '#d1d4dc'
      },
      title: {
        text: `${symbol} ${timeframe}`,
        left: 20,
        top: 20,
        textStyle: {
          color: '#d1d4dc',
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      grid: [
        {
          left: 80,
          right: 80,
          top: 80,
          height: '65%',
          backgroundColor: 'transparent'
        },
        {
          left: 80,
          right: 80,
          top: '75%',
          height: '18%',
          backgroundColor: 'transparent'
        }
      ],
      xAxis: [
        {
          type: 'time',
          gridIndex: 0,
          axisLine: { 
            lineStyle: { color: '#363c4e' }
          },
          axisLabel: {
            color: '#787b86',
            formatter: function(value: number) {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: timeframe.includes('M') ? '2-digit' : undefined,
                minute: timeframe.includes('M') ? '2-digit' : undefined
              });
            }
          },
          splitLine: {
            lineStyle: { color: '#2a2e39' }
          }
        },
        {
          type: 'time',
          gridIndex: 1,
          axisLine: { 
            lineStyle: { color: '#363c4e' }
          },
          axisLabel: {
            show: false
          }
        }
      ],
      yAxis: [
        {
          gridIndex: 0,
          scale: true,
          position: 'right',
          axisLine: { 
            lineStyle: { color: '#363c4e' }
          },
          axisLabel: {
            color: '#787b86',
            formatter: function(value: number) {
              return '$' + value.toFixed(2);
            }
          },
          splitLine: {
            lineStyle: { 
              color: '#2a2e39',
              type: 'dashed'
            }
          }
        },
        {
          gridIndex: 1,
          scale: true,
          position: 'right',
          axisLine: { 
            lineStyle: { color: '#363c4e' }
          },
          axisLabel: {
            color: '#787b86',
            formatter: function(value: number) {
              return (value / 1000000).toFixed(1) + 'M';
            }
          },
          splitLine: {
            lineStyle: { 
              color: '#2a2e39',
              type: 'dashed'
            }
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: crosshairEnabled ? 'cross' : 'none',
          lineStyle: {
            color: '#787b86',
            type: 'dashed'
          }
        },
        backgroundColor: 'rgba(25, 30, 40, 0.95)',
        borderColor: '#363c4e',
        borderWidth: 1,
        textStyle: {
          color: '#d1d4dc'
        },
        formatter: function(params: any) {
          const dataIndex = params[0].dataIndex;
          const item = sortedData[dataIndex];
          if (!item) return '';
          
          const timestamp = new Date(item.timestamp);
          const open = parseFloat(item.open);
          const high = parseFloat(item.high);
          const low = parseFloat(item.low);
          const close = parseFloat(item.close);
          const volume = item.volume;
          
          return `
            <div style="padding: 12px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #d1d4dc;">
                ${timestamp.toLocaleString()}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div>O: <span style="color: ${open >= close ? downColor : upColor};">$${open.toFixed(2)}</span></div>
                <div>H: <span style="color: #26a69a;">$${high.toFixed(2)}</span></div>
                <div>L: <span style="color: #ef5350;">$${low.toFixed(2)}</span></div>
                <div>C: <span style="color: ${close >= open ? upColor : downColor};">$${close.toFixed(2)}</span></div>
              </div>
              <div style="margin-top: 8px; font-size: 12px;">
                Vol: <span style="color: #787b86;">${volume.toLocaleString()}</span>
              </div>
            </div>
          `;
        }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 70,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        }
      ],
      series: []
    };

    // Add main chart series based on type
    if (chartType === 'candlestick') {
      option.series.push({
        name: 'Candlestick',
        type: 'candlestick',
        data: candlestickData.map((candle, index) => [timeAxis[index], ...candle]),
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upColor,
          borderColor0: downColor
        },
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    } else if (chartType === 'line') {
      option.series.push({
        name: 'Close Price',
        type: 'line',
        data: lineData.map((price, index) => [timeAxis[index], price]),
        lineStyle: {
          color: upColor,
          width: 2
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    } else if (chartType === 'area') {
      option.series.push({
        name: 'Close Price',
        type: 'line',
        data: lineData.map((price, index) => [timeAxis[index], price]),
        lineStyle: {
          color: upColor,
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: upColor + '40' },
            { offset: 1, color: upColor + '00' }
          ])
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // Add moving averages if indicators include them
    if (indicators.includes('MA20')) {
      option.series.push({
        name: 'MA20',
        type: 'line',
        data: ma20.map((value, index) => [timeAxis[index], value]),
        lineStyle: {
          color: ma20Color,
          width: 1
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    if (indicators.includes('MA50')) {
      option.series.push({
        name: 'MA50',
        type: 'line',
        data: ma50.map((value, index) => [timeAxis[index], value]),
        lineStyle: {
          color: ma50Color,
          width: 1
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // Add volume chart
    option.series.push({
      name: 'Volume',
      type: 'bar',
      data: volumeData.map((vol, index) => [timeAxis[index], vol]),
      itemStyle: {
        color: function(params: any) {
          const dataIndex = params.dataIndex;
          const current = sortedData[dataIndex];
          const close = parseFloat(current.close);
          const open = parseFloat(current.open);
          return close >= open ? upColor + '60' : downColor + '60';
        }
      },
      xAxisIndex: 1,
      yAxisIndex: 1
    });

    chartInstance.current.setOption(option, true);

    // Handle dataZoom events for infinite scroll
    chartInstance.current.off('dataZoom');
    chartInstance.current.on('dataZoom', (params: any) => {
      if (params.batch && params.batch[0]) {
        const { start, end } = params.batch[0];
        const startIndex = Math.floor((start / 100) * data.length);
        const endIndex = Math.floor((end / 100) * data.length);
        
        if (onZoomChange) {
          onZoomChange(startIndex, endIndex);
        }
        
        if (onDataRangeChange) {
          // Trigger infinite scroll when near edges
          if (startIndex < 50) {
            onDataRangeChange('older');
          }
          if (endIndex > data.length - 50) {
            onDataRangeChange('newer');
          }
        }
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.off('dataZoom');
      }
    };

  }, [data, symbol, chartType, indicators, crosshairEnabled, timeframe]);

  // Calculate moving average
  function calculateMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  const toggleIndicator = (indicator: string) => {
    setIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-[#131722] rounded-lg overflow-hidden">
      {/* TradingView-style toolbar */}
      <div className="flex items-center justify-between p-4 bg-[#1e222d] border-b border-[#363c4e]">
        <div className="flex items-center space-x-4">
          {/* Chart type controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant={chartType === 'candlestick' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('candlestick')}
              className="h-8 px-3"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="h-8 px-3"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('area')}
              className="h-8 px-3"
            >
              <Move className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-[#363c4e]" />

          {/* Indicators */}
          <div className="flex items-center space-x-2">
            <Button
              variant={indicators.includes('MA20') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => toggleIndicator('MA20')}
              className="h-8 px-3 text-xs"
            >
              MA20
            </Button>
            <Button
              variant={indicators.includes('MA50') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => toggleIndicator('MA50')}
              className="h-8 px-3 text-xs"
            >
              MA50
            </Button>
          </div>

          <div className="h-6 w-px bg-[#363c4e]" />

          {/* Tools */}
          <Button
            variant={crosshairEnabled ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCrosshairEnabled(!crosshairEnabled)}
            className="h-8 px-3"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>

        {/* Timeframe selector */}
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-24 h-8 bg-[#2a2e39] border-[#363c4e]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1M">1m</SelectItem>
            <SelectItem value="5M">5m</SelectItem>
            <SelectItem value="15M">15m</SelectItem>
            <SelectItem value="30M">30m</SelectItem>
            <SelectItem value="1H">1h</SelectItem>
            <SelectItem value="1D">1D</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef} 
        style={{ width: '100%', height }}
        className="bg-[#131722]"
      />
    </div>
  );
}