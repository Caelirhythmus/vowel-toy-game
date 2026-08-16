# 语系上下文玩法：搜集结果与数据矩阵

> 状态：**已搜集（2026-08）**。本文档是 `family-mode-data-checklist.md` 的搜集产出。
> 每个档位/语料均标注依据；**证据不足的组合明确标"排除出题"或"待确认"**，
> 不硬填（宁可少做不做假）。模型缺口见 §4，开工前需代码层决策。

---

## 1. L0 语系档案

| 语系 | 时间切片 | 韵律类型 | 音系清单（模型内可表达子集） | 模型缺口 |
|---|---|---|---|---|
| 英语史 | 1100–1700（中古英语→早期近代英语） | stress-timed | /i e ɛ a ɔ o u ə/ ± 长短；GVS 后 iː uː eː oː 复化 | 无 ɪ/ʊ（近闭）——中古英语 [ɪ ʊ] 需决策：扩库或声明简化 |
| 汉语史 | 官话/北方方言（近代） | tone（轻声弱化弱） | /i y u a ə/ + ai ei au ou（[现代标准汉语音系](https://zh.wikipedia.org/zh-hans/%E7%8E%B0%E4%BB%A3%E6%A0%87%E5%87%86%E6%BC%A2%E8%AA%9E%E9%9F%B3%E7%B3%BB)，韵母层面含 e/ɛ/o 成分） | 无 ɤ/ʊ 音位；轻声涉声调维度（简化可接受） |
| 罗曼史 | 拉丁语→罗曼语（约前 200–1500） | 音节计时为主（法语史弱化弱） | 通俗拉丁语 7 元音 /i e ɛ a ɔ o u/（[Britannica: Romance vowels](https://www.britannica.com/topic/Romance-languages/Vowels)）；法语支 + y ø œ | 意大利语/法语史需要"重读开音节"环境（新 EnvKind） |
| 斯拉夫史 | 共同斯拉夫语→俄语（约 500–1500） | 重音（自由重音） | 共同斯拉夫语 /i ь ɨ u e ě o a ę ǫ/（[History of Proto-Slavic](https://web.archive.org/web/20160616065944/https://en.wikipedia.org/wiki/History_of_Proto-Slavic)）；现代俄语 5 元音 | 无 ɨ/ь（yers）；鼻元音 ę ǫ 超出模型 |

---

## 2. L1 档位矩阵（9 规则 × 4 语系）

图例：✅=有据 · ⚠️=依据弱/待确认 · 🚫=排除出题（该语系无此机制或时间切片外）

| 规则 | 英语史 | 汉语史 | 罗曼史 | 斯拉夫史 |
|---|---|---|---|---|
| raise 高化 | ✅ typical（GVS eː→iː、oː→uː，[剑桥 Long-Vowel Shifts](https://www.cambridge.org/core/books/abs/longvowel-shifts-in-english-c10501700/development-of-oe-e-and-eo/E4156D7591539014451AD96D963730E3)） | ✅ typical（高化倾向，王力《汉语史稿》） | ⚠️ rare（无大规模高化链，证据弱） | ⚠️ rare（俄语史无典型高化） |
| lower-a（a-mutation） | 🚫（PGmc 史前特征，切片内无） | 🚫 | 🚫 | 🚫 |
| lower-free 无条件低化 | ✅ occasional（FOOT–STRUT ʊ→ʌ，17c，展唇+低化，[Wikipedia](https://en.wikipedia.org/wiki/FOOT%E2%80%93STRUT_split)） | ⚠️ 建议排除（低化链研究零散） | ✅ **typical**（通俗拉丁语 ŏ→ɔ、ĕ→ɛ 无条件质变，[Britannica](https://www.britannica.com/topic/Romance-languages/Vowels)——与泛语系 rare 形成教学对照） | ⚠️ rare（依据不足） |
| front-umlaut 前化 | 🚫（i-umlaut 完成于古英语期 <1100；切片含古英语则 typical） | 🚫（无此机制） | ⚠️ 排除 i-umlaut；**法语支 typical**（u→y 无条件前化，[History of French](https://en.wikipedia.org/wiki/History_of_French)）——需法语分支处理 | 🚫 |
| back-a 后化 | ⚠️ rare（BATH 后化在 18c，切片外） | ⚠️ rare（共时 [ɑ] 变体非历时音变） | ✅ occasional（法语部分地区 a→ɑ） | ⚠️ rare（依据不足） |
| reduce 弱化 | ✅ **typical**（非重读 schwa，[Minkova, final vowels in English](https://varieng.helsinki.fi/series/volumes/16/minkova/)） | ✅ occasional（轻声央化，如"哥哥" kɤ→kə） | ✅ occasional（意大利语弱化弱；法语 e caduc 是支内典型） | ✅ **typical**（аканье：非重读 o/a→a→ə，[Wikipedia Akanye](https://en.wikipedia.org/wiki/Akanye)） |
| diph-long 长元音复化 | ✅ **typical**（GVS iː→aɪ、uː→aʊ、eː→eɪ，14–17c） | 🚫（官话无音位长短） | 🚫（音位长度在通俗拉丁语已丢失） | 🚫（晚期共同斯拉夫语长度丢失） |
| diph-short 短高元音复化 | 🚫（无短高元音复化证据） | ✅ **typical**（济南等 i→ei、u→ou，[山东方言高元音后滑研究](https://d.wanfangdata.com.cn/thesis/Ch1UaGVzaXNOZXdTb2xyOVMyMDI2MDYyOTE2MTQ1MhIIWTQ1NTY2NDcaCHFtcXM2eGpo)、钱曾怡主编《山东方言研究》） | ⚠️ 需扩展：意大利语 ĕ→jɛ、ŏ→wɔ 是"短**中**元音+重读开音节"复化（[Sanchez-Miret 开音节复化研究](https://www.academia.edu/figures/2195549/figure-2-schiirrs-hypothesis-after-sanchez-miret-sanchez)），现有规则不匹配 → L3 新 env | ⚠️ rare |
| mono 单元音化 | ✅ occasional（ME ai→ɛː，"day"，14c，[Phonological history of English diphthongs](https://web.archive.org/all/20140810183601/http://en.wikipedia.org/wiki/Phonological_history_of_English_diphthongs)） | ⚠️ 建议排除（复元音单化证据零散） | ✅ **typical**（拉丁语 ae→e、au→o 后古典） | ✅ **typical**（共同斯拉夫语双元音单化 *ai→ě、*au→u、*ei→i，[Wikipedia](https://web.archive.org/web/20230717044150/https://en.wikipedia.org/wiki/Monophthongization_of_diphthongs_in_Proto-Slavic)） |

---

## 3. L2 真实演变语料（按语系 × 适用规则）

### 英语史
| 音变 | 条件 | 时期 | 出处 |
|---|---|---|---|
| eː → iː（meet） | 长元音 | 15c（GVS） | [Britannica GVS](https://www.britannica.com/topic/Great-Vowel-Shift)；[剑桥专著](https://www.cambridge.org/core/books/abs/longvowel-shifts-in-english-c10501700/development-of-oe-e-and-eo/E4156D7591539014451AD96D963730E3) |
| oː → uː（food 部分） | 长元音 | 15c（GVS） | 同上 |
| iː → aɪ（bite） | 长元音 | 15–16c（GVS） | [元音大推移（维基）](https://zh.wikipedia.org/wiki/%E6%AF%8D%E9%9F%B3%E5%A4%A7%E6%8E%A8%E7%A7%BB) |
| uː → aʊ（house） | 长元音 | 15–16c（GVS） | 同上 |
| eː → eɪ（face） | 长元音 | 16–17c（GVS） | 同上 |
| ai → ɛː（day） | — | 14c | [English diphthongs 史](https://web.archive.org/all/20140810183601/http://en.wikipedia.org/wiki/Phonological_history_of_English_diphthongs) |
| ʊ → ʌ（but） | 展唇+低化，词汇扩散 | 17c | [FOOT–STRUT](https://en.wikipedia.org/wiki/FOOT%E2%80%93STRUT_split) |
| 非重读 a → ə（about） | 非重读 | 中古英语起 | [Minkova](https://varieng.helsinki.fi/series/volumes/16/minkova/) |
| OE ā → æː → ɛː → eː | 北方方言前化+高化链 | 早期中古英语 | [剑桥 OE ā 章节](https://www.cambridge.org/core/books/longvowel-shifts-in-english-c10501700/development-of-oe-a/240A1B91D9BF99E83225D50437146CD8) |

### 汉语史（官话/北方方言）
| 音变 | 条件 | 地域/时期 | 出处 |
|---|---|---|---|
| i → ei、u → ou | 高元音复化（后滑） | 济南等冀鲁官话 | [山东方言高元音后滑研究](https://d.wanfangdata.com.cn/thesis/Ch1UaGVzaXNOZXdTb2xyOVMyMDI2MDYyOTE2MTQ1MhIIWTQ1NTY2NDcaCHFtcXM2eGpo)；钱曾怡《山东方言研究》 |
| 非重读元音 → ə（轻声央化，"哥哥" kɤ→kə） | 轻声 | 北京话 | [元音弱化（维基）](https://zh.wikipedia.org/wiki/%E5%85%83%E9%9F%B3%E5%BC%B1%E5%8C%96)；现代汉语教材 |
| 元音高化倾向（链移） | — | 汉语史（王力） | 王力《汉语史稿》《汉语语音史》 |

### 罗曼史
| 音变 | 条件 | 时期 | 出处 |
|---|---|---|---|
| ŏ → ɔ（forte） | 无条件（长短合并质变） | 通俗拉丁语 | [Britannica Romance vowels](https://www.britannica.com/topic/Romance-languages/Vowels) |
| ĕ → ɛ（terra） | 无条件 | 通俗拉丁语 | 同上 |
| u → y（séur > sûr） | 无条件前化 | 古法语 11–13c | [History of French](https://en.wikipedia.org/wiki/History_of_French) |
| e → ə（e caduc，faire→fəʁ?） | 非重读 | 法语史 | [History of French](https://en.wikipedia.org/wiki/History_of_French) |
| ae → e（poena→pena） | — | 拉丁语后古典 | [西班牙语元音史](https://www.staff.ncl.ac.uk/i.e.mackenzie/vowelsr.htm) |
| au → o（aurum→oro） | — | 拉丁语后古典 | 同上 |
| ĕ → jɛ（pedem→piede） | **重读开音节**（新 env） | 意大利语史 | [开音节复化研究](https://www.academia.edu/figures/2195549/figure-2-schiirrs-hypothesis-after-sanchez-miret-sanchez) |
| ŏ → wɔ（focum→fuoco） | **重读开音节**（新 env） | 意大利语史 | 同上 |
| a → ɑ（部分地区） | — | 法语变体 | 法语史研究 |

### 斯拉夫史
| 音变 | 条件 | 时期 | 出处 |
|---|---|---|---|
| o → a（非重读，аканье） | 非重读（首前音节/词首） | 14c 起，莫斯科方言 | [Wikipedia Akanye](https://en.wikipedia.org/wiki/Akanye) |
| a → ə（进一步央化） | 非重读（其他位置） | 同上 | 同上 |
| *ai → ě（sěno < *saino-?） | 双元音单化 | 共同斯拉夫语（早期） | [Monophthongization in Proto-Slavic](https://web.archive.org/web/20230717044150/https://en.wikipedia.org/wiki/Monophthongization_of_diphthongs_in_Proto-Slavic) |
| *ou/*au → u（*duša?） | 双元音单化 | 共同斯拉夫语 | 同上 |
| *ei → i | 双元音单化 | 共同斯拉夫语 | 同上 |

> ⚠️ 斯拉夫语/汉语的**具体例词**（sěno、duša 等）建议实现前对照原始文献复核一次；
> 音变方向与时期均已由上述来源背书。

---

## 4. 完备性报告（哪些不能"完备"，开工前必须决策）

### 4.1 证据不足、建议排除出题的组合
- 汉语史：lower-free（低化）、mono —— 无干净文献，标"排除"
- 英语史：back-a（BATH 后化在切片外）、diph-short —— 排除
- 斯拉夫史：raise、back-a、lower-free —— 证据弱，排除
- 结论：**4 语系 × 9 规则中，可出题的组合约 20 个**（矩阵中 ✅/occasional 以上），其余排除——这不影响玩法成立，反而更诚实

### 4.2 模型/引擎缺口（代码层决策，非资料问题）
1. **近闭元音 ɪ/ʊ/ʌ 缺失**：英语史、FOOT–STRUT 语料无法精确表达 → 决策：接受"模型内子集"（i e ɛ a ɔ o u ə）并在 note 声明，或扩元音库（动 VowelChart/发音映射/espeak/piper 全链）
2. **新 EnvKind：stressed-open-syllable（重读开音节）**：罗曼史意大利语复化、部分低化必须 → 引擎层加环境类型
3. **斯拉夫史 ɨ/ь（yers）、鼻元音**：模型无法表达 → 斯拉夫史模式用"共同斯拉夫语简化子集"（i e o a u + 单化语料）并声明
4. **汉语轻声 vs 模型"非重读"**：模型 unstressed 可近似表达（轻声=弱读），声调维度忽略（声明）

### 4.3 已确认的正面发现（教学价值）
- **罗曼史 lower-free = typical**（通俗拉丁语长短合并的无条件质变）——与泛语系"罕见"形成强烈对照，是语系模式最亮眼的差异点
- **同类型不同语系不同环境**：复化在英语史=长元音、汉语史=短高元音、罗曼史=短中元音+开音节——正是"语系视角"的核心教学内容

---

## 5. 下一步（开工顺序）

1. 代码层决策：§4.2 的四个缺口（扩库 or 声明简化；新增 EnvKind）
2. 新增 `config/families.ts`：语系档案 + 音系子集 + 排除规则表
3. 填充 `Rule.familyTiers`（按本矩阵 ✅ 项）
4. 示例卡语系化 + `familyExcluded` 字段
5. 守门测试：矩阵与 familyNote 一致性、排除规则不出题
