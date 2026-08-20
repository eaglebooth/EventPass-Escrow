"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getContractAddress, readContract, shortAddress } from "../lib/genlayer";
import type { Summary } from "../lib/types";

export function ContractStrip({ onSync }: { onSync?: (summary: Summary) => void }) {
  const [message, setMessage] = useState("Select a deployed contract");
  async function sync() {
    try {
      const summary = await readContract<Summary>("get_summary");
      setMessage(`Live state · ${summary.listing_count} passes`);
      onSync?.(summary);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Contract sync failed."); }
  }
  useEffect(() => { if (getContractAddress()) void sync(); }, []);
  return <div className="contract-strip"><span><CheckCircle2 size={16} /> STUDIONET · {shortAddress(getContractAddress())}</span><span>{message}</span><button onClick={sync}><RefreshCw size={15} /> Sync</button></div>;
}
