import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';

var isWeb = Platform.OS === 'web';

const html = require('./uplot.html');
import 'uplot/dist/uPlot.min.css';

var uPlot: any = null;
if (isWeb) {
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

const ChartUPlot = forwardRef<any, UPlotProps>(
  ({ data, options, style }, ref) => {
    // Native: render uPlot inside a WebView
    const { width, height } = useWindowDimensions();
    let webref: any = useRef(null);
    const uplotInstance = useRef<any>(null);
    const dataRef = useRef(data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addChart = (opts: any, data: number[][]): void => {
      // Subtracting height of u-title and u-legend and some more?
      opts.height = style?.height || 200;
      opts.width = style?.width || width;

      if (isWeb) {
        uplotInstance.current = new uPlot(opts, data, webref);
      } else {
        webref?.injectJavaScript(
          `let data = ${JSON.stringify(data)}; let uplot = new uPlot(${JSON.stringify(opts)}, data, document.getElementById("chart"));true;`,
        );
      }
    };

    const setData = (newData: number[][]): void => {
      if (isWeb) {
        uplotInstance.current?.setData(newData);
      } else {
        webref?.injectJavaScript(
          `uplot.setData(${JSON.stringify(newData)});true;`,
        );
      }
    };

    /**
     * Append a new data point across all series: [x, y1, y2, ...]
     */
    const pushData = (item: number[]): void => {
      if (isWeb) {
        for (let i = 0; i < item.length; i++) {
          dataRef.current[i].push(item[i]);
        }
        console.log('Pushing data:', item);
        console.log('dataRef.current', dataRef.current);

        uplotInstance.current?.setData(dataRef.current);
      } else {
        webref?.injectJavaScript(
          `var item = ${JSON.stringify(item)};
          for (let i = 0; i < item.length; i++) {
            data[i].push(item[i]);
          }
          uplot.setData(data);true;`,
        );
      }
    };

    useImperativeHandle(ref, () => ({
      setData,
      pushData,
    }));

    if (Platform.OS === 'web') {
      return (
        <div
          // eslint-disable-next-line react-native/no-inline-styles
          ref={(r): any => {
            webref = r;
            if (r) {
              addChart(options, data);
            }
          }}
          // eslint-disable-next-line react-native/no-inline-styles
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
  },
);

export default ChartUPlot;
