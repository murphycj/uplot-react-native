import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { transformSync } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Load either published entry with real React hooks and a measurable synthetic chart node. */
function loadWrapper(extension, instances) {
  class Plot {
    constructor(options, data) {
      this.data = data;
      this.scales = { x: { min: 0, max: 20 } };
      this.setSize(options);
      instances.push(this);
    }
    // Resizing must leave the existing data, scale and instance intact.
    setSize({ width, height }) {
      this.width = width;
      this.height = height;
    }
    setData(data) {
      this.data = data;
    }
    setScale(axis, scale) {
      this.scales[axis] = scale;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  const source = fs.readFileSync(
    `dist/components/ChartUPlot.${extension}`,
    'utf8',
  );
  const { code } = transformSync(source, {
    loader: extension === 'tsx' ? 'tsx' : 'jsx',
    format: 'cjs',
  });
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name === 'react') return React;
    if (name === 'react-native')
      return {
        Platform: { OS: 'web' },
        View: 'ChartView',
        useWindowDimensions: () => ({ width: 1280, height: 950 }),
      };
    if (name === 'react-native-webview' || name.endsWith('.css')) return {};
    if (name === 'uplot') return { default: Plot };
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports.default;
}

for (const extension of ['js', 'tsx']) {
  test(`${extension}: imperative resize survives the next dimension effect without recreating or losing zoom`, async () => {
    const instances = [];
    const Chart = loadWrapper(extension, instances);
    const ref = React.createRef();
    const data = [
      [0, 10, 20],
      [100, 120, 110],
    ];
    let measuredWidth = 748;
    let renderer;
    const render = (width) =>
      React.createElement(Chart, {
        ref,
        data,
        options: { width, height: 220 },
        margin: { legend: 0 },
      });
    try {
      await act(async () => {
        renderer = create(render(1000), {
          createNodeMock: () => ({
            getBoundingClientRect: () => ({
              width: measuredWidth,
              height: 220,
            }),
          }),
        });
      });
      // The first sheet layout is narrower than the window-seeded chart options.
      await act(async () =>
        renderer.root.findByType('ChartView').props.onLayout({
          nativeEvent: { layout: { width: 748, height: 220 } },
        }),
      );
      ref.current.setScale('x', { min: 5, max: 15 });
      const plot = instances[0];
      const originalData = plot.data;
      for (const width of [346, 748, 346, 748]) {
        measuredWidth = width;
        // The app measures/resizes before React commits the updated wrapper options.
        await act(async () => {
          ref.current.setSize(width, 220);
          renderer.update(render(width));
        });
        assert.equal(plot.width, width);
        assert.equal(instances.length, 1);
        assert.equal(plot.data, originalData);
        assert.deepEqual(plot.scales.x, { min: 5, max: 15 });
      }
    } finally {
      if (renderer) await act(async () => renderer.unmount());
    }
  });

  test(`${extension}: late layout events use the current DOM dimensions`, async () => {
    const instances = [];
    const Chart = loadWrapper(extension, instances);
    let measuredWidth = 748;
    const ref = React.createRef();
    let renderer;
    const props = {
      ref,
      data: [
        [0, 1],
        [100, 110],
      ],
      options: { width: 1000, height: 220 },
      margin: { legend: 0 },
    };
    try {
      await act(async () => {
        renderer = create(React.createElement(Chart, props), {
          createNodeMock: () => ({
            getBoundingClientRect: () => ({
              width: measuredWidth,
              height: 220,
            }),
          }),
        });
      });
      const layout = () =>
        renderer.root.findByType('ChartView').props.onLayout({
          nativeEvent: { layout: { width: 748, height: 220 } },
        });
      await act(async () => layout());
      measuredWidth = 346;
      await act(async () => {
        ref.current.setSize(346, 220);
        layout(); // A desktop onLayout event was queued before the DOM narrowed.
        renderer.update(
          React.createElement(Chart, {
            ...props,
            options: { width: 346, height: 220 },
          }),
        );
      });
      assert.equal(instances[0].width, 346);
      assert.equal(instances.length, 1);
    } finally {
      if (renderer) await act(async () => renderer.unmount());
    }
  });

  test(`${extension}: a layout callback resizes the existing chart without another React render`, async () => {
    const instances = [];
    const Chart = loadWrapper(extension, instances);
    let measuredWidth = 748;
    let renderer;
    try {
      await act(async () => {
        renderer = create(
          React.createElement(Chart, {
            data: [
              [0, 1],
              [100, 110],
            ],
            options: { width: 1000, height: 220 },
            margin: { legend: 0 },
          }),
          {
            createNodeMock: () => ({
              getBoundingClientRect: () => ({
                width: measuredWidth,
                height: 220,
              }),
            }),
          },
        );
      });
      const layout = () =>
        renderer.root.findByType('ChartView').props.onLayout({
          nativeEvent: { layout: { width: 748, height: 220 } },
        });
      await act(async () => layout());
      measuredWidth = 346;
      await act(async () => layout());
      assert.equal(instances[0].width, 346);
      assert.equal(instances.length, 1);
    } finally {
      if (renderer) await act(async () => renderer.unmount());
    }
  });
}
