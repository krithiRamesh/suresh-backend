import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse-fork';

dotenv.config();
const app = express();

// Helper: Convert stream to Buffer
const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

// Helper: Extract text sections between headings
const extractSection = (text, heading, nextHeadings) => {
  const pattern = `${heading}[\\s\\S]*?(?=${nextHeadings.join('|')}|$)`;
  const regex = new RegExp(pattern, 'i');
  const match = text.match(regex);
  if (!match) return 'Not Found';
  return match[0].replace(new RegExp(`^${heading}`, 'i'), '').trim() || 'Not Found';
};

// GraphQL Schema
const typeDefs = `#graphql
  scalar Upload

  type ResumeProfile {
    id: ID!
    name: String
    email: String
    phone: String
    skills: [String]
    experience: String
    education: String
    certifications: String
    createdAt: String
  }

  type Query {
    getLatestProfile: ResumeProfile
  }

  type Mutation {
    uploadResume(file: Upload!): ResumeProfile
  }
`;

let latestProfile = null;

// GraphQL Resolvers
const resolvers = {
  Query: {
    getLatestProfile: () => latestProfile,
  },
  Mutation: {
    uploadResume: async (_, { file }) => {
      // Resolve file payload from graphql-upload
      const fileData = await (file.promise || file.file || file);

      if (!fileData || typeof fileData.createReadStream !== 'function') {
        throw new Error('Failed to resolve uploaded file stream.');
      }

      const stream = fileData.createReadStream();
      const buffer = await streamToBuffer(stream);

      // Clean ESM execution with pdf-parse-fork
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text || '';

      // Extract details via regex
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

      // Extract sections
      const experience = extractSection(text, 'WORK EXPERIENCE', ['EDUCATION', 'CERTIFICATIONS', 'PROJECTS', 'TECHNICAL SKILLS']);
      const education = extractSection(text, 'EDUCATION', ['CERTIFICATIONS', 'PROJECTS', 'WORK EXPERIENCE', 'TECHNICAL SKILLS']);
      const certifications = extractSection(text, 'CERTIFICATIONS', ['PROJECTS', 'WORK EXPERIENCE', 'EDUCATION', 'TECHNICAL SKILLS']);

      // Match skills against list
      const SKILLS_LIST = ['React', 'Node.js', 'JavaScript', 'TypeScript', 'Express', 'MongoDB', 'Tailwind', 'HTML', 'CSS', 'PostgreSQL', 'Git', 'Redux', 'GraphQL', 'Jest', 'AWS', 'Docker', 'REST'];
      const extractedSkills = SKILLS_LIST.filter((skill) => 
        new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
      );

      // ✅ Included ALL schema fields in the returned object!
      latestProfile = {
        id: Date.now().toString(),
        name: text.split('\n').find((line) => line.trim().length > 0) || 'Candidate',
        email: emailMatch ? emailMatch[0] : 'Not Found',
        phone: phoneMatch ? phoneMatch[0] : 'Not Found',
        skills: extractedSkills.length > 0 ? extractedSkills : ['Not Found'],
        experience: experience,
        education: education,
        certifications: certifications,
        createdAt: new Date().toISOString(),
      };

      return latestProfile;
    },
  },
};

// Middleware Setup
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 1 }));

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resumedb')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Error:', err));

app.use('/graphql', cors(), express.json(), expressMiddleware(server));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/graphql`);
});