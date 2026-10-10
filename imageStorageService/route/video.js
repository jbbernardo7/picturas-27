const express = require("express");
const allowedStages = require("../utils/stages");
const v = require("../services/uploadVideo");

const router = express.Router();
router.use(express.json());

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
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
  await v.complete(bucket, key, uploadId, parts);
  return { key };
}));

router.post("/abort", wrap(async (req) => {
  const { bucket, key, uploadId } = req.body;
  await v.abort(bucket, key, uploadId);
  return { aborted: true };
}));

module.exports = router;
