"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button type="button" onClick={copy} className="btn-secondary shrink-0 !px-3 !py-2 text-sm">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
