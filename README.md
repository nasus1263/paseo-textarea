# paseo-textarea

[한국어](README.ko.md)

A [Paseo](https://paseo.sh) plugin that adds editor-style keys to the agent message composer.

## Install

```bash
paseo plugin add git:nasus1263/paseo-textarea
```

Plugins must be enabled on the daemon (**Settings → Plugins → Enable plugins**). Requires Paseo `>=0.16.0-beta.2`.

## Keys

| Key | Action |
|---|---|
| Shift+Enter | New line that keeps the indent and continues `- ` / `1. ` lists |
| Tab / Shift+Tab | Indent / dedent the selected lines |
| Ctrl+D | Delete the line |
| Ctrl+L | Toggle `- ` bullets |
| Alt+Up / Alt+Down | Move lines |
| Ctrl+Space | Select whole lines |
| Ctrl+C / Ctrl+X (no selection) | Copy / cut the current line |
| Quote or bracket over a selection | Wrap the selection |
| Third backtick on an empty line | Add the closing fence |

Enter and Ctrl+Enter keep Paseo's default behavior.

## Notes

- Desktop and web only.
- It finds the composer through Paseo's page markup, so a Paseo update can break it.
- While the autocomplete list is open, Enter, Tab, and the arrow keys go to Paseo.
