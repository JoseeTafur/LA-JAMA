const path = require("path");
const crypto = require("crypto");
const fs = require("fs-extra");
const slugify = require("slugify");

const ROOT = path.dirname(require.main?.filename ?? __filename);
const UPLOADS_DIR = path.join(ROOT, "uploads");

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
};

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|bmp|tiff)$/i;

function normalizeTipo(tipo) {
  return slugify(tipo, { lower: true, strict: true, trim: true });
}

function resolveDestDir(tipo, id) {
  const segments = [UPLOADS_DIR, normalizeTipo(tipo)];
  if (id) segments.push(id);
  return path.join(...segments);
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

function getExt(file) {
  return MIME_TO_EXT[file.mimetype] || path.extname(file.originalname) || ".bin";
}

async function listImagePaths(dir) {
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => IMAGE_EXT_RE.test(f))
    .map((f) => path.join(dir, f));
}

function buildUrl(req, tipo, id, filename) {
  const segments = ["uploads", normalizeTipo(tipo)];
  if (id) segments.push(id);
  segments.push(filename);
  return `${req.protocol}://${req.get("host")}/${segments.join("/")}`;
}

async function saveFiles(files, destDir, req, tipo, id) {
  return Promise.all(
    files.map(async (file) => {
      const filename = `${hashBuffer(file.buffer)}${getExt(file)}`;
      await fs.writeFile(path.join(destDir, filename), file.buffer);
      return {
        filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: buildUrl(req, tipo, id, filename),
      };
    })
  );
}

async function clearImages(dir) {
  const paths = await listImagePaths(dir);
  await Promise.all(paths.map((p) => fs.remove(p)));
  return paths.map((p) => path.basename(p));
}

module.exports = {
  UPLOADS_DIR,
  resolveDestDir,
  listImagePaths,
  buildUrl,
  saveFiles,
  clearImages,
};