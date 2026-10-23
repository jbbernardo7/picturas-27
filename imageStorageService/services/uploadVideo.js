const s3 = require("./s3Client");
const createBucket = require("./createBucket");
const { toPublicUrl } = require("./getPresignedUrl");
const { inspectVideo } = require("./inspectVideo");
const { v4: uuidv4 } = require("uuid");

const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX_MB = Number(process.env.MAX_VIDEO_SIZE_MB) || 500;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024; // S3 minimum is 5 MB, except for the last part

// Error messages from UC-VID-001 (E2, E3).
const MSG_TYPE = "Invalid file type! Accepted formats: MP4, WEBM, MOV.";
const MSG_SIZE = `File exceeds the maximum allowed size (${MAX_MB} MB).`;

function fail(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

// Last time the client showed signs of life for each upload (init, sign, touch).
// The cleaner uses it to tell a slow upload from an abandoned one.
const lastSeen = new Map();
const touch = (uploadId) => lastSeen.set(uploadId, Date.now());

async function init(userId, projectId, stage, contentType, size) {
  const ext = VIDEO_TYPES[contentType];
  if (!ext) throw fail(415, MSG_TYPE, "INVALID_TYPE");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    throw fail(413, MSG_SIZE, "TOO_LARGE");
  }

  const bucket = `user-${userId}`;
  await createBucket(bucket);
  const key = `${projectId}/${stage}/${uuidv4()}.${ext}`;

  const { UploadId } = await s3
    .createMultipartUpload({ Bucket: bucket, Key: key, ContentType: contentType })
    .promise();
  touch(UploadId);

  return { bucket, key, uploadId: UploadId, partSize: PART_SIZE, partCount: Math.ceil(size / PART_SIZE) };
}

async function signPart(bucket, key, uploadId, partNumber) {
  touch(uploadId);
  const url = await s3.getSignedUrlPromise("uploadPart", {
    Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber, Expires: 3600,
  });
  return toPublicUrl(url);
}

/**
 * Joins the parts, then checks the stored file (content, codec, duration) and
 * hashes it. A file that fails a check is deleted, so nothing invalid is kept.
 */
async function complete(bucket, key, uploadId, parts) {
  touch(uploadId);
  // The browser could upload more than it declared, so check the real total.
  const { Parts } = await s3.listParts({ Bucket: bucket, Key: key, UploadId: uploadId }).promise();
  const total = Parts.reduce((n, p) => n + p.Size, 0);
  if (total > MAX_BYTES) {
    await abort(bucket, key, uploadId);
    throw fail(413, MSG_SIZE, "TOO_LARGE");
  }
  await s3
    .completeMultipartUpload({
      Bucket: bucket, Key: key, UploadId: uploadId,
      MultipartUpload: { Parts: parts }, // [{ PartNumber, ETag }]
    })
    .promise();
  lastSeen.delete(uploadId);

  let info;
  try {
    info = await inspectVideo(bucket, key);
  } catch (err) {
    await s3.deleteObject({ Bucket: bucket, Key: key }).promise().catch(() => {});
    throw err;
  }
  return { size: total, sha256: info.sha256, duration: info.duration, codec: info.codec };
}

function abort(bucket, key, uploadId) {
  lastSeen.delete(uploadId);
  return s3.abortMultipartUpload({ Bucket: bucket, Key: key, UploadId: uploadId }).promise();
}

// ---- Cleanup of abandoned uploads (REQ-VID-UPLOAD-022: <= 60 s) ----

const IDLE_MS = 45 * 1000; // no sign of life for this long = abandoned
const SWEEP_MS = 15 * 1000; // so an upload is cleaned at most ~60 s after it stops

async function sweepAbandoned() {
  const now = Date.now();
  const { Buckets = [] } = await s3.listBuckets().promise();
  for (const { Name } of Buckets) {
    if (!Name.startsWith("user-")) continue;
    let uploads = [];
    try {
      ({ Uploads: uploads = [] } = await s3.listMultipartUploads({ Bucket: Name }).promise());
    } catch {
      continue;
    }
    for (const u of uploads) {
      let last = Math.max(lastSeen.get(u.UploadId) || 0, new Date(u.Initiated).getTime() || 0);
      try {
        const { Parts = [] } = await s3
          .listParts({ Bucket: Name, Key: u.Key, UploadId: u.UploadId })
          .promise();
        for (const p of Parts) last = Math.max(last, new Date(p.LastModified).getTime() || 0);
      } catch {}
      if (now - last > IDLE_MS) {
        await abort(Name, u.Key, u.UploadId).catch(() => {});
        console.log(`[video] aborted abandoned upload ${Name}/${u.Key}`);
      }
    }
  }
}

function startCleaner() {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await sweepAbandoned();
    } catch (err) {
      console.error("[video] cleanup failed:", err.message);
    } finally {
      running = false;
    }
  }, SWEEP_MS).unref();
}

module.exports = { init, signPart, complete, abort, touch, fail, startCleaner, MAX_MB };
