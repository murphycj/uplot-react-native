import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, SafeAreaView, Text } from 'react-native';

import { ChartUPlot } from 'uplot-react-native';

var data = [[Date.now()], [Math.random() * 100]];

export default function HomeScreen() {
  // create ref for chart
  const chartRef = useRef(null);
  const [nDataPoint, setNDataPoint] = useState(1);

  useEffect(() => {
    setInterval(() => {
      // chartRef.current?.pushData([Date.now(), Math.random() * 100]);
      // setNDataPoint((prev) => prev + 1);
    }, 33);
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 16,
          marginTop: 54,
        }}
      >
        uPlot Chart Example
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 16 }}>
        {nDataPoint} data points
      </Text>
      <ChartUPlot
        data={data}
        options={{
          id: 'chart',
          width: 300,
          height: 300,
          scales: { x: { time: true } },
          series: [
            { label: 'Time' },
            { label: 'Value', stroke: 'blue', width: 2 },
          ],
          axes: [{ scale: 'x' }, {}],
        }}
        style={{
          width: 300,
          height: 300,
        }}
        ref={chartRef}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
