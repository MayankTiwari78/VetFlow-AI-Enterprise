/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns:{
        'auto':'repeat(auto-fill, minmax(200px, 1fr))'
      },
      colors:{
        'primary':'#0F6F85',
        'teal':'#0C8F8C',
        'ink':'#153048',
        'mist':'#F3F8FA',
        'line':'#D7E5E9'
      }
    },
  },
  plugins: [],
}
