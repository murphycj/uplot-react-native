import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';

var isWeb = Platform.OS === 'web';

import html from './uplot.html';
import 'uplot/dist/uPlot.min.css';

var uPlot: any = null;
if (isWeb) {
  uPlot = require('uplot').default;
}

const MARGIN_TITLE = 27; // Height of the title
const MARGIN_LEGEND = 50; // Height of the legend

/**
 * Calculate the dimensions for the uPlot chart based on options, style, and device dimensions.
 * Adjusts for title and legend margins if they are present.
 */
function getDimensions(
  options: any,
  style: any,
  deviceWidth: number,
  deviceHeight: number,
  margin: { title?: number; legend?: number },
): {
  optionsFinal: any;
  containerWidth: number;
  containerHeight: number;
} {
  var containerWidth = options?.width || style?.width || deviceWidth;
  containerWidth = Math.min(containerWidth, deviceWidth);

  var containerHeight = options?.height || style?.height || deviceHeight;
  containerHeight = Math.min(containerHeight, deviceHeight);

  var uplotWidth = containerWidth;
  var uplotHeight = containerHeight;

  if (options?.title) {
    // Subtract height for title
    uplotHeight -= margin.title || MARGIN_TITLE;
  }

  if (options?.legend?.show) {
    // do nothing
  } else {
    // Subtract height for legend
    uplotHeight -= margin.legend || MARGIN_LEGEND;
  }

  var optionsFinal = { ...options };
  optionsFinal.width = uplotWidth;
  optionsFinal.height = uplotHeight;

  return { optionsFinal, containerWidth, containerHeight };
}

export interface UPlotProps {
  /** uPlot data array: [xValues[], series1[], series2[], ...] */
  data: [number[], ...number[][]];
  /** uPlot options object */
  options: any;
  /** Additional style for the container */
  style?: any;
  /** Margin for the chart, useful for titles and legends */
  margin?: { title?: number; legend?: number };
}

const ChartUPlot = forwardRef<any, UPlotProps>(
  (
    {
      data,
      options,
      style,
      margin = { title: MARGIN_TITLE, legend: MARGIN_LEGEND },
    },
    ref,
  ) => {
    // Native: render uPlot inside a WebView
    const { width, height } = useWindowDimensions();
    let webref: any = useRef(null);
    const uplotInstance = useRef<any>(null);
    const dataRef = useRef(data);
    const initialized = useRef(false);

    const bgColor = style?.backgroundColor || 'transparent';

    var { optionsFinal, containerWidth, containerHeight } = useMemo(() => {
      return getDimensions(options, style, width, height, margin);
    }, [options, style, width, height]);

    useEffect(() => {
      // update uplot height and width if options change

      if (isWeb) {
        uplotInstance.current?.setSize({
          width: containerWidth,
          height: containerHeight,
        });
      } else {
        webref?.injectJavaScript(`
          window._chart.setSize(${JSON.stringify(containerWidth)}, ${JSON.stringify(containerHeight)});
          true;
        `);
      }
    }, [containerWidth, containerHeight]);

    // const guardAndCreateJS = `
    //     (function() {
    //       if (window.__CHART_CREATED__) return;
    //       window.__CHART_CREATED__ = true;

    //       // stash your data and options on window
    //       window._data = ${JSON.stringify(data)};
    //       window._opts = ${JSON.stringify(options)};

    //       // now actually construct uPlot
    //       window._chart = new uPlot(window._opts, window._data, document.getElementById('chart'));
    //     })();
    //     true;
    //   `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createChart = useCallback(
      (opts: any, data: number[][]): void => {
        if (initialized.current) {
          return;
        }

        if (isWeb) {
          uplotInstance.current = new uPlot(opts, data, webref);
        } else {
          // inject background color before chart setup if provided
          const bgJS = bgColor
            ? `document.body.style.backgroundColor='${bgColor}';`
            : '';
          webref?.injectJavaScript(
            `${bgJS}
          window._data = ${JSON.stringify(data)};
          window._opts = ${JSON.stringify(opts)};
          window._chart = new uPlot(window._opts, window._data, document.getElementById("chart"));
          true;
          `,
          );
        }
        initialized.current = true;
      },
      [bgColor],
    );

    const setData = useCallback((newData: number[][]): void => {
      if (isWeb) {
        uplotInstance.current?.setData(newData);
      } else {
        webref?.injectJavaScript(`
          window._data = ${JSON.stringify(newData)};
          window._chart.setData(window._data);
          true;
          `);
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

          if (!window._data) {
            window._data = [];
            for (let i = 0; i < item.length; i++) {
              window._data.push([]);
            }
          }

          for (let i = 0; i < item.length; i++) {
            window._data[i].push(item[i]);
          }
          window._chart.setData(window._data);true;`);
      }
    }, []);

    // function to call setScale
    const setScale = useCallback((axis: string, options: any): void => {
      if (isWeb) {
        uplotInstance.current?.setScale(axis, options);
      } else {
        webref?.injectJavaScript(`
          window._chart.setScale(${JSON.stringify(axis)}, ${JSON.stringify(options)});true;
        `);
      }
    }, []);

    // function to call setSize
    const setSize = useCallback((width: number, height: number): void => {
      if (isWeb) {
        uplotInstance.current?.setSize(width, height);
      } else {
        webref?.injectJavaScript(
          `window._chart.setSize(${JSON.stringify(width)}, ${JSON.stringify(height)});true;`,
        );
      }
    }, []);

    // function to call destroy
    const destroy = useCallback((): void => {
      if (isWeb) {
        uplotInstance.current?.destroy();
      } else {
        webref?.injectJavaScript('window._chart.destroy();true;');
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
        <View
          ref={(r): any => {
            webref = r;
            if (r) {
              createChart(optionsFinal, data);
            }
          }}
          style={{
            ...style,
            width: containerWidth,
            height: containerHeight,
          }}
        />
      );
    } else {
      return (
        <WebView
          originWhitelist={['*']}
          source={html}
          style={{
            ...style,
            width: containerWidth,
            height: containerHeight,
          }}
          scrollEnabled={false}
          onLoadEnd={(): void => {
            // webref.injectJavaScript(guardAndCreateJS);
            createChart(optionsFinal, data);
          }}
          ref={(r) => {
            webref = r;
          }}
          javaScriptEnabled={true}
        />
      );
    }
  },
);

export default React.memo(ChartUPlot);
