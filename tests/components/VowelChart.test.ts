import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import VowelChart from '@/components/VowelChart.vue';

const V = (s: string, long = false, diph = false) => ({ s, long, diph });

describe('VowelChart', () => {
  it('无词对时渲染全部元音点，不高亮', () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.findAll('circle').length).toBeGreaterThanOrEqual(13); // 全部单元音
    expect(wrapper.find('circle[stroke="#4b6cb7"]').exists()).toBe(false);
  });

  it('有词对时渲染 A→B 高亮', () => {
    const wrapper = mount(VowelChart, {
      props: { a: V('a'), b: V('æ') }
    });
    expect(wrapper.find('circle[stroke="#4b6cb7"]').exists()).toBe(true);
    expect(wrapper.find('circle[stroke="#e74c3c"]').exists()).toBe(true);
    expect(wrapper.find('line[marker-end="url(#arr)"]').exists()).toBe(true);
  });

  it('复元音输出按起点定位（aɪ 落在 a 附近）', () => {
    const wrapper = mount(VowelChart, {
      props: { a: V('i', true), b: V('aɪ', false, true) }
    });
    expect(wrapper.find('circle[stroke="#e74c3c"]').exists()).toBe(true);
  });
});
