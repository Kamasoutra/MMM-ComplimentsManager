# MMM-ComplimentsManager

A [MagicMirror²](https://magicmirror.builders/) module that adds a web UI to manage your compliments directly in `config.js` — no file editing required.

Accessible from any device on your network at `http://your-mirror:8080/compliments-manager`.

## Features

- **4 categories** — Always, Morning, Afternoon, Evening
- **Two modes** — *quote* (`"text" — author`) or *plain text* (displayed as-is)
- **Pause/resume** — paused entries are commented out in `config.js`, keeping a full history without displaying them
- **Move** — reassign a compliment to another category
- **Settings tab** — configure `updateInterval`, `fadeSpeed`, time windows and CSS classes
- **Multilingual UI** — auto-detects the `language` setting from `config.js` (supports `fr` and `en`)

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/Kamasoutra/MMM-ComplimentsManager.git
```

No npm dependencies required.

## Configuration

Add the module to `config/config.js`:

```js
{
  module: "MMM-ComplimentsManager",
}
```

The module renders nothing on the mirror — it only serves the admin UI at `/compliments-manager`.

## Usage

Open `http://your-mirror:8080/compliments-manager` in a browser.

### Quote mode
Two fields: the quoted text and an optional author. Displayed as `"text" — Author`.

### Plain text mode
A single field. The text is displayed exactly as typed.

### Pausing a compliment
Click **Pause** — the entry is commented out in `config.js` (e.g. `// "..."`) and excluded from the mirror display. Click **Resume** to re-enable it. The entry is never lost.

### Moving a compliment
Use the **→** dropdown on any entry to move it to another category.

### Settings
The ⚙ Settings tab lets you configure the `compliments` module options:

| Setting | Default | Description |
|---|---|---|
| `updateInterval` | 30 000 ms | Time between two compliments |
| `fadeSpeed` | 4 000 ms | Transition animation duration |
| `morningStartTime` | 3 | Start of morning window (hour, 0–23) |
| `morningEndTime` | 12 | End of morning window |
| `afternoonStartTime` | 12 | Start of afternoon window |
| `afternoonEndTime` | 17 | End of afternoon window |
| `classes` | `thin xlarge bright` | CSS classes applied to the displayed text |

Changes are written directly to `config.js` on save.

## Security

This module exposes an unauthenticated HTTP endpoint. It is intended to be used behind a reverse proxy with authentication (e.g. nginx basic auth). Do not expose port 8080 directly to the internet.

## License

MIT
