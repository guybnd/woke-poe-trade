// Shortcut strings keep key codes ("Alt + BracketLeft"); people read the
// printed key ("Alt+[").
const SYMBOLS: Record<string, string> = {
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/'
}

export function keyLabel (key: string): string {
  return SYMBOLS[key] ?? key
}

export function hotkeyParts (keys: string | null | undefined): string[] {
  return (keys ?? '').split('+').map(s => s.trim()).filter(Boolean).map(keyLabel)
}

export function hotkeyText (keys: string | null | undefined): string {
  return hotkeyParts(keys).join('+')
}
