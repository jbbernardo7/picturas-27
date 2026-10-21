const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");
const s3 = require("./s3Client");

const MAX_SECONDS = (Number(process.env.MAX_VIDEO_DURATION_MIN) || 10) * 60;
// Container timestamps are rarely exact; a 10:00 video may report 600.02 s.
const DURATION_TOLERANCE = 0.5;

// Codecs accepted for each container (RN5).
const CODECS = { mp4: ["h264"], mov: ["h264"], webm: ["vp8", "vp9"] };

// Error messages from UC-VID-001 (E4, E8, E9).
const MSG_CONTENT = "Invalid file content!";
const MSG_CODEC = "Invalid video codec!";
const MSG_DURATION = `File exceeds the maximum allowed duration (${MAX_SECONDS / 60} minutes).`;

function invalid(message, code) {
  const err = new Error(message);
  err.status = 422;
  err.code = code;
  return err;
}

// MP4 and MOV share the same box structure (ISO BMFF); WebM is EBML with doctype "webm".
function headerMatches(ext, head) {
  if (ext === "webm") {
    const ebml = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    return ebml && head.includes(Buffer.from("webm"));
  }
  const box = head.subarray(4, 8).toString("latin1");
  if (ext === "mp4") return box === "ftyp";
  return ["ftyp", "moov", "mdat", "wide", "free", "skip", "pnot"].includes(box);
}

function ffprobe(file) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file],
      { timeout: 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(invalid(MSG_CONTENT, "INVALID_CONTENT"));
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(invalid(MSG_CONTENT, "INVALID_CONTENT"));
        }
      },
    );
  });
}

/**
 * Downloads the stored video once, hashing it on the way, and checks that the
 * content matches the extension, the codec is allowed and the duration fits.
 * Throws a 422 error with the UC message when a check fails.
 */
async function inspectVideo(bucket, key) {
  const ext = path.extname(key).slice(1).toLowerCase();
  const tmp = path.join(os.tmpdir(), `video-${crypto.randomUUID()}.${ext}`);
  const hash = crypto.createHash("sha256");
  let head = Buffer.alloc(0);

  try {
    await pipeline(
      s3.getObject({ Bucket: bucket, Key: key }).createReadStream(),
      new Transform({
        transform(chunk, _enc, cb) {
          hash.update(chunk);
          if (head.length < 64) head = Buffer.concat([head, chunk]).subarray(0, 64);
          cb(null, chunk);
        },
      }),
      fs.createWriteStream(tmp),
    );

    if (!CODECS[ext] || !headerMatches(ext, head)) throw invalid(MSG_CONTENT, "INVALID_CONTENT");

    const probe = await ffprobe(tmp);
    const formats = String(probe.format?.format_name || "").split(",");
    const family = ext === "webm" ? "webm" : "mp4";
    if (!formats.includes(family)) throw invalid(MSG_CONTENT, "INVALID_CONTENT");

    const video = (probe.streams || []).find((s) => s.codec_type === "video");
    if (!video) throw invalid(MSG_CONTENT, "INVALID_CONTENT");
    if (!CODECS[ext].includes(video.codec_name)) throw invalid(MSG_CODEC, "INVALID_CODEC");

    const duration = Number(probe.format?.duration ?? video.duration);
    if (!Number.isFinite(duration)) throw invalid(MSG_CONTENT, "INVALID_CONTENT");
    if (duration > MAX_SECONDS + DURATION_TOLERANCE) throw invalid(MSG_DURATION, "TOO_LONG");

    return { sha256: hash.digest("hex"), duration, codec: video.codec_name };
  } finally {
    fs.promises.unlink(tmp).catch(() => {});
  }
}

module.exports = { inspectVideo };
