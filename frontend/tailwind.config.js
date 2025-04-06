export const content = [
  "./index.html",
  "./src/**/*.{ts,tsx}", // ✅ только нужные файлы
  "./components/**/*.{ts,tsx}", // если есть
];
export const theme = {
  extend: {
    colors: {
      background: "var(--background)",
      panel: "var(--panel)",
      accent: "var(--accent)",
      text: "var(--text)",
      border: "var(--border)",
    },
  },
};
export const plugins = [];
