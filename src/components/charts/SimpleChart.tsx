import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Caption } from '../../../components/ui/Typography';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = Math.min(screenWidth - 80, 300);

interface SimpleBarChartProps {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  maxValue?: number;
}

export function SimpleBarChart({ 
  data, 
  labels, 
  color = '#9B8A7D', 
  height = 200,
  maxValue 
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data);
  const barWidth = (chartWidth - 40) / data.length - 8;

  return (
    <View style={[styles.chartContainer, { height: height + 40 }]}>
      <View style={styles.barsContainer}>
        {data.map((value, index) => {
          const barHeight = (value / max) * (height - 40);
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: barWidth,
                      backgroundColor: color,
                    },
                  ]}
                />
                <Text style={[styles.barValue, { fontSize: 10 }]}>{value}</Text>
              </View>
              <Caption style={[styles.barLabel, { width: barWidth + 8 }]}>
                {labels[index]}
              </Caption>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface SimpleLineChartProps {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  fillColor?: string;
}

export function SimpleLineChart({ 
  data, 
  labels, 
  color = '#9B8A7D', 
  height = 200,
  fillColor 
}: SimpleLineChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pointWidth = (chartWidth - 40) / (data.length - 1);

  return (
    <View style={[styles.chartContainer, { height: height + 40 }]}>
      <View style={styles.lineContainer}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, index) => (
          <View
            key={index}
            style={[
              styles.gridLine,
              {
                bottom: (height - 40) * percent + 20,
                width: chartWidth - 40,
              },
            ]}
          />
        ))}
        
        {/* Area fill */}
        {fillColor && (
          <View style={styles.areaContainer}>
            {data.map((value, index) => {
              const pointHeight = ((value - min) / range) * (height - 40);
              return (
                <View
                  key={index}
                  style={[
                    styles.areaBar,
                    {
                      left: index * pointWidth,
                      height: pointHeight,
                      width: pointWidth,
                      backgroundColor: fillColor,
                      opacity: 0.3,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* Data points and lines */}
        {data.map((value, index) => {
          const x = index * pointWidth;
          const y = ((value - min) / range) * (height - 40);
          
          return (
            <View key={index}>
              {/* Line to next point */}
              {index < data.length - 1 && (
                <View
                  style={[
                    styles.lineSegment,
                    {
                      left: x,
                      bottom: y + 20,
                      width: pointWidth,
                      backgroundColor: color,
                    },
                  ]}
                />
              )}
              
              {/* Data point */}
              <View
                style={[
                  styles.dataPoint,
                  {
                    left: x - 4,
                    bottom: y + 16,
                    backgroundColor: color,
                  },
                ]}
              />
              
              {/* Value label */}
              <Text
                style={[
                  styles.pointValue,
                  {
                    left: x - 15,
                    bottom: y + 25,
                  },
                ]}
              >
                {value}
              </Text>
            </View>
          );
        })}
      </View>
      
      {/* X-axis labels */}
      <View style={styles.xAxisContainer}>
        {labels.map((label, index) => (
          <Caption
            key={index}
            style={[
              styles.xAxisLabel,
              {
                left: index * pointWidth - 15,
                width: 30,
              },
            ]}
          >
            {label}
          </Caption>
        ))}
      </View>
    </View>
  );
}

interface SimplePieChartProps {
  data: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  size?: number;
}

export function SimplePieChart({ data, size = 120 }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={styles.pieContainer}>
      {/* Simple pie representation using bars */}
      <View style={[styles.pieChart, { width: size, height: size }]}>
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const barHeight = (percentage / 100) * size;
          
          return (
            <View
              key={index}
              style={[
                styles.pieSegment,
                {
                  height: barHeight,
                  backgroundColor: item.color,
                  width: size / data.length,
                },
              ]}
            />
          );
        })}
      </View>
      
      {/* Legend */}
      <View style={styles.pieLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: item.color },
              ]}
            />
            <Caption style={styles.legendText}>
              {item.label} ({((item.value / total) * 100).toFixed(1)}%)
            </Caption>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    minHeight: 5,
  },
  barValue: {
    marginTop: 4,
    color: '#666',
    fontSize: 10,
  },
  barLabel: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    fontSize: 10,
  },
  lineContainer: {
    position: 'relative',
    height: '100%',
    paddingTop: 20,
    paddingBottom: 20,
    marginHorizontal: 20,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  areaContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  areaBar: {
    position: 'absolute',
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  pointValue: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    width: 30,
  },
  xAxisContainer: {
    position: 'relative',
    height: 20,
    marginTop: 10,
    marginHorizontal: 20,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  pieContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pieChart: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  pieSegment: {
    borderRadius: 2,
    marginHorizontal: 1,
  },
  pieLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});
