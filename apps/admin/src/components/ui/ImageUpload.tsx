"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export function ImageUpload({ value, onChange, maxFiles = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList) {
    const remaining = maxFiles - value.length;
    if (remaining <= 0) return;
    const picked = Array.from(files).slice(0, remaining);
    setError("");
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of picked) {
        if (file.size > 5 * 1024 * 1024) {
          setError("Файл 5MB-аас бага байх ёстой");
          continue;
        }
        const res = await apiFetch<PresignResponse>("/admin/upload/presign", {
          method: "POST",
          body: JSON.stringify({ contentType: file.type }),
        });
        if (!res.success) throw new Error(res.error?.message ?? "Presign алдаа");
        const putRes = await fetch(res.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("R2 upload алдаа");
        uploaded.push(res.data.publicUrl);
      }
      onChange([...value, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload алдаа гарлаа");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {value.map((url, i) => (
            <div key={url} style={{ position: "relative" }}>
              <img
                src={url}
                alt={`Зураг ${i + 1}`}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: "var(--r-2)",
                  border: i === 0 ? "2px solid var(--accent)" : "1px solid var(--line)",
                }}
              />
              <button
                onClick={() => onChange(value.filter((u) => u !== url))}
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "white",
                  border: "none",
                  fontSize: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length < maxFiles && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          style={{
            border: "1.5px dashed var(--line-2)",
            borderRadius: "var(--r-2)",
            padding: "16px 12px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            background: "var(--bg-cream)",
          }}
        >
          {uploading ? (
            <p style={{ fontSize: 12, color: "var(--mute)" }}>Байршуулж байна…</p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--mute)" }}>
              Зураг чирж тавих эсвэл{" "}
              <span style={{ color: "var(--accent)" }}>сонгох</span>
            </p>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {error && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
