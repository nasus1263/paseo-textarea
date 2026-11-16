Editing keys for the message composer, ported from the ming_helper prompter.

- **Shift+Enter**: keeps the indent and continues `- ` and `1. ` lists. On an empty marker or indent line it removes one level instead. Elsewhere it is Paseo's own line break. Plain Enter and Ctrl+Enter are never touched and stay Paseo's.
- **Tab / Shift+Tab**: indent or dedent the selected lines with a tab. Shift+Tab on a line with no indent falls through to Paseo.
- **Ctrl+D**: delete the line. **Ctrl+L**: toggle `- ` bullets. **Alt+Up/Down**: move lines. **Ctrl+Space**: select whole lines.
- **Ctrl+C / Ctrl+X with nothing selected**: copy or cut the cursor line. Pasting it puts it above the cursor line.
- **Quotes and brackets over a selection** wrap it and keep it selected, so typing a backtick three times makes a fenced block. `(`, `<` and `{` with no selection insert the closing character.
- **Third backtick on an empty line** adds the closing fence.

Works in the desktop and browser apps only. The plugin finds the composer through its page markup, so a Paseo update that changes the composer can break it. Enter, Tab and the arrows are left to Paseo while the autocomplete list is open.
