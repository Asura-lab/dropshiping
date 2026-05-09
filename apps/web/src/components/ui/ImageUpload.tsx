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
        // 1. Presigned URL авна
        const res = await apiFetch<PresignResponse>("/admin/upload/presign", {
          method: "POST",
          body: JSON.stringify({ contentType: file.type }),
        });
        if (!res.success) throw new Error(res.error?.message ?? "Presign алдаа");

        // 2. Шууд R2 руу PUT
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

  function removeImage(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div>
      {/* Preview */}
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
              {i === 0 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: 2,
                    background: "var(--accent)",
                    color: "white",
                    fontSize: 8,
                    padding: "1px 4px",
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  ҮНДСЭН
                </span>
              )}
              <button
                onClick={() => removeImage(url)}
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

      {/* Drop zone */}
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
            transition: "border-color 100ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-mid)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
        >
          {uploading ? (
            <p style={{ fontSize: 12, color: "var(--mute)" }}>Байршуулж байна…</p>
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--mute-2)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: "0 auto 6px" }}
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ fontSize: 12, color: "var(--mute)" }}>
                Зураг чирж тавих эсвэл{" "}
                <span style={{ color: "var(--accent)" }}>сонгох</span>
              </p>
              <p style={{ fontSize: 11, color: "var(--mute-2)", marginTop: 3 }}>
                JPEG · PNG · WEBP · 5MB хүртэл · Эхний зураг үндсэн болно
              </p>
            </>
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
