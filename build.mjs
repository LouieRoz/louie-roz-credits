// Reads credits.json, fetches missing cover art (and metadata if left blank), writes covers/ and data.js.
// Node 18+. Optional env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (free, developer.spotify.com).
// With keys: title, artist and year are filled in automatically. Without: add them to credits.json yourself.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";

const credits = JSON.parse(await readFile("credits.json", "utf8"));
const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
await mkdir("covers", { recursive: true });

const exists = (p) => access(p).then(() => true, () => false);
const trackId = (u) => (u.match(/track\/([A-Za-z0-9]+)/) || [])[1];

let token = null;
if (id && secret) {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (r.ok) token = (await r.json()).access_token;
  else console.warn("Spotify token request failed:", r.status, "- falling back to oEmbed");
}

async function lookup(url, tid) {
  if (token) {
    const r = await fetch("https://api.spotify.com/v1/tracks/" + tid, { headers: { Authorization: "Bearer " + token } });
    if (r.ok) {
      const j = await r.json();
      return { title: j.name, artist: j.artists.map((a) => a.name).join(", "), year: Number((j.album.release_date || "").slice(0, 4)) || undefined, image: j.album.images?.[0]?.url };
    }
    console.warn("API lookup failed for", tid, r.status);
  }
  const r = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(url));
  if (!r.ok) { console.warn("oEmbed failed for", tid, r.status); return {}; }
  const j = await r.json();
  return { title: j.title, image: j.thumbnail_url };
}

const out = [];
for (const c of credits) {
  const tid = trackId(c.url || "");
  const file = tid && "covers/" + tid + ".jpg";
  const needArt = tid && !(await exists(file));
  const needMeta = !c.title || !c.artist || !c.year;
  let meta = {};
  if (tid && (needArt || needMeta)) {
    try { meta = await lookup(c.url, tid); } catch (e) { console.warn("lookup error", tid, e.message); }
  }
  if (needArt && meta.image) {
    try {
      const r = await fetch(meta.image);
      if (r.ok) await writeFile(file, Buffer.from(await r.arrayBuffer()));
      else console.warn("image download failed for", tid, r.status);
    } catch (e) { console.warn("image error", tid, e.message); }
  }
  const title = c.title || meta.title || "Untitled";
  if (!c.artist && !meta.artist) console.warn("Missing artist for", title, "- add it to credits.json or set Spotify keys");
  out.push({
    title,
    artist: c.artist || meta.artist || "",
    year: c.year || meta.year,
    roles: c.roles || [],
    link: c.url || "",
    cover: file && (await exists(file)) ? file : "",
  });
}
await writeFile("data.js", "window.CREDITS = " + JSON.stringify(out, null, 1) + ";\n");
console.log("Built", out.length, "credits,", out.filter((o) => o.cover).length, "with cover art.");
