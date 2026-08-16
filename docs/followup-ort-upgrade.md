# 跟进工作：升级 onnxruntime-web 到 1.19+（解决手机首次加载 ~70s）

> 写给下一个接手 agent 的背景、动机、步骤与验证清单。
> **执行状态：已完成（2026-08-16）。** 升级 onnxruntime-web 1.18.0 → **1.20.1**（exact），
> 恢复 wasm 预取（`env.wasm.wasmBinary`），并在 headless 浏览器**非隔离环境**（无 COOP/COEP）实测通过。
> 剩余：真机复核（§5 清单）。

## 1. 为什么做这件事

### 现状问题
- 手机（Android）首次打开页面：模型下载很快（0%→100%，npmjs ~10s），但**会话创建前要下载 10MB 的 ort 推理引擎 wasm（`ort-wasm-simd.wasm`）并编译**，加上 16MB 模型解析，**首次总计 ~70s** 才出“发音”按钮。
- 第二次起：模型走 Cache Storage（`vowel-lab-models-v1`）、wasm 走浏览器 HTTP 缓存 → 秒开。**问题只在首次（或清缓存后）**。

### 目标
把 ort wasm 也预取进 **Cache Storage**（与模型下载**并行**发起），首次加载从 ~70s 压到 ~20-30s（= max(模型, wasm) 下载 + 编译/解析）。这需要 **`ort.env.wasm.wasmBinary`**（把缓存字节注入 ort，跳过网络下载）。

### 版本事实（已实测，2026-08）
- **1.18.0 不支持 `wasmBinary`**（dist 源码中 0 次出现）→ 之前的预取实现无效，已被回退（commit `c4a3abe`）。
- **1.20.0/1.20.1 支持 `wasmBinary`**（`ort.min.mjs` 中 2 次出现）✓ → 升级目标版本为 **1.19+（选用 1.20.1，锁定 exact）**。

## 2. 为什么之前锁在 1.18（升级必须重新验证的风险）

- **1.19+ 只发布线程版 wasm**（非线程构建被移除；1.20 的 dist 只有 `ort-wasm-simd-threaded.wasm` ~10.7MB + 对应 `.mjs` glue）。
- 线程版依赖 **SharedArrayBuffer**，需要 **COOP/COEP 响应头**；**GitHub Pages / Vercel 均无法设置**这些头。
- 官方（fs-eire，[onnxruntime issue #25666](https://github.com/microsoft/onnxruntime/issues/25666)）声称线程版可在非隔离环境“单线程运行”，但**社区有用户报告仍需要 `crossOriginIsolated`**——结论有争议。
- 沙箱（Node）无法模拟浏览器对该行为的判定（此前 1.20 在 Node web 模拟中卡在 XHR/环境差异）→ 必须真机验证（见 §5）。

### 实测结论（本次 headless 浏览器验证，消除争议）
用 headless Edge 151（Chromium 内核，`crossOriginIsolated:false`、`typeof SharedArrayBuffer === 'undefined'`）加载
`ort.min.mjs` + `wasmBinary` 注入 + int8 模型（16MB）：
- `InferenceSession.create` **成功**（首次 ~103s：wasm 编译 + 模型解析；二次复用 ~0.8s）；
- 真实推理 `run` **成功**（输出 2048 样本）；
- 服务器请求日志：wasm 文件**只被预取请求 1 次**，create 期间零网络请求 → `wasmBinary` 注入生效。

结论：**线程版 wasm 在非隔离环境可用**（Chromium 对 `new WebAssembly.Memory({shared:true})` 在无 SAB 时
返回普通 ArrayBuffer 而非抛错，glue 的 fallback 分支（`globalThis.SharedArrayBuffer ?? ...`）兜住单线程运行）。
fs-eire 官方说法成立。Firefox/Safari 行为未实测，真机清单保留。

## 3. 升级步骤（已执行）

1. **package.json**：`onnxruntime-web` 由 `"1.18.0"`（exact）改为 **`"1.20.1"`**（exact 锁定，1.20.x 最新 patch），`npm install`。
2. **scripts/vendor-piper.mjs**：1.19+ 的 dist 布局变化（1.20 实测）：
   - ESM 入口：**根目录 `ort.min.mjs`**（1.18 的 `esm/` 子目录在 1.20 已不存在）；
   - wasm：`ort-wasm-simd-threaded.wasm` + `ort-wasm-simd-threaded.mjs`（glue 需与 wasm 同目录，
     ort 按硬编码名 `ort-wasm-simd-threaded.mjs` 加载 glue）；
   - 复制清单更新为上述 3 个文件 → `public/vendor/onnxruntime-web/`；
   - **新增旧布局清理**：删除 `esm/`、`ort-wasm-simd.wasm`、`ort-wasm.wasm`（1.18 残留 ~20MB，防误导）。
3. **src/services/piper.ts / piper.worker.ts**：
   - 动态 import 路径：`${PIPER_VOICE.ortPath}/esm/ort.min.js` → `${PIPER_VOICE.ortPath}/ort.min.mjs`；
   - `wasmPaths` / `numThreads` 设置保持（非隔离环境设 `numThreads = 1`，ort 自动探测降级）。
4. **wasm 预取已恢复**（本次全新实现，旧实现未进过 git）：
   - **SIMD 探针**：复用 ort 自带的探针字节（与 ort 的 wasm 选择一致，实测与 `ort.min.mjs` 内置 `am()` 完全一致）：
     ```
     [0,97,115,109,1,0,0,0, 1,4,1,96,0,0, 3,2,1,0, 10,30,1,28,0, 65,0,253,15,253,12,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 253,186,1,26,11]
     ```
     `WebAssembly.validate(probe)` 为 true 时预取 `ort-wasm-simd-threaded.wasm`；false 则跳过
     （1.19+ 无非线程文件，无 SIMD 设备 ort 自身也会失败，链路最终降级 espeak）。
   - `prefetchOrtWasm()`：与模型下载并行发起（`loadSession` 入口 `void prefetchOrtWasm()`），
     Cache Storage key `wasm:${wasm文件名}`（沿用 `vowel-lab-models-v1` 缓存，`v2:` 前缀之后再用 `wasm:` 前缀区分）。
   - **create 前等待预取收尾**（上限 60s，`Promise.race`）：模型先就绪（本地缓存命中秒级）时，
     等预取完成再注入，避免 ort 自己再下载；未命中/超时则 ort 走网络（浏览器对同 URL 在途请求会合并，不重复下载）。
   - worker init 消息带 `wasmBytes`（transfer 副本，主线程降级路径保留原字节）→
     `ort.env.wasm.wasmBinary = bytes`；主线程 `loadOrt()` 同样从缓存读并注入。
5. **缓存 key 前缀**：模型缓存 key 前缀 `v2:` 未动；wasm 用 `wasm:` 前缀（在 `v2:` 之后拼接），互不影响。
6. **`CREATE_TIMEOUT_MS`：90s → 120s**（§4 约束项放宽，理由见下）。
7. **加载进度改造（修复“模型 100% 干等”假进度观感）**：
   - 总进度 = 模型 × 0.6 + wasm × 0.4（字节权重，对应 int8 16.6MB + wasm 11.2MB 的真实比例；
     桌面 float 60MB 时 wasm 权重虚高——保守展示，下载快无感知差异）；
   - `prefetchOrtWasm` 的下载进度并入总进度（`emitTotalProgress`），进度条单调推进——
     模型先就绪（缓存命中秒级）时 wasm 进度继续走，不再“100% 干等”；
   - wasm 不可用/失败（`skip`）时权重归零，进度 = 模型进度，不拖后腿；
   - 资源就绪后进入 **init 阶段**：进度定格 100% + 独立文案
     `btn.speak.init`（“正在初始化语音引擎（首次需编译，请稍候）…”），
     与“下载中”区分，避免假进度观感；
   - 折算逻辑抽为纯函数 `computeTotalProgress`（单测覆盖），UI 阶段经 `onPiperStatus`
     第三参数 `phase` 透出（`useSpeech.phase` → `QuestionArea` 按钮文案）。
   - **实测**（headless Edge + vite preview，CDP 轮询按钮文案）：
     首次清缓存加载：40%→100% 连续推进（每秒多次更新）→ init 文案 → 发音（~21s，本地服务器）；
     二次缓存命中：init 文案 → 发音（<1s）。

## 4. 不能破坏的现有约束（历史教训）

- **`graphOptimizationLevel` 必须是 `'disabled'`**：合法枚举是 `'disabled'`（写 `'disable'` 会在 create 时直接抛错，曾有线上事故）；`'all'` 在 wasm 单线程可能卡数十秒。
- **下载渠道循环与会话创建已解耦**（阶段 1 下载 / 阶段 2 创建）：create 失败**绝不能再回渠道循环**（曾造成“下载 100% → create 失败 → 重新 0%”无尽循环，commit `df9d406`）。
- **worker 优先 + 主线程降级**：`piper.worker.ts` 承载 create/run（主线程不再被 wasm 同步阻塞）；worker 失败置 `workerFailed` 后本会话走主线程。
- **create 超时 120s**（`CREATE_TIMEOUT_MS`，本次由 90s 放宽）：wasm 下载已移出 create（预取并行），
  但线程版 wasm（10.7MB）编译 + 16MB 模型解析在 headless 桌面实测 ~103s（手机 CPU 更弱）；
  worker 模式不阻塞主线程，放宽仅延长“等待降级”时间，无卡死风险。
- **模型加载链路**：桌面 float 60MB（npm 包 `vowel-lab-voices-float@0.1.0`）→ jsDelivr 分片 → 本地；移动 int8 16.6MB（`vowel-lab-voices-int8@0.1.0`）→ jsDelivr → 本地；全部带进度与坏缓存长度校验。
- **npm 语音包**：发布脚本 `scripts/prepare-npm-voices.mjs`；tarball URL 在 `src/config/audio.ts`。

## 5. 真机验证清单（升级后必做——headless 已过，真机复核）

| 场景 | 预期 |
|---|---|
| 桌面 Chrome（**GH Pages 部署**，无 COOP/COEP） | 加载成功、控制台无线程相关报错、首次含 wasm 并行下载（DevTools Network 可见 wasm 与模型并发） |
| 桌面 Edge/Firefox（如有） | 同上（Firefox 对无 SAB 环境的 `Memory({shared:true})` 行为未实测，重点关注） |
| 手机 Android Chrome / 小米浏览器（无代理直连） | 首次总时长预期 <30s（wasm 与模型并行）；二次加载 <15s；缓存命中 100% → 秒初始化 |
| iOS Safari（如可借到） | 线程 wasm 兼容性（风险最高项，Safari 无 SAB 时行为未实测） |
| 挂代理 | npmjs 快通道不受影响 |

**若线程版 wasm 在真机非隔离环境失败**（create 报 SharedArrayBuffer/线程错误）：
- 回退方案 A：保持 1.18（现状，功能正常，仅首次慢）；
- 回退方案 B：试 WebGPU 后端（1.20 的 jsep，非隔离可用但算子覆盖/稳定性需验证）；
- 回退方案 C：自编译非线程 wasm（重，需 Emscripten 工具链，不推荐起步）。

## 6. 相关文件

- `package.json`（onnxruntime-web 版本，现 **1.20.1** exact）
- `scripts/vendor-piper.mjs`（ort 文件复制 → `public/vendor/onnxruntime-web/`，含旧布局清理）
- `src/config/audio.ts`（`PIPER_VOICE.ortPath`、`modelCandidates*`、`knownBytes`）
- `src/services/piper.ts`（`loadOrt` / `createWorkerSession` / Cache Storage 模型持久化 / 两阶段加载 / **wasm 预取**）
- `src/services/piper.worker.ts`（worker 内 ort 初始化与推理，`wasmBytes` 注入）
- 历史参考：`git log -S "prefetchOrtWasm"`（旧预取实现，未进 git）、`git log -S "wasmBinary"`（1.18 时代尝试记录）

## 7. 验收标准

1. 手机首次打开（清缓存）总时长 ≤ ~30s，且进度条连续（wasm 与模型并行，无“100% 干等”阶段——
   headless 已实测：进度 40%→100% 连续推进后转 init 文案，无假进度，见 §3.7）。
   **注意**：30s 含 10.7MB 线程版 wasm 编译 + 16MB 模型解析，headless 桌面编译实测 ~103s——
   真机若 >120s 会触发 create 超时降级 espeak（发音仍可用但音质降级），需按 §5 复核后校准。
2. 二次打开 ≤ ~15s，三次起缓存命中秒初始化。
3. GH Pages 部署下桌面/手机均无线程相关错误；挂代理与直连都可用。
4. 全部失败路径仍正确降级（espeak → TTS），无循环、无卡死。
