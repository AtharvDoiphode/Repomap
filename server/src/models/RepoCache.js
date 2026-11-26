import mongoose from 'mongoose';

const fileItemSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const checkItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    passed: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
  },
  { _id: false }
);

const nodeItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    folder: { type: String, default: '.' },
    extension: { type: String, default: '' },
    size: { type: Number, default: 0 },
    inDegree: { type: Number, default: 0 },
    outDegree: { type: Number, default: 0 },
  },
  { _id: false }
);

const edgeItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
  },
  { _id: false }
);

const repoCacheSchema = new mongoose.Schema(
  {
    repoKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    branch: { type: String, default: 'main' },
    description: { type: String, default: '' },
    stars: { type: Number, default: 0 },
    language: { type: String, default: 'Unknown' },
    files: [fileItemSchema],
    techStack: [{ type: String }],
    healthScore: {
      score: { type: Number, default: 0 },
      checks: [checkItemSchema],
    },
    nodes: [nodeItemSchema],
    edges: [edgeItemSchema],
    circularEdgeIds: [{ type: String }],
    cycles: [[{ type: String }]],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24-hour automatic TTL deletion by MongoDB
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('RepoCache', repoCacheSchema);
