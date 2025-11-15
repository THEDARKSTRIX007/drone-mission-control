"use client";

import dynamic from "next/dynamic";

// Load react-leaflet *client only* to avoid SSR issues
const LeafletMap = dynamic(() => import("./MapClient"), {
  ssr: false,
});

interface MapProps {
  polygon?: number[][];
}

export default function Map(props: MapProps) {
  return <LeafletMap {...props} />;
}
