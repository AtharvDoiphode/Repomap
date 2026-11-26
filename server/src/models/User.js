import mongoose from 'mongoose';

const scanHistoryItemSchema = new mongoose.Schema(
  {
    repoKey: { type: String, required: true },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    stars: { type: Number, default: 0 },
    language: { type: String, default: 'Unknown' },
    healthScore: { type: Number, default: 0 },
    scannedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    scanHistory: [scanHistoryItemSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', userSchema);
