# uplot-react-native
React native wrapper around uPlot. Works on web, iOS, and Android. Wraps uPlot in a [WebView](https://github.com/react-native-webview/react-native-webview) on iOS and Android. The video below demos its performance on a iOS development build (iPhone 15 Pro).

# Why?
I needed a cross-platform library to plot thousands of data points in a streaming / real-time fashion. The performance of every library that I tested degraded after a couple thousand data points, except for uPlot. uPlot is one of the fastest javascript libraries for plotting data.
