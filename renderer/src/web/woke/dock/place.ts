// The icon row's spot, kept whole on screen like a pin (PinFrame.vue): a row
// saved near the right or bottom edge, one that grew more icons, stood on its
// side, or a smaller window, pulls it back in.
export function dockSpot (x: number, y: number, size: { w: number, h: number }): { left: string, top: string } {
  return {
    left: `min(${x}%, calc(100% - ${size.w}px))`,
    top: `min(${y}%, calc(100% - ${size.h}px))`
  }
}
