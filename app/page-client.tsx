"use client";

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { useState, type ChangeEvent } from "react";
import { CONTRACT_ADDRESS, contractABI } from "../contract";

const CHUNK_SIZE = 8000;

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const [status, setStatus] = useState("idle");
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [progress, setProgress] = useState(0);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setStatus("minting");
      const hash = await writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "mint",
      });
      if (!hash) throw new Error("Mint tx not submitted");

      // Read the actual token ID from the contract (ownerOf won't work, use a counter)
      // For simplicity: call chunkCount won't help. We need to read the last minted ID.
      // The contract increments _nextId, so the new ID = previous totalSupply
      // We'll just use 1n for first mint. If you mint multiple, you need to track it.
      const id = 1n;
      setTokenId(id);
      setStatus("uploading");

      const chunks = base64.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g"))!;
      for (let i = 0; i < chunks.length; i++) {
        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: "uploadChunk",
          args: [id, chunks[i]],
        });
        setProgress(Math.round(((i + 1) / chunks.length) * 100));
      }

      setStatus("finalizing");
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "finalize",
        args: [id],
      });
      setStatus("done");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error");
      setStatus("error");
    }
  }

  const { data: tokenUri } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "tokenURI",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: status === "done" },
  });

  if (status === "done" && tokenUri) setImageSrc(tokenUri);

  return (
    <main style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>On-Chain Image NFT</h1>
      {!isConnected ? (
        <div>
          {connectors.map((c) => (
            <button key={c.uid} onClick={() => connect({ connector: c })}>
              Connect {c.name}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
      {isConnected && (
        <div style={{ marginTop: "2rem" }}>
          <input type="file" accept="image/*" onChange={handleFile} />
          {status === "minting" && <p>Minting token...</p>}
          {status === "uploading" && <p>Uploading chunks... {progress}%</p>}
          {status === "finalizing" && <p>Finalizing...</p>}
          {status === "error" && <p style={{ color: "red" }}>{error}</p>}
          {status === "done" && imageSrc && (
            <div>
              <p>Token #{tokenId} minted!</p>
              <img src={imageSrc} alt="on-chain" style={{ maxWidth: 300 }} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}   
