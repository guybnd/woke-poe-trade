// A small mouse with its wheel lit, for "Wheel" key chips (Guy's tips
// review: the wheel peek should show the middle mouse). Plain SVG markup so
// the DOM-built wheel peek can use it too; it is our own constant, never data.
export const WHEEL_GLYPH = '<svg class="w-mouse-glyph" viewBox="0 0 10 14" width="9" height="12" aria-hidden="true" focusable="false">' +
  '<rect x="0.75" y="0.75" width="8.5" height="12.5" rx="4.25" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>' +
  '<rect x="4" y="2.6" width="2" height="3.6" rx="1" fill="var(--w-accent, currentColor)"/>' +
  '</svg>'

export const isWheelKey = (k: string): boolean => /^wheel$/i.test(k.trim())
