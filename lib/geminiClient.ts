import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp" // Using Gemini 2.5 Flash (experimental model)
});

// Interface for parsed resume data
export interface ParsedResumeData {
  skills: string[];
  experience: {
    company: string;
    position: string;
    duration: string;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    year: string;
    cgpa?: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    year: string;
    validity?: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
  summary: string;
  suggestedQuestions: {
    question: string;
    category: string;
    difficulty: string;
  }[];
}

// Function to parse resume content using Gemini
export async function parseResumeWithGemini(resumeText: string): Promise<ParsedResumeData> {
  try {
    const prompt = `Parse this resume and return ONLY valid JSON with this exact structure:

{
  "skills": ["JavaScript", "React", "Node.js"],
  "experience": [
    {
      "position": "Software Engineer",
      "company": "TechCorp",
      "duration": "2021-2023",
      "description": "Developed web applications"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "institution": "University",
      "field": "Computer Science",
      "year": "2020",
      "cgpa": "8.5/10.0"
    }
  ],
  "certifications": [
    {
      "name": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "year": "2023",
      "validity": "2026"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["React", "Node.js"]
    }
  ],
  "summary": "Brief summary of the candidate",
  "suggestedQuestions": [
    {
      "question": "Tell me about your experience with [specific technology from skills]",
      "category": "technical",
      "difficulty": "medium"
    },
    {
      "question": "Describe a challenging project you worked on using [relevant technologies]",
      "category": "project",
      "difficulty": "hard"
    },
    {
      "question": "How do you approach debugging and problem-solving in [specific technology]?",
      "category": "problem_solving",
      "difficulty": "medium"
    },
    {
      "question": "What's your experience with [database/cloud technology from skills]?",
      "category": "technical",
      "difficulty": "easy"
    },
    {
      "question": "Walk me through a time when you had to learn a new technology quickly",
      "category": "behavioral",
      "difficulty": "medium"
    }
  ]
}

Resume:
${resumeText}

Return only the JSON object, no other text.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini raw response:', text);
    
    // Clean the response text to extract JSON
    console.log('Raw Gemini response:', text);
    
    // Try to find JSON in the response
    let jsonText = text;
    
    // Look for JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // If no JSON object found, try to extract from code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        console.error('No JSON found in response:', text);
        throw new Error('No valid JSON found in Gemini response');
      }
    }
    
    console.log('Extracted JSON text:', jsonText);
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('JSON text that failed to parse:', jsonText);
      
      // Try to fix common JSON issues
      try {
        // Remove any trailing commas
        const fixedJson = jsonText.replace(/,(\s*[}\]])/g, '$1');
        parsedData = JSON.parse(fixedJson);
        console.log('Successfully parsed after fixing trailing commas');
      } catch (secondError) {
        throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
    
    // Validate the parsed data structure
    return {
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
      projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
      summary: parsedData.summary || '',
      suggestedQuestions: Array.isArray(parsedData.suggestedQuestions) ? parsedData.suggestedQuestions : []
    };
    
  } catch (error) {
    console.error('Error parsing resume with Gemini:', error);
    throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to generate additional interview questions based on specific skills
export async function generateSkillBasedQuestions(skills: string[], role: string = ''): Promise<string[]> {
  try {
    const prompt = `
Generate 5 specific interview questions based on these skills: ${skills.join(', ')}
${role ? `For the role: ${role}` : ''}

Return as a JSON array of strings:
["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]

Make the questions specific to the skills mentioned and suitable for a technical interview.
`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in Gemini response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    return Array.isArray(questions) ? questions : [];
    
  } catch (error) {
    console.error('Error generating skill-based questions:', error);
    return [];
  }
}
