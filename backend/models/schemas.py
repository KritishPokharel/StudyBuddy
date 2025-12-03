from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Midterm Analysis Schemas
class ErrorItem(BaseModel):
    question: int
    yourAnswer: str
    correctAnswer: str
    topic: str
    feedback: str
    marksReceived: Optional[int] = None
    totalMarks: Optional[int] = None
    correctness: Optional[str] = None  # "correct", "incorrect", "partially_correct"

class MidtermAnalysisRequest(BaseModel):
    user_id: str
    course_name: Optional[str] = None

class MidtermAnalysisResponse(BaseModel):
    courseName: str
    examDate: str
    errors: List[ErrorItem]

# Quiz Generation Schemas
class QuizOption(BaseModel):
    id: str
    text: str

class QuizQuestion(BaseModel):
    id: str
    text: str
    options: List[QuizOption]
    correctAnswer: str
    explanation: str
    topic: Optional[str] = None
    imageUrl: Optional[str] = None

class QuizGenerationRequest(BaseModel):
    user_id: Optional[str] = None
    title: Optional[str] = None
    topics: Optional[List[str]] = None
    num_questions: int = 5
    uploaded_files: Optional[List[Dict[str, Any]]] = None  # {filename, content}
    subject: Optional[str] = None  # Subject/category name (e.g., "Data Structures & Algorithms")

class QuizGenerationResponse(BaseModel):
    quiz_id: str
    questions: List[QuizQuestion]
    title: str

# Study Material Schemas
class StudyMaterial(BaseModel):
    title: str
    description: str
    url: str
    source: Optional[str] = None

class StudyMaterialRequest(BaseModel):
    user_id: Optional[str] = None
    topics: List[str]
    context: Optional[str] = None
    difficulty_level: Optional[str] = "intermediate"
    max_results: Optional[int] = 5

class StudyMaterialResponse(BaseModel):
    materials: List[StudyMaterial]

# User Weakness Schemas
class UserWeaknessUpdate(BaseModel):
    topics: List[str]
    performance_data: Optional[Dict[str, Any]] = None

