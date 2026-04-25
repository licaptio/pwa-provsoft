import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as procesador from "./procesador.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

app.post("/procesar", async (req, res) => {
  try {
    let resultado;

    if (typeof procesador.procesar === "function") {
      resultado = await procesador.procesar();
    } else if (typeof procesador.default === "function") {
      resultado = await procesador.default();
    } else {
      throw new Error("procesador.js no exporta una función procesar().");
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).json({
      ok: false,
      mensaje: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor PROVSOFT listo: http://localhost:${PORT}/index.html`);
});