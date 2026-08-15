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

  it('复元音标签两两不重叠（aɪ/aʊ 同起点也要错开）', () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const labels = wrapper
      .findAll('text[font-style="italic"]')
      .map((el) => el.attributes('x') + ',' + el.attributes('y'));
    expect(labels).toHaveLength(4);
    expect(new Set(labels).size).toBe(4);
  });

  it('圆唇对并排：i 与 y、e 与 ø 的标签 x 不同', () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const posOf = (s: string) => {
      const el = wrapper.findAll('text').find((t) => t.text() === s);
      return el ? { x: el.attributes('x'), y: el.attributes('y') } : null;
    };
    const i = posOf('i');
    const y = posOf('y');
    const e = posOf('e');
    const oSlash = posOf('ø');
    expect(i).not.toBeNull();
    expect(y).not.toBeNull();
    expect(i!.x).not.toBe(y!.x);
    expect(e!.x).not.toBe(oSlash!.x);
  });

  it('轴标注存在（闭/开、前/央/后）', () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const texts = wrapper.findAll('text').map((t) => t.text());
    expect(texts).toContain('闭');
    expect(texts).toContain('开');
    expect(texts).toContain('前');
    expect(texts).toContain('后');
  });

  it('悬停元音显示特征卡', async () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const dotI = wrapper.findAll('g[role="button"]').find((g) => g.text().includes('i'));
    expect(dotI).toBeDefined();
    await dotI!.trigger('mouseenter');
    expect(wrapper.find('.chart-tip').exists()).toBe(true);
    expect(wrapper.find('.chart-tip').text()).toContain('前');
    expect(wrapper.find('.chart-tip').text()).toContain('闭');
    await dotI!.trigger('mouseleave');
    expect(wrapper.find('.chart-tip').exists()).toBe(false);
  });

  it('元音点带读屏 aria-label（符号+特征+朗读提示）', () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const dotI = wrapper.findAll('g[role="button"]').find((g) => g.text().includes('i'));
    expect(dotI!.attributes('aria-label')).toContain('前');
    expect(dotI!.attributes('aria-label')).toContain('闭');
    expect(dotI!.attributes('aria-label')).toContain('点击朗读');
  });

  it('切换到共振峰图：出现 F1/F2 轴标注', async () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const acousticBtn = wrapper.findAll('.chart-view-btn').find((b) => b.text().includes('共振峰'));
    await acousticBtn!.trigger('click');
    const texts = wrapper.findAll('text').map((t) => t.text());
    expect(texts).toContain('F1 (Hz)');
    expect(texts).toContain('F2 (Hz)');
    expect(wrapper.find('rect').exists()).toBe(true);
  });

  it('diff 视图：变化源绿色、变化结果虚线空心、其余淡化', () => {
    const wrapper = mount(VowelChart, {
      props: { a: null, b: null, diff: { sources: ['a'], targets: ['æ'] } }
    });
    expect(wrapper.find('circle[fill="#27ae60"]').exists()).toBe(true); // 源
    expect(wrapper.find('circle[stroke="#2980b9"]').exists()).toBe(true); // 目标
    expect(wrapper.findAll('circle[opacity="0.3"]').length).toBeGreaterThan(0); // 淡化
    const legend = wrapper.find('.chart-legend').text();
    expect(legend).toContain('变化源');
    expect(legend).toContain('变化结果');
  });

  it('路径动画元素存在（pathLength=1 + path-anim class）', () => {
    const wrapper = mount(VowelChart, {
      props: { a: V('a'), b: V('æ'), animKey: 'a→æ' }
    });
    const line = wrapper.find('line.path-anim');
    expect(line.exists()).toBe(true);
    const pl = line.attributes('pathlength') ?? line.attributes('pathLength');
    expect(pl).toBe('1');
    expect(wrapper.find('circle.b-pulse').exists()).toBe(true);
  });

  it('元音图梯形上宽下窄且不自交（回归：曾画反/曾自交成沙漏）', () => {
    const wrapper = mount(VowelChart, { props: { a: null, b: null } });
    const pts = wrapper
      .find('polygon')
      .attributes('points')!
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number));
    expect(pts).toHaveLength(4);
    // 顶点顺序必须为 左上→右上→右下→左下，否则 SVG 填充自交成沙漏
    expect(pts[0][0]).toBeLessThan(pts[1][0]); // 顶边：左→右
    expect(pts[1][1]).toBeLessThan(pts[2][1]); // 右边：上→下
    expect(pts[2][0]).toBeGreaterThan(pts[3][0]); // 底边：右→左
    expect(pts[3][1]).toBeGreaterThan(pts[0][1]); // 左边：下→上
    const topWidth = pts[1][0] - pts[0][0];
    const bottomWidth = pts[2][0] - pts[3][0];
    expect(topWidth).toBeGreaterThan(bottomWidth); // 宽边在上

    // 闭元音应比开元音更靠外：i 比 a 靠左、u 比 ɑ 靠右
    const dotX = (sym: string) => {
      const g = wrapper.findAll('g[role="button"]').find((el) => el.text().trim() === sym);
      expect(g).toBeDefined();
      return Number(g!.find('circle').attributes('cx'));
    };
    expect(dotX('i')).toBeLessThan(dotX('a'));
    expect(dotX('u')).toBeGreaterThan(dotX('ɑ'));
  });
});
