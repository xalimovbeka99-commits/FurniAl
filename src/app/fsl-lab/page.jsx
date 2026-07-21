"use client";

/**
 * /fsl-lab — a minimal manual-testing page for POST /api/v1/furniture/generate.
 * Isolated like /cad-lab: nothing existing links here, nothing here is
 * imported elsewhere. Exists purely so the Furniture Generation API (FSL v1)
 * has somewhere to click and try, since the API itself has no UI of its own.
 */
import { useState } from "react";
import Link from "next/link";

const EXAMPLE =
  "Create a modern white wardrobe, 2400 mm wide, 2600 mm high and 600 mm deep, with four hinged doors, six drawers, internal shelves, hanging rails and LED lighting.";

const STATUS_COLOR = {
  ready: "text-emerald-600",
  draft: "text-neutral-500",
  needs_clarification: "text-amber-600",
  partially_supported: "text-amber-600",
  invalid: "text-red-600",
};

function Field({ label, children }) {
  return (
    <label className="flex items-center gap-2 text-xs font-mono text-[#5C626E]">
      {children}
      {label}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-[#EDE8DC] rounded-md bg-white p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C626E] mb-1.5">{title}</div>
      {children}
    </div>
  );
}

export default function FslLabPage() {
  const [message, setMessage] = useState(EXAMPLE);
  const [target, setTarget] = useState("configurator");
  const [allowDefaults, setAllowDefaults] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/furniture/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, options: { target, allow_defaults: allowDefaults, include_explanation: true } }),
      });
      const body = await res.json();
      if (!res.ok && body.status === "error") {
        setError(body.errors?.[0]?.message || `Request failed (${res.status})`);
        setResult(body);
      } else {
        setResult(body);
      }
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const fsl = result?.data?.fsl;
  const interpretation = result?.data?.interpretation;
  const configurator = result?.data?.configurator;

  return (
    <div className="min-h-screen w-full bg-neutral-100">
      <header className="flex items-center justify-between border-b border-[#EDE8DC] bg-[#FAF9F5] px-5 py-2.5">
        <Link href="/" className="font-mono text-xs tracking-wider text-[#5C626E] hover:text-[#1C1E21] transition-colors">
          ← Back
        </Link>
        <div className="text-sm font-mono">
          <span className="font-bold">FSL Lab</span>
          <span className="text-[#5C626E]"> — Furniture Generation API (/api/v1/furniture/generate)</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="mx-auto max-w-5xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Section title="Describe the furniture you want">
            <form onSubmit={submit} className="space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full text-sm border border-[#EDE8DC] rounded px-2 py-1.5 bg-white font-mono"
                placeholder="Describe a wardrobe, kitchen, bookcase…"
              />
              <div className="flex flex-wrap items-center gap-4">
                <Field label="concept">
                  <input type="radio" name="target" checked={target === "concept"} onChange={() => setTarget("concept")} />
                </Field>
                <Field label="configurator">
                  <input type="radio" name="target" checked={target === "configurator"} onChange={() => setTarget("configurator")} />
                </Field>
                <Field label="allow_defaults">
                  <input type="checkbox" checked={allowDefaults} onChange={(e) => setAllowDefaults(e.target.checked)} />
                </Field>
              </div>
              <button type="submit" disabled={loading} className="text-sm px-3 py-1.5 rounded bg-[#1C1E21] text-white disabled:opacity-40">
                {loading ? "Generating…" : "Generate FSL"}
              </button>
            </form>
          </Section>

          {interpretation && (
            <Section title="Interpretation">
              <p className="text-sm mb-2">{interpretation.summary}</p>
              {interpretation.explicit_requirements?.length > 0 && (
                <>
                  <div className="text-[10px] font-mono uppercase text-[#5C626E] mt-2">Explicit</div>
                  <ul className="text-xs font-mono list-disc pl-4">
                    {interpretation.explicit_requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}
              {interpretation.defaults_applied?.length > 0 && (
                <>
                  <div className="text-[10px] font-mono uppercase text-[#5C626E] mt-2">Defaults applied</div>
                  <ul className="text-xs font-mono list-disc pl-4 text-amber-700">
                    {interpretation.defaults_applied.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}
              {interpretation.clarifications_required?.length > 0 && (
                <>
                  <div className="text-[10px] font-mono uppercase text-[#5C626E] mt-2">Clarifications needed</div>
                  <ul className="text-xs font-mono list-disc pl-4 text-red-600">
                    {interpretation.clarifications_required.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}
            </Section>
          )}

          {configurator && (
            <Section title="Configurator compatibility">
              <div className="text-sm font-mono">
                compatible: <span className={configurator.compatible ? "text-emerald-600" : "text-amber-600"}>{String(configurator.compatible)}</span>
              </div>
              {configurator.unsupported_fields?.length > 0 && (
                <ul className="text-xs font-mono list-disc pl-4 mt-1 text-amber-700">
                  {configurator.unsupported_fields.map((f, i) => <li key={i}>{f.message}</li>)}
                </ul>
              )}
            </Section>
          )}
        </div>

        <div className="space-y-3">
          {error && (
            <Section title="Error">
              <p className="text-sm text-red-600 font-mono">{error}</p>
            </Section>
          )}
          {fsl && (
            <Section title={`FSL document — status: `}>
              <div className={`text-sm font-mono font-bold mb-2 ${STATUS_COLOR[fsl.status] || ""}`}>{fsl.status}</div>
              <pre className="font-mono text-[11px] whitespace-pre-wrap break-all max-h-[70vh] overflow-y-auto">{JSON.stringify(fsl, null, 2)}</pre>
            </Section>
          )}
          {!result && !loading && <p className="text-sm text-[#5C626E] font-mono px-1">No request sent yet.</p>}
        </div>
      </div>
    </div>
  );
}
