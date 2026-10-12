const s3 = require("./s3Client");
const createBucket = require("./createBucket");
const { toPublicUrl } = require("./getPresignedUrl");
const { v4: uuidv4 } = require("uuid");

const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX_BYTES = (Number(process.env.MAX_VIDEO_SIZE_MB) || 500) * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024; // S3 minimum is 5 MB, except for the last part

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function init(userId, projectId, stage, contentType, size) {
  const ext = VIDEO_TYPES[contentType];
  if (!ext) throw fail(415, "Tipo de vídeo não suportado.");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    throw fail(413, "Tamanho inválido ou acima do máximo.");
  }

  const bucket = `user-${userId}`;
  await createBucket(bucket);
  const key = `${projectId}/${stage}/${uuidv4()}.${ext}`;

  const { UploadId } = await s3
    .createMultipartUpload({ Bucket: bucket, Key: key, ContentType: contentType })
    .promise();

  return { bucket, key, uploadId: UploadId, partSize: PART_SIZE, partCount: Math.ceil(size / PART_SIZE) };
}

async function signPart(bucket, key, uploadId, partNumber) {
  const url = await s3.getSignedUrlPromise("uploadPart", {
    Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber, Expires: 3600,
  });
  return toPublicUrl(url);
}

async function complete(bucket, key, uploadId, parts) {
  // The browser could upload more than it declared, so check the real total.
  const { Parts } = await s3.listParts({ Bucket: bucket, Key: key, UploadId: uploadId }).promise();
  const total = Parts.reduce((n, p) => n + p.Size, 0);
  if (total > MAX_BYTES) {
    await abort(bucket, key, uploadId);
    throw fail(413, "Vídeo excede o tamanho máximo.");
  }
  const done = await s3
    .completeMultipartUpload({
      Bucket: bucket, Key: key, UploadId: uploadId,
      MultipartUpload: { Parts: parts }, // [{ PartNumber, ETag }]
    })
    .promise();
  return { ...done, size: total };
}

function abort(bucket, key, uploadId) {
  return s3.abortMultipartUpload({ Bucket: bucket, Key: key, UploadId: uploadId }).promise();
}

module.exports = { init, signPart, complete, abort, fail };
