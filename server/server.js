// server/server.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { execFile } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");
const cors = require("cors");

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 3000;

// Allow all origins for dev, adjust in production
app.use(cors({ origin: true }));

// Multer config - store to OS temp dir
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, osTmpDir()),
    filename: (req, file, cb) => {
      const id = crypto.randomBytes(8).toString("hex");
      cb(null, `${Date.now()}-${id}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx files are allowed"));
    }
  }
});

function osTmpDir() {
  return require("os").tmpdir();
}

// POST /convert-to-pdf
app.post("/convert-to-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const xlsxPath = req.file.path;
  const outDir = path.dirname(xlsxPath);
  const baseName = path.basename(xlsxPath, path.extname(xlsxPath));
  const pdfPath = path.join(outDir, baseName + ".pdf");

  try {
    // Linux-compatible LibreOffice
    await execFileAsync("soffice", [
      "--headless",
      "--nologo",
      "--convert-to",
      "pdf:writer_pdf_Export",
      "--outdir",
      outDir,
      xlsxPath
    ], { timeout: 120000 });

    // Make sure PDF exists
    await fs.access(pdfPath);

    // Send PDF back
    const pdfBuffer = await fs.readFile(pdfPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${baseName}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("Conversion error:", err);
    res.status(500).json({ error: "Conversion failed", detail: err.message || err.toString() });
  } finally {
    // Cleanup temp files
    try { await fs.unlink(xlsxPath).catch(() => {}); } catch {}
    try { await fs.unlink(pdfPath).catch(() => {}); } catch {}
  }
});

// Health endpoint
app.get("/", (req, res) => res.send("XLSX -> PDF conversion service"));

// Start server
app.listen(PORT, () => {
  console.log(`Converter running on port ${PORT}`);
});
