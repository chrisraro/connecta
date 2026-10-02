import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

const here = path.resolve(".");
const repo = path.resolve("..");
const mod = (name: string) => path.join(here, "node_modules", name);

Config.setVideoImageFormat("jpeg");
Config.overrideWebpackConfig((config) => {
  const withTailwind = enableTailwind(config);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        "@": repo,
        react: mod("react"),
        "react-dom": mod("react-dom"),
        "react/jsx-runtime": mod("react/jsx-runtime.js"),
        "lucide-react": mod("lucide-react"),
        "qrcode.react": mod("qrcode.react"),
        "next/image": path.join(here, "src/shims/next-image.tsx"),
      },
    },
  };
});
