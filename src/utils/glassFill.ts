/**
 * 画布内模拟毛玻璃：线性渐变高光 + 半透明叠色（Leafer 无 backdrop-filter）
 */
export function glassCardFillLighter(): object {
  return {
    type: "linear",
    from: { x: 0, y: 0 },
    to: { x: 1, y: 1 },
    stops: [
      { offset: 0, color: "rgba(255, 255, 255, 0.94)" },
      { offset: 0.42, color: "rgba(248, 252, 255, 0.84)" },
      { offset: 1, color: "rgba(228, 241, 250, 0.78)" }
    ]
  };
}

export function glassCardFillDeep(): object {
  return {
    type: "linear",
    from: { x: 0, y: 0 },
    to: { x: 1, y: 1 },
    stops: [
      { offset: 0, color: "rgba(255, 255, 255, 0.97)" },
      { offset: 0.48, color: "rgba(244, 252, 255, 0.90)" },
      { offset: 1, color: "rgba(232, 245, 252, 0.84)" }
    ]
  };
}
