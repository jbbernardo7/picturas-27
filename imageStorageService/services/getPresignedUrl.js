const s3 = require("./s3Client");

// Presigned URL reachable only inside the Docker network (http://seaweedfs:9000/...),
// for services that download the image themselves.
async function getInternalUrl(userId, projectId, stage, imageName) {
  const params = {
    Bucket: `user-${userId}`,
    Key: `${projectId}/${stage}/${imageName}`,
    Expires: 60 * 60,
  };

  try {
    return await s3.getSignedUrlPromise("getObject", params);
  } catch (error) {
    console.error("Erro ao gerar URL presignada:", error.message);
    throw error;
  }
}

// Rewrites a presigned URL's host from the internal S3 endpoint to the nginx /s3
// proxy path, so the browser can use it. The signature lives in the path and query,
// which are unchanged. Works for any presigned URL (download or upload part).
function toPublicUrl(url) {
  const internal = `http://${process.env.S3_ENDPOINT || "seaweedfs:9000"}`;
  return url.replace(internal, process.env.FRONTEND_URL + "/s3");
}

// Same presigned URL as getInternalUrl, but loadable by the browser.
async function getPublicUrl(userId, projectId, stage, imageName) {
  return toPublicUrl(await getInternalUrl(userId, projectId, stage, imageName));
}

module.exports = { getInternalUrl, getPublicUrl, toPublicUrl };
