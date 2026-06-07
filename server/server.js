const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

const { UPLOADS_DIR, resolveDestDir, listImagePaths, saveFiles, clearImages } = require("./util");

const app = express();
const PORT = 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Solo se permiten imágenes"));
  },
});

const requireFiles = (req, res, next) =>
  req.files?.length ? next() : res.status(400).json({ error: "Campo 'image' requerido" });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

const router = express.Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { tipo, id } = req.params;
  const destDir = resolveDestDir(tipo, id);

  if (!(await fs.pathExists(destDir)))
    return res.status(404).json({ error: "Directorio no encontrado" });

  const images = await Promise.all(
    (await listImagePaths(destDir)).map(async (p) => {
      const { size } = await fs.stat(p);
      const filename = path.basename(p);
      const segments = ["uploads", tipo, id, filename].filter(Boolean);
      return { filename, size, url: `${req.protocol}://${req.get("host")}/${segments.join("/")}` };
    })
  );

  res.json({ success: true, count: images.length, images });
});

router.post("/", upload.array("image"), requireFiles, async (req, res) => {
  const { tipo, id } = req.params;
  const destDir = resolveDestDir(tipo, id);
  await fs.ensureDir(destDir);
  const uploaded = await saveFiles(req.files, destDir, req, tipo, id);
  res.status(201).json({ success: true, uploaded });
});

router.put("/", upload.array("image"), requireFiles, async (req, res) => {
  const { tipo, id } = req.params;
  const destDir = resolveDestDir(tipo, id);
  await fs.ensureDir(destDir);
  const [deleted, uploaded] = await Promise.all([
    clearImages(destDir),
    saveFiles(req.files, destDir, req, tipo, id),
  ]);
  res.json({ success: true, deleted, uploaded });
});

router.delete("/", async (req, res) => {
  const { tipo, id } = req.params;
  const destDir = resolveDestDir(tipo, id);

  if (!(await fs.pathExists(destDir)))
    return res.status(404).json({ error: "Directorio no encontrado" });

  const { filename, filenames } = req.body ?? {};
  const targets = filename
    ? [filename]
    : Array.isArray(filenames) && filenames.length
    ? filenames
    : null;

  if (!targets) {
    const deleted = await clearImages(destDir);
    return res.json({ success: true, deleted, notFound: [] });
  }

  const results = await Promise.allSettled(
    targets.map(async (name) => {
      const safe = path.basename(name);
      const filePath = path.join(destDir, safe);
      if (!(await fs.pathExists(filePath))) throw new Error(safe);
      await fs.remove(filePath);
      return safe;
    })
  );

  const deleted = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const notFound = results.filter((r) => r.status === "rejected").map((r) => r.reason.message);

  res.json({ success: true, deleted, notFound });
});

app.use("/upload/:tipo", router);
app.use("/upload/:tipo/:id", router);

app.use((err, _req, res, _next) => {
  const status = err instanceof multer.MulterError ? 400 : 500;
  res.status(status).json({ error: err.message });
});

fs.ensureDirSync(UPLOADS_DIR);

app.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
  console.log(`📁 ${UPLOADS_DIR}`);
});

module.exports = app;