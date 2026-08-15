# 元音演变实验室 · Vowel Change Lab

> 一个以语音学事实为基础的元音演变学习小游戏（原 “Vowel Change Inference Game” 的方案 B 重构版）。
> 零构建、零依赖的纯静态页面，可双击 `index.html` 直接运行，也可部署到 GitHub Pages。

## 功能

- **三种题型**（可混合，也可单独练习）：
  - **类型判断**：给定 A→B 演变（含环境信息），选出演变类型（高化 / 低化 / 前化 / 后化 / 央化弱化 / 复元音化 / 单元音化）
  - **频率判断**：判断该演变方向在跨语言中的常见程度（典型 / 偶见 / 罕见）
  - **系统预测**：给出一条规则和 5 个词的词表，选出会发生变化的词——训练“规则音变作用于系统”的规律性
- **二维 IPA 元音图**（SVG）：按舌位高低 × 前后 × 圆唇定位全部元音，答题时高亮 A→B 路径
- **9 条声明式演变规则**：每条带真实语言实例（英语元音大推移、日耳曼 i-umlaut / a-mutation、俄语 аканье、汉语方言高元音复化等）与粗略频率档
- **环境条件**：重音位置、邻接元音、元音长短都会影响规则是否触发
- **教学反馈**：答对后展示类型、频率、说明与实例卡片；答错保留原题重试
- **中英双语**（右上角切换，localStorage 记忆）、限时/不限时、入门/进阶难度、错题回顾
- **可访问性**：`aria-live` 反馈、键盘操作、Esc 关闭弹窗、`prefers-reduced-motion`

## 语音学模型与局限

本项目是**教学简化模型**，请勿把它当成音变定律：

- 元音用特征向量建模（舌位高低 / 前后 / 圆唇 / 长短），在二维元音图上展示；真实元音音质维度更多（松紧、鼻化等）
- “典型 / 偶见 / 罕见”是跨语言频率的粗略分级，**不是定律**：低化、央化、复元音化在真实语言中同样常见
- 真实音变作用于整个音系系统，并受重音、邻接音、词汇扩散、语言接触等影响
- 音标均按 IPA 理解：`[a]` 为前开元音，与 `[ɑ]`（后开）不同

详细的语音学事实误区研究见 [`docs/phonetics-misconceptions-and-refactor.md`](docs/phonetics-misconceptions-and-refactor.md)。

## 项目结构

```
├── index.html                  # 页面结构
├── style.css                   # 样式（含 a11y / 响应式）
├── js/
│   ├── data.js                 # 数据层：元音特征模型、演变规则表、i18n 词条
│   ├── core.js                 # 纯逻辑：词形生成、规则应用、三种题型生成（Node 可测）
│   ├── state.js                # 状态机：idle → playing → answered → over，时间戳计时
│   ├── ui.js                   # 渲染层：题目区、IPA 元音图、速查表、弹窗
│   └── main.js                 # 引导层：事件绑定、计时循环
├── scripts/
│   └── smoke-test.js           # Node 冒烟测试（数据 / 规则 / 生成器 / 状态机 / i18n）
├── docs/
│   └── phonetics-misconceptions-and-refactor.md  # 语音学误区研究文档
└── .github/workflows/deploy.yml # GitHub Pages 部署
```

浏览器通过经典 script 标签按序加载 `data → core → state → ui → main`，全部挂载在 `window.VL` 命名空间下，无构建步骤。

## 本地运行

```bash
# 方式一：直接双击 index.html（无需服务器）
# 方式二：任意静态服务器
python -m http.server 8000
# 或
npx serve .
```

## 测试

```bash
node scripts/smoke-test.js
```

覆盖：数据完整性、9 条规则的应用正确性（构造用例）、题型生成不变量（无 A==B、系统题必有变化与未变化词）、状态机与扣时逻辑、i18n 键完整性。

## 部署

推送到 `main` 分支自动部署 GitHub Pages（`.github/workflows/deploy.yml`，纯静态上传，无需构建）。若手动启用 Pages，选择 “GitHub Actions” 作为部署源即可。

## 参考资料

- 王力《汉语史稿》《汉语语音史》（元音高化倾向）
- Wikipedia: [Great Vowel Shift](https://en.wikipedia.org/wiki/Great_Vowel_Shift)、[Germanic i-umlaut](https://en.m.wikipedia.org/wiki/I-umlaut)、[Vowel reduction](https://en.wikipedia.org/wiki/Vowel_reduction)、[Germanic languages (a-mutation)](https://en.wikipedia.org/wiki/Germanic_language_group)
- Oxford Phonetics: [Cardinal Vowels](https://www.phon.ox.ac.uk/jcoleman/CardinalVowels.htm)
