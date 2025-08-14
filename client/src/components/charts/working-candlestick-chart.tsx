import { useEffect, useRef } from "react";
import * as echarts from "echarts";

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

interface WorkingCandlestickChartProps {
  data: CandleData[];
  symbol: string;
  height?: string;
  onZoomChange?: (start: number, end: number) => void;
}

export default function WorkingCandlestickChart({ 
  data, 
  symbol, 
  height = "400px",
  onZoomChange
}: WorkingCandlestickChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    // Prepare data for ECharts
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const xAxisData = sortedData.map(item => 
      new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    );

    const candlestickData = sortedData.map(item => [
      parseFloat(item.open),
      parseFloat(item.close),
      parseFloat(item.low),
      parseFloat(item.high)
    ]);

    const volumeData = sortedData.map(item => item.volume);

    // Generate market session areas and day dividers
    const generateMarketSessions = () => {
      const markAreas: any[] = [];
      const markLines: any[] = [];
      const processedDays = new Set();

      sortedData.forEach((item, index) => {
        const timestamp = new Date(item.timestamp);
        const hour = timestamp.getHours();
        const minute = timestamp.getMinutes();
        const dayKey = timestamp.toDateString();

        // Only process each day once
        if (processedDays.has(dayKey)) return;
        processedDays.add(dayKey);

        // Find day boundaries in data
        const dayStart = sortedData.findIndex(d => 
          new Date(d.timestamp).toDateString() === dayKey
        );
        const dayEnd = sortedData.findLastIndex(d => 
          new Date(d.timestamp).toDateString() === dayKey
        );

        if (dayStart === -1 || dayEnd === -1) return;

        // Day divider at market open (9:30 AM)
        const marketOpenIndex = sortedData.findIndex(d => {
          const dt = new Date(d.timestamp);
          return dt.toDateString() === dayKey && 
                 dt.getHours() === 9 && dt.getMinutes() >= 30;
        });

        if (marketOpenIndex !== -1) {
          markLines.push({
            xAxis: marketOpenIndex,
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

        // Pre-market session (4:00 AM - 9:30 AM) - Blue tint
        const preMarketStart = sortedData.findIndex(d => {
          const dt = new Date(d.timestamp);
          return dt.toDateString() === dayKey && dt.getHours() >= 4;
        });
        const preMarketEnd = sortedData.findIndex(d => {
          const dt = new Date(d.timestamp);
          return dt.toDateString() === dayKey && 
                 dt.getHours() === 9 && dt.getMinutes() >= 30;
        });

        if (preMarketStart !== -1 && preMarketEnd !== -1 && preMarketStart < preMarketEnd) {
          markAreas.push([
            { xAxis: preMarketStart },
            { 
              xAxis: preMarketEnd,
              itemStyle: {
                color: 'rgba(59, 130, 246, 0.25)',
                borderWidth: 0
              }
            }
          ]);
        }

        // After-hours session (4:00 PM - 8:00 PM) - Purple tint
        const afterHoursStart = sortedData.findIndex(d => {
          const dt = new Date(d.timestamp);
          return dt.toDateString() === dayKey && dt.getHours() >= 16;
        });
        const afterHoursEnd = sortedData.findIndex(d => {
          const dt = new Date(d.timestamp);
          return dt.toDateString() === dayKey && dt.getHours() >= 20;
        });

        if (afterHoursStart !== -1) {
          const endIndex = afterHoursEnd !== -1 ? afterHoursEnd : 
                          Math.min(dayEnd + 1, sortedData.length - 1);
          
          if (afterHoursStart < endIndex) {
            markAreas.push([
              { xAxis: afterHoursStart },
              { 
                xAxis: endIndex,
                itemStyle: {
                  color: 'rgba(147, 51, 234, 0.25)',
                  borderWidth: 0
                }
              }
            ]);
          }
        }
      });

      return { markAreas, markLines };
    };

    const { markAreas, markLines } = generateMarketSessions();

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: `${symbol} Candlestick Chart`,
        left: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#334155',
        textStyle: {
          color: '#ffffff'
        },
        formatter: function(params: any) {
          const dataIndex = params[0].dataIndex;
          const item = sortedData[dataIndex];
          if (!item) return '';
          
          const timestamp = new Date(item.timestamp);
          const hour = timestamp.getHours();
          const sessionType = hour < 9.5 ? '🌅 Pre-Market' : 
                            hour >= 16 ? '🌙 After-Hours' : 
                            '📈 Regular Market';
          
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${timestamp.toLocaleString()}</div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">${sessionType}</div>
              <div>Open: $${parseFloat(item.open).toFixed(2)}</div>
              <div>High: $${parseFloat(item.high).toFixed(2)}</div>
              <div>Low: $${parseFloat(item.low).toFixed(2)}</div>
              <div>Close: $${parseFloat(item.close).toFixed(2)}</div>
              <div>Volume: ${item.volume.toLocaleString()}</div>
            </div>
          `;
        }
      },
      grid: [
        {
          left: '3%',
          right: '15%',
          top: '10%',
          height: '65%'
        },
        {
          left: '3%',
          right: '15%',
          top: '80%',
          height: '15%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: xAxisData,
          axisLine: {
            lineStyle: {
              color: '#64748b'
            }
          },
          axisLabel: {
            color: '#94a3b8',
            interval: Math.floor(xAxisData.length / 10)
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: xAxisData,
          axisLine: {
            lineStyle: {
              color: '#64748b'
            }
          },
          axisLabel: {
            show: false
          }
        }
      ],
      yAxis: [
        {
          scale: true,
          position: 'right',
          axisLine: {
            lineStyle: {
              color: '#64748b'
            }
          },
          axisLabel: {
            color: '#94a3b8',
            formatter: '${value}',
            fontSize: 11
          },
          splitLine: {
            lineStyle: {
              color: '#334155',
              type: 'dashed'
            }
          }
        },
        {
          scale: true,
          position: 'right',
          gridIndex: 1,
          axisLine: {
            lineStyle: {
              color: '#64748b'
            }
          },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 10
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: 'Candlestick',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: '#10b981', // Green for bullish
            color0: '#ef4444', // Red for bearish
            borderColor: '#10b981',
            borderColor0: '#ef4444'
          },
          emphasis: {
            itemStyle: {
              color: '#34d399',
              color0: '#f87171',
              borderColor: '#34d399',
              borderColor0: '#f87171'
            }
          },
          markArea: {
            silent: true,
            data: markAreas
          },
          markLine: {
            silent: true,
            data: markLines
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumeData,
          itemStyle: {
            color: 'rgba(59, 130, 246, 0.6)'
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: Math.max(0, 100 - (250 / data.length) * 100),
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: false,
          moveOnMouseWheel: true,
          preventDefaultMouseMove: false
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '95%',
          start: Math.max(0, 100 - (250 / data.length) * 100),
          end: 100,
          backgroundColor: 'rgba(47, 69, 84, 0.8)',
          borderColor: '#64748b',
          fillerColor: 'rgba(59, 130, 246, 0.3)',
          handleStyle: {
            color: '#3b82f6'
          },
          textStyle: {
            color: '#94a3b8'
          }
        }
      ],
      brush: {
        toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
        xAxisIndex: 0
      }
    };

    chartInstance.current.setOption(option);

    // Handle dataZoom events for infinite scrolling
    if (onZoomChange) {
      chartInstance.current.off('dataZoom');
      chartInstance.current.on('dataZoom', (params: any) => {
        if (params.batch && params.batch[0]) {
          const { start, end } = params.batch[0];
          const startIndex = Math.floor((start / 100) * data.length);
          const endIndex = Math.floor((end / 100) * data.length);
          onZoomChange(startIndex, endIndex);
        }
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current && onZoomChange) {
        chartInstance.current.off('dataZoom');
      }
    };

  }, [data, symbol]);

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
      style={{ width: '100%', height }}
      className="bg-navy-900 rounded-lg"
    />
  );
}