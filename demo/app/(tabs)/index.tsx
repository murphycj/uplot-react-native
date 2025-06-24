import { useEffect, useRef, useState, useMemo } from 'react';
import { Platform, StyleSheet, SafeAreaView, Text } from 'react-native';

import ChartUPlot from 'uplot-react-native';

var makeData = (points = 1000) => {
  const xs: number[] = new Array(points);
  const ys: number[] = new Array(points);

  for (let i = 0; i < points; i++) {
    xs[i] = i;
    ys[i] = Math.random() * 100;
  }

  return [xs, ys] as [number[], number[]];
};

var n = 500;
var data1 = makeData(n);
var data2 = makeData(n);
var data3 = makeData(n);
var count = n * 3;

var options = {
  id: 'chart',
  width: 300,
  height: 150,
  scales: { x: { time: false } },
  series: [{ label: 'Time' }, { label: 'Value', stroke: 'blue', width: 2 }],
  axes: [{ scale: 'x' }, {}],
};
var style = {
  width: 400,
  height: 150,
};

export default function HomeScreen() {
  // create ref for chart
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartRef3 = useRef(null);
  const [nDataPoint, setNDataPoint] = useState(1);

  useEffect(() => {
    setTimeout(() => {
      setInterval(() => {
        chartRef1.current?.pushData([n, Math.random() * 100]);
        chartRef2.current?.pushData([n, Math.random() * 100]);
        chartRef3.current?.pushData([n, Math.random() * 100]);
        count = count + 3;
        n = n + 1;
      }, 10);
    }, 10000);
    setInterval(() => {
      setNDataPoint(count);
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
        data={data1}
        options={options}
        style={style}
        ref={chartRef1}
      />
      <ChartUPlot
        data={data2}
        options={options}
        style={style}
        ref={chartRef2}
      />
      <ChartUPlot
        data={data3}
        options={options}
        style={style}
        ref={chartRef3}
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
