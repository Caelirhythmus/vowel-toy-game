# 语系上下文玩法：资料搜集清单

> 状态：**搜集完成 → 产出见 [`family-mode-data.md`](family-mode-data.md)**（档位矩阵 + 语料 + 出处 + 完备性报告）。
> 本文档保留为"数据缺口与决策记录"：开工前需按 §4 完备性报告做代码层决策（模型缺口/新 EnvKind）。
> 原则：每条数据都要有**文献/数据库依据**，宁可少做不做假（频率档本就是粗略估计，语系化后不能变成更不可靠的估计）。

## 0. 玩法定义（决定资料范围）

玩家选择语系上下文（泛语系 / 英语史 / 汉语史 / 罗曼史 / 斯拉夫史）→
频率题档位按该语系取值（`Rule.familyTiers`）+ 词对/示例来自该语系真实演变。

代码现状（已就位的扩展点）：

- `Rule.familyTiers?: { family: string; tier: Tier }[]` —— 档位矩阵落点（schema 已校验）
- `Rule.familyNote` —— 语系倾向说明（已实现，泛语系视角）
- `config/rules.ts` / `config/vowels.ts` / `core/questions.ts` —— 内容与引擎已解耦，加语系只需加配置层

## 1. L0 语系档案（每个语系的基础配置）

| 资料 | 用途 | 来源 |
|---|---|---|
| 元音音系清单（该语系/时期实际存在的元音集合） | 语系模式下词表生成的**元音子集**（现状全 IPA，必须收窄） | [BDPROTO（古代/重构语言音系清单库）](https://github.com/bdproto/bdproto)、PHOIBLE |
| 韵律类型（stress-timed / syllable-timed / tone） | 决定弱化规则适用性 | WALS、韵律类型学文献 |
| 时间范围切片 | 语系模式的"时期"定位 | 各语系历史音韵学专著 |
| 音变研究传统/文献偏差 | familyNote 与教学免责 | 各语系研究综述 |

⚠️ **模型缺口要提前决策**：现有元音库无 ɪ/ʊ/ʌ（近闭/展唇），高度为 0-4 整数编码。
英语史音系含 ɪ/ʊ——子集化时要么扩元音库（动 VowelChart/发音映射/espeak/piper），
要么接受"英语史 = 模型内可表达子集"的简化并在 note 声明。

## 2. L1 档位矩阵（核心玩法数据）

9 条规则 × N 语系 → typical/occasional/rare，**每条必须带依据**：

| 规则 | 英语史 | 汉语史 | 罗曼史 | 斯拉夫史 | 依据 |
|---|---|---|---|---|---|
| 高化 raise | ? | ? | ? | ? | 王力；各语系历史音韵学 |
| 低化 lower-a（a-mutation） | ? | 无此机制？ | 无？ | 无？ | 日耳曼语特征 |
| 低化 lower-free（无条件） | ? | ? | ? | ? | 各语系 |
| 前化 front-umlaut | ? | 无？ | 无？ | 无？ | i-umlaut 地理分布 |
| 后化 back-a | ? | ? | ? | ? | 法语/斯拉夫语案例 |
| 弱化 reduce | ? | ? | ? | ? | 韵律类型学 |
| 复化 diph-long | ? | ? | ? | ? | GVS vs 德语/荷兰语史 |
| 复化 diph-short | ? | ? | ? | ? | 汉语官话方言研究 |
| 单元音化 mono | ? | ? | ? | ? | 拉丁语/希腊语/英语史 |

**关键决策**：某语系"不存在"的规则——标 rare 还是**从题库排除**（建议排除，需新增
`familyExcluded` 字段；否则罗曼史里出现 i-umlaut 题很怪）。

## 3. L2 真实演变语料（每语系 × 每条适用规则 ≥1 条）

每条记录字段（对齐现有 `RuleExample` + 扩展）：

```
{ soundChange: 'iː → aɪ', condition: '长元音', period: '1400–1600',
  language: '英语（GVS）', source: 'Index Diachronica: en …' }
```

**主语料源（开源数据库，可脚本化提取）**：

- [Index Diachronica（历时音变总目，按语系/语言组织）](https://github.com/bradrn/index-diachronica-redux)
  - [转库版 quilde/indexdiachronica](https://Gist.GitHub.com/quilde/indexdiachronica)
  - [转库版 amundo/indexdiachronica](https://github.com/amundo/indexdiachronica)
- [BDPROTO（古代/重构语言音系清单）](https://github.com/bdproto/bdproto)
- PHOIBLE（现代语言音系清单，验证音系子集）

**文献（档位与示例的背书）**：

- 英语史：Baugh & Cable《A History of the English Language》；Lass《The Cambridge History of the English Language》
- 汉语史：王力《汉语史稿》《汉语语音史》；时秀娟《汉语方言的元音格局》
- 罗曼史：Loporcaro《Vowel Length from Latin to Romance》；通俗拉丁语 ŏ→ɔ 专题
- 斯拉夫史：俄语历史音韵学（аканье 专题）
- 类型学：WALS、PHOIBLE、音变类型学综述

## 4. L3 环境条件扩展（P1，开工前调研）

现有 `EnvKind`：unstressed / long / stressed-next-a / before-i —— 语系模式**必然要加**：

- 罗曼史低化 ŏ→ɔ 需要 **stressed-open-syllable（重读开音节）**
- 俄语 аканье 需要非重读 o/a 的细化
- 汉语高元音复化可能涉及声调/韵尾条件（超出当前 CVCV 模型，需评估）

## 5. L4 语系内特有类型（P2，另行立项）

声调产生（汉语/越南语）、鼻化（法语/波兰语/葡萄牙语）、元音和谐（突厥语/芬兰语）——
不在现有 9 条规则内。做之前评估认知负荷（docs/followup-analysis.md 不做清单）。

## 6. P0 最小资料集（每语系约 0.5–1 天文献工作）

1. 音系清单（BDPROTO/PHOIBLE，约 10 分钟/语系）
2. familyTiers 档位矩阵（Index Diachronica + 历史音韵学专著）——最花时间，逐条依据
3. 每规则 ≥1 条真实演变（Index Diachronica 直接提取）

**验收标准**：每条档位与语料可溯源（含出处）；通过现有 schema 校验 +
新增"familyTiers 与 familyNote 一致性"守门测试；4 语系 × 9 规则的
空档矩阵全部填完或明确标注"排除"。
