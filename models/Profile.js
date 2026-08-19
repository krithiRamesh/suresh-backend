import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'N/A' },
    email: { type: String, default: 'N/A' },
    phone: { type: Number, default: 'N/A' },
    skills: { type: [String], default: [] },
   experience: { type: String, default: '' },
    education: { type: String, default: '' },
    certifications: { type: String, default: '' },
  },
  { timestamps: true } // Auto-creates createdAt and updatedAt
);

export default mongoose.model('Profile', profileSchema);