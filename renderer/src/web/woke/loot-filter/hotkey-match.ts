// Compares a key press in the overlay with a saved hotkey such as "Alt + F".
// Modifier order doesn't matter: "Shift + Alt + F" is "Alt + Shift + F".
export function sortKeys (hotkey: string): string {
  return hotkey.split(' + ').sort().join('+')
}

export function pressedKeys (e: Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'shiftKey'>): string {
  const key = e.code.replace(/^Key|^Digit/, '')
  const keys = [key]
  if (e.altKey) keys.push('Alt')
  if (e.ctrlKey) keys.push('Ctrl')
  if (e.shiftKey) keys.push('Shift')
  return keys.sort().join('+')
}

const MOD_KEYS = ['Alt', 'Ctrl', 'Shift']

// The key a hotkey ends on: "Ctrl + Space" is Space. Null when the hotkey has
// no modifier, since then a plain press already matches it.
export function hotkeyMainKey (hotkey: string): string | null {
  const keys = hotkey.split(' + ')
  if (!keys.some(key => MOD_KEYS.includes(key))) return null
  return keys.find(key => !MOD_KEYS.includes(key)) ?? null
}

export function isModifierCode (code: string): boolean {
  return /^(Control|Alt|Shift|Meta)(Left|Right)$/.test(code)
}

// A global hotkey lets go of its keys when it fires, so the game isn't left
// with Ctrl stuck down. With Ctrl still held, the next tap of the same key then
// reaches the overlay without Ctrl: "Space", not "Ctrl + Space". True for that
// bare key. Only for keys that don't type a letter or digit, so a query
// starting with "p" never reads as Alt + P again.
export function isHotkeyTail (
  e: Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'shiftKey'>,
  hotkey: string
): boolean {
  if (e.altKey || e.ctrlKey || e.shiftKey) return false
  const main = hotkeyMainKey(hotkey)
  return main !== null && main.length > 1 && pressedKeys(e) === main
}
