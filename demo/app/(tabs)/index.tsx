import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, SafeAreaView } from 'react-native';

import { ChartUPlot } from 'uplot-react-native';

var data = [[Date.now()], [Math.random() * 100]];

export default function HomeScreen() {
  // create ref for chart
  const chartRef = useRef(null);

  useEffect(() => {
    setInterval(() => {
      chartRef.current?.pushData([Date.now(), Math.random() * 100]);
    }, 1000);
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
