# 跟进工作：升级 onnxruntime-web 到 1.19+（解决手机首次加载 ~70s）

> 写给下一个接手 agent 的背景、动机、步骤与验证清单。
> 结论先行：**升级 onnxruntime-web 1.18.0 → 1.20.x，恢复 wasm 预取（`env.wasm.wasmBinary`）**，
> 并在真机上验证线程版 wasm 在无 COOP/COEP 环境（GH Pages/Vercel）下的可用性。

## 1. 为什么做这件事

### 现状问题
- 手机（Android）首次打开页面：模型下载很快（0%→100%，npmjs ~10s），但**会话创建前要下载 10MB 的 ort 推理引擎 wasm（`ort-wasm-simd.wasm`）并编译**，加上 16MB 模型解析，**首次总计 ~70s** 才出“发音”按钮。
- 第二次起：模型走 Cache Storage（`vowel-lab-models-v1`）、wasm 走浏览器 HTTP 缓存 → 秒开。**问题只在首次（或清缓存后）**。

### 目标
把 ort wasm 也预取进 **Cache Storage**（与模型下载**并行**发起），首次加载从 ~70s 压到 ~20-30s（= max(模型, wasm) 下载 + 编译/解析）。这需要 **`ort.env.wasm.wasmBinary`**（把缓存字节注入 ort，跳过网络下载）。

### 版本事实（已实测，2026-08）
- **1.18.0 不支持 `wasmBinary`**（dist 源码中 0 次出现）→ 之前的预取实现无效，已被回退（commit `c4a3abe`）。
- **1.20.0 支持 `wasmBinary`**（`ort.min.mjs` 中 2 次出现）✓ → 升级目标版本为 **1.19+（推荐 1.20.x，锁定 exact）**。

## 2. 为什么之前锁在 1.18（升级必须重新验证的风险）

- **1.19+ 只发布线程版 wasm**（非线程构建被移除；1.20 的 dist 只有 `ort-wasm-simd-threaded.wasm` ~10.7MB + 对应 `.mjs` glue）。
- 线程版依赖 **SharedArrayBuffer**，需要 **COOP/COEP 响应头**；**GitHub Pages / Vercel 均无法设置**这些头。
- 官方（fs-eire，[onnxruntime issue #25666](https://github.com/microsoft/onnxruntime/issues/25666)）声称线程版可在非隔离环境“单线程运行”，但**社区有用户报告仍需要 `crossOriginIsolated`**——结论有争议。
- 沙箱（Node）无法模拟浏览器对该行为的判定（此前 1.20 在 Node web 模拟中卡在 XHR/环境差异）→ **必须真机验证**（见 §5）。

## 3. 升级步骤

1. **package.json**：`onnxruntime-web` 由 `"1.18.0"`（exact）改为 `"1.20.x"`（exact 锁定），`npm install`。
2. **scripts/vendor-piper.mjs**：1.19+ 的 dist 布局变化（1.20 实测）：
   - ESM 入口：**根目录 `ort.min.mjs`**（1.18 的 `esm/` 子目录在 1.20 已不存在）；
   - wasm：`ort-wasm-simd-threaded.wasm` + `ort-wasm-simd-threaded.mjs`（glue 需与 wasm 同目录）；
   - 更新复制文件清单与目标目录（`public/vendor/onnxruntime-web/`）。
3. **src/services/piper.ts / piper.worker.ts**：
   - 动态 import 路径：`${PIPER_VOICE.ortPath}/esm/ort.min.js` → `${PIPER_VOICE.ortPath}/ort.min.mjs`；
   - `wasmPaths` / `numThreads` 设置保持（非隔离环境设 `numThreads = 1`）。
4. **恢复 wasm 预取**（git 历史中有过一版实现，可 `git log -S "prefetchOrtWasm"` 找回参考，最终被 `c4a3abe` 回退）：
   - **SIMD 探针**：复用 ort 自带的探针字节（保证与 ort 的 wasm 选择一致）。已知可用字节序列：
     ```
     [0,97,115,109,1,0,0,0, 1,4,1,96,0,0, 3,2,1,0, 10,30,1,28,0, 65,0,253,15,253,12,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 253,186,1,26,11]
     ```
     `WebAssembly.validate(probe)` 为 true 时选 `ort-wasm-simd-threaded.wasm`，否则 `ort-wasm-threaded.wasm`（1.19+ 无非线程文件，若 validate 为 false 需特别处理/降级）。
   - `prefetchOrtWasm()`：与模型下载并行发起（`loadSession` 入口 `void prefetchOrtWasm()`），Cache Storage key `wasm:${wasm文件名}`（沿用现有 `vowel-lab-models-v1` 缓存，key 前缀区分）。
   - worker init 消息带 `wasmBytes`（transfer）→ `ort.env.wasm.wasmBinary = bytes`；主线程 `loadOrt()` 同样设置。
   - 1.20 中 `wasmBinary` 设置后 ort 不再网络请求 wasm（可在沙箱 web 模拟 + 服务器请求日志验证，参考旧 diag 脚本做法）。
5. **缓存 key 前缀**：模型缓存 key 前缀 `v2:` 若模型未变可不动；wasm 用独立 `wasm:` 前缀，不受影响。

## 4. 不能破坏的现有约束（历史教训）

- **`graphOptimizationLevel` 必须是 `'disabled'`**：合法枚举是 `'disabled'`（写 `'disable'` 会在 create 时直接抛错，曾有线上事故）；`'all'` 在 wasm 单线程可能卡数十秒。
- **下载渠道循环与会话创建已解耦**（阶段 1 下载 / 阶段 2 创建）：create 失败**绝不能再回渠道循环**（曾造成“下载 100% → create 失败 → 重新 0%”无尽循环，commit `df9d406`）。
- **worker 优先 + 主线程降级**：`piper.worker.ts` 承载 create/run（主线程不再被 wasm 同步阻塞）；worker 失败置 `workerFailed` 后本会话走主线程。
- **create 超时 90s**（`CREATE_TIMEOUT_MS`）：手机首次初始化含 wasm 下载/编译。
- **模型加载链路**：桌面 float 60MB（npm 包 `vowel-lab-voices-float@0.1.0`）→ jsDelivr 分片 → 本地；移动 int8 16.6MB（`vowel-lab-voices-int8@0.1.0`）→ jsDelivr → 本地；全部带进度与坏缓存长度校验。
- **npm 语音包**：发布脚本 `scripts/prepare-npm-voices.mjs`；tarball URL 在 `src/config/audio.ts`。

## 5. 真机验证清单（升级后必做）

| 场景 | 预期 |
|---|---|
| 桌面 Chrome（**GH Pages 部署**，无 COOP/COEP） | 加载成功、控制台无线程相关报错、首次含 wasm 并行下载 |
| 桌面 Edge/Firefox（如有） | 同上 |
| 手机 Android Chrome / 小米浏览器（无代理直连） | 首次总时长预期 <30s（wasm 与模型并行）；二次加载 <15s；缓存命中 100% → 秒初始化 |
| iOS Safari（如可借到） | 线程 wasm 兼容性（风险最高项） |
| 挂代理 | npmjs 快通道不受影响 |

**若线程版 wasm 在非隔离环境失败**（create 报 SharedArrayBuffer/线程错误）：
- 回退方案 A：保持 1.18（现状，功能正常，仅首次慢）；
- 回退方案 B：试 WebGPU 后端（1.20 的 jsep，非隔离可用但算子覆盖/稳定性需验证）；
- 回退方案 C：自编译非线程 wasm（重，需 Emscripten 工具链，不推荐起步）。

## 6. 相关文件

- `package.json`（onnxruntime-web 版本，当前 1.18.0 exact）
- `scripts/vendor-piper.mjs`（ort 文件复制 → `public/vendor/onnxruntime-web/`）
- `src/config/audio.ts`（`PIPER_VOICE.ortPath`、`modelCandidates*`、`knownBytes`）
- `src/services/piper.ts`（`loadOrt` / `createWorkerSession` / Cache Storage 模型持久化 / 两阶段加载）
- `src/services/piper.worker.ts`（worker 内 ort 初始化与推理）
- 历史参考：`git log -S "prefetchOrtWasm"`（已回退的预取实现）、`git log -S "wasmBinary"`（1.18 时代尝试记录）

## 7. 验收标准

1. 手机首次打开（清缓存）总时长 ≤ ~30s，且进度条连续（wasm 与模型并行，无“100% 干等”阶段）。
2. 二次打开 ≤ ~15s，三次起缓存命中秒初始化。
3. GH Pages 部署下桌面/手机均无线程相关错误；挂代理与直连都可用。
4. 全部失败路径仍正确降级（espeak → TTS），无循环、无卡死。
