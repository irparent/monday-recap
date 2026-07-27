"use client";

import { useRef, useState } from "react";

type InFile = { name: string; kind: "csv" | "image"; media?: string; data: string };
type Sourced = { text: string; source: string };
type Recap = {
  summary_message: string;
  wins: Sourced[];
  concerns: Sourced[];
  missing: string[];
  post_ideas: string[];
};

export default function Home() {
  const [files, setFiles] = useState<InFile[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recap, setRecap] = useState<Recap | null>(null);
  const [copied, setCopied] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const added: InFile[] = [];
    for (const f of Array.from(list)) {
      if (f.type.startsWith("image/")) {
        added.push({ name: f.name, kind: "image", media: f.type, data: await toBase64(f) });
      } else {
        added.push({ name: f.name, kind: "csv", data: await f.text() });
      }
    }
    setFiles((prev) => [...prev, ...added]);
  }

  async function generate() {
    setBusy(true);
    setError("");
    setRecap(null);
    setCopied(false);
    try {
      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setRecap(json as Recap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage() {
    if (!recap) return;
    await navigator.clipboard.writeText(recap.summary_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main>
      <h1>Monday Recap</h1>
      <p className="sub">Drop last week&apos;s exports and screenshots. Get the owner message.</p>

      <div
        className="drop"
        onClick={() => picker.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        Drop CSV exports and dashboard screenshots here, or click to choose files.
        <input
          ref={picker}
          type="file"
          multiple
          accept=".csv,image/*"
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="chips">
          {files.map((f, i) => (
            <span className="chip" key={`${f.name}-${i}`}>
              {f.kind === "image" ? "🖼" : "📄"} {f.name}
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`remove ${f.name}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        placeholder="Anything else Mark should know this week? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button className="go" onClick={generate} disabled={busy || files.length === 0}>
        {busy ? "Reading the week…" : "Write the Monday message"}
      </button>

      {error && <p className="error">{error}</p>}

      {recap && (
        <div style={{ marginTop: 24 }}>
          <div className="card">
            <h2>Message to Mark</h2>
            <div className="message">{recap.summary_message}</div>
            <button className="copy" onClick={copyMessage}>
              {copied ? "✓ Copied" : "Copy message"}
            </button>
          </div>

          {recap.missing.length > 0 && (
            <div className="card missing">
              <h2>Missing / couldn&apos;t verify</h2>
              <ul>
                {recap.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2>Wins</h2>
            <ul>
              {recap.wins.map((w, i) => (
                <li key={i}>
                  {w.text} <span className="src">{w.source}</span>
                </li>
              ))}
            </ul>
          </div>

          {recap.concerns.length > 0 && (
            <div className="card">
              <h2>Watch</h2>
              <ul>
                {recap.concerns.map((c, i) => (
                  <li key={i}>
                    {c.text} <span className="src">{c.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2>Post ideas this week</h2>
            <ul>
              {recap.post_ideas.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="footer">
        Numbers come only from what you drop in. Anything the tool can&apos;t find, it says so instead of guessing.{" "}
        <a href="/sample-data.zip">Sample data to try it →</a>
      </p>
    </main>
  );
}

function toBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
