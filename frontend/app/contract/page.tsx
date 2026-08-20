"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { EXPLORER_BASE, getContractAddress, restoreContractAddress, saveContractAddress, shortAddress } from "../../lib/genlayer";
import { ContractStrip } from "../../components/ContractStrip";

export default function ContractPage() {
  const [address, setAddress] = useState("");
  useEffect(() => setAddress(getContractAddress()), []);
  function useAddress() { saveContractAddress(address.trim()); window.location.reload(); }
  function restore() { setAddress(restoreContractAddress()); window.location.reload(); }
  return <main><SiteHeader /><ContractStrip /><section className="contract-page"><span className="eyebrow">Runtime-selectable deployment</span><h1>Prove the contract you are using.</h1><p>Paste any compatible EventPass deployment, sync its live state, then open the same address in Explorer. The production default remains one click away.</p><div className="contract-console"><label>Contract address<input value={address} onChange={(event) => setAddress(event.target.value)} /></label><div className="contract-buttons"><button className="primary-action" onClick={useAddress}><RefreshCw size={17} /> Use and sync</button><button className="secondary-action" onClick={restore}>Restore production default</button></div><div className="active-address">Active address · {shortAddress(getContractAddress())}</div>{getContractAddress() && <a className="explorer-link" href={`${EXPLORER_BASE}/${getContractAddress()}`} target="_blank" rel="noreferrer">View transactions in Explorer <ExternalLink size={15} /></a>}</div></section></main>;
}
