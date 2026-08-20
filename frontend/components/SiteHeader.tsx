"use client";

import Link from "next/link";
import { ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { connectWallet, EXPLORER_BASE, getContractAddress, shortAddress } from "../lib/genlayer";

export function SiteHeader() {
  const [wallet, setWallet] = useState("");
  const [contract, setContract] = useState("");
  useEffect(() => setContract(getContractAddress()), []);
  async function connect() {
    try { setWallet(await connectWallet()); } catch (error) { alert(error instanceof Error ? error.message : "Wallet connection failed."); }
  }
  return (
    <header className="site-header">
      <Link href="/" className="brand"><span className="brand-mark"><ShieldCheck size={20} /></span><span>EventPass <b>Escrow</b></span></Link>
      <nav aria-label="Primary navigation">
        <Link href="/#board">Pass board</Link><Link href="/#protocol">Protocol</Link><Link href="/passes/new">Open pass</Link><Link href="/contract">Contract</Link>
      </nav>
      <div className="header-actions">
        {contract && <a className="contract-chip" href={`${EXPLORER_BASE}/${contract}`} target="_blank" rel="noreferrer">{shortAddress(contract)} <ExternalLink size={13} /></a>}
        <button className="wallet-button" onClick={connect}><Wallet size={17} />{wallet ? shortAddress(wallet) : "Connect wallet"}</button>
      </div>
    </header>
  );
}
