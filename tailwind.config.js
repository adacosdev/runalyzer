/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        // Custom dark
        'bg-primary': '#050505',
        'bg-secondary': '#0A0A0A',
        'bg-card': '#111111',
        'neon-orange': '#FF6B00',
      },
      fontFamily: {
        display: ['Chakra Petch', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
