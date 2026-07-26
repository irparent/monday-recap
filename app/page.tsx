"use client";

import { useRef, useState } from "react";

type InFile = { name: string; kind: "csv" | "image"; media?: string; data: string };

export default function Home() {
  const [files, setFiles] = useState<InFile[]>([]);
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

      <button className="go" disabled>
        Write the Monday message
      </button>

      <p className="footer">Model call not wired up yet.</p>
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
