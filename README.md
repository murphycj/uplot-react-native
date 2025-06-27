# uplot-react-native

## Description

React native wrapper around [uPlot](https://github.com/leeoniya/uPlot). Works on web, iOS, and Android. Wraps uPlot in a [WebView](https://github.com/react-native-webview/react-native-webview) on iOS and Android. The video below demos its performance on an Expo iOS development build (iPhone 15 Pro).

<p align="center">
<img src="https://github.com/user-attachments/assets/f9e2e65c-bfe2-40a4-87ef-4d68faa11e77" height="400" />
</p>

**Note**: This library is a work in progress. It may not fully support all uPlot features yet, so feel free to open issues or pull requests to help improve it.

## Why?

I needed a cross-platform library to plot thousands of data points in a streaming / real-time fashion. The performance of every library that I tested degraded after a couple thousand data points, except for uPlot. uPlot is one of the fastest javascript libraries for plotting data.

## Installation

```bash
npm install uplot-react-native
# or
yarn add uplot-react-native
```

## Usage

Create a uPlot chart via `ChartUPlot`. The `data` and `options` props are structured the same as when you call `new uPlot(options, data)`. You update the chart via a `ref`.

```javascript
import { useRef, useEffect } from 'react';
import { ChartUPlot } from 'uplot-react-native';

var x = 6;
const data = [
  [1, 2, 3, 4, 5],
  [5, 4, 3, 2, 1],
];

const options = {
  id: 'chart',
  width: 300,
  height: 300,
  scales: { x: { time: false } },
  series: [{ label: 'X' }, { label: 'Value', stroke: 'blue', width: 2 }],
  axes: [{ scale: 'x' }, {}],
};

const MyChart = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    setInterval(() => {
      // add a new data point every 33ms
      chartRef.current?.pushData([x, Math.random() * 10]);
      x += 1;
    }, 33);
  }, []);

  return (
    <ChartUPlot
      ref={chartRef}
      data={data}
      options={options}
      style={{ width: 500, height: 200, backgroundColor: 'white' }}
    />
  );
};
```

The `ref` exposes the following methods:

- `createChart(options, data)`: Create a new chart. The initial render of ChartUPlot will automatically call this method with the initial options and data.
- `setData(newData)`: Replace the data in the chart.
- `pushData(newData)`: Push new data to the chart. This is useful for streaming data.
- `setScale(axis, options)`: Set the scale options for a specific axis. The `axis` can be 'x' or 'y'.
- `setSize(width, height)`: Set the size of the chart.
- `destroy()`: Destroy the chart instance.

### Dimensions

You can set the width and height either through the uPlot `options` or by passing a `style` prop to the `ChartUPlot` component. If you set both, the uPlot `options` will take precedence. Any changes to the width and height in the `options` will not automatically update the chart size.

### Margins

Margin for the title and legend will be subtracted from the final width and height for the chart. You can control the margin via the `margin: { title?: number; legend?: number }` prop.

### Functions

If you have custom functions within your uPlot `options`, have them defined elsewhere; do not use inline functions. Then to make use of them on iOS and Android version, wrap all functions into a single string to pass them to the ChartUPlot's `injectedJavaScript` prop.

Any dependencies in each function must be:

- One of the other functions passed to the `injectedJavaScript` prop.
- Anything globally available within a WebView.
- A function from the uPlot library that is available in the webview.

```javascript
// for web version of uPlot
function format_value(self, ticks) {
  return ticks.map((val) => {
    return 2;
  });
}

// for iOS and Android version
const injectedJavaScript = `
function format_value(self, ticks) {
  return ticks.map((val) => {
    return 2;
  });
}
`;

const options = {
  width: 300,
  height: 300,
  scales: { x: { time: false } },
  series: [{ label: 'X' }, { label: 'Value', stroke: 'blue', width: 2 }],
  axes: [
    {
      scale: 'x',
      values: format_value,
    },
    {},
  ],
};

<ChartUPlot options={options} injectedJavaScript={injectedJavaScript} />;
```

#### Why is it done this way?

There may be a better way to do this, so please open an issue if you have a suggestion. Passing javascript functions to the webview is tricky, so the current solution is to pass them as strings into WebView's `injectedJavaScript` prop. You might suggest doing something like, `function.toString()`, but in iOS build `toString()` does not actually return the javascript source code, so it won't work.

## Demo app

The `demo` folder contains an example Expo app that demonstrates how to use the library. You can run it by cloning the repository and running:

```bash
cd demo
yarn

# for web demo
npx expo start

# for iOS or Android simulators
npx expo run:ios

# for development build on a physical device
eas build --profile development --platform ios --local
```

## Tips

1. Don't create inline props to the `ChartUPlot` component, otherwise uPlot instance may get out of sync with the rendered component. Instead, use a `useMemo` hook to memoize the options and data.

2. The functions you pass to the `injectedJavaScript` can be tricky to debug, so be sure to test them in a web environment first.

## Contributing

If you would like to contribute, please open an issue or a pull request. Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
