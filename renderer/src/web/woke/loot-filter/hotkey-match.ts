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
