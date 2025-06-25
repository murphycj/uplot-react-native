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

### Plot dimensions

You can set the width and height either through the uPlot `options` or by passing a `style` prop to the `ChartUPlot` component. If you set both, the uPlot `options` will take precedence.

### Plot margins

Margin for the title and legend will be subtracted from the final width and height for the chart. You can control the margin via the `margin: { title?: number; legend?: number }` prop.

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

## Contributing

If you would like to contribute, please open an issue or a pull request. Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
