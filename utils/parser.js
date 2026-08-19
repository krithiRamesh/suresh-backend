// utils/parser.js

const SKILLS_LIST = [
  'React', 'Node.js', 'JavaScript', 'TypeScript', 'Express', 'MongoDB', 
  'Tailwind', 'Python', 'Java', 'HTML', 'CSS', 'SQL', 'PostgreSQL', 
  'Git', 'Redux', 'GraphQL', 'Jest', 'Cypress', 'AWS', 'Docker', 'REST'
];

/**
 * Helper to safely escape special characters in skill names (e.g., C++, Node.js) for RegEx
 */
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extracts text between a target section heading and subsequent section headings
 */
const extractSection = (text, heading, nextHeadings) => {
  const pattern = `${heading}[\\s\\S]*?(?=${nextHeadings.join('|')}|$)`;
  const regex = new RegExp(pattern, 'i');
  const match = text.match(regex);
  
  if (!match) return 'N/A';
  
  // Strip out the heading text itself and clean whitespace
  return match[0].replace(new RegExp(`^${heading}`, 'i'), '').trim() || 'N/A';
};

export const parseResumeText = (text) => {
  // 1. Extract Contact Info & Basic Details
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  // 2. Extract Skills Safely
  const extractedSkills = SKILLS_LIST.filter((skill) => {
    const escaped = escapeRegExp(skill);
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });

  // 3. Extract Major Sections
  const experience = extractSection(text, 'WORK EXPERIENCE', ['EDUCATION', 'CERTIFICATIONS', 'PROJECTS', 'SKILLS']);
  const education = extractSection(text, 'EDUCATION', ['CERTIFICATIONS', 'PROJECTS', 'WORK EXPERIENCE', 'SKILLS']);
  const certifications = extractSection(text, 'CERTIFICATIONS', ['PROJECTS', 'WORK EXPERIENCE', 'EDUCATION', 'SKILLS']);

  return {
    name: lines.length > 0 ? lines[0] : 'N/A',
    email: emailMatch ? emailMatch[0] : 'N/A',
    phone: phoneMatch ? phoneMatch[0] : 'N/A',
    skills: extractedSkills.length > 0 ? extractedSkills : ['N/A'],
    experience,
    education,
    certifications,
  };
};