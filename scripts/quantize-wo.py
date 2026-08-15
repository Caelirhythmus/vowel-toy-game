#!/usr/bin/env python3
"""weight-only per-tensor QDQ 量化：Conv/MatMul/ConvTranspose 权重 int8。

- per-tensor 对称量化 + 99.9% 分位数裁剪（wasm 的 DequantizeLinear 只支持
  per-tensor；分位数裁剪避免异常极值拉大量化步长，精度接近 per-channel）
- 图里只新增 DequantizeLinear 节点（onnxruntime-web wasm 确定支持；
  onnxruntime 自带 quantize_dynamic 会融合出 ConvInteger——wasm 无实现）

用法: python scripts/quantize-wo.py <float.onnx> <out.onnx>
依赖: python3 + onnx + numpy
"""
import sys
import onnx
import numpy as np
from onnx import numpy_helper, helper

PERCENTILE = 99.9


def main() -> None:
    if len(sys.argv) != 3:
        print('usage: python scripts/quantize-wo.py <src.onnx> <dst.onnx>')
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]

    model = onnx.load(src)
    name_to_init = {init.name: init for init in model.graph.initializer}

    new_nodes = []
    new_inits = []
    quantized = set()

    def quantize_weight(name: str, arr: np.ndarray) -> str:
        # 99.9% 分位数作为量化范围（容忍少量离群权重）
        bound = float(np.percentile(np.abs(arr), PERCENTILE))
        scale = max(bound, 1e-6) / 127.0
        wq = np.clip(np.round(arr / scale), -128, 127).astype(np.int8)
        wq_name = name + '_wq'
        scale_name = name + '_scale'
        zp_name = name + '_zp'
        new_inits.append(numpy_helper.from_array(wq, wq_name))
        new_inits.append(numpy_helper.from_array(np.float32(scale), scale_name))
        new_inits.append(numpy_helper.from_array(np.int8(0), zp_name))
        dq = helper.make_node(
            'DequantizeLinear', [wq_name, scale_name, zp_name], [name + '_dq'], name=name + '_DQ'
        )
        new_nodes.append(dq)
        return name + '_dq'

    for node in model.graph.node:
        if node.op_type in ('Conv', 'MatMul', 'ConvTranspose'):
            w_name = node.input[1]
            init = name_to_init.get(w_name)
            if init is not None and w_name not in quantized:
                arr = numpy_helper.to_array(init)
                if arr.dtype == np.float32:
                    node.input[1] = quantize_weight(w_name, arr)
                    quantized.add(w_name)
        new_nodes.append(node)

    final_inits = [init for init in model.graph.initializer if init.name not in quantized] + new_inits
    del model.graph.initializer[:]
    model.graph.initializer.extend(final_inits)
    del model.graph.node[:]
    model.graph.node.extend(new_nodes)

    onnx.checker.check_model(model)
    onnx.save(model, dst)
    print(f'[quantize-wo] {len(quantized)} 个权重 per-tensor({PERCENTILE}% 裁剪) int8 量化完成: {dst}')


if __name__ == '__main__':
    main()
