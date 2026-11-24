Editing keys for the message composer, ported from the ming_helper prompter.

- **Shift+Enter**: keeps the indent and continues `- ` and `1. ` lists. On an empty marker or indent line it removes one level instead. Elsewhere it is Paseo's own line break. Plain Enter and Ctrl+Enter are never touched and stay Paseo's.
- **Tab / Shift+Tab**: indent or dedent the selected lines with a tab. Shift+Tab on a line with no indent falls through to Paseo. In an agent composer Paseo's Cycle agent mode shortcut takes Shift+Tab first; rebind it in Paseo's keyboard shortcuts to dedent there.
- **Ctrl+D**: delete the line. **Ctrl+L**: toggle `- ` bullets. **Alt+Up/Down**: move lines. **Ctrl+Space**: select whole lines.
- **Ctrl+C / Ctrl+X with nothing selected**: copy or cut the cursor line. Pasting it puts it above the cursor line.
- **Quotes and brackets over a selection** wrap it and keep it selected, so typing a backtick three times makes a fenced block. `(`, `<` and `{` with no selection insert the closing character.
- **Third backtick on an empty line** adds the closing fence. A backtick with no selection also inserts its closing backtick, unless it closes a code span or extends a run.
- **`->` and `<-`** turn into `→` and `←`.
- **Ctrl+S stash**: stashes the prompt (or the selection) per workspace, and on an empty composer brings one back, from a list when there are several. **stash N** in the composer opens the list, which shows each item's age and a `⋮` row between items 3 hours or more apart. Stashes are stored on the daemon under `plugin-data/paseo-textarea`.

Other plugins can give their own multiline fields these keys (not the stash) by marking the TextInput with `dataSet={{ paseoTextarea: "" }}`, which renders `data-paseo-textarea`. paseo-doc-ask does this for its input boxes.

Works in the desktop and browser apps only. The plugin finds the composer through its page markup, so a Paseo update that changes the composer can break it. Enter, Tab and the arrows are left to Paseo while the autocomplete list is open.
