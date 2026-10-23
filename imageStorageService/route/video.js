const express = require("express");
const allowedStages = require("../utils/stages");
const v = require("../services/uploadVideo");

const router = express.Router();
router.use(express.json());

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
};

router.post("/init", wrap(async (req) => {
  const { userId, projectId, stage, contentType, size } = req.body;
  if (!allowedStages.includes(stage)) throw v.fail(400, "Estágio inválido.");
  return v.init(userId, projectId, stage, contentType, Number(size));
}));

router.post("/sign", wrap(async (req) => {
  const { bucket, key, uploadId, partNumber } = req.body;
  return { url: await v.signPart(bucket, key, uploadId, Number(partNumber)) };
}));

router.post("/complete", wrap(async (req) => {
  const { bucket, key, uploadId, parts } = req.body;
  const done = await v.complete(bucket, key, uploadId, parts);
  return { key, ...done };
}));

// Keeps an upload alive for the cleaner while its pieces are being sent.
router.post("/touch", wrap(async (req) => {
  v.touch(String(req.body.uploadId || ""));
  return { ok: true };
}));

router.post("/abort", wrap(async (req) => {
  const { bucket, key, uploadId } = req.body;
  await v.abort(bucket, key, uploadId);
  return { aborted: true };
}));

// Internal: store a video that a tool left on the shared volume (see storeFromDisk).
// Not exposed through the gateway or nginx.
router.post("/store", wrap(async (req) => {
  const { userId, projectId, stage, path: relPath } = req.body;
  if (!allowedStages.includes(stage)) throw v.fail(400, "Estágio inválido.");
  return v.storeFromDisk(userId, projectId, stage, relPath);
}));

module.exports = router;
