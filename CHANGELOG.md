# uplot-react-native

## 0.1.17

### Patch Changes

- Keep web chart dimensions current through imperative resizing and delayed layout callbacks, preventing desktop-width canvases from overflowing narrow containers. Preserve the existing chart instance, data and zoom during resizing.
- Add regression coverage for the published JavaScript and TypeScript wrappers.

## 0.1.16

### Patch Changes

- Fix chart resizing by passing uPlot the required `{ width, height }` size object, preventing native charts from collapsing to zero width during initial rendering.

## 0.1.5

### Patch Changes

- 939a80d: improve injecting functions

## 0.1.4

### Patch Changes

- df61bf9: Fix styling

## 0.1.3

### Patch Changes

- 2933086: fix formating

## 0.1.2

### Patch Changes

- 1304340: Fix rerendering issues

## 0.1.1

### Patch Changes

- 768d3ae: Initial release
