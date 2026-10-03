"use client";

import { useState } from "react";
import { primaryButtonClass } from "@/components/ui/form-field";
import { ApplySheet } from "./apply-sheet";

export function ApplyButton({ errandId }: { errandId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={primaryButtonClass} onClick={() => setOpen(true)}>
        지원하기
      </button>
      {open && <ApplySheet errandId={errandId} onClose={() => setOpen(false)} />}
    </>
  );
}
