// What the Claude link's Copy buttons put on the clipboard.

export function claudeCodeCommand (url: string, token: string): string {
  return `claude mcp add --scope user --transport http woke-poe-trade ${url} --header "Authorization: Bearer ${token}"`
}

export function claudeDesktopJson (url: string, token: string): string {
  // mcp-remote bridges Claude Desktop's stdio to the link. The key goes in an
  // environment variable: an argument with a space breaks on Windows.
  return JSON.stringify({
    mcpServers: {
      'woke-poe-trade': {
        command: 'npx',
        args: ['-y', 'mcp-remote', url, '--header', 'Authorization:$' + '{WOKE_AUTH}'],
        env: { WOKE_AUTH: `Bearer ${token}` }
      }
    }
  }, null, 2)
}
