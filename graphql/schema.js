import { createRequire } from 'module';
import { GraphQLUpload } from 'graphql-upload-ts';
import Profile from '../models/Profile.js';
import { parseResumeText } from '../utils/parser.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export const typeDefs = `#graphql
  scalar Upload

  type Profile {
    id: ID!
    name: String
    email: String
    phone: Number
    skills: [String]
    experience: String    
    education: String      
    certifications: String 
    createdAt: String
  }

  type Query {
    getLatestProfile: Profile
  }

  type Mutation {
    uploadResume(file: Upload!): Profile!
  }
`;

export const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    getLatestProfile: async () => Profile.findOne().sort({ createdAt: -1 }),
  },
  Mutation: {
    uploadResume: async (_, { file }) => {
      const { createReadStream } = await file;
      const stream = createReadStream();
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const parsedPdf = await pdfParse(buffer);
      const extractedData = parseResumeText(parsedPdf.text);

      const newProfile = new Profile(extractedData);
      await newProfile.save();
      return newProfile;
    },
  },
};