// Which character is yours. Client.txt never names the character you log in
// on, and party members' deaths and level-ups are logged too (in your
// hideout as well as in maps). So: after the game starts (or you log in), the
// first death or level-up decides, and other names are party members until
// the game starts again. Pure: no Vue or IO.

const OPENING = '***** LOG FILE OPENING *****'
// The login server line, when the client writes one (back from character select too).
const LOGIN_RE = /\] Connected to \S+\.login\.pathofexile\.com\b/

// The game started, or you logged in: the next death or level-up decides.
export function isGameStart (line: string): boolean {
  return line.includes(OPENING) || LOGIN_RE.test(line)
}

export class MyChar {
  // `name`: the last character known (a saved map's, say). Until a death or
  // level-up confirms it, it keeps no one out.
  constructor (public name: string | null = null, public confirmed = false) {}

  start (): void {
    this.confirmed = false
  }

  // A death or level-up of `name`: whether it's yours. The first one decides.
  seen (name: string): boolean {
    if (this.confirmed && this.name !== name) return false
    this.name = name
    this.confirmed = true
    return true
  }
}
