/**
 * @design D-S-01
 * 文案与分组：对外只暴露这一个入口，内部按职责分两个文件。
 *
 * 为什么拆：`D-U-01`（组头/分组）与 `D-U-02`（提示与失败文案）在 pi-web 里是两簇互不相干的纯函数，
 * 混在一个文件里会让行级归属（ownership）无法把行段对到元素上。
 */
export type { Translate } from './mcp-action-text'
export * from './mcp-action-text'
export * from './mcp-group-labels'
