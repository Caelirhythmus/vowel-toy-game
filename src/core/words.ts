/* ============================================================
 * core：词形（CVCV）生成与显示
 * 语系模式：词表元音池按语系音系子集过滤（输入子集化；
 * 规则输出允许在子集之外——音变产生新音是常态）
 * ============================================================ */
import type { Rule, Word, WordVowel } from './types';
import { mkVowel, vowelText } from './vowels';
import { CONSONANTS } from '@/config/vowels';
import { longProbFor, vowelPoolFor } from '@/config/families';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** 随机 CVCV 词：{c:[c1,c2], v:[v1,v2], stress:0|1}；family 决定元音子集与长短概率
 * 音系学约束：重读音节不生成 ə——重读 schwa 在绝大多数语言中
 * 不存在或极罕见（ə 是非重读弱化的产物） */
export function randomWord(family = 'generic'): Word {
  const pool = vowelPoolFor(family);
  const longProb = longProbFor(family);
  const stress = Math.random() < 0.5 ? 0 : 1;
  const mkV = (avoidSchwa: boolean): WordVowel => {
    let x = mkVowel(pool, longProb);
    while (avoidSchwa && x.s === 'ə') x = mkVowel(pool, longProb);
    return x;
  };
  return {
    c: [pick(CONSONANTS), pick(CONSONANTS)],
    v: [mkV(stress === 0), mkV(stress === 1)],
    stress
  };
}

/** IPA 显示串（重音标记 ˈ 置于重读音节前） */
export function wordText(w: Word): string {
  const s1 = w.c[0] + vowelText(w.v[0]);
  const s2 = w.c[1] + vowelText(w.v[1]);
  return w.stress === 0 ? 'ˈ' + s1 + s2 : s1 + 'ˈ' + s2;
}

/** 为带环境条件的规则“定向构词”：保证所需语境出现
 * 注意：i-umlaut / a-mutation 是“向后同化”——目标元音必须在
 * 首音节（pos 0），触发元音（i / a）在后一音节；构词必须固定
 * 这一方向，否则会生成“前接 i / 前有 a”的反向语境 */
export function makeWordForRule(rule: Rule, family = 'generic'): Word {
  const word = randomWord(family);
  const env = rule.env;
  if (!env) return word;
  const mk = (s: string, long: boolean, diph = false): WordVowel => ({ s, long, diph });
  switch (env.kind) {
    case 'stressed-next-a': // a-mutation：重读短 u（首音节）+ 后接 a（次音节）
      word.stress = 0;
      word.v[1] = mk('a', false);
      word.v[0] = mk('u', false);
      break;
    case 'before-i': // i-umlaut：后元音/低元音（首音节）+ 后接 i（次音节）
      word.stress = Math.random() < 0.5 ? 0 : 1;
      word.v[1] = mk('i', false);
      word.v[0] = mk(pick(['u', 'o', 'ɔ', 'ɑ', 'a']), Math.random() < 0.3);
      break;
    case 'long': // 长元音 iː/uː/eː/oː（任何位置皆可，与方向无关）
      word.stress = Math.random() < 0.5 ? 0 : 1;
      word.v[Math.random() < 0.5 ? 0 : 1] = mk(pick(['i', 'u', 'e', 'o']), true);
      break;
    case 'unstressed': // 随机词即可（总有非重读位）
      break;
    case 'stressed-open-syllable': // 意大利语复化：重读位放短中元音 ɛ/ɔ
      word.stress = Math.random() < 0.5 ? 0 : 1;
      word.v[word.stress] = mk(pick(['ɛ', 'ɔ']), false);
      break;
  }
  return word;
}
