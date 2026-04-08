export interface MiniProgramShell {
  brand: string;
  defaultRoute: string;
  pages: string[];
  theme: {
    background: string;
    accent: string;
    foreground: string;
  };
}

export function createMiniProgramApp(): MiniProgramShell {
  return {
    brand: "糖蟹",
    defaultRoute: "pages/home/index",
    pages: ["pages/home/index", "pages/task-detail/index"],
    theme: {
      background: "warm-gradient",
      accent: "amber",
      foreground: "ink",
    },
  };
}

export default createMiniProgramApp();
