import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Platform, useWindowDimensions } from 'react-native';
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
    const createChart = useCallback((opts: any, data: number[][]): void => {
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
    }, []);

    const setData = useCallback((newData: number[][]): void => {
      if (isWeb) {
        uplotInstance.current?.setData(newData);
      } else {
        webref?.injectJavaScript(
          `uplot.setData(${JSON.stringify(newData)});true;`,
        );
      }
    }, []);

    /**
     * Append a new data point across all series: [x, y1, y2, ...]
     */
    const pushData = useCallback((item: number[]): void => {
      if (isWeb) {
        for (let i = 0; i < item.length; i++) {
          dataRef.current[i].push(item[i]);
        }

        uplotInstance.current?.setData(dataRef.current);
      } else {
        webref?.injectJavaScript(`
          var item = ${JSON.stringify(item)};
          for (let i = 0; i < item.length; i++) {
            data[i].push(item[i]);
          }
          uplot.setData(data);true;`);
      }
    }, []);

    // function to call setScale
    const setScale = useCallback((axis: string, options: any): void => {
      if (isWeb) {
        uplotInstance.current?.setScale(axis, options);
      } else {
        webref?.injectJavaScript(
          `uplot.setScale(${JSON.stringify(axis)}, ${JSON.stringify(options)});true;`,
        );
      }
    }, []);

    // function to call setSize
    const setSize = useCallback((width: number, height: number): void => {
      if (isWeb) {
        uplotInstance.current?.setSize(width, height);
      } else {
        webref?.injectJavaScript(
          `uplot.setSize(${JSON.stringify(width)}, ${JSON.stringify(height)});true;`,
        );
      }
    }, []);

    // function to call destroy
    const destroy = useCallback((): void => {
      if (isWeb) {
        uplotInstance.current?.destroy();
      } else {
        webref?.injectJavaScript('uplot.destroy();true;');
      }
    }, []);

    useImperativeHandle(ref, () => ({
      createChart,
      setData,
      pushData,
      setScale,
      setSize,
      destroy,
    }));

    if (Platform.OS === 'web') {
      return (
        <div
          // eslint-disable-next-line react-native/no-inline-styles
          ref={(r): any => {
            webref = r;
            if (r) {
              createChart(options, data);
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

            createChart(options, data);
          }}
          ref={(r): any => {
            webref = r;
            if (r) {
              console.log('WebView ref set');

              createChart(options, data);
            }
          }}
        />
      );
    }
  },
);

export default ChartUPlot;
