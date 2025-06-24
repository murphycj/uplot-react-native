import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const html = require('./uplot.html');
import 'uplot/dist/uPlot.min.css';

var uPlot: any = null;
if (Platform.OS === 'web') {
  uPlot = require('uplot').default;
}

export interface UPlotProps {
  /** uPlot data array: [xValues[], series1[], series2[], ...] */
  data: [number[], ...number[][]];
  /** uPlot options object */
  options: any;
  /** Additional style for the container */
  style?: any;
}

const ChartUPlot: React.FC<UPlotProps> = ({ data, options, style }) => {
  // Native: render uPlot inside a WebView
  const { width, height } = useWindowDimensions();
  let webref: any = useRef(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addChart = (opts: any, data: number[][]): void => {
    // Subtracting height of u-title and u-legend and some more?
    opts.height = style?.height || 200;
    opts.width = style?.width || width;

    if (Platform.OS === 'web') {
      new uPlot(opts, data, webref);
    } else {
      webref?.injectJavaScript(
        `let uplot = new uPlot(${JSON.stringify(opts)}, ${JSON.stringify(data)}, document.getElementById("chart"));true;`,
      );
    }
  };

  if (Platform.OS === 'web') {
    return (
      <div
        ref={(r): any => {
          webref = r;
          if (r) {
            addChart(options, data);
          }
        }}
        style={style as React.CSSProperties}
      />
    );
  } else {
    return (
      <WebView
        originWhitelist={['*']}
        source={html}
        style={{
          height: style?.height || height,
          width: style?.width || width,
          ...style,
        }}
        scrollEnabled={false}
        onLoadEnd={(): void => {
          console.log('WebView loaded');

          addChart(options, data);
        }}
        ref={(r): any => {
          webref = r;
          if (r) {
            console.log('WebView ref set');

            addChart(options, data);
          }
        }}
      />
    );
  }
};

export default ChartUPlot;
