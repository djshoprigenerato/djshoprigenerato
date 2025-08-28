import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./index.css"          // 👈 IMPORTANTE: importa i tuoi stili globali

const root = createRoot(document.getElementById("root"))
root.render(<App />)
