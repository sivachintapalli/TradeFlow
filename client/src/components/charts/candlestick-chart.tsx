import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { HistoricalData } from "@shared/schema";

// Generate market session dividers and background areas
function generateMarketSessions(data: HistoricalData[]) {
  const dayDividers: any[] = [];
  const sessionAreas: any[] = [];
  
  if (!data || data.length === 0) {
    return { dayDividers, sessionAreas };
  }
  
  // Group data by trading day
  const dayGroups: { [key: string]: HistoricalData[] } = {};
  
  data.forEach(item => {
    const date = new Date(item.timestamp);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!dayGroups[dayKey]) {
      dayGroups[dayKey] = [];
    }
    dayGroups[dayKey].push(item);
  });
  
  // Create day dividers and session areas
  Object.keys(dayGroups).forEach(dayKey => {
    const dayData = dayGroups[dayKey];
    if (dayData.length === 0) return;
    
    // Sort by timestamp
    dayData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const firstTimestamp = new Date(dayData[0].timestamp);
    const lastTimestamp = new Date(dayData[dayData.length - 1].timestamp);
    
    // Day divider (vertical line at market open)
    const marketOpen = new Date(firstTimestamp);
    marketOpen.setHours(9, 30, 0, 0); // 9:30 AM EST
    
    if (marketOpen.getTime() >= firstTimestamp.getTime() && marketOpen.getTime() <= lastTimestamp.getTime()) {
      dayDividers.push({
        xAxis: marketOpen.getTime(),
        lineStyle: {
          color: '#64748b',
          type: 'solid',
          width: 1,
          opacity: 0.8
        },
        label: {
          show: false
        }
      });
    }
    
    // Session background areas
    const preMarketStart = new Date(firstTimestamp);
    preMarketStart.setHours(4, 0, 0, 0); // 4:00 AM EST
    
    const marketOpenTime = new Date(firstTimestamp);
    marketOpenTime.setHours(9, 30, 0, 0); // 9:30 AM EST
    
    const marketCloseTime = new Date(firstTimestamp);
    marketCloseTime.setHours(16, 0, 0, 0); // 4:00 PM EST
    
    const afterHoursEnd = new Date(firstTimestamp);
    afterHoursEnd.setHours(20, 0, 0, 0); // 8:00 PM EST
    
    // Pre-market session (4:00 AM - 9:30 AM)
    if (firstTimestamp.getTime() <= marketOpenTime.getTime()) {
      sessionAreas.push([
        {
          xAxis: Math.max(preMarketStart.getTime(), firstTimestamp.getTime()),
          itemStyle: {
            color: 'rgba(59, 130, 246, 0.05)', // Blue tint for pre-market
            borderWidth: 0
          }
        },
        {
          xAxis: Math.min(marketOpenTime.getTime(), lastTimestamp.getTime()),
          itemStyle: {
            color: 'rgba(59, 130, 246, 0.05)',
            borderWidth: 0
          }
        }
      ]);
    }
    
    // After-hours session (4:00 PM - 8:00 PM)
    if (lastTimestamp.getTime() >= marketCloseTime.getTime()) {
      sessionAreas.push([
        {
          xAxis: Math.max(marketCloseTime.getTime(), firstTimestamp.getTime()),
          itemStyle: {
            color: 'rgba(168, 85, 247, 0.05)', // Purple tint for after-hours
            borderWidth: 0
          }
        },
        {
          xAxis: Math.min(afterHoursEnd.getTime(), lastTimestamp.getTime()),
          itemStyle: {
            color: 'rgba(168, 85, 247, 0.05)',
            borderWidth: 0
          }
        }
      ]);
    }
  });
  
  return { dayDividers, sessionAreas };
}

interface CandlestickChartProps {
  data: HistoricalData[];
  symbol: string;
  isHistorical?: boolean;
  className?: string;
}

export default function CandlestickChart({ 
  data, 
  symbol, 
  isHistorical = true, 
  className = "" 
}: CandlestickChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) {
      console.log('[CandlestickChart] Missing data or ref', { chartRef: !!chartRef.current, dataLength: data?.length });
      return;
    }

    // Initialize chart if not exists
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstance.current;

    console.log('[CandlestickChart] Processing', data.length, 'data points for', symbol);

    // Process data for ECharts candlestick format: [timestamp, open, close, low, high]
    const processedData = data.map((item, index) => {
      const timestamp = new Date(item.timestamp).getTime();
      const open = parseFloat(item.open);
      const close = parseFloat(item.close);
      const low = parseFloat(item.low);
      const high = parseFloat(item.high);
      
      // Validate data sanity
      if (open > 10000 || close > 10000 || low > 10000 || high > 10000) {
        console.error('[CandlestickChart] Invalid price data detected:', {
          timestamp: item.timestamp,
          open: item.open,
          close: item.close,
          low: item.low,
          high: item.high
        });
      }
      
      const result = [timestamp, open, close, low, high];
      if (index < 3) {
        console.log('[CandlestickChart] Data point', index, ':', {
          timestamp: new Date(timestamp).toISOString(),
          open, close, low, high,
          volume: item.volume
        });
      }
      return result;
    });

    const dates = data.map(item => new Date(item.timestamp).toLocaleDateString());
    const volumeData = data.map(item => parseFloat(item.volume.toString()));

    console.log('[CandlestickChart] Processed arrays - Candles:', processedData.length, 'Volume:', volumeData.length);

    // Generate market session dividers (pre-market, regular hours, after-hours)
    const marketSessions = generateMarketSessions(data);
    
    const option = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 1000,
      grid: [
        {
          left: '3%',
          right: '3%',
          top: '10%',
          height: '65%',
        },
        {
          left: '3%',
          right: '3%',
          top: '80%',
          height: '15%',
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderColor: 'rgba(132, 79, 193, 0.5)',
        textStyle: {
          color: '#ffffff',
          fontFamily: 'Roboto Mono, monospace',
        },
        formatter: function(params: any) {
          if (!params || !Array.isArray(params) || params.length === 0) return '';
          
          const seriesData = params[0]?.data;
          if (!seriesData || !Array.isArray(seriesData) || seriesData.length < 5) return '';
          
          const [timestamp, open, close, low, high] = seriesData;
          const dataIndex = params[0]?.dataIndex;
          const volume = dataIndex !== undefined && data[dataIndex] ? parseFloat(data[dataIndex].volume.toString()) : 0;
          const date = new Date(timestamp).toLocaleDateString();
          const change = ((close - open) / open * 100).toFixed(2);
          const changeColor = parseFloat(change) >= 0 ? '#38ce3c' : '#ef4444';
          
          return `
            <div style="font-family: 'Roboto Mono', monospace;">
              <div style="margin-bottom: 8px; font-weight: bold;">${symbol} - ${date}</div>
              <div style="display: grid; grid-template-columns: auto auto; gap: 8px 16px;">
                <span style="color: #94a3b8;">Open:</span><span>$${open.toFixed(2)}</span>
                <span style="color: #94a3b8;">High:</span><span style="color: #38ce3c;">$${high.toFixed(2)}</span>
                <span style="color: #94a3b8;">Low:</span><span style="color: #ef4444;">$${low.toFixed(2)}</span>
                <span style="color: #94a3b8;">Close:</span><span>$${close.toFixed(2)}</span>
                <span style="color: #94a3b8;">Change:</span><span style="color: ${changeColor};">${change}%</span>
                <span style="color: #94a3b8;">Volume:</span><span>${(volume / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          `;
        }
      },
      xAxis: [
        {
          type: 'time',
          boundaryGap: false,
          axisLine: { 
            onZero: false,
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            color: '#94a3b8',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
          },
          // Add market session vertical lines
          markLine: {
            silent: true,
            lineStyle: {
              color: '#475569',
              type: 'solid',
              width: 1,
              opacity: 0.6
            },
            data: marketSessions.dayDividers
          },
          splitLine: { 
            show: false 
          },
          axisTick: {
            show: false,
          }
        },
        {
          type: 'time',
          gridIndex: 1,
          boundaryGap: false,
          axisLine: { 
            onZero: false,
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            show: false,
          },
          splitLine: { 
            show: false 
          },
          axisTick: {
            show: false,
          }
        }
      ],
      yAxis: [
        {
          scale: true,
          axisLine: { 
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            color: '#94a3b8',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 11,
            formatter: (value: number) => `$${value.toFixed(2)}`
          },
          splitLine: {
            lineStyle: {
              color: '#334155',
              opacity: 0.5
            }
          },
          // Add session markers
          markArea: {
            silent: true,
            data: marketSessions.sessionAreas
          }
        },
        {
          scale: true,
          gridIndex: 1,
          axisLine: { 
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            color: '#94a3b8',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 10,
            formatter: (value: number) => `${(value / 1000000).toFixed(0)}M`
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: symbol,
          type: 'candlestick',
          data: processedData,
          itemStyle: {
            color: '#38ce3c', // Bullish green
            color0: '#ef4444', // Bearish red
            borderColor: '#38ce3c',
            borderColor0: '#ef4444',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2,
            }
          },
          // Fix data interpretation - ensure proper OHLC mapping
          encode: {
            x: 0,  // timestamp (x-axis)
            y: [1, 2, 3, 4]  // [open, close, low, high] for candlestick
          },
          // Enable dataZoom for infinite scrolling
          large: true,
          largeThreshold: 1000
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumeData,
          itemStyle: {
            color: function(params: any) {
              const dataIndex = params.dataIndex;
              if (dataIndex >= data.length) return '#475569';
              const item = data[dataIndex];
              const open = parseFloat(item.open);
              const close = parseFloat(item.close);
              return close >= open ? 'rgba(56, 206, 60, 0.3)' : 'rgba(239, 68, 68, 0.3)';
            }
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: isHistorical ? 70 : 90,
          end: 100,
          zoomLock: false,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
          preventDefaultMouseMove: false,
        },
        {
          show: isHistorical,
          xAxisIndex: [0, 1],
          type: 'slider',
          bottom: '5%',
          start: isHistorical ? 70 : 90,
          end: 100,
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          dataBackground: {
            lineStyle: {
              color: '#844fc1',
            },
            areaStyle: {
              color: 'rgba(132, 79, 193, 0.2)',
            }
          },
          fillerColor: 'rgba(132, 79, 193, 0.1)',
          handleStyle: {
            color: '#844fc1',
          },
          textStyle: {
            color: '#94a3b8'
          }
        }
      ]
    };

    try {
      console.log('[CandlestickChart] Setting chart option...');
      chart.setOption(option, true);
      console.log('[CandlestickChart] Chart option set successfully');
    } catch (error: any) {
      console.error('[CandlestickChart] Error setting chart option:', error.message || String(error));
    }

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, symbol, isHistorical]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={chartRef} 
      className={`w-full h-full ${className}`}
      data-testid="candlestick-chart"
      style={{ minHeight: '300px' }}
    />
  );
}