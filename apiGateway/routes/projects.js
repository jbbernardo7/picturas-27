var express = require("express");
var router = express.Router();

const axios = require("axios");

const https = require("https");
const fs = require("fs");

const multer = require("multer");
const FormData = require("form-data");

const auth = require("../auth/auth");

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
  cert: cert,
  key: key,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const projectsURL = "https://projects:9001/";

function forwardAxiosError(res, err, fallbackMsg) {
  const status = err.response?.status || 500;
  const data =
    err.response?.data ||
    (err.code === "ECONNREFUSED" ? "Projects service unavailable" : fallbackMsg);

  // reenviar versão se existir
  const v = err.response?.headers?.["x-project-version"];
  if (v) res.set("X-Project-Version", v);

  console.error("[API-GW]", status, fallbackMsg, {
    data: err.response?.data,
    message: err.message,
  });

  return res.status(status).jsonp(data);
}

// TODO Verify jwt

/*
Project structure
{
    "_id": Mongoose.type.id,
    "user_id": Mongoose.type.id,
    "name": String,
    "imgs": [Image Structure],
    "tools": [Tool Structure],
}

Image structure
{
    "_id": Mongoose.type.id,
    "og_uri": String,
    "new_uri": String
}

Tool structure
{
    "_id": Mongoose.type._id,
    "position": Number,
    "procedure": String,
    "params": Object
}

Post answer structure in case of success
{
    "acknowledged": Bool,
    "modifiedCount": Number,
    "upsertedId": null,
    "upsertedCount": Number,
    "matchedCount": Number
}
*/

/**
 * Note: auth.checkToken is a midleware used to verify JWT
 */

// listar links de um projeto (só dono) – protegido
router.get("/:user/:project/share", auth.checkToken, (req, res) => {
  axios
    .get(projectsURL + `${req.params.user}/${req.params.project}/share`, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

// criar link de partilha
router.post("/:user/:project/share", auth.checkToken, (req, res) => {
    const callerId = req.authUserId || req.params.user;
  axios
    .post(
      projectsURL + `${req.params.user}/${req.params.project}/share`,
      req.body,
      {
        httpsAgent,
        headers: { 
          Authorization: req.headers["authorization"], 
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      },
    )

    .then((resp) => {
          if (resp.headers?.["x-project-version"]) {
            res.set("X-Project-Version", resp.headers["x-project-version"]);
          }
          return res.status(201).jsonp(resp.data);
        })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

// resolver link de partilha (PÚBLICO – sem auth)
// devolve { projectId, ownerId, permission }
router.get("/share/:shareId", (req, res) => {
  axios
    .get(projectsURL + `share/${req.params.shareId}`, { httpsAgent })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "Error resolving share link"));
});

// obter projeto completo via shareId (PROTEGIDO – requer JWT)
router.get("/share/:shareId/project", auth.checkToken, (req, res) => {
  const callerId = req.authUserId;

  axios
    .get(projectsURL + `share/${req.params.shareId}/project`, {
      httpsAgent,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "Error getting shared project"));
});



// revogar link de partilha (dono, protegido)
router.delete("/:user/:project/share/:shareId", auth.checkToken, (req, res) => {
  const callerId = req.authUserId || req.params.user;

  axios
    .delete(
      projectsURL + `${req.params.user}/${req.params.project}/share/${req.params.shareId}`,
      {
        httpsAgent,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      }
    )
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});

/**
 * Get user's projects
 * @body Empty
 * @returns List of projects, each project has no information about it's images or tools
 */
router.get("/:user", auth.checkToken, function (req, res, next) {
  const callerId = req.authUserId || req.params.user;

  axios
    .get(projectsURL + `${req.params.user}`, {
      httpsAgent,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});

/**
 * Get user's project
 * @body Empty
 * @returns The required project
 */
router.get("/:user/:project", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .get(projectsURL + `${ownerId}/${req.params.project}`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});


/**
 * Get project image
 * @body Empty
 * @returns The image url
 */
router.get(
  "/:user/:project/img/:img",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .get(projectsURL + `${ownerId}/${req.params.project}/img/${req.params.img}`, {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      })
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
  }
);

/**
 * Get project images
 * @body Empty
 * @returns The project's images
 */
router.get("/:user/:project/imgs", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .get(projectsURL + `${ownerId}/${req.params.project}/imgs`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).send(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});


/**
 * Get project's processment result
 * @body Empty
 * @returns The required results, sent as a zip
 */
router.get(
  "/:user/:project/process",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .get(projectsURL + `${ownerId}/${req.params.project}/process`, {
        httpsAgent,
        responseType: "arraybuffer",
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      })
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
  }
);

  // Cancelar processamento de um projeto
router.delete("/:user/:project/process", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;


  axios
    .delete(projectsURL + `${ownerId}/${req.params.project}/process`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      //  reenviar versão se vier do projects-ms
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});


/**
 * Get project's processment result
 * @body Empty
 * @returns The required results, sent as [{img_id, img_name, url}]
 */
router.get(
  "/:user/:project/process/url",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .get(projectsURL + `${ownerId}/${req.params.project}/process/url`, {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      })
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
  }
);


/**
 * Create new user's project
 * @body { "name": String }
 * @returns Created project's data
 */
router.post("/:user", auth.checkToken, function (req, res, next) {
  axios
    .post(projectsURL + `${req.params.user}`, req.body, {
      httpsAgent: httpsAgent,
    })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
});

/**
 * Preview an image
 * @body Empty
 * @returns String indication preview is being processed
 */
router.post(
  "/:user/:project/preview/:img",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    const body = {
      ...req.body,
      runnerUserId: callerId,                         
    };

    axios
      .post(
        projectsURL +
          `${ownerId}/${req.params.project}/preview/${req.params.img}`,
        body,
        { 
          httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined, 
        
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      }
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
  }
);

/**
 * Add image to project
 * @body Empty
 * @file Image to be added
 * @returns Post answer structure in case of success
 */
router.post(
  "/:user/:project/img",
  upload.single("image"),
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    const data = new FormData();
    data.append("image", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    axios
      .post(
        projectsURL + `${ownerId}/${req.params.project}/img`,
        data,
        {
          headers: {
            ...data.getHeaders(),                     
            Authorization: req.headers["authorization"], 
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
          httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined, 
          
        }
      )
      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

/**
 * Add tool to project
 * @body { "procedure": String, "params": Object }
 * @returns Post answer structure in case of success
 */
router.post("/:user/:project/tool", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios.post(
    projectsURL + `${ownerId}/${req.params.project}/tool`,
    req.body,
    {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    }
  )

    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.status(201).jsonp(resp.data);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
});

/**
 * Reorder tools of a project
 * @body [{ "position": Number, "procedure": String, "params": Object }] (Position is a unique number between 0 and req.body.length - 1)
 * @returns Post answer structure in case of success
 */
router.post(
  "/:user/:project/reorder",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .post(
        projectsURL + `${ownerId}/${req.params.project}/reorder`,
        req.body,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.status(201).jsonp(resp.data);
      })
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
  }
);

/**
 * Generate request to process a project
 * @body Empty
 * @returns String indicating process request has been created
 */
router.post(
  "/:user/:project/process",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    const body = {
      ...req.body,
      runnerUserId: callerId,                         
    };

    axios
      .post(
        projectsURL + `${ownerId}/${req.params.project}/process`,
        body,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,

          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.status(201).jsonp(resp.data);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

/**
 * Update a specific project
 * @body { "name": String }
 * @returns Empty
 */
router.put("/:user/:project", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .put(projectsURL + `${ownerId}/${req.params.project}`, req.body, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined, 
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

/**
 * Update a tool from a project
 * @body { "params" : Object }
 * @returns Empty
 */
router.put(
  "/:user/:project/tool/:tool",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .put(
        projectsURL +
          `${ownerId}/${req.params.project}/tool/${req.params.tool}`,
        req.body,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
  }
);

/**
 * Delete a user's project
 * @body Empty
 * @returns Empty
 */
/**
 * Delete a user's project
 * @body Empty
 * @returns Empty
 */
router.delete("/:user/:project", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .delete(projectsURL + `${ownerId}/${req.params.project}`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

/**
 * Remove an image from a user's project
 * @body Empty
 * @returns Empty
 */
router.delete(
  "/:user/:project/img/:img",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .delete(
        projectsURL +
          `${ownerId}/${req.params.project}/img/${req.params.img}`,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

/**
 * Remove a tool from a user's project
 * @body Empty
 * @returns Empty
 */
router.delete(
  "/:user/:project/tool/:tool",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .delete(
        projectsURL +
          `${ownerId}/${req.params.project}/tool/${req.params.tool}`,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

// limpar tools + resultados + previews
router.post("/:user/:project/clear", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(
      projectsURL + `${ownerId}/${req.params.project}/clear`,
      {},
      {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      },
    )
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "Error clearing project"));
});

// ================== AI ASSISTANT ==================

// sugestões do assistente de IA para um projeto
router.post("/:user/:project/assistant/suggest", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(
      projectsURL + `${ownerId}/${req.params.project}/assistant/suggest`,
      req.body,
      {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      },
    )
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.status(200).jsonp(resp.data);
    })
    .catch((err) => forwardAxiosError(res, err, "Error generating assistant suggestions"));
});

// ================== FIM AI ASSISTANT ==================

// ================== PRESENCE (ACTIVE EDITORS) ==================

// heartbeat: manter editor ativo
router.post("/:user/:project/presence", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(
      projectsURL + `${ownerId}/${req.params.project}/presence`,
      {},
      {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      },
    )
    .then((resp) => res.status(204).send())
    .catch((err) => forwardAxiosError(res, err, "Error updating presence"));
});

// libertar slot
router.delete("/:user/:project/presence", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .delete(projectsURL + `${ownerId}/${req.params.project}/presence`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then(() => res.sendStatus(204))
    .catch((err) => forwardAxiosError(res, err, "Error releasing presence"));
});

router.post("/:user/:project/dirty", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(projectsURL + `${ownerId}/${req.params.project}/dirty`, req.body, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "Error setting dirty flag"));
});


// ================== END PRESENCE ==================

// ================== VIDEO UPLOAD (multipart, direct to storage) ==================
// init, complete and delete now go through the projects service (it knows the
// project type and records the video). sign, abort and url still go straight
// to img_storage, because they don't need any project knowledge.

// img_storage speaks plain HTTP on the internal Docker network.
const videoStorageURL = process.env.IMG_STORAGE_URL || "http://img_storage:11000";

const VIDEO_ID = /^[A-Za-z0-9_-]{1,64}$/;
const VIDEO_FILE_NAME = /^[A-Za-z0-9._-]{1,200}$/;
const VIDEO_MAX_PARTS = 10000;

function videoReject(res, status, message) {
  return res.status(status).jsonp({ error: message });
}

// auth.checkToken skips the "token user == URL user" comparison when ?share=
// is present. Video management is owner-only, so enforce the match here.
function requireVideoOwner(req, res, next) {
  const { user, project } = req.params;
  if (req.authUserId !== user) {
    return videoReject(res, 403, "Only the project owner can manage videos.");
  }
  if (!VIDEO_ID.test(user) || !VIDEO_ID.test(project)) {
    return videoReject(res, 400, "Invalid user or project id.");
  }
  next();
}

// sign / complete / abort receive bucket + key + uploadId from the client.
// Make sure they point inside this user's bucket and this project's prefix.
function requireOwnVideoUpload(req, res, next) {
  const { bucket, key, uploadId } = req.body || {};
  const { user, project } = req.params;

  if (bucket !== `user-${user}`) {
    return videoReject(res, 403, "Bucket does not belong to this user.");
  }
  if (
    typeof key !== "string" ||
    !key.startsWith(`${project}/`) ||
    key.includes("..")
  ) {
    return videoReject(res, 403, "Key does not belong to this project.");
  }
  if (typeof uploadId !== "string" || !uploadId) {
    return videoReject(res, 400, "Missing uploadId.");
  }
  next();
}

async function forwardVideo(res, call) {
  try {
    const r = await call();
    res.status(r.status).jsonp(r.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const data = err.response?.data || { error: "Storage service unavailable" };
    console.error("[API-GW][video]", status, err.message);
    res.status(status).jsonp(data);
  }
}

/**
 * Start a multipart upload (video projects only; checked by the projects service).
 * @body { contentType, size }
 * @returns { bucket, key, uploadId, partSize, partCount }
 */
router.post(
  "/:user/:project/video/init",
  auth.checkToken,
  requireVideoOwner,
  (req, res) => {
    const { contentType, size } = req.body || {};
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/video/init`,
        { contentType, size },
        {
          httpsAgent,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Caller-Id": req.authUserId,
          },
        }
      )
      .then((resp) => res.status(200).jsonp(resp.data))
      .catch((err) => forwardAxiosError(res, err, "Error starting video upload"));
  }
);

/**
 * Get a presigned URL for one part.
 * @body { bucket, key, uploadId, partNumber }
 * @returns { url }
 */
router.post(
  "/:user/:project/video/sign",
  auth.checkToken,
  requireVideoOwner,
  requireOwnVideoUpload,
  (req, res) => {
    const partNumber = Number(req.body.partNumber);
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > VIDEO_MAX_PARTS
    ) {
      return videoReject(
        res,
        400,
        `partNumber must be an integer between 1 and ${VIDEO_MAX_PARTS}.`,
      );
    }
    const { bucket, key, uploadId } = req.body;
    forwardVideo(res, () =>
      axios.post(`${videoStorageURL}/video/sign`, {
        bucket,
        key,
        uploadId,
        partNumber,
      }),
    );
  },
);

/**
 * Heartbeat while pieces are being sent, so the storage cleaner doesn't treat a
 * slow upload as abandoned.
 * @body { bucket, key, uploadId }
 */
router.post(
  "/:user/:project/video/touch",
  auth.checkToken,
  requireVideoOwner,
  requireOwnVideoUpload,
  (req, res) => {
    forwardVideo(res, () =>
      axios.post(`${videoStorageURL}/video/touch`, { uploadId: req.body.uploadId }),
    );
  },
);

/**
 * Finish the upload and attach the video to the project.
 * @body { bucket, key, uploadId, parts: [{ PartNumber, ETag }], name }
 * @returns 201 { _id, name, size, contentType, status } (+ X-Project-Version)
 */
router.post(
  "/:user/:project/video/complete",
  auth.checkToken,
  requireVideoOwner,
  requireOwnVideoUpload,
  (req, res) => {
    const { key, uploadId, parts, name } = req.body;
    if (
      !Array.isArray(parts) ||
      parts.length === 0 ||
      parts.length > VIDEO_MAX_PARTS
    ) {
      return videoReject(res, 400, "parts must be a non-empty array.");
    }
    const clean = [];
    for (const p of parts) {
      if (!Number.isInteger(p?.PartNumber) || typeof p?.ETag !== "string") {
        return videoReject(
          res,
          400,
          "Each part needs an integer PartNumber and a string ETag.",
        );
      }
      clean.push({ PartNumber: p.PartNumber, ETag: p.ETag });
    }

    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/video/complete`,
        { key, uploadId, parts: clean, name },
        {
          httpsAgent,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Caller-Id": req.authUserId,
          },
        }
      )
      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.status(201).jsonp(resp.data);
      })
      .catch((err) => forwardAxiosError(res, err, "Error completing video upload"));
  }
);

/**
 * Cancel the upload and free the parts already stored.
 * @body { bucket, key, uploadId }
 */
router.post(
  "/:user/:project/video/abort",
  auth.checkToken,
  requireVideoOwner,
  requireOwnVideoUpload,
  (req, res) => {
    const { bucket, key, uploadId } = req.body;
    forwardVideo(res, () =>
      axios.post(`${videoStorageURL}/video/abort`, { bucket, key, uploadId }),
    );
  },
);

/**
 * Remove a video from a project.
 * Needs the X-Project-Version header, like the other edit routes.
 */
router.delete(
  "/:user/:project/video/:video",
  auth.checkToken,
  requireVideoOwner,
  (req, res) => {
    if (!VIDEO_ID.test(req.params.video)) {
      return videoReject(res, 400, "Invalid video id.");
    }
    axios
      .delete(
        projectsURL +
          `${req.params.user}/${req.params.project}/video/${req.params.video}`,
        {
          httpsAgent,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": req.authUserId,
          },
        }
      )
      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
      .catch((err) => forwardAxiosError(res, err, "Error deleting video"));
  }
);

/**
 * Presigned playback URL (valid for 1 hour, supports Range requests).
 * The app normally gets this URL from GET /:user/:project (the `videos` array).
 * @returns { url }
 */
router.get(
  "/:user/:project/video/:stage/:name/url",
  auth.checkToken,
  requireVideoOwner,
  (req, res) => {
    const { user, project, stage, name } = req.params;
    if (!VIDEO_FILE_NAME.test(name)) {
      return videoReject(res, 400, "Invalid file name.");
    }
    forwardVideo(res, () =>
      axios.get(
        `${videoStorageURL}/image/public/${user}/${project}/${stage}/${name}`,
      ),
    );
  },
);

// ================== END VIDEO UPLOAD ==================

module.exports = router;