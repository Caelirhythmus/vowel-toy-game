# 元音演变实验室 · Vowel Change Lab

> 一个以语音学事实为基础的元音演变学习小游戏（原 “Vowel Change Inference Game” 的长期产品化重构版）。
> 技术栈：**Vue 3（组合式 API）+ TypeScript + Vite + Vitest**，内容与引擎解耦、可配置化、零后端纯静态部署。

## 功能

- **三种题型**（可混合，也可单独练习）：
  - **类型判断**：给定 A→B 演变（含环境信息），选出演变类型（高化 / 低化 / 前化 / 后化 / 央化弱化 / 复元音化 / 单元音化）
  - **频率判断**：判断该演变方向在跨语言中的常见程度（典型 / 偶见 / 罕见）
  - **系统预测**：给出一条规则和 5 个词的词表，选出会发生变化的词——训练“规则音变作用于系统”的规律性
- **二维 IPA 元音图**（SVG）：按舌位高低 × 前后 × 圆唇定位全部元音，答题时高亮 A→B 路径（描画动画 + 目标脉冲）
  - **双视图切换**：发音部位图 ⇄ 共振峰图（F1×F2 声学空间），直观展示“开口度 ≠ 元音全部”
  - **交互**：悬停/聚焦显示特征卡（含 F1/F2 估值）、点击元音发音、读屏 aria-label 拼读
  - **系统题 diff 视图**：答对后图上标注“变化源（绿）/ 变化结果（虚线空心）/ 其余淡化”
- **9 条声明式演变规则**：每条带真实语言实例（英语元音大推移、日耳曼 i-umlaut / a-mutation、俄语 аканье、汉语方言高元音复化等）与粗略频率档
- **环境条件**：重音位置、邻接元音、元音长短都会影响规则是否触发
- **教学反馈**：答对后展示类型、频率、说明与实例卡片；答错保留原题重试
- **发音播放**：
  - 元音符号：**权威录音**（Wikimedia Commons 15 个单元音，CC BY-SA 3.0，自托管 WAV，逐文件署名见 `public/audio/ATTRIBUTIONS.txt`）
  - 词形（伪词）主引擎：**Piper 神经 TTS**（VITS，显式音素 id 输入，保证每个元音精确可控；CC0 音色 en_US-joe-medium + onnxruntime-web，均离线运行；桌面 float 原版、移动 int8 量化，通过 npm 语音包分发）
  - 回退：**espeak-ng WASM 合成**（共振峰合成，近似；en-us 音色缺 [y ø œ a] 时就近近似）
  - 复元音：无权威录音，不提供发音（图上仅标注）
  - 浏览器 TTS 仅作最后兜底（近似拼写朗读，不读 IPA 原文）
  - 首次使用体验：页面打开即后台预热 Piper（模型仅下载一次，缓存后免下载；
    桌面约 20~40 秒、移动约 10 秒，视网络而定）；加载期间发音按钮显示
    “语音模型加载中…”，就绪后自动恢复
  - 第三方许可见 `THIRD_PARTY_NOTICES.md`；`npm run vendor` 预置全部离线资源（espeak-ng / onnxruntime-web / piper 模型）
- **自托管 IPA 字体**（Charis SIL 子集 woff2，SIL OFL 许可）：消除跨平台 ɛ/æ/ø/ə 渲染差异
- **中英双语**（右上角切换，localStorage 记忆）、限时/不限时、入门/进阶难度、错题回顾、历史统计
- **可访问性**：`aria-live` 反馈、键盘操作（元音点可 Tab 聚焦 + Enter/Space 发音）、Esc 关闭弹窗、焦点管理、`prefers-reduced-motion`

## 架构（可配置化 · 去耦合化 · 框架化）

```
src/
├── config/          # 内容配置层：元音库 / 演变规则表 / 游戏参数（改内容不动引擎）
│   ├── vowels.ts    #   IPA 单元音、复元音、词生成元音池
│   ├── rules.ts     #   演变规则（类型/频率/环境/示例/transform）
│   ├── game.ts      #   题型/难度/时长选项、规则权重、混合比例
│   └── schema.ts    #   zod 内容校验（开发期警告 + 测试守护）
├── core/            # 领域逻辑层（纯 TS、零 DOM/框架依赖、Node 可测）
│   ├── types.ts     #   领域类型（Vowel/Word/Rule/Question/GameState…）
│   ├── vowels.ts    #   元音特征解析与构造
│   ├── words.ts     #   CVCV 词形生成与显示
│   ├── rules.ts     #   规则引擎（环境匹配/可应用/变换）
│   ├── questions.ts #   三类题型生成器（含系统题兜底）
│   ├── state.ts     #   游戏状态机（时间注入，纯函数）
│   └── i18n.ts      #   类型安全的中英文案字典 + 插值
├── services/        # 端口与适配器（副作用隔离）
│   ├── storage.ts   #   localStorage 适配（隐私模式降级内存）
│   ├── audio.ts     #   语音服务（录音 → Piper → espeak → TTS 兜底）
│   ├── piper.ts     #   Piper 神经 TTS（onnxruntime-web WASM 推理）
│   ├── espeak.ts    #   espeak-ng WASM 适配（回退引擎）
│   └── wav.ts       #   Float32 PCM → WAV 编码（纯函数）
├── composables/     # 编排层（Vue 响应式接线）
│   ├── useGame.ts   #   单例游戏 store：状态/计时/自动下一题/持久化
│   └── useI18n.ts   #   语言状态 + 文案取用
├── components/      # 视图层（SFC）
│   ├── SettingsPanel / TimerBar / QuestionArea / OptionsPanel
│   ├── FeedbackCard / StatsBar / VowelChart / CheatSheet
│   ├── ModelNotes / GameOverModal / LangToggle
├── App.vue
└── main.ts          # 入口（DEV 下执行内容校验）
tests/               # Vitest：core 逻辑 / 配置 schema / 组件渲染
```

**分层原则**：

- `core/` 不依赖 Vue/DOM/存储——全部纯函数，时间用参数注入，可直接在 Node 中测试
- 内容（`config/`）与引擎（`core/`）解耦：加一条规则 = 改 `rules.ts` 一行配置，schema 校验 + 不变量测试守门
- 副作用（存储、语音、计时）全部收敛到 `services/` 与 `composables/`，视图层只消费响应式状态
- 未来扩展（链移玩法、音频、题库编辑器）只动对应层，不破坏既有分层

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器（Vite HMR）
npm run test         # Vitest 单测（core + schema + 组件）
npm run typecheck    # vue-tsc 全量类型检查
npm run build        # 类型检查 + 生产构建（dist/）
npm run preview      # 本地预览构建产物
```

## 测试

`npm run test` 覆盖：

- 规则应用正确性（9 条规则构造用例：环境匹配、长元音保持、边界不适用）
- 题型生成不变量（无 A==B、系统题必有变化与未变化词、答案与计算一致）
- 状态机（答错扣时/保留原题、答对推进、超时结束、错题本）
- 内容配置 schema（重复 id / 非法 tier / 空示例 / 元音池）
- 组件渲染（VowelChart 高亮与复元音定位、FeedbackCard 对错反馈）

## 语音学模型与局限

本项目是**教学简化模型**，请勿把它当成音变定律：

- 元音用特征向量建模（舌位高低 / 前后 / 圆唇 / 长短），在二维元音图上展示；真实元音音质维度更多（松紧、鼻化等）
- “典型 / 偶见 / 罕见”是跨语言频率的粗略分级，**不是定律**：低化、央化、复元音化在真实语言中同样常见
- 真实音变作用于整个音系系统，并受重音、邻接音、词汇扩散、语言接触等影响
- 音标均按 IPA 理解：`[a]` 为前开元音，与 `[ɑ]`（后开）不同

详细研究见：

- [`docs/phonetics-misconceptions-and-refactor.md`](docs/phonetics-misconceptions-and-refactor.md) —— 语音学事实误区研究
- [`docs/followup-analysis.md`](docs/followup-analysis.md) —— 后续跟进全量分析（路线图）

## 部署

推送到 `main` 分支自动：`npm ci` → `npm run test` → `npm run build` → 上传 `dist/` 到 GitHub Pages（`.github/workflows/deploy.yml`）。若手动启用 Pages，选择 “GitHub Actions” 作为部署源即可。

## 参考资料

- 王力《汉语史稿》《汉语语音史》（元音高化倾向）
- Wikipedia: [Great Vowel Shift](https://en.wikipedia.org/wiki/Great_Vowel_Shift)、[Germanic i-umlaut](https://en.m.wikipedia.org/wiki/I-umlaut)、[Vowel reduction](https://en.wikipedia.org/wiki/Vowel_reduction)、[Germanic languages (a-mutation)](https://en.wikipedia.org/wiki/Germanic_language_group)
- Oxford Phonetics: [Cardinal Vowels](https://www.phon.ox.ac.uk/jcoleman/CardinalVowels.htm)
