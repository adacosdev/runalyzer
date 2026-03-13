/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Zonas metabólicas - Luis del Águila
        'zone-1': '#10B981', // Verde - grasas/rodaje suave
        'zone-2': '#F59E0B', // Naranja - umbral lactato
        'zone-3': '#EF4444', // Rojo - VO2Max
        // Estados
        'drift-ok': '#10B981',
        'drift-warning': '#F59E0B', 
        'drift-bad': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
