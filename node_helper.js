"use strict";
const NodeHelper = require("node_helper");
const fs   = require("fs");
const path = require("path");

const CONFIG_PATH = "/opt/magic_mirror/config/config.js";
const CATEGORIES  = ["anytime", "morning", "afternoon", "evening"];

const SETTINGS_DEFAULTS = {
  updateInterval:     30000,
  fadeSpeed:          4000,
  morningStartTime:   3,
  morningEndTime:     12,
  afternoonStartTime: 12,
  afternoonEndTime:   17,
  classes:            "thin xlarge bright",
};

module.exports = NodeHelper.create({
  start() {
    this.registerRoutes();
  },

  registerRoutes() {
    this.expressApp.use("/compliments-manager/save", require("express").json());

    this.expressApp.get("/compliments-manager", (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    this.expressApp.get("/compliments-manager/data", (_req, res) => {
      try {
        const content    = fs.readFileSync(CONFIG_PATH, "utf8");
        const categories = {};
        for (const cat of CATEGORIES) categories[cat] = this.parseCategory(content, cat);
        const settings = this.readSettings(content);
        const language = this.readLanguage(content);
        res.json({ success: true, categories, settings, language });
      } catch (e) {
        res.json({ success: false, error: e.message });
      }
    });

    this.expressApp.post("/compliments-manager/save", (req, res) => {
      try {
        const { categories, settings } = req.body;
        if (!categories) throw new Error("Invalid payload");
        let content = fs.readFileSync(CONFIG_PATH, "utf8");
        for (const cat of CATEGORIES) {
          if (categories[cat]) content = this.writeCategory(content, cat, categories[cat]);
        }
        if (settings) content = this.writeSettings(content, settings);
        fs.writeFileSync(CONFIG_PATH, content, "utf8");
        res.json({ success: true });
      } catch (e) {
        res.json({ success: false, error: e.message });
      }
    });
  },

  // ── Language ────────────────────────────────────────────────────────────

  readLanguage(content) {
    const m = /\blanguage:\s*["']([^"']+)["']/.exec(content);
    return m ? m[1] : "en";
  },

  // ── Categories (compliments arrays) ─────────────────────────────────────

  parseCategory(content, cat) {
    const blockRe = new RegExp(`\\b${cat}:\\s*\\[([\\s\\S]*?)\\]`);
    const blockMatch = blockRe.exec(content);
    if (!blockMatch) return [];

    const quotes = [];
    for (const line of blockMatch[1].split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const paused   = trimmed.startsWith("//");
      const strMatch = /"((?:[^"\\]|\\.)*)"/.exec(paused ? trimmed.slice(2) : trimmed);
      if (!strMatch) continue;

      const decoded = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      // Detect mode: citation = "text"\n\nAuthor
      const fmtMatch = /^"([\s\S]*?)"(?:\n\n([\s\S]*))?$/.exec(decoded);
      if (fmtMatch) {
        quotes.push({ mode: "citation", citation: fmtMatch[1], author: fmtMatch[2] || "", paused });
      } else {
        quotes.push({ mode: "text", citation: decoded, author: "", paused });
      }
    }
    return quotes;
  },

  encodeCompliment({ mode, citation, author, paused }) {
    const esc = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    let value;
    if (mode === "citation") {
      value = `\\"${esc(citation)}\\"${author.trim() ? `\\n\\n${esc(author.trim())}` : ""}`;
    } else {
      value = esc(citation);
    }
    return paused ? `            // "${value}"` : `            "${value}"`;
  },

  writeCategory(content, cat, compliments) {
    const items   = compliments.map(q => this.encodeCompliment(q)).join(",\n");
    const replace = `${cat}: [\n${items}\n          ]`;
    const updated = content.replace(new RegExp(`\\b${cat}:\\s*\\[[\\s\\S]*?\\]`), replace);
    if (updated === content) throw new Error(`Could not locate ${cat} block`);
    return updated;
  },

  // ── Settings ─────────────────────────────────────────────────────────────

  getSettingsRegion(content) {
    const modMatch = /module:\s*["']compliments["']/.exec(content);
    if (!modMatch) return null;
    const afterMod = content.slice(modMatch.index + modMatch[0].length);
    const configMatch = /\bconfig:\s*\{/.exec(afterMod);
    if (!configMatch) return null;
    const insideConfig = afterMod.slice(configMatch.index + configMatch[0].length);
    const arrMatch = /\bcompliments:\s*[\{\[]/.exec(insideConfig);
    if (!arrMatch) return null;
    const start = modMatch.index + modMatch[0].length + configMatch.index + configMatch[0].length;
    return { start, end: start + arrMatch.index };
  },

  readSettings(content) {
    const region  = this.getSettingsRegion(content);
    const block   = region ? content.slice(region.start, region.end) : "";
    const settings = {};
    for (const [key, def] of Object.entries(SETTINGS_DEFAULTS)) {
      const m = new RegExp(`\\b${key}:\\s*([^,\\n\\r]+)`).exec(block);
      if (m) {
        const raw = m[1].trim().replace(/,$/, "").replace(/\/\/.*$/, "").trim();
        if (raw.startsWith('"') || raw.startsWith("'")) settings[key] = raw.slice(1, -1);
        else settings[key] = isNaN(Number(raw)) ? raw : Number(raw);
      } else {
        settings[key] = def;
      }
    }
    return settings;
  },

  writeSettings(content, settings) {
    const region = this.getSettingsRegion(content);
    if (!region) throw new Error("Cannot find compliments config block");
    let block = content.slice(region.start, region.end);
    for (const [key, value] of Object.entries(settings)) {
      const fmt = typeof value === "string" ? `"${value}"` : value;
      const re  = new RegExp(`(\\b${key}:\\s*)([^,\\n\\r]+)`);
      if (re.test(block)) {
        block = block.replace(re, `$1${fmt}`);
      } else {
        block = `\n        ${key}: ${fmt},` + block;
      }
    }
    return content.slice(0, region.start) + block + content.slice(region.end);
  },
});
