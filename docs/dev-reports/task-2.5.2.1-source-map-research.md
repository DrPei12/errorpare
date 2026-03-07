# Task 2.5.2.1 调研记录

## 结论

本阶段不引入 `source-map-support`、`mozilla/source-map` 或第三方轻量 VLQ 库，改为内建一个轻量 Source Map 解析器。

## 取舍

### `source-map-support`

- 优点：生产环境成熟，核心问题模型清晰，重点在 `sourceMappingURL` 发现和堆栈帧替换
- 缺点：它更偏向运行时异常堆栈 hook，不完全贴合 ErrorPare 这种“离线压缩已有报错文本”的模式

### `mozilla/source-map`

- 优点：能力完整，生态成熟
- 缺点：对当前需求偏重；ErrorPare 只需要读取 version 3 map、解码 VLQ、按帧查询 original position

### 轻量 `vlq-source-map` 思路

- 优点：依赖轻、启动快、便于做缓存
- 缺点：市面上的轻量库通常只覆盖一部分能力，且还需要自行处理 source map 发现、内联 data URL、链式 map 和路径归一化

## 最终方案

- 手写 VLQ 解码器
- 只支持 ErrorPare 当前需要的 version 3 source map 查询能力
- 内建 `.map` 自动发现和 `data:` 内联 source map 解析
- 对 `webpack:///`、`vite:///`、`esbuild://` 等常见路径做归一化
- 在 `Compressor` 中异步恢复堆栈，并通过缓存降低重复读取成本

## 为什么这个方案更适合 ErrorPare

- 更容易与现有 `Compressor` 和 `context-reader` 集成
- 控制面更清晰，不需要引入运行时全局异常 hook
- 对 npm 包体积和启动耗时更友好
