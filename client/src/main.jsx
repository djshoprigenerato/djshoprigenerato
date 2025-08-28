import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./index.css"   // <-- IMPORTANTISSIMO: carica gli stili globali

createRoot(document.getElementById("root")).render(<App />)
