"use client";

import dynamic from "next/dynamic";

const OnChainImageNFT = dynamic(() => import("./page-client"), { ssr: false });

export default function Page() {
  return <OnChainImageNFT />;
}   
