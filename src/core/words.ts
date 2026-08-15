/* ============================================================
 * core：词形（CVCV）生成与显示
 * ============================================================ */
import type { Rule, Word, WordVowel } from './types';
import { mkVowel, vowelText } from './vowels';
import { CONSONANTS } from '@/config/vowels';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** 随机 CVCV 词：{c:[c1,c2], v:[v1,v2], stress:0|1} */
export function randomWord(): Word {
  return {
    c: [pick(CONSONANTS), pick(CONSONANTS)],
    v: [mkVowel(), mkVowel()],
    stress: Math.random() < 0.5 ? 0 : 1
  };
}

/** IPA 显示串（重音标记 ˈ 置于重读音节前） */
export function wordText(w: Word): string {
  const s1 = w.c[0] + vowelText(w.v[0]);
  const s2 = w.c[1] + vowelText(w.v[1]);
  return w.stress === 0 ? 'ˈ' + s1 + s2 : s1 + 'ˈ' + s2;
}

/** 为带环境条件的规则“定向构词”：保证所需语境出现 */
export function makeWordForRule(rule: Rule): Word {
  const word = randomWord();
  const env = rule.env;
  if (!env) return word;
  const pos = Math.random() < 0.5 ? 0 : 1;
  const opos = 1 - pos;
  const mk = (s: string, long: boolean, diph = false): WordVowel => ({ s, long, diph });
  switch (env.kind) {
    case 'stressed-next-a': // 重读 u（短）+ 另一音节 a
      word.stress = pos as 0 | 1;
      word.v[opos] = mk('a', false);
      word.v[pos] = mk('u', false);
      break;
    case 'before-i': // 后元音/低元音 + 另一音节 i
      word.stress = Math.random() < 0.5 ? 0 : 1;
      word.v[opos] = mk('i', false);
      word.v[pos] = mk(pick(['u', 'o', 'ɔ', 'ɑ', 'a']), Math.random() < 0.3);
      break;
    case 'long': // 长元音 iː/uː/eː/oː
      word.stress = Math.random() < 0.5 ? 0 : 1;
      word.v[pos] = mk(pick(['i', 'u', 'e', 'o']), true);
      break;
    case 'unstressed': // 随机词即可（总有非重读位）
      break;
  }
  return word;
}
