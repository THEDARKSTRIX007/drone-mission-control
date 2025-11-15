"use client";

import dynamic from "next/dynamic";

// Load Leaflet-Draw *client only* to avoid SSR issues
const PolygonDrawerClient = dynamic(() => import("./PolygonDrawerClient"), {
  ssr: false,
});

interface PolygonDrawerProps {
  onPolygonComplete: (polygon: number[][]) => void;
}

export default function PolygonDrawer(props: PolygonDrawerProps) {
  return <PolygonDrawerClient {...props} />;
}
