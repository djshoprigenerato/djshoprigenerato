/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FF7F00",    // arancione logo
        secondary: "#00A000",  // verde logo
        dark: "#000000"        // nero
      }
    }
  },
  plugins: []
};
