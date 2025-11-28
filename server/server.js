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

// allow your frontend origin, or use '*' for local/dev
app.use(cors({
  origin: true // adjust to specific origin in production
}));

// Multer config - store to OS temp dir
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, osTmpDir()),
    filename: (req, file, cb) => {
      const id = crypto.randomBytes(8).toString("hex");
      cb(null, `${Date.now()}-${id}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB max (adjust as needed)
  },
  fileFilter: (req, file, cb) => {
    // accept only xlsx
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      || file.originalname.endsWith(".xlsx")) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx files are allowed"));
    }
  }
});

function osTmpDir() {
  return require("os").tmpdir();
}

// Endpoint: POST /convert-to-pdf
// Expects form-data with field 'file' (the .xlsx)
app.post("/convert-to-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const xlsxPath = req.file.path;
  const outDir = path.dirname(xlsxPath);
  // LibreOffice will create a PDF with same base filename, but different ext
  const baseName = path.basename(xlsxPath, path.extname(xlsxPath));
  const pdfPath = path.join(outDir, baseName + ".pdf");

  try {
    // Convert with LibreOffice headless
    // Note: for Windows replace 'soffice' with the full path to soffice.exe
    // Add '--convert-to pdf:writer_pdf_Export' for explicit exporter if desired
    await execFileAsync("C:\\Program Files\\LibreOffice\\program\\soffice.exe", [
      "--headless",
      "--invisible",
      "--nocrashreport",
      "--nodefault",
      "--nolockcheck",
      "--nologo",
      "--convert-to", "pdf:writer_pdf_Export",
      "--outdir", outDir,
      xlsxPath
    ], { timeout: 120000 });

    // Make sure the file exists
    await fs.access(pdfPath);

    // Stream the PDF back to client as attachment
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${baseName}.pdf"`);

    const pdfBuffer = await fs.readFile(pdfPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${baseName}.pdf"`);
    res.send(pdfBuffer);

    // When response finishes, clean up files
    res.on("finish", async () => {
      try {
        await fs.unlink(xlsxPath).catch(() => { });
        await fs.unlink(pdfPath).catch(() => { });
      } catch (cleanupErr) {
        console.warn("Cleanup error:", cleanupErr);
      }
    });

  } catch (err) {
    console.error("Conversion error:", err);
    // attempt cleanup
    try { await fs.unlink(xlsxPath).catch(() => { }); } catch { }
    try { await fs.unlink(pdfPath).catch(() => { }); } catch { }
    res.status(500).json({ error: "Conversion failed", detail: err.message || err.toString() });
  }
});

// simple health endpoint
app.get("/", (req, res) => res.send("XLSX -> PDF conversion service"));

// start
app.listen(PORT, () => {
  console.log(`Converter running on port ${PORT}`);
});
