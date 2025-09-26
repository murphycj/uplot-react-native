import { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, SafeAreaView, Text, Dimensions } from 'react-native';

import ChartUPlot from 'uplot-react-native';

var makeData = (points = 1000) => {
  const xs: number[] = new Array(points);
  const ys: number[] = new Array(points);
  var prev: number | null = null;

  for (let i = 0; i < points; i++) {
    xs[i] = i;
    if (prev != null) {
      ys[i] = prev + (Math.random() - 0.5) * 10;
    } else {
      ys[i] = Math.random() * 200 + 100;
    }
    prev = ys[i];
  }

  return [xs, ys] as [number[], number[]];
};

var injectedJavaScript = `
  function format_value(self, ticks) {
    return ticks.map((val) => {
      return 2;
    });
  }

function msToTimeSemicolon(milliseconds, range) {
  var seconds = parseInt((milliseconds / 1000) % 60),
    minutes = parseInt((milliseconds / (1000 * 60)) % 60),
    hours = parseInt(milliseconds / (1000 * 60 * 60));

  if (hours > 0) {
    seconds = seconds > 9 ? seconds : '0' + seconds;
    minutes = minutes > 9 ? minutes : '0' + minutes;
    return \`\${hours}:\${minutes}:\${seconds}\`;
  } else if (minutes >= 1) {
    seconds = seconds > 9 ? seconds : '0' + seconds;
    return \`\${minutes}:\${seconds}\`;
  } else {
    if (range && range < 10000) {
      return \`\${seconds}.\${parseInt((milliseconds % 1000) / 10)}\`;
    } else {
      return \`\${seconds}\`;
    }
  }
}

function axesValuesX(self, ticks) {
  return ticks.map((val) => {
    return msToTimeSemicolon(val, self.scales.x.max - self.scales.x.min);
  });
}

function axesValuesY(self, ticks) {
  return ticks.map((val) => {
      return val;
  });
}

function path(u, seriesIdx, idx0, idx1) {
  let stroke = new Path2D();

  let xData = u.data[0];
  let yData = u.data[1];

  for (let i = idx0; i <= idx1; i++) {
    if (yData[i] != null) {
      let x = u.valToPos(xData[i], 'x', true);
      let y = u.valToPos(yData[i], 'y', true);

      if (
        i == 0 ||
        yData[i - 1] == null ||
        Math.abs(yData[i] - yData[i - 1]) > 20
      )
        stroke.moveTo(Math.round(x), Math.round(y));
      else stroke.lineTo(Math.round(x), Math.round(y));
    }
  }

  return { stroke };
}
`;

var textColor = '#000';
var gridColor = '#ddd';
var gridWidth = 1;
var lineColor = '#eb5fac';
var lineWidth = 2;

function format_value(self, ticks) {
  return ticks.map((val) => {
    return 2;
  });
}

function msToTimeSemicolon(milliseconds, range) {
  var seconds = parseInt((milliseconds / 1000) % 60),
    minutes = parseInt((milliseconds / (1000 * 60)) % 60),
    hours = parseInt(milliseconds / (1000 * 60 * 60));

  if (hours > 0) {
    seconds = seconds > 9 ? seconds : '0' + seconds;
    minutes = minutes > 9 ? minutes : '0' + minutes;
    return `${hours}:${minutes}:${seconds}`;
  } else if (minutes >= 1) {
    seconds = seconds > 9 ? seconds : '0' + seconds;
    return `${minutes}:${seconds}`;
  } else {
    if (range && range < 10000) {
      return `${seconds}.${parseInt((milliseconds % 1000) / 10)}`;
    } else {
      return `${seconds}`;
    }
  }
}

var axesValuesX = (self, ticks) => {
  ticks.map((val) => {
    return msToTimeSemicolon(val, self.scales.x.max - self.scales.x.min);
  });
};

var axesValuesY = (self, ticks) =>
  ticks.map((val) => {
    return val;
  });

var path = (u, seriesIdx, idx0, idx1) => {
  let stroke = new Path2D();
  let xData = u.data[0];
  let yData = u.data[1];

  for (let i = idx0; i <= idx1; i++) {
    if (yData[i] != null) {
      let x = u.valToPos(xData[i], 'x', true);
      let y = u.valToPos(yData[i], 'y', true);

      if (
        i == 0 ||
        yData[i - 1] == null ||
        Math.abs(yData[i] - yData[i - 1]) > 20
      )
        stroke.moveTo(Math.round(x), Math.round(y));
      else stroke.lineTo(Math.round(x), Math.round(y));
    }
  }

  return { stroke };
};

var options = {
  width: 300,
  height: 400,
  pxAlign: 0,
  axes: [
    {
      stroke: textColor,
      grid: {
        show: false,
        width: gridWidth,
      },
      ticks: {
        stroke: gridColor,
        width: gridWidth,
      },
      values: axesValuesX,
    },
    {
      stroke: textColor,
      grid: {
        stroke: gridColor,
        width: gridWidth,
      },
      ticks: {
        stroke: gridColor,
        width: gridWidth,
      },
      splits: null,
      values: axesValuesY,
    },
  ],
  series: [
    {
      label: 'Time',
      // value: (self, rawValue) =>
      //   msToTimeSemicolon(rawValue, self.scales.x.max - self.scales.x.min),
    },
    {
      label: 'Values',
      points: { show: false },
      stroke: lineColor,
      width: lineWidth,
      // stroke: (u, seriesIdx) => {
      //   console.log(u);
      //   return u;
      //   // return scaleGradient(u, 'y', 1, vtGrad, true);
      // },
      paths: path,
      spanGaps: false,
    },
  ],
  scales: {
    x: {
      time: false,
    },
    y: {
      range: [50, 350],
      auto: false,
      distr: null,
      log: 2,
    },
  },
};

var n = 200;
var data1 = makeData(n);
var data2 = makeData(n);
var data3 = makeData(n);
var count = n * 3;

export default function HomeScreen() {
  // create ref for chart
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartRef3 = useRef(null);
  const [nDataPoint, setNDataPoint] = useState(1);

  var { width, height } = Dimensions.get('window');

  useEffect(() => {
    setInterval(() => {
      chartRef1.current?.pushData([n, Math.random() * 100]);
      // chartRef2.current?.pushData([n, Math.random() * 100]);
      // chartRef3.current?.pushData([n, Math.random() * 100]);
      count = count + 3;
      n = n + 1;
    }, 1000);
    setInterval(() => {
      setNDataPoint(count);
    }, 1000);
  }, []);

  // var options = {
  //   id: 'chart',
  //   width: width,
  //   height: height * 0.7,
  //   scales: { x: { time: false }, y: { range: [0, 200] } },
  //   series: [
  //     {
  //       label: 'Time',
  //     },
  //     { label: 'Value', stroke: 'blue', width: 2 },
  //   ],
  //   axes: [
  //     {
  //       scale: 'x',
  //       ticks: {
  //         stroke: 'black',
  //         width: 2,
  //       },
  //     },
  //     {},
  //   ],
  // };

  var style = useMemo(() => {
    return {
      width: width,
      height: height * 0.7,
    };
  }, [width, height]);

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
        injectedJavaScript={injectedJavaScript}
        // functions={functions}
      />
      {/* <ChartUPlot
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
      /> */}
    </SafeAreaView>
  );
}
