import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7f3ea",
    description: "A local bead pattern generator MVP.",
    display: "standalone",
    icons: [
      {
        sizes: "any",
        src: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    name: "Bead Pattern Web",
    scope: "/",
    short_name: "Bead Pattern",
    start_url: "/",
    theme_color: "#5a7d62",
  };
}
