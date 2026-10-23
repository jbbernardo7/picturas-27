const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  type: { type: String, required: true },
  file_name: { type: String, required: true },
  img_key: { type: String, required: true },
  img_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  project_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  token: { type: Number, default: 0, index: true },
  // type "frames" (UC-VID-003): where the extracted frames were stored
  dest_project_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  dest_user_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  frame_count: { type: Number, default: 0 },
});

module.exports = mongoose.model("result", resultSchema);
