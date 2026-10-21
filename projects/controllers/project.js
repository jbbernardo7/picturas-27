var Project = require("../models/project");
const ProjectModel = require("../models/project");

// DELETE condicional por versão
module.exports.deleteIfVersion = async (user_id, project_id, expectedVersion) => {
  const res = await Project.deleteOne({
    user_id: user_id,
    _id: project_id,
    version: expectedVersion,
  });

  return res.deletedCount === 1;
};

// Adicionar share link (atómico + versão)
module.exports.addShareLinkIfVersion = async (
  user_id,
  project_id,
  newLink,
  expectedVersion
) => {
  return await Project.findOneAndUpdate(
    { user_id: user_id, _id: project_id, version: expectedVersion },
    { $push: { sharedLinks: newLink }, $inc: { version: 1 } },
    { new: true }
  ).exec();
};

// Revogar share link (atómico + versão)
module.exports.revokeShareLinkIfVersion = async (
  user_id,
  project_id,
  shareId,
  expectedVersion
) => {
  return await Project.findOneAndUpdate(
    {
      user_id: user_id,
      _id: project_id,
      version: expectedVersion,
      "sharedLinks.id": shareId,
    },
    { $set: { "sharedLinks.$.revoked": true }, $inc: { version: 1 } },
    { new: true }
  ).exec();
};

module.exports.getAll = async (user_id) => {
  return await Project.find({ user_id: user_id }).sort({ _id: 1 }).exec();
};

module.exports.getOne = async (user_id, project_id) => {
  return await Project.findOne({ user_id: user_id, _id: project_id }).exec();
};

module.exports.create = async (project) => {
  return await Project.create(project);
};

module.exports.update = (user_id, project_id, project) => {
  return Project.updateOne({ user_id: user_id, _id: project_id }, project);
};

module.exports.delete = (user_id, project_id) => {
  return Project.deleteOne({ user_id: user_id, _id: project_id });
};

// Devolve o projeto que contém este shareId
module.exports.getOneByShareId = (shareId) =>
  Project.findOne({ "sharedLinks.id": shareId }).exec();

module.exports.updateIfVersion = async (user_id, project_id, project, expectedVersion) => {
  const raw = project.toObject ? project.toObject() : project;

  // remove campos que não se quer "setar"
  const { _id, user_id: _uid, version, __v, sharedLinks, ...rest } = raw;

  return await Project.findOneAndUpdate(
    { user_id: user_id, _id: project_id, version: expectedVersion },
    { $set: rest, $inc: { version: 1 } },
    { new: true } // devolve documento já com versão incrementada
  ).exec();
};

module.exports.updateRaw = async (user_id, project_id, update) => {
  return await ProjectModel.updateOne(
    { user_id, _id: project_id },
    update
  ).exec();
};

// Adiciona um vídeo (atómico) a um projeto do tipo "video" e torna-o visível (pending=false).
// Sem pré-condição de versão: um upload pode demorar minutos e não deve ser rejeitado
// só porque a versão mudou entretanto. A versão é incrementada na mesma.
module.exports.addVideo = async (user_id, project_id, video) => {
  return await Project.findOneAndUpdate(
    { user_id: user_id, _id: project_id, type: "video" },
    { $push: { videos: video }, $set: { pending: false }, $inc: { version: 1 } },
    { new: true }
  ).exec();
};

// Apaga projetos de vídeo que ficaram pendentes (nenhum vídeo carregado) há mais de maxAgeMs.
module.exports.deleteStalePending = async (user_id, maxAgeMs) => {
  const projects = await Project.find({
    user_id: user_id,
    pending: true,
    "videos.0": { $exists: false },
  }).exec();
  const cutoff = Date.now() - maxAgeMs;
  const stale = projects.filter((p) => p._id.getTimestamp().getTime() < cutoff);
  if (stale.length > 0) {
    await Project.deleteMany({ _id: { $in: stale.map((p) => p._id) }, pending: true }).exec();
  }
  return stale.length;
};