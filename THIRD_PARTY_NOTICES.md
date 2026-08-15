# 第三方资源声明 · Third-Party Notices

## Piper（词形神经合成 · 主引擎）

- 项目：[rhasspy/piper](https://github.com/rhasspy/piper)（VITS 神经 TTS；[onnxruntime-web](https://github.com/microsoft/onnxruntime) WASM 推理）
- 许可：Piper 代码 **MIT**；onnxruntime-web **MIT**；均不随仓库提交，由 `npm run vendor` 预置
- 音色：**en_US-joe-medium**（`rhasspy/piper-voices`，单说话人，22.05kHz，~60MB）
  - 数据集：OHF-Voice voice-datasets，许可 **CC0**（公有领域，[模型卡](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/joe/medium)）
  - 下载源：`https://hf-mirror.com/rhasspy/piper-voices/...`（回退 huggingface.co）
- 用途：伪词（如 ˈbata）主合成引擎——显式音素 id 输入（BOS+音素+pad+EOS），保证每个元音精确可控
- 依赖运行时：`onnxruntime-web@1.18.0`（固定版本；1.19+ 仅提供线程版 wasm，需 COOP/COEP，GitHub Pages 不可用）
- 使用限制说明：en-us 音色缺失 [y ø œ a]（前圆唇/开前元音），映射为就近近似（y→i、ø→e、œ→ɛ、a→æ），详见 `src/config/audio.ts`

## espeak-ng（词形离线合成 · 回退引擎）

- 项目：[espeak-ng](https://github.com/espeak-ng/espeak-ng)（Emscripten/WASM 构建：[npm `espeak-ng`](https://www.npmjs.com/package/espeak-ng)）
- 许可：**GPL-3.0-or-later**（附带的 `espeak-ng.wasm` 与 `espeak-ng.js` 由该库编译而来）
- 用途：Piper 不可用时的伪词回退合成；不随仓库提交，由 `npm run vendor` 从 `node_modules` 复制到 `public/vendor/`，随站点发布
- GPL 合规说明：本项目静态站点分发该 WASM 产物时，其对应源代码可在上述 espeak-ng 仓库获取（编译参数见 npm 包 README）；本仓库无独立许可证
- 使用限制说明：en-us 音色缺失 [y ø œ a]（前圆唇/开前元音），映射为就近近似（y→i、ø→e、œ→ɛ、a→æ），详见 `src/config/audio.ts`

## IPA 元音发音录音（权威发音，图内点播）

- 来源：[Wikimedia Commons](https://commons.wikimedia.org) 各 IPA 元音词条录音（15 个单元音）
- 许可：**CC BY-SA 3.0**；逐文件署名见 [`public/audio/ATTRIBUTIONS.txt`](public/audio/ATTRIBUTIONS.txt)
- 用途：自托管 WAV（`public/audio/vowel-*.wav`），已在 `src/config/audio.ts` 中登记

## Charis SIL 字体（IPA 渲染）

- 来源：[Google Fonts / SIL International](https://fonts.google.com/specimen/Charis+SIL)
- 许可：**SIL Open Font License 1.1**（见 [`public/fonts/OFL.txt`](public/fonts/OFL.txt)）
- 用途：按本项目所需字形子集化的 woff2 自托管
