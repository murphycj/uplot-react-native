import React, {
  useState,
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

// Utility functions to be injected into the WebView
// these are also present in the uplot.html file, but
// they are also here since in some cases the <script>
// tag in the HTML file is sometimes not executed in time
const UTIL_FUNCTIONS = `
function parseOptions(options) {
  var parsed = JSON.parse(options, (k, v) => {
    if (typeof v === 'string' && v.startsWith('__UPLOT_FUNC__')) {
      var name = v.replace(/^__UPLOT_FUNC__/, '');
      return window[name];
    }
    return v;
  });

  return parsed;
}

function sliceSeries(data, axis, min, max) {
  const axisData = data[axis];
  let start = -1;
  let end = -1;
  for (let i = 0; i < axisData.length; i++) {
    const v = axisData[i];
    if (v >= min && v <= max) {
      if (start === -1) start = i;
      end = i;
    }
  }

  if (start === -1) {
    return data.map(() => []);
  }

  return data.map((series) => series.slice(start, end + 1));
}
`;

const stringify = (obj: any): string => {
  return JSON.stringify(obj, (_key, val) =>
    // encode functions as an explicit marker that parseOptions can detect reliably
    typeof val === 'function'
      ? `__UPLOT_FUNC__${val.name || 'anonymous'}`
      : val,
  );
};

type AnyTypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

function isTypedArray(x: unknown): x is AnyTypedArray {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

/**
 * Converts typed arrays to plain arrays for JSON serialization.
 * This is necessary because typed arrays cannot be directly serialized to JSON.
 *
 * @param {Array} arrays - Array of arrays, which may include typed arrays.
 * @returns {Array} - A new array with all typed arrays converted to plain arrays.
 */
function toPlainArrays(arrays: any[]): any[] {
  return arrays.map((arr) =>
    isTypedArray(arr) ? Array.from(arr as ArrayLike<number | bigint>) : arr,
  );
}

/**
 * Slices a multi-series dataset to only the window where the given axis lies within [min, max].
 *
 * @param {number[][]} data   - Array of N series, each an array of equal length.
 *                              One of these series at index `axis` is the “axis” to window on.
 * @param {number}   axis     - Index of the axis-series in `data`.
 * @param {number}   min      - Inclusive lower bound on axis values.
 * @param {number}   max      - Inclusive upper bound on axis values.
 * @returns {number[][]}      - A new array of N series, each sliced to the [start..end] window.
 */
function _sliceSeries(
  data: number[][],
  axis: number,
  min: number,
  max: number,
): number[][] {
  const axisData = data[axis];
  let start = -1,
    end = -1;

  // find the first and last indices where axisData[i] ∈ [min, max]
  for (let i = 0; i < axisData.length; i++) {
    const v = axisData[i];
    if (v >= min && v <= max) {
      if (start === -1) start = i;
      end = i;
    }
  }

  // if nothing falls in the range, return empty arrays
  if (start === -1) {
    return data.map(() => []);
  }

  // slice each series to [start .. end]
  return data.map((series) => series.slice(start, end + 1));
}

/**
 * Calculate the dimensions for the uPlot chart based on options, style, and device dimensions.
 * Adjusts for title and legend margins if they are present.
 */
function getDimensions(
  options: any,
  width: number,
  height: number,
  // style: any,
  // deviceWidth: number,
  // deviceHeight: number,
  margin: { title?: number; legend?: number },
): {
  optionsFinal: any;
  // containerWidth: number;
  // containerHeight: number;
} {
  // var containerWidth = options?.width || style?.width || deviceWidth;
  // containerWidth = Math.min(containerWidth, deviceWidth);

  // var containerHeight = options?.height || style?.height || deviceHeight;
  // containerHeight = Math.min(containerHeight, deviceHeight);

  // var uplotWidth = containerWidth;
  // var uplotHeight = containerHeight;

  var uplotWidth = width;
  var uplotHeight = height;

  if (options?.title) {
    // Subtract height for title
    uplotHeight -= margin?.title != undefined ? margin.title : MARGIN_TITLE;
  }

  if (options?.legend?.show) {
    // do nothing
  } else {
    // Subtract height for legend
    uplotHeight -= margin?.legend != undefined ? margin.legend : MARGIN_LEGEND;
  }

  var optionsFinal = { ...options };
  optionsFinal.width = uplotWidth;
  optionsFinal.height = uplotHeight;

  return optionsFinal;
  // return { optionsFinal, containerWidth, containerHeight };
}

function getCreateChartString(
  data: number[][] | null = null,
  options: any,
  bgColor: string = 'transparent',
  injectedJavaScript: string = '',
): string {
  // Prepare data assignment only if data is not null
  const dataAssignment =
    data !== null ? `window._data = ${JSON.stringify(data)};` : '';

  const chartCreatedCheck =
    data !== null ? `if (window.__CHART_CREATED__) return;` : ``;

  return `
    (function() {
        ${chartCreatedCheck}
        window.__CHART_CREATED__ = true;

        // inject custom functions if provided
        ${injectedJavaScript}

        document.body.style.backgroundColor='${bgColor}';

        // stash your data on window if provided
        ${dataAssignment}

        // stash options on window
        window._opts = parseOptions('${stringify(options)}');

        if (window._chart) window._chart.destroy();

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
  /** Callback when the WebView has loaded */
  onLoad?: (() => void) | null;
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
      onLoad = null,
      injectedJavaScript = '',
      ...webviewProps
    },
    ref,
  ) => {
    // Native: render uPlot inside a WebView
    const { width, height } = useWindowDimensions();
    let webref: any = useRef(null);
    const uplotInstance = useRef<any>(null);
    const dataRef = useRef<number[][]>(data as number[][]);
    const variablesRef = useRef<{ [key: string]: any }>({});
    const initialized = useRef<boolean>(false);
    const containerRef = useRef<any>(null);
    const dimensionsRef = useRef({
      containerWidth: options?.width || style?.width || height,
      containerHeight: options?.height || style?.height || width,
    });

    const bgColor = style?.backgroundColor || 'transparent';

    const handleLayout = useCallback((event) => {
      const { width, height } = event.nativeEvent.layout;
      dimensionsRef.current = {
        containerWidth: width,
        containerHeight: height,
      };
    }, []);

    // memoized webview/view style to avoid recreating object on every render
    const memoizedContainerStyle = useMemo(() => {
      const base = style || {};
      return {
        ...base,
        width: options?.width || base?.width || '100%',
        height: options?.height || base?.height || '100%',
      };
    }, [style, options?.width, options?.height]);

    // memoized onLoadEnd handler for native WebView
    const handleLoadEnd = useCallback((): void => {
      // Use canonical dataRef when creating the native WebView chart
      dataRef.current = toPlainArrays(data as any[]) as number[][];
      createChart(options, dataRef.current, bgColor);

      if (onLoad) {
        onLoad();
      }
    }, [data, options, bgColor, onLoad]);

    // memoized onMessage handler for native WebView
    const handleMessage = useCallback(
      (payload: any): void => {
        if (onMessage) {
          onMessage(payload);
          return;
        }

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
      },
      [onMessage],
    );

    // memoized ref callback for both web container and native WebView
    const setWebRef = useCallback(
      (r: any) => {
        const prevContainer = containerRef.current;
        const prevWeb = webref.current;
        const shouldReinit = Boolean(prevContainer && r && r !== prevWeb);

        // update refs (allow clearing when r is null)
        containerRef.current = r;
        webref.current = r;

        if (!r) return;

        // On web, simply create chart when the DOM node appears
        if (Platform.OS === 'web') {
          createChart(options, data);
          return;
        }

        // Native WebView: detect reinitialization and restore variables/data
        if (shouldReinit) {
          initialized.current = false;
          destroy(true);
        }

        if (shouldReinit) {
          // console.log('Reinitializing WebView chart');

          // re-add any variables that were set
          let injectedVars = '';
          Object.keys(variablesRef.current).forEach((key) => {
            injectedVars += `window.${key} = ${JSON.stringify(
              variablesRef.current[key],
            )};`;
          });
          webref.current.injectJavaScript(`
            ${injectedVars}
            true;
          `);

          // reinit using the canonical dataRef rather than the original prop
          createChart(options, dataRef.current, bgColor);
        }
      },
      [options, data, bgColor],
    );

    // Keep canonical copy of incoming prop `data` (convert typed arrays to plain arrays).
    // Also mirror to window._data for native platforms when webref is available.
    useEffect(() => {
      if (!data) return;
      const plain = toPlainArrays(data as any[]);
      dataRef.current = plain as number[][];

      if (!isWeb && webref?.current) {
        // Mirror to webview window._data
        try {
          webref.current.injectJavaScript(`
            window._data = ${JSON.stringify(dataRef.current)};
            true;
          `);
        } catch (e) {
          console.error('Failed to inject initial data into WebView', e);
        }
      } else if (isWeb) {
        uplotInstance.current?.setData(dataRef.current);
      }
    }, [data]);

    // var { optionsFinal, containerWidth, containerHeight } = useMemo(() => {

    //   const { containerWidth, containerHeight } = dimensionsRef.current.containerWidth
    //     ? dimensionsRef.current
    //     : { containerWidth: width, containerHeight: height };

    //   return getDimensions(options, style, containerWidth, containerHeight, margin);
    // }, [style, width, height]);

    // var optsFinal = useMemo(() => {
    //   return options
    //   // return getDimensions(
    //   //     options,
    //   //     dimensionsRef.current.containerWidth,
    //   //     dimensionsRef.current.containerHeight,
    //   //     margin,
    //   //   );
    // }, [style, margin]);

    useEffect(() => {
      // update uplot height and width if options change

      if (isWeb) {
        uplotInstance.current?.setSize({
          width: dimensionsRef.current.containerWidth,
          height: dimensionsRef.current.containerHeight,
        });
      } else {
        if (!webref.current) {
          console.error('WebView reference is not set');
          return;
        }

        webref.current.injectJavaScript(`
          if (window._chart) {
            window._chart.setSize(${JSON.stringify(dimensionsRef.current.containerWidth)}, ${JSON.stringify(dimensionsRef.current.containerHeight)});
          } else {
            console.error('useEffect - dim | Chart not initialized');
          }
          true;
        `);
      }
    }, [
      dimensionsRef.current.containerHeight,
      dimensionsRef.current.containerWidth,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createChart = useCallback(
      (opts: any, data: number[][] | null = null, bgColor?: string): void => {
        if (initialized.current) {
          return;
        }

        const optsFinal = getDimensions(
          opts,
          // style,
          dimensionsRef.current.containerWidth,
          dimensionsRef.current.containerHeight,
          margin,
        );

        const chartData = data == null ? dataRef.current : data;

        if (isWeb) {
          uplotInstance.current = new uPlot(
            optsFinal,
            chartData,
            webref.current,
          );
        } else {
          // inject background color before chart setup if provided
          if (!webref?.current) {
            console.error('WebView reference is not set');
            return;
          }

          // Ensure dataRef is the source of truth for the created chart in the WebView
          dataRef.current = toPlainArrays(chartData || []) as number[][];
          webref.current.injectJavaScript(
            getCreateChartString(dataRef.current, optsFinal, bgColor),
          );
        }
        initialized.current = true;
      },
      [],
    );

    /**
     * Update the uPlot chart options.
     * It will create a new uPlot instance with the new options if the chart is already initialized.
     *
     * @param {Object} newOptions - The new options to set for the chart.
     */
    const updateOptions = useCallback((newOptions: any): void => {
      // call getDimensions to update optionsFinal

      destroy(true); // keep data
      createChart(newOptions);
    }, []);

    /**
     * Set the data for the uPlot chart.
     * If the chart is not initialized, it will be created with the new data.
     *
     * @param {number[][]} newData - The new data to set for the chart.
     */
    const setData = useCallback((newData: number[][]): void => {
      // Keep canonical copy (plain arrays)
      const plain = toPlainArrays(newData as any[]);
      dataRef.current = plain as number[][];

      if (isWeb) {
        uplotInstance.current?.setData(dataRef.current);
        return;
      }

      if (!webref?.current) {
        console.error('WebView reference is not set');
        return;
      }

      // Mirror full data into window._data and set chart
      webref.current.injectJavaScript(`
        window._data = ${JSON.stringify(dataRef.current)};
        if (window._chart) {
          window._chart.setData(window._data);
        } else {
          console.error('setData | Chart not initialized');
        }
        true;
      `);
    }, []);

    /**
     * Append a new data point across all series: [x, y1, y2, ...]
     */
    const pushData = useCallback((item: number[]): void => {
      // Update canonical copy locally first
      if (!dataRef.current || dataRef.current.length !== item.length) {
        dataRef.current = [];
        for (let i = 0; i < item.length; i++) dataRef.current.push([]);
      }
      for (let i = 0; i < item.length; i++) dataRef.current[i].push(item[i]);

      if (isWeb) {
        uplotInstance.current?.setData(dataRef.current);
        return;
      }

      if (!webref?.current) {
        console.error('WebView reference is not set');
        return;
      }

      // For native: inject only the new item and append to window._data in the WebView,
      // then call setData there. Avoid sending the entire dataRef.
      webref.current.injectJavaScript(`
        (function() {
          var item = ${JSON.stringify(item)};
          if (!window._data || window._data.length !== item.length) {
            window._data = [];
            for (var i = 0; i < item.length; i++) window._data.push([]);
          }
          for (var j = 0; j < item.length; j++) window._data[j].push(item[j]);
          if (window._chart) {
            window._chart.setData(window._data);
          } else {
            console.error('pushData | Chart not initialized');
          }
        })();
        true;
      `);
    }, []);

    /**
     * Slices a multi-series dataset to only the window where the given axis lies within [min, max].
     *
     * @param {number[][]} data   - Array of N series, each an array of equal length.
     *                              One of these series at index `axis` is the “axis” to window on.
     * @param {number}   axis     - Index of the axis-series in `data`.
     * @param {number}   min      - Inclusive lower bound on axis values.
     * @param {number}   max      - Inclusive upper bound on axis values.
     * @returns {number[][]}      - A new array of N series, each sliced to the [start..end] window.
     */
    const sliceSeries = useCallback(
      (axis: number, min: number, max: number): void => {
        // Update canonical dataRef by slicing locally
        dataRef.current = _sliceSeries(dataRef.current, axis, min, max);

        if (isWeb) {
          if (!uplotInstance.current) {
            console.error('uPlot instance is not initialized');
            return;
          }
          uplotInstance.current.setData(dataRef.current);
          return;
        }

        if (!webref?.current) {
          console.error('WebView reference is not set');
          return;
        }

        // Mirror sliced data into window._data and update the chart in the WebView
        webref.current.injectJavaScript(`
          window._data = ${JSON.stringify(dataRef.current)};
          if (window._chart) {
            window._chart.setData(window._data);
          } else {
            console.error('sliceSeries | Chart not initialized or data not available');
          }
          true;
        `);
        return;
      },
      [],
    );

    // function to call setScale
    const setScale = useCallback((axis: string, options: any): void => {
      if (isWeb) {
        uplotInstance.current?.setScale(axis, options);
      } else {
        if (!webref?.current) {
          console.error('WebView reference is not set');
          return;
        }

        webref.current.injectJavaScript(`
          if (window._chart) {
            window._chart.setScale(${JSON.stringify(axis)}, ${JSON.stringify(options)});true;
          } else {
            console.error('setScale | Chart not initialized');
          }
          true;
        `);
      }
    }, []);

    // if web, sets the variable to window.[name]
    // if native, sets the variable to window.[name] via webref.current.injectJavaScript
    const setVariable = useCallback((name: string, value: any): void => {
      variablesRef.current[name] = value;

      if (isWeb) {
        if (!window) {
          console.error('Window is not defined');
          return;
        }

        (window as any)[name] = value;
      } else {
        if (!webref?.current) {
          console.error('WebView reference is not set');
          return;
        }

        webref.current.injectJavaScript(`
            window.${name} = ${JSON.stringify(value)};
            true;
          `);
      }
    }, []);

    // function to call setSize
    const setSize = useCallback((width: number, height: number): void => {
      if (isWeb) {
        uplotInstance.current?.setSize(width, height);
      } else {
        if (!webref) {
          console.error('WebView reference is not set');
          return;
        }

        webref.current.injectJavaScript(`
          if (!window._chart) {
            window._chart.setSize(${JSON.stringify(width)}, ${JSON.stringify(height)});true;
          } else {
            console.error('setSize | Chart not initialized');
          }
          true;
        `);
      }
    }, []);

    // function to call destroy, also clears the data
    const destroy = useCallback((keepData: boolean = false): void => {
      if (isWeb) {
        uplotInstance.current?.destroy();
        if (!keepData) {
          dataRef.current = [];
        }
      } else {
        if (!webref?.current) {
          console.error('WebView reference is not set');
          return;
        }

        var keepDataStr = keepData ? '' : `window._data = [];`;

        webref.current.injectJavaScript(`
          ${keepDataStr}

          if (window._chart) {
            window._chart.destroy();
          }
          window.__CHART_CREATED__ = false;
          true;
        `);
      }
      initialized.current = false;
    }, []);

    // destroy, clear data, and reinitialize the chart when the component unmounts
    const reset = useCallback(
      (opts: any, data: number[][], bgColor?: string): void => {
        destroy();
        createChart(opts, data, bgColor);
      },
      [],
    );

    // add UTIL_FUNCTIONS to the injectedJavaScript
    const injectedJavaScriptWithFunctions = useMemo(() => {
      return `
      ${UTIL_FUNCTIONS}
      
      ${injectedJavaScript}

      true;
      `;
    }, [injectedJavaScript]);

    console.log(
      'injectedJavaScriptWithFunctions',
      injectedJavaScriptWithFunctions,
    );

    useImperativeHandle(ref, () => ({
      createChart,
      updateOptions,
      setData,
      pushData,
      sliceSeries,
      setScale,
      setVariable,
      setSize,
      destroy,
      reset,
    }));

    if (Platform.OS === 'web') {
      return (
        <View
          ref={setWebRef}
          onLayout={handleLayout}
          style={memoizedContainerStyle}
        />
      );
    } else {
      return (
        <WebView
          {...webviewProps}
          originWhitelist={['*']}
          source={html}
          style={memoizedContainerStyle}
          scrollEnabled={false}
          onLoadEnd={handleLoadEnd}
          ref={setWebRef}
          onLayout={handleLayout}
          javaScriptEnabled={true}
          injectedJavaScript={injectedJavaScriptWithFunctions}
          onMessage={handleMessage}
        />
      );
    }
  },
);

export default React.memo(ChartUPlot);
