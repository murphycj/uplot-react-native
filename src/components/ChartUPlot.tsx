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

import html from './uplot.html';
import 'uplot/dist/uPlot.min.css';
var isWeb = Platform.OS === 'web';

var uPlot: any = null;
if (isWeb) {
  uPlot = require('uplot').default;
}

const MARGIN_TITLE = 27; // Height of the title
const MARGIN_LEGEND = 50; // Height of the legend

const stringify = (obj: any): string => {
  return JSON.stringify(obj, (_key, val) =>
    typeof val === 'function' ? `function(${val.name || 'anonymous'})` : val,
  );
};

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

function getCreateChartString(
  data: number[][],
  options: any,
  bgColor: string = 'transparent',
  injectedJavaScript: string = '',
): string {
  return `
    (function() {
      if (window.__CHART_CREATED__) return;
      window.__CHART_CREATED__ = true;

      // inject custom functions if provided
      ${injectedJavaScript}

      document.body.style.backgroundColor='${bgColor}';

      // stash your data and options on window
      window._data = ${JSON.stringify(data)};
      window._opts = parseOptions('${stringify(options)}');

      // inject background color before chart setup if provided
      if ('${bgColor}') {
        document.body.style.backgroundColor='${bgColor}';
      }
      // now actually construct uPlot
      window._chart = new uPlot(window._opts, window._data, document.getElementById('chart'));
    })();
    true;
  `;
}

export interface UPlotProps {
  /** uPlot data array: [xValues[], series1[], series2[], ...] */
  data: [number[], ...number[][]];
  /** uPlot options object */
  options: any;
  /** Additional style for the container */
  style?: any;
  /** any custom functions to be injected into the webview (Function or source string) */
  functions?: Array<Function | string>;
  /** Margin for the chart, useful for titles and legends */
  margin?: { title?: number; legend?: number };
  /** Callback for messages from the WebView */
  onMessage?: (event: any) => void;
  /** JavaScript to be injected into the WebView */
  injectedJavaScript?: string;
  /** Additional props for the WebView */
  webviewProps?: any;
}

const ChartUPlot = forwardRef<any, UPlotProps>(
  (
    {
      data,
      options,
      style,
      functions,
      margin = { title: MARGIN_TITLE, legend: MARGIN_LEGEND },
      onMessage,
      injectedJavaScript = '',
      ...webviewProps
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

    var injectFns = useMemo(() => {
      if (!functions || functions.length === 0) return '';
      // convert functions to string if needed
      return functions
        .map((fn) => (typeof fn === 'function' ? fn.toString() : fn))
        .join('\n');
    }, [functions]);

    useEffect(() => {
      // update uplot height and width if options change

      if (isWeb) {
        uplotInstance.current?.setSize({
          width: containerWidth,
          height: containerHeight,
        });
      } else {
        if (!webref) {
          console.error('WebView reference is not set');
          return;
        }

        webref?.injectJavaScript(`
          if (window._chart) {
            window._chart.setSize(${JSON.stringify(containerWidth)}, ${JSON.stringify(containerHeight)});
          } else {
            console.error('Chart not initialized');
          }
          true;
        `);
      }
    }, [containerWidth, containerHeight]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createChart = useCallback(
      (opts: any, data: number[][], bgColor?: string): void => {
        if (initialized.current) {
          return;
        }

        if (isWeb) {
          uplotInstance.current = new uPlot(opts, data, webref);
        } else {
          // inject background color before chart setup if provided

          webref?.injectJavaScript(getCreateChartString(data, opts, bgColor));
        }
        initialized.current = true;
      },
      [],
    );

    const setData = useCallback((newData: number[][]): void => {
      if (isWeb) {
        uplotInstance.current?.setData(newData);
      } else {
        if (!webref) {
          console.error('WebView reference is not set');
          return;
        }

        webref?.injectJavaScript(`
          if (window._chart) {
            console.debug('Setting new data for uPlot chart');
            window._data = ${JSON.stringify(newData)};
            window._chart.setData(window._data);
          } else {
            console.error('Chart not initialized');
          }
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
        if (!webref) {
          console.error('WebView reference is not set');
          return;
        }

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
          if (window._chart) {
            console.debug('Pushing new data to uPlot chart');
            window._chart.setData(window._data);
          } else {
            console.error('Chart not initialized');
          }
          true;
        `);
      }
    }, []);

    // function to call setScale
    const setScale = useCallback((axis: string, options: any): void => {
      if (isWeb) {
        uplotInstance.current?.setScale(axis, options);
      } else {
        if (!webref) {
          console.error('WebView reference is not set');
          return;
        }

        webref?.injectJavaScript(`
          if (window._chart) {
            window._chart.setScale(${JSON.stringify(axis)}, ${JSON.stringify(options)});true;
          } else {
            console.error('Chart not initialized');
          }
          true;
        `);
      }
    }, []);

    // function to call setSize
    const setSize = useCallback((width: number, height: number): void => {
      if (isWeb) {
        uplotInstance.current?.setSize(width, height);
      } else {
        webref?.injectJavaScript(`
          if (!window._chart) {
            window._chart.setSize(${JSON.stringify(width)}, ${JSON.stringify(height)});true;
          } else {
            console.error('Chart not initialized');
          }
          true;
        `);
      }
    }, []);

    // function to call destroy
    const destroy = useCallback((): void => {
      if (isWeb) {
        uplotInstance.current?.destroy();
      } else {
        webref?.injectJavaScript(`
          if (window._chart) {
            window._chart.destroy();true;
          } else {
            console.error('Chart not initialized');
          }
          true;
        `);
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
          {...webviewProps}
          originWhitelist={['*']}
          source={html}
          style={{
            ...style,
            width: containerWidth,
            height: containerHeight,
          }}
          scrollEnabled={false}
          onLoadEnd={(): void => {
            createChart(optionsFinal, data, bgColor);
          }}
          ref={(r) => {
            webref = r;
          }}
          javaScriptEnabled={true}
          injectedJavaScript={`${injectedJavaScript}; true;`}
          onMessage={(payload): void => {
            // in webviewProps, if onMessage is provided, call it with the payload
            if (onMessage) {
              onMessage(payload);
              return;
            }

            // Handle messages from the webview if needed
            // console.log('Message from webview:', event.nativeEvent.data);
            let dataPayload;
            try {
              dataPayload = JSON.parse(payload.nativeEvent.data);
            } catch (e) {}

            if (dataPayload) {
              if (dataPayload.type === 'Console') {
                console.info(`[Console] ${JSON.stringify(dataPayload.data)}`);
              } else {
                console.log(dataPayload);
              }
            }
          }}
        />
      );
    }
  },
);

export default React.memo(ChartUPlot);
