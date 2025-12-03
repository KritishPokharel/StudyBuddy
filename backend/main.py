from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends,
    Form,
    Request,
    Header,
    BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from typing import List, Optional, Dict, Any
import uvicorn
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
import logging
import json
import random
import re
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

from services.ocr_service import OCRService
from services.ai_service import AIService
from services.rag_service import RAGService
from services.perplexity_service import PerplexityService
from services.supabase_service import SupabaseService
from models.schemas import (
    MidtermAnalysisRequest,
    MidtermAnalysisResponse,
    QuizGenerationRequest,
    QuizGenerationResponse,
    StudyMaterialRequest,
    StudyMaterialResponse,
    UserWeaknessUpdate,
)

app = FastAPI(title="Personalized Learning Platform API", version="1.0.0")

# CORS middleware - must be before routes
# Allow all origins for ngrok backend (can be restricted in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for ngrok
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize services
ocr_service = OCRService()
ai_service = AIService()
rag_service = RAGService()
perplexity_service = PerplexityService()
supabase_service = SupabaseService()


@app.get("/")
async def root():
    return {"message": "Personalized Learning Platform API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "backend", "port": 8000}


@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "service": "backend", "port": 8000}


@app.post("/api/midterm/analyze", response_model=MidtermAnalysisResponse)
async def analyze_midterm(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    course_name: Optional[str] = Form(None),
):
    """
    Analyze uploaded midterm paper:
    1. Extract text using OCR
    2. Use AI to identify mistakes, provide solutions, and identify topics
    3. Use Perplexity to get study resources for identified mistakes
    4. Store analysis in RAG for future recommendations
    5. Return analysis results with resources
    """
    try:
        # Step 1: Extract text from PDF/image
        logger.info(f"Extracting text from midterm paper: {file.filename}")
        file_content = await file.read()
        extracted_text = await ocr_service.extract_text(file_content, file.filename)
        logger.info(f"Extracted {len(extracted_text)} characters from midterm paper")

        # Step 2: Use AI to analyze the midterm with enhanced prompt
        analysis_prompt = f"""
You are analyzing a graded midterm exam paper. Extract ALL questions with their answers, marks, and correctness status.

For EACH question in the paper (including correct ones), identify:
1. Question number
2. Student's answer (what they wrote)
3. Marks received (points given)
4. Total marks for the question
5. Correctness status: MUST be one of "correct", "incorrect", or "partially_correct"
   - "correct" = student got full marks
   - "incorrect" = student got 0 marks or wrong answer
   - "partially_correct" = student got some marks but not full marks
6. Correct answer (always provide, even if student was correct)
7. Topic/subject area (e.g., "Algorithms", "Data Structures", "Calculus", etc.)
8. Detailed feedback (explain what was right/wrong)

Midterm paper content (extracted via OCR):
{extracted_text[:5000]}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no explanations. Just pure JSON starting with [ and ending with ].

Format each question as:
{{
  "question": <number>,
  "yourAnswer": "<student's answer>",
  "marksReceived": <number>,
  "totalMarks": <number>,
  "correctness": "<correct|incorrect|partially_correct>",
  "correctAnswer": "<correct answer>",
  "topic": "<topic name>",
  "feedback": "<detailed explanation>"
}}

Return ALL questions from the paper, including correct ones. The correctness field is critical - use "correct" if marksReceived equals totalMarks, "partially_correct" if marksReceived is between 0 and totalMarks, and "incorrect" if marksReceived is 0.

Return ONLY the JSON array, nothing else.
"""

        logger.info("Calling AI service to analyze midterm paper...")
        ai_response = await ai_service.generate_response(
            analysis_prompt, temperature=0.3, max_tokens=4096
        )
        logger.info(f"AI response received, length: {len(ai_response)}")

        # Step 3: Parse AI response and extract all questions (including correct ones)
        all_questions = await ai_service.parse_midterm_analysis(ai_response)
        logger.info(f"Parsed {len(all_questions)} questions from midterm analysis")

        # Log correctness breakdown for debugging (before filtering)
        correctness_breakdown = {
            "correct": sum(
                1
                for e in all_questions
                if str(e.get("correctness", "")).lower().strip() == "correct"
            ),
            "incorrect": sum(
                1
                for e in all_questions
                if str(e.get("correctness", "")).lower().strip() == "incorrect"
            ),
            "partially_correct": sum(
                1
                for e in all_questions
                if str(e.get("correctness", "")).lower().strip()
                in ["partially_correct", "partially correct", "partial"]
            ),
            "unknown": sum(
                1
                for e in all_questions
                if not e.get("correctness")
                or str(e.get("correctness", "")).lower().strip()
                not in [
                    "correct",
                    "incorrect",
                    "partially_correct",
                    "partially correct",
                    "partial",
                ]
            ),
        }
        logger.info(f"Correctness breakdown (all questions): {correctness_breakdown}")

        # Step 4: Filter to only show errors (exclude correct answers from results)
        # But keep all questions for stats calculation
        errors = [
            e
            for e in all_questions
            if str(e.get("correctness", "")).lower().strip() != "correct"
        ]
        logger.info(
            f"Filtered to {len(errors)} errors (excluded {correctness_breakdown['correct']} correct answers)"
        )

        if not errors:
            logger.warning(
                "No errors found in midterm analysis - student may have perfect score or parsing failed"
            )

        # Step 5: Get unique topics with errors (only from error questions, not correct ones)
        topics_with_errors = list(
            set(
                [
                    error.get("topic", "Unknown")
                    for error in errors
                    if error.get("topic")
                ]
            )
        )
        logger.info(
            f"Identified {len(topics_with_errors)} topics with errors: {topics_with_errors}"
        )

        # Step 6: Use Perplexity to get study resources for identified mistakes
        recommended_resources = []
        if topics_with_errors:
            try:
                logger.info("Fetching study resources from Perplexity...")
                # Build personalized query for Perplexity
                error_context = (
                    f"Student made mistakes in: {', '.join(topics_with_errors)}. "
                )
                error_context += f"Total errors: {len(errors)}. "
                error_context += (
                    "Need study materials to improve understanding in these areas."
                )

                perplexity_query = await perplexity_service.build_personalized_query(
                    topics=topics_with_errors,
                    user_weaknesses=topics_with_errors,
                    context=error_context,
                    difficulty_level="intermediate",
                )

                logger.info(f"Perplexity query: {perplexity_query[:200]}...")
                recommended_resources = await perplexity_service.search_materials(
                    query=perplexity_query, max_results=5
                )
                logger.info(
                    f"Found {len(recommended_resources)} recommended resources from Perplexity"
                )
            except Exception as e:
                logger.error(
                    f"Failed to fetch Perplexity resources: {str(e)}", exc_info=True
                )
                # Continue without resources if Perplexity fails

        # Step 7: Store user weaknesses in RAG
        if topics_with_errors:
            await rag_service.store_user_weakness(
                user_id=user_id,
                topics=topics_with_errors,
                context=extracted_text,
                error_details=errors,
            )

        # Step 8: Update Supabase with analysis (including resources and stats)
        # Pass all_questions for stats calculation, but errors array only contains non-correct answers
        analysis_id = await supabase_service.save_midterm_analysis(
            user_id=user_id,
            filename=file.filename,
            course_name=course_name or "Unknown",
            errors=errors,  # Only errors (no correct answers) for display
            extracted_text=extracted_text,
            recommended_resources=recommended_resources,
            error_topics=topics_with_errors,
            all_questions=all_questions,  # Pass all questions for accurate stats
        )
        logger.info(f"Midterm analysis saved to Supabase with ID: {analysis_id}")

        result = {
            "courseName": course_name or "Unknown Course",
            "examDate": datetime.now().strftime("%B %d, %Y"),
            "errors": errors,  # Only errors, no correct answers
            "recommendedResources": recommended_resources,
            "errorTopics": topics_with_errors,
        }

        logger.info(
            f"Midterm analysis complete: {len(errors)} errors, {len(recommended_resources)} resources"
        )
        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Midterm analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def randomize_question_options(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Randomize the position of correct answers in quiz questions to prevent pattern guessing.
    Shuffles options while maintaining the correct answer mapping.

    Args:
        questions: List of question dictionaries with options and correctAnswer

    Returns:
        List of questions with randomized option positions
    """
    for question in questions:
        if (
            "options" in question
            and isinstance(question["options"], list)
            and len(question["options"]) > 1
        ):
            # Store the original correct answer
            original_correct = question.get("correctAnswer", "a")

            # Find the correct option object
            correct_option = None
            for opt in question["options"]:
                if isinstance(opt, dict) and opt.get("id") == original_correct:
                    correct_option = opt
                    break

            if correct_option:
                # Shuffle the options array
                shuffled_options = question["options"].copy()
                random.shuffle(shuffled_options)

                # Find the new position of the correct answer
                for idx, opt in enumerate(shuffled_options):
                    if isinstance(opt, dict) and opt.get("id") == original_correct:
                        # Update option IDs to maintain a, b, c, d pattern
                        option_ids = ["a", "b", "c", "d", "e", "f"][
                            : len(shuffled_options)
                        ]
                        for i, opt in enumerate(shuffled_options):
                            opt["id"] = option_ids[i]

                        # Update correct answer to new position
                        question["correctAnswer"] = option_ids[idx]
                        question["options"] = shuffled_options
                        break

    return questions


@app.post("/api/quiz/generate", response_model=QuizGenerationResponse)
async def generate_quiz(request: QuizGenerationRequest):
    """
    Generate quiz questions based on uploaded materials or user weaknesses:
    1. Extract text from uploaded files (if any)
    2. Use RAG to get user's weak areas
    3. Generate quiz questions using AI
    4. Return quiz questions
    """
    try:
        logger.info(f"Quiz generation request received for user: {request.user_id}")
        logger.info(
            f"Request data: topics={request.topics}, num_questions={request.num_questions}"
        )

        # NOTE: Do NOT include user weaknesses from RAG for specific topic quizzes
        # This endpoint is for quizzes from uploaded materials or specific topics only
        # RAG-based quizzes use a separate endpoint (/api/user/{user_id}/rag-quiz/generate)
        # Including weaknesses here causes mixing of topics (e.g., Chemistry + CS topics)

        # Extract text from uploaded files if provided
        materials_text = ""
        if request.uploaded_files:
            logger.info(f"Processing {len(request.uploaded_files)} uploaded files")
            for file_data in request.uploaded_files:
                try:
                    # Handle base64 encoded content
                    file_content = file_data.get("content", "")
                    if isinstance(file_content, str) and file_content.startswith(
                        "data:"
                    ):
                        # Extract base64 part
                        file_content = file_content.split(",")[1]

                    import base64

                    file_bytes = (
                        base64.b64decode(file_content)
                        if isinstance(file_content, str)
                        else file_content
                    )

                    extracted_text = await ocr_service.extract_text(
                        file_bytes, file_data.get("filename", "unknown")
                    )
                    materials_text += f"\n\nMaterial from {file_data.get('filename', 'unknown')}:\n{extracted_text}"
                except Exception as e:
                    logger.error(f"Failed to extract text from file: {str(e)}")

        # Build prompt for quiz generation - be very explicit about JSON format
        # IMPORTANT: Only use the provided topics, do NOT mix with other subjects or topics
        topics_str = ", ".join(request.topics) if request.topics else "General topics"
        quiz_prompt = f"""You are a quiz generator. Generate exactly {request.num_questions} quiz questions.

CRITICAL: Generate questions ONLY from these specific topics: {topics_str}
DO NOT include questions from other subjects or topics not listed above.
Focus exclusively on the provided topics and materials.

Topics to use: {topics_str}
Materials: {materials_text[:1500] if materials_text else 'General knowledge'}

CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanations. Just pure JSON starting with [ and ending with ].

IMPORTANT: Randomize the position of the correct answer across options a, b, c, and d. Do NOT always place the correct answer in the same position. Vary it randomly for each question.

Example format (note how correct answers are in different positions):
[
{{"id": "1", "text": "What is binary search time complexity?", "options": [{{"id": "a", "text": "O(n)"}}, {{"id": "b", "text": "O(log n)"}}, {{"id": "c", "text": "O(n²)"}}, {{"id": "d", "text": "O(1)"}}], "correctAnswer": "b", "explanation": "Binary search eliminates half the space each iteration", "topic": "Algorithms"}},
{{"id": "2", "text": "What data structure does DFS use?", "options": [{{"id": "a", "text": "Queue"}}, {{"id": "b", "text": "Stack"}}, {{"id": "c", "text": "Heap"}}, {{"id": "d", "text": "Array"}}], "correctAnswer": "b", "explanation": "DFS uses stack (recursion or explicit)", "topic": "Graphs"}},
{{"id": "3", "text": "What is the time complexity of bubble sort?", "options": [{{"id": "a", "text": "O(n log n)"}}, {{"id": "b", "text": "O(n)"}}, {{"id": "c", "text": "O(n²)"}}, {{"id": "d", "text": "O(1)"}}], "correctAnswer": "c", "explanation": "Bubble sort has quadratic time complexity", "topic": "Sorting"}},
{{"id": "4", "text": "Which algorithm uses divide and conquer?", "options": [{{"id": "a", "text": "Merge sort"}}, {{"id": "b", "text": "Bubble sort"}}, {{"id": "c", "text": "Selection sort"}}, {{"id": "d", "text": "Insertion sort"}}], "correctAnswer": "a", "explanation": "Merge sort uses divide and conquer strategy", "topic": "Algorithms"}}
]

Generate {request.num_questions} questions. Vary the correct answer position randomly (a, b, c, or d) for each question. Return ONLY the JSON array, nothing else."""

        logger.info("Calling AI service to generate quiz questions...")
        ai_response = await ai_service.generate_response(quiz_prompt)
        logger.info(f"AI response received, length: {len(ai_response)}")

        # Log response for debugging (first and last 500 chars)
        if len(ai_response) > 1000:
            logger.debug(f"AI response start: {ai_response[:500]}")
            logger.debug(f"AI response end: {ai_response[-500:]}")
        else:
            logger.debug(f"Full AI response: {ai_response}")

        questions = await ai_service.parse_quiz_questions(ai_response)
        logger.info(f"Parsed {len(questions)} questions from AI response")

        # Randomize option positions to prevent pattern guessing
        questions = randomize_question_options(questions)

        if not questions or len(questions) == 0:
            logger.warning("No questions generated, using fallback")
            # Fallback: create a simple question
            questions = [
                {
                    "id": "1",
                    "text": f"Test question about {request.topics[0] if request.topics else 'general topic'}",
                    "options": [
                        {"id": "a", "text": "Option A"},
                        {"id": "b", "text": "Option B"},
                        {"id": "c", "text": "Option C"},
                        {"id": "d", "text": "Option D"},
                    ],
                    "correctAnswer": "a",
                    "explanation": "This is a placeholder question",
                    "topic": request.topics[0] if request.topics else "General",
                }
            ]

        # Generate AI title if not provided or if title looks like a topic list
        quiz_title = request.title
        # Check if title is just a concatenation of topics (likely from frontend)
        if quiz_title and request.topics:
            # If title contains multiple topics joined together, regenerate it
            title_lower = quiz_title.lower()
            topics_in_title = sum(
                1 for topic in request.topics[:5] if topic.lower() in title_lower
            )
            if (
                topics_in_title >= 2 or len(quiz_title) > 50
            ):  # Title is too long or contains multiple topics
                quiz_title = None  # Force regeneration

        if not quiz_title and request.topics:
            try:
                # Pass subject if available to generate more accurate title
                quiz_title = await ai_service.generate_quiz_title(
                    request.topics, subject=request.subject
                )
                logger.info(
                    f"Generated AI title: '{quiz_title}' for topics: {request.topics[:5]}, subject: {request.subject}"
                )
            except Exception as e:
                logger.warning(f"Failed to generate AI title: {str(e)}, using fallback")
                # Use subject in fallback if available
                if request.subject:
                    quiz_title = request.subject
                else:
                    quiz_title = (
                        f"{', '.join(request.topics[:2])} Quiz"
                        if request.topics
                        else "Generated Quiz"
                    )

        # Store quiz in Supabase (skip if RLS fails, we'll use temp ID)
        quiz_id = None
        try:
            # Try to save to database, but don't fail if RLS blocks it
            quiz_id = await supabase_service.save_quiz(
                user_id=request.user_id,
                title=quiz_title or "Generated Quiz",
                questions=questions,
                topics=request.topics,
            )
            logger.info(f"Quiz saved to database with ID: {quiz_id}")
        except Exception as e:
            logger.warning(
                f"Failed to save quiz to database (continuing anyway): {str(e)}"
            )
            # Generate a temporary ID if database save fails
            import uuid

            quiz_id = str(uuid.uuid4())
            logger.info(f"Using temporary quiz ID: {quiz_id}")

        result = {
            "quiz_id": quiz_id,
            "questions": questions,
            "title": quiz_title or "Generated Quiz",
        }

        logger.info(f"Quiz generation successful, returning {len(questions)} questions")
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quiz generation error: {str(e)}", exc_info=True)
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@app.post("/api/quiz/generate-from-errors", response_model=QuizGenerationResponse)
async def generate_quiz_from_errors(
    user_id: str = Form(...),
    error_topics: str = Form(...),  # Comma-separated topics
    num_questions: int = Form(10),
    subject: Optional[str] = Form(None),  # Optional subject/course name
):
    """
    Generate a 10-question quiz directly from error topics (e.g., from midterm analysis).
    This endpoint is called when user clicks "Start Quiz on Errors" button.
    """
    try:
        topics_list = [t.strip() for t in error_topics.split(",") if t.strip()]

        if not topics_list:
            raise HTTPException(status_code=400, detail="No error topics provided")

        logger.info(
            f"Generating {num_questions} question quiz from error topics: {topics_list}"
        )

        # NOTE: Do NOT include user weaknesses from RAG for error-based quizzes
        # This quiz should ONLY focus on the specific error topics from the midterm
        # Including other weaknesses causes mixing of topics (e.g., Chemistry errors + CS topics)

        # Build prompt for quiz generation focused ONLY on error topics
        topics_str = ", ".join(topics_list)
        quiz_prompt = f"""You are a quiz generator. Generate exactly {num_questions} quiz questions focused on helping a student improve in areas where they made mistakes.

CRITICAL: Generate questions ONLY from these specific error topics: {topics_str}
DO NOT include questions from other subjects or topics not listed above.
Focus exclusively on the topics where the student made errors.

The student made errors in these topics: {topics_str}

Generate questions that:
1. Test understanding of these specific topics
2. Are at an intermediate difficulty level
3. Help reinforce concepts the student struggled with
4. Include clear explanations for each answer

CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanations. Just pure JSON starting with [ and ending with ].

IMPORTANT: Randomize the position of the correct answer across options a, b, c, and d. Do NOT always place the correct answer in the same position. Vary it randomly for each question.

Example format (note how correct answers are in different positions):
[
{{"id": "1", "text": "What is the time complexity of binary search?", "options": [{{"id": "a", "text": "O(n)"}}, {{"id": "b", "text": "O(log n)"}}, {{"id": "c", "text": "O(n²)"}}, {{"id": "d", "text": "O(1)"}}], "correctAnswer": "b", "explanation": "Binary search eliminates half the search space each iteration, resulting in O(log n) time complexity", "topic": "{topics_list[0] if topics_list else 'General'}"}},
{{"id": "2", "text": "Which data structure does DFS use?", "options": [{{"id": "a", "text": "Queue"}}, {{"id": "b", "text": "Stack"}}, {{"id": "c", "text": "Heap"}}, {{"id": "d", "text": "Array"}}], "correctAnswer": "b", "explanation": "DFS uses a stack (either through recursion or an explicit stack) to track nodes to visit", "topic": "{topics_list[0] if topics_list else 'General'}"}},
{{"id": "3", "text": "What is the worst-case time complexity of quicksort?", "options": [{{"id": "a", "text": "O(n log n)"}}, {{"id": "b", "text": "O(n)"}}, {{"id": "c", "text": "O(n²)"}}, {{"id": "d", "text": "O(1)"}}], "correctAnswer": "c", "explanation": "Quicksort has O(n²) worst-case time complexity", "topic": "{topics_list[0] if topics_list else 'General'}"}},
{{"id": "4", "text": "Which algorithm uses divide and conquer?", "options": [{{"id": "a", "text": "Merge sort"}}, {{"id": "b", "text": "Bubble sort"}}, {{"id": "c", "text": "Selection sort"}}, {{"id": "d", "text": "Insertion sort"}}], "correctAnswer": "a", "explanation": "Merge sort uses divide and conquer strategy", "topic": "{topics_list[0] if topics_list else 'General'}"}}
]

Generate {num_questions} questions covering these topics: {', '.join(topics_list)}.
Vary the correct answer position randomly (a, b, c, or d) for each question. Return ONLY the JSON array, nothing else."""

        logger.info("Calling AI service to generate quiz from error topics...")
        # Increase max_tokens to reduce truncation for longer quizzes
        # 10 questions with full text can be ~6000-8000 tokens
        ai_response = await ai_service.generate_response(
            quiz_prompt, temperature=0.7, max_tokens=8192
        )
        logger.info(f"AI response received, length: {len(ai_response)}")

        # Check if response might be truncated (ends abruptly)
        if (
            ai_response
            and not ai_response.rstrip().endswith("]")
            and not ai_response.rstrip().endswith("}")
        ):
            logger.warning("AI response may be truncated - doesn't end with ] or }")

        parsed_questions = await ai_service.parse_quiz_questions(ai_response)
        logger.info(f"Parsed {len(parsed_questions)} questions from AI response")

        # Randomize option positions to prevent pattern guessing
        parsed_questions = randomize_question_options(parsed_questions)

        # Validate and clean questions - ensure they have proper text
        validated_questions = []
        for i, q in enumerate(parsed_questions):
            # Ensure question has proper text field
            question_text = q.get("text") or q.get("question") or ""
            if not question_text or len(question_text.strip()) < 10:
                logger.warning(
                    f"Question {i+1} has invalid or too short text: '{question_text[:50]}...', skipping"
                )
                continue

            # Ensure question has options
            options = q.get("options", [])
            if not options or len(options) < 2:
                logger.warning(
                    f"Question {i+1} has insufficient options ({len(options)} found), skipping"
                )
                logger.debug(f"Question {i+1} options: {options}")
                continue

            # Validate options structure - ensure they have text
            valid_options = []
            for opt in options:
                if isinstance(opt, dict):
                    if "text" in opt or "id" in opt:
                        # Normalize option structure
                        opt_id = opt.get("id") or (
                            chr(97 + len(valid_options))
                            if len(valid_options) < 26
                            else str(len(valid_options))
                        )
                        opt_text = (
                            opt.get("text")
                            or opt.get("id")
                            or f"Option {opt_id.upper()}"
                        )
                        valid_options.append({"id": opt_id, "text": opt_text})
                    else:
                        logger.warning(f"Question {i+1} option missing text/id: {opt}")
                elif isinstance(opt, str):
                    # Convert string option to object
                    opt_id = (
                        chr(97 + len(valid_options))
                        if len(valid_options) < 26
                        else str(len(valid_options))
                    )
                    valid_options.append({"id": opt_id, "text": opt})
                else:
                    logger.warning(
                        f"Question {i+1} has invalid option type: {type(opt)}"
                    )

            if len(valid_options) < 2:
                logger.warning(
                    f"Question {i+1} has insufficient valid options after normalization, skipping"
                )
                continue

            # Normalize question structure
            validated_q = {
                "id": q.get("id") or str(len(validated_questions) + 1),
                "text": question_text.strip(),
                "options": valid_options,
                "correctAnswer": q.get("correctAnswer")
                or q.get("correct_answer")
                or valid_options[0].get("id", "a"),
                "explanation": q.get("explanation") or "",
                "topic": q.get("topic") or topics_list[0] if topics_list else "General",
            }
            validated_questions.append(validated_q)
            logger.debug(
                f"Validated question {validated_q['id']}: {validated_q['text'][:50]}... ({len(valid_options)} options)"
            )

        questions = validated_questions
        logger.info(
            f"Validated {len(questions)} questions after cleaning (from {len(parsed_questions)} parsed)"
        )

        if not questions or len(questions) == 0:
            logger.warning("No questions generated, using fallback")
            # Fallback: create simple questions
            questions = []
            for i, topic in enumerate(topics_list[:num_questions]):
                questions.append(
                    {
                        "id": str(i + 1),
                        "text": f"Test question about {topic}",
                        "options": [
                            {"id": "a", "text": "Option A"},
                            {"id": "b", "text": "Option B"},
                            {"id": "c", "text": "Option C"},
                            {"id": "d", "text": "Option D"},
                        ],
                        "correctAnswer": "a",
                        "explanation": f"This is a placeholder question about {topic}",
                        "topic": topic,
                    }
                )

        # Generate AI title based on error topics
        quiz_title = None
        try:
            # Pass subject if available to generate more accurate title
            quiz_title = await ai_service.generate_quiz_title(
                topics_list, subject=subject
            )
            logger.info(
                f"Generated AI title for error quiz: '{quiz_title}' from topics: {topics_list[:5]}, subject: {subject}"
            )
        except Exception as e:
            logger.warning(f"Failed to generate AI title: {str(e)}, using fallback")
            # Use subject in fallback if available
            if subject:
                quiz_title = f"{subject} Error Quiz"
            else:
                quiz_title = f"Error Topics Quiz"

        # Store quiz in Supabase
        quiz_id = None
        try:
            quiz_id = await supabase_service.save_quiz(
                user_id=user_id,
                title=quiz_title,
                questions=questions,
                topics=topics_list,
            )
            logger.info(f"Quiz saved to database with ID: {quiz_id}")
        except Exception as e:
            logger.warning(
                f"Failed to save quiz to database (continuing anyway): {str(e)}"
            )
            import uuid

            quiz_id = str(uuid.uuid4())
            logger.info(f"Using temporary quiz ID: {quiz_id}")

        result = {
            "quiz_id": quiz_id,
            "questions": questions,
            "title": quiz_title,
        }

        logger.info(
            f"Quiz generation from errors successful, returning {len(questions)} questions"
        )
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quiz generation from errors error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@app.post("/api/resources/search", response_model=StudyMaterialResponse)
async def search_study_materials(request: StudyMaterialRequest):
    """
    Search for study materials using Perplexity API:
    1. Build search query based on provided topics and context ONLY
    2. Search Perplexity for relevant materials
    3. Return materials with titles, descriptions, and URLs

    NOTE: Do NOT include RAG weaknesses here - this endpoint is for specific quiz/midterm resources
    RAG-based resources use a separate endpoint (/api/user/{user_id}/rag-resources)
    """
    try:
        # NOTE: Do NOT include user weaknesses from RAG for specific topic searches
        # This endpoint is called from quiz summaries for specific topics
        # Including RAG data causes mixing of topics (e.g., Chemistry + CS topics)

        # Build search query focusing ONLY on the provided topics
        topics_str = ", ".join(request.topics) if request.topics else "general topics"
        context_str = request.context or "general understanding"
        difficulty_str = request.difficulty_level or "intermediate"

        search_query = f"""Find high-quality study materials (articles, videos, tutorials, practice problems) 
for learning about these specific topics: {topics_str}

CRITICAL: Focus ONLY on materials related to these topics: {topics_str}
Do NOT include materials from other subjects or unrelated topics.

Context: {context_str}

Return materials suitable for: {difficulty_str} level

Include: tutorials, practice problems, video explanations, and written guides specifically about {topics_str}

IMPORTANT: Only return resources that are completely free to access, no paywalls, no subscriptions required. Include free videos (YouTube, educational platforms), free articles, free research papers, open-access journals, free tutorials, and free practice problems. Exclude any resources that require payment, subscription, or registration fees."""

        # Search Perplexity
        materials = await perplexity_service.search_materials(
            query=search_query, max_results=request.max_results or 5
        )

        # Store recommended materials in Supabase
        await supabase_service.save_recommended_resources(
            user_id=request.user_id, topics=request.topics, materials=materials
        )

        result = {"materials": materials}
        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Material search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Material search failed: {str(e)}")


@app.get("/api/user/{user_id}/weaknesses")
async def get_user_weaknesses(user_id: str):
    """Get user's identified weaknesses from RAG"""
    try:
        weaknesses = await rag_service.get_user_weaknesses(user_id)
        return weaknesses
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get weaknesses: {str(e)}"
        )


@app.post("/api/user/{user_id}/weaknesses/update")
async def update_user_weaknesses(user_id: str, update: UserWeaknessUpdate):
    """Update user weaknesses based on quiz results"""
    try:
        await rag_service.update_user_weakness(
            user_id=user_id,
            topics=update.topics,
            performance_data=update.performance_data,
        )
        return {"message": "Weaknesses updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update weaknesses: {str(e)}"
        )


@app.get("/api/quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    """Get quiz details by ID"""
    try:
        quiz = await supabase_service.get_quiz(quiz_id)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quiz: {str(e)}")


@app.get("/api/quiz/{quiz_id}/result")
async def get_quiz_result(quiz_id: str, user_id: str):
    """Get quiz result with recommendations"""
    try:
        logger.info(f"Getting quiz result for quiz_id={quiz_id}, user_id={user_id}")

        # Get quiz - might fail if it's a temporary ID
        quiz = None
        try:
            quiz = await supabase_service.get_quiz(quiz_id)
        except Exception as e:
            logger.warning(
                f"Quiz not found in database (might be temporary ID): {str(e)}"
            )
            # Try to continue without quiz data

        # Get result
        results = await supabase_service.get_user_quiz_results(user_id)
        result = next((r for r in results if r.get("quiz_id") == quiz_id), None)

        if not result:
            logger.warning(f"No result found for quiz_id={quiz_id}")
            # Return empty result if not found
            return JSONResponse(
                content={"quiz": quiz, "result": None, "recommendations": []}
            )

        # Get recommendations based on weak topics
        weak_topics = result.get("weak_topics", [])
        recommendations = []

        if weak_topics:
            try:
                materials = await perplexity_service.search_materials(
                    query=f"Study materials for learning: {', '.join(weak_topics)}. User scored {result.get('score', 0)}% and needs help with these topics. IMPORTANT: Only return resources that are completely free to access, no paywalls, no subscriptions required. Include free videos (YouTube, educational platforms), free articles, free research papers, open-access journals, free tutorials, and free practice problems. Exclude any resources that require payment, subscription, or registration fees.",
                    max_results=5,
                )
                recommendations = materials
            except Exception as e:
                logger.warning(f"Failed to get recommendations: {str(e)}")

        return JSONResponse(
            content={"quiz": quiz, "result": result, "recommendations": recommendations}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get quiz result: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to get quiz result: {str(e)}"
        )


@app.get("/api/quiz-result/{result_id}")
async def get_quiz_result_by_id(result_id: str, user_id: str):
    """Get a specific quiz result by result ID"""
    try:
        logger.info(
            f"Getting quiz result by ID: result_id={result_id}, user_id={user_id}"
        )

        result = await supabase_service.get_quiz_result_by_id(result_id, user_id)

        # Try to get the quiz if quiz_id exists
        quiz = None
        quiz_id = result.get("quiz_id")
        if quiz_id:
            try:
                quiz = await supabase_service.get_quiz(quiz_id)
            except Exception as e:
                logger.warning(f"Quiz not found for quiz_id={quiz_id}: {str(e)}")

        # Get recommendations from result if available
        recommendations = result.get("recommended_resources", [])

        return JSONResponse(
            content={"quiz": quiz, "result": result, "recommendations": recommendations}
        )
    except Exception as e:
        logger.error(f"Failed to get quiz result by ID: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=404 if "not found" in str(e).lower() else 500,
            detail=f"Failed to get quiz result: {str(e)}",
        )


@app.get("/api/midterm-analysis/{analysis_id}")
async def get_midterm_analysis_by_id(analysis_id: str, user_id: str):
    """Get a specific midterm analysis by ID"""
    try:
        logger.info(
            f"Getting midterm analysis by ID: analysis_id={analysis_id}, user_id={user_id}"
        )

        analysis = await supabase_service.get_midterm_analysis(analysis_id, user_id)

        return JSONResponse(content=analysis)
    except Exception as e:
        logger.error(f"Failed to get midterm analysis by ID: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=404 if "not found" in str(e).lower() else 500,
            detail=f"Failed to get midterm analysis: {str(e)}",
        )


@app.get("/api/user/{user_id}/quizzes")
async def get_user_quizzes(user_id: str):
    """Get all quizzes for a user"""
    try:
        quizzes = await supabase_service.get_user_quizzes(user_id)
        return quizzes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quizzes: {str(e)}")


@app.get("/api/user/{user_id}/progress")
async def get_user_progress(user_id: str):
    """Get user progress data for dashboard"""
    try:
        logger.info(f"Fetching progress for user: {user_id}")

        # Get quizzes and results
        quizzes = await supabase_service.get_user_quizzes(user_id)
        quiz_results = await supabase_service.get_user_quiz_results(user_id)
        midterm_analyses = await supabase_service.get_user_midterm_analyses(user_id)

        # Calculate weekly goals
        from datetime import datetime, timedelta, timezone

        # Get start of current week (Monday) - make it timezone-aware
        today = datetime.now(timezone.utc)
        week_start = today - timedelta(days=today.weekday())

        # Parse dates and filter for this week
        def parse_date(date_str):
            """Parse date string, handling various formats - returns timezone-aware datetime"""
            if not date_str:
                return datetime(2000, 1, 1, tzinfo=timezone.utc)
            try:
                # Try ISO format with timezone
                if date_str.endswith("Z"):
                    date_str = date_str.replace("Z", "+00:00")
                elif "+" not in date_str and "Z" not in date_str:
                    # No timezone info, assume UTC
                    date_str = date_str + "+00:00"

                parsed = datetime.fromisoformat(date_str)

                # Ensure timezone-aware
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)

                return parsed
            except Exception as e:
                logger.warning(f"Failed to parse date '{date_str}': {str(e)}")
                try:
                    # Try other formats
                    parsed = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                    return parsed.replace(tzinfo=timezone.utc)
                except:
                    return datetime(2000, 1, 1, tzinfo=timezone.utc)

        recent_quizzes = [
            q for q in quizzes if parse_date(q.get("created_at")) >= week_start
        ]
        recent_results = [
            r for r in quiz_results if parse_date(r.get("completed_at")) >= week_start
        ]
        recent_midterms = [
            m for m in midterm_analyses if parse_date(m.get("created_at")) >= week_start
        ]

        # Calculate study hours from quiz results (approximate 10-15 min per quiz)
        study_hours = len(recent_results) * 0.25  # ~15 minutes per quiz

        # Get user weaknesses
        weaknesses = await rag_service.get_user_weaknesses(user_id)

        # Count unique weak areas that have been addressed (topics with recent quiz attempts)
        weak_areas_addressed = 0
        if weaknesses and weaknesses.get("topics"):
            # Check if user has attempted quizzes on these weak topics
            weak_topics = set(weaknesses.get("topics", []))
            for result in recent_results:
                result_weak_topics = result.get("weak_topics", [])
                if any(topic in weak_topics for topic in result_weak_topics):
                    weak_areas_addressed += 1

        progress = {
            "weekly_goals": {
                "quizzes_completed": len(recent_results),
                "total_quizzes": 5,
                "study_hours": round(study_hours, 1),
                "total_hours": 10,
                "flashcards_reviewed": 0,  # Not implemented yet
                "flashcards_target": 100,
                "midterms_reviewed": len(recent_midterms),
                "total_midterms": 2,
                "weak_areas_fixed": min(weak_areas_addressed, 5),
                "total_weak_areas": 5,
            },
            "recent_activities": [],
        }

        # Build recent activities from quiz results and midterms
        activities = []

        # Add quiz results - show even if quiz doesn't exist in database
        for result in quiz_results:
            quiz = next((q for q in quizzes if q["id"] == result.get("quiz_id")), None)

            # Use quiz data from database if available, otherwise use data stored in result
            quiz_title = (
                quiz.get("title", "") if quiz else result.get("quiz_title", "Quiz")
            )
            quiz_topics = (
                quiz.get("topics", []) if quiz else result.get("quiz_topics", [])
            )

            # Calculate issues found (wrong answers)
            answers = result.get("answers", [])
            wrong_count = sum(1 for a in answers if not a.get("is_correct", True))

            # Calculate time spent
            time_spent_seconds = result.get("time_spent")
            time_spent_formatted = "N/A"
            if time_spent_seconds:
                minutes = time_spent_seconds // 60
                seconds = time_spent_seconds % 60
                time_spent_formatted = f"{minutes}:{seconds:02d}"

            activities.append(
                {
                    "id": result.get("id", f"quiz_{result.get('quiz_id')}"),
                    "type": "quiz",
                    "title": quiz_title,
                    "timestamp": result.get(
                        "completed_at", result.get("created_at", "")
                    ),
                    "score": float(result.get("score", 0)),
                    "topics": quiz_topics,
                    "weak_topics": result.get("weak_topics", []),
                    "quiz_id": result.get("quiz_id"),
                    "issues_found": wrong_count,
                    "time_spent": time_spent_formatted,
                }
            )

        # Add midterm analyses with full details
        for analysis in midterm_analyses:
            errors = analysis.get("errors", [])
            topics = analysis.get("error_topics", [])
            if not topics:
                # Fallback: extract topics from errors
                topics = list(
                    set([e.get("topic", "") for e in errors if e.get("topic")])
                )

            # Get stats
            total_errors = analysis.get("total_errors", len(errors))
            wrong_count = analysis.get("wrong_count", 0)
            correct_count = analysis.get("correct_count", 0)
            partially_correct_count = analysis.get("partially_correct_count", 0)

            # Get recommended resources
            recommended_resources = analysis.get("recommended_resources", [])

            course_name = analysis.get("course_name", "Unknown")
            # Format title as "Subject Name Graded Paper Review"
            if course_name and course_name != "Unknown":
                title = f"{course_name} Graded Paper Review"
            else:
                title = "Mid-Term Review"

            activities.append(
                {
                    "id": analysis.get(
                        "id", f"midterm_{analysis.get('filename', 'unknown')}"
                    ),
                    "type": "midterm",
                    "title": title,
                    "timestamp": analysis.get("created_at", ""),
                    "topics": topics,
                    "issues_found": total_errors,
                    "wrong_count": wrong_count,
                    "correct_count": correct_count,
                    "partially_correct_count": partially_correct_count,
                    "recommended_resources": recommended_resources,
                    "analysis_id": analysis.get("id"),
                    "filename": analysis.get("filename", ""),
                }
            )

        # Sort by timestamp (most recent first)
        # Sort activities by timestamp (latest first)
        activities.sort(key=lambda x: parse_date(x.get("timestamp", "")), reverse=True)

        # Separate latest quiz for Quick Recap
        latest_quiz_result = None
        latest_quiz_activity = None

        # Find the most recent quiz result
        for activity in activities:
            if activity.get("type") == "quiz":
                latest_quiz_activity = activity
                # Find the corresponding quiz result
                latest_quiz_result = next(
                    (
                        r
                        for r in quiz_results
                        if r.get("id") == activity.get("id")
                        or (
                            r.get("quiz_id") == activity.get("quiz_id")
                            and parse_date(r.get("completed_at", ""))
                            == parse_date(activity.get("timestamp", ""))
                        )
                    ),
                    None,
                )
                if latest_quiz_result:
                    break

        # Set latest quiz summary for Quick Recap
        progress["latest_quiz_summary"] = None
        if latest_quiz_result:
            quiz_title = latest_quiz_result.get("quiz_title", "Quiz")
            if not quiz_title:
                matching_quiz = next(
                    (
                        q
                        for q in quizzes
                        if q["id"] == latest_quiz_result.get("quiz_id")
                    ),
                    None,
                )
                if matching_quiz:
                    quiz_title = matching_quiz.get("title", "Quiz")

            time_spent_seconds = latest_quiz_result.get("time_spent")
            time_spent_formatted = "N/A"
            if time_spent_seconds is not None:
                minutes = time_spent_seconds // 60
                seconds = time_spent_seconds % 60
                time_spent_formatted = f"{minutes}:{seconds:02d}"

            answers = latest_quiz_result.get("answers", [])
            correct_count = latest_quiz_result.get("correct_count")
            wrong_count = latest_quiz_result.get("wrong_count")
            total_questions = latest_quiz_result.get("total_questions")

            if correct_count is None and answers:
                correct_count = len([a for a in answers if a.get("is_correct")])
            if wrong_count is None and answers:
                wrong_count = len([a for a in answers if not a.get("is_correct")])
            if total_questions is None:
                total_questions = len(answers) if answers else 0

            weak_areas = latest_quiz_result.get("weak_areas", [])
            if not weak_areas and latest_quiz_result.get("weak_topics"):
                weak_areas = [
                    {"topic": topic, "accuracy": 0}
                    for topic in latest_quiz_result.get("weak_topics", [])
                ]

            progress["latest_quiz_summary"] = {
                "result_id": latest_quiz_result.get(
                    "id"
                ),  # Add result ID for navigation
                "quiz_id": latest_quiz_result.get("quiz_id"),
                "title": quiz_title,
                "score": float(latest_quiz_result.get("score", 0)),
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "total_questions": total_questions,
                "time_spent": time_spent_formatted,
                "weak_areas": weak_areas,
                "recommended_resources": latest_quiz_result.get(
                    "recommended_resources", []
                ),
                "timestamp": latest_quiz_result.get("completed_at", ""),
            }
            logger.info(
                f"Latest quiz summary prepared: {progress['latest_quiz_summary']['title']}, score={progress['latest_quiz_summary']['score']}%"
            )

            # Find the activity ID for the latest quiz to exclude it from recent activities
            latest_quiz_activity_id = latest_quiz_result.get("id")
        else:
            latest_quiz_activity_id = None

        # Set latest midterm summary for Quick Mid-Term Review Analysis
        progress["latest_midterm_summary"] = None
        if midterm_analyses:
            latest_midterm = midterm_analyses[0]  # Already sorted by created_at desc
            errors = latest_midterm.get("errors", [])
            topics = latest_midterm.get("error_topics", [])
            if not topics:
                topics = list(
                    set([e.get("topic", "") for e in errors if e.get("topic")])
                )

            # Get stats
            total_errors = latest_midterm.get("total_errors", len(errors))
            wrong_count = latest_midterm.get("wrong_count", 0)
            correct_count = latest_midterm.get("correct_count", 0)
            partially_correct_count = latest_midterm.get("partially_correct_count", 0)

            # Calculate accuracy percentage (based on correct vs total)
            total_questions = total_errors  # Total questions with errors
            accuracy = 0
            if total_questions > 0:
                # If we have marks data, use that; otherwise estimate from correctness
                total_marks_received = latest_midterm.get("total_marks_received")
                total_marks_possible = latest_midterm.get("total_marks_possible")
                if (
                    total_marks_received is not None
                    and total_marks_possible is not None
                    and total_marks_possible > 0
                ):
                    accuracy = round(
                        (total_marks_received / total_marks_possible) * 100
                    )
                else:
                    # Estimate from correct/wrong counts
                    accuracy = (
                        round((correct_count / total_questions) * 100)
                        if total_questions > 0
                        else 0
                    )

            progress["latest_midterm_summary"] = {
                "analysis_id": latest_midterm.get("id"),
                "course_name": latest_midterm.get("course_name", "Mid-Term"),
                "filename": latest_midterm.get("filename", ""),
                "total_errors": total_errors,
                "wrong_count": wrong_count,
                "correct_count": correct_count,
                "partially_correct_count": partially_correct_count,
                "error_topics": topics,
                "recommended_resources": latest_midterm.get(
                    "recommended_resources", []
                ),
                "timestamp": latest_midterm.get("created_at", ""),
                "accuracy": accuracy,
            }
            logger.info(
                f"Latest midterm summary prepared: {progress['latest_midterm_summary']['course_name']}, {total_errors} errors"
            )

            # Find the activity ID for the latest midterm to exclude it from recent activities
            latest_midterm_activity_id = latest_midterm.get("id")
        else:
            latest_midterm_activity_id = None

        # Recent activities should exclude the latest quiz and latest midterm (they're shown in Quick Recap sections)
        # But include all other activities including older quizzes and midterms
        recent_activities = []
        for activity in activities:
            # Include all activities except the latest quiz and latest midterm (which are in Quick Recap sections)
            is_latest_quiz = (
                activity.get("type") == "quiz"
                and activity.get("id") == latest_quiz_activity_id
            )
            is_latest_midterm = (
                activity.get("type") == "midterm"
                and activity.get("id") == latest_midterm_activity_id
            )

            if not is_latest_quiz and not is_latest_midterm:
                recent_activities.append(activity)

        progress["recent_activities"] = recent_activities[
            :10
        ]  # Top 10 most recent (excluding latest quiz and midterm)

        return progress

    except Exception as e:
        logger.error(f"Failed to get user progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


@app.post("/api/materials/extract-topics")
async def extract_topics_from_material(
    file: UploadFile = File(...), user_id: str = Form(...)
):
    """Extract topics and subject/category from uploaded material"""
    try:
        logger.info(f"Extracting topics from {file.filename} for user {user_id}")

        # Extract text
        file_content = await file.read()
        logger.info(f"File size: {len(file_content)} bytes")

        try:
            extracted_text = await ocr_service.extract_text(file_content, file.filename)
            logger.info(f"OCR extracted {len(extracted_text)} characters")
            logger.info(f"OCR preview (first 200 chars): {extracted_text[:200]}")

            if not extracted_text or len(extracted_text.strip()) == 0:
                logger.warning(
                    "OCR extracted empty text - this may indicate an OCR issue"
                )
        except Exception as ocr_error:
            logger.error(f"OCR extraction failed: {str(ocr_error)}", exc_info=True)
            extracted_text = ""

        # Use AI to extract topics AND subject/category
        prompt = f"""
        Analyze this study material and extract:
        1. The main subject/category (e.g., "Data Structures & Algorithms", "Computer Science", "Chemistry", "Physics", "Mathematics")
        2. The top 5 most important topics/subjects covered
        
        Material content:
        {extracted_text[:3000]}
        
        Return a JSON object with:
        {{
            "subject": "Main subject/category name (1-3 words)",
            "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
        }}
        
        Examples:
        - If material is about sorting algorithms, trees, graphs: {{"subject": "Data Structures & Algorithms", "topics": ["Merge Sort", "Binary Trees", "Graph Traversal", ...]}}
        - If material is about loops, functions, variables: {{"subject": "Programming Fundamentals", "topics": ["Loops", "Functions", "Variables", ...]}}
        - If material is about chemical reactions: {{"subject": "Chemistry", "topics": ["Chemical Reactions", "Stoichiometry", ...]}}
        
        Return ONLY the JSON object, nothing else.
        """

        logger.info(f"Prompt length: {len(prompt)} characters")
        logger.info(f"Prompt preview (first 300 chars): {prompt[:300]}")

        try:
            ai_response = await ai_service.generate_response(
                prompt, temperature=0.3, max_tokens=4096
            )
            logger.info(
                f"AI response length: {len(ai_response) if ai_response else 0} characters"
            )
            if ai_response:
                logger.info(
                    f"AI response preview (first 200 chars): {ai_response[:200]}"
                )
            else:
                logger.warning("AI response is None or empty")
        except Exception as ai_error:
            logger.error(f"AI generation failed: {str(ai_error)}", exc_info=True)
            ai_response = None

        # Parse response
        import re
        import json

        subject = "General"
        topics = []

        # Check if AI response is valid
        if (
            not ai_response
            or not isinstance(ai_response, str)
            or len(ai_response.strip()) == 0
        ):
            logger.warning(
                "AI response is None, invalid, or empty, using fallback extraction"
            )
            # Fallback: try to infer from extracted text
            if extracted_text:
                text_lower = extracted_text[:500].lower()
                if any(
                    word in text_lower
                    for word in [
                        "algorithm",
                        "data structure",
                        "tree",
                        "graph",
                        "sort",
                        "binary",
                        "merge",
                        "dfs",
                        "bfs",
                    ]
                ):
                    subject = "Data Structures & Algorithms"
                elif any(
                    word in text_lower
                    for word in ["chemical", "reaction", "molecule", "compound"]
                ):
                    subject = "Chemistry"
                elif any(
                    word in text_lower
                    for word in [
                        "force",
                        "energy",
                        "motion",
                        "physics",
                        "velocity",
                        "acceleration",
                    ]
                ):
                    subject = "Physics"
                elif any(
                    word in text_lower
                    for word in [
                        "loop",
                        "function",
                        "variable",
                        "class",
                        "python",
                        "java",
                        "programming",
                    ]
                ):
                    subject = "Programming Fundamentals"
                elif any(
                    word in text_lower
                    for word in [
                        "midterm",
                        "exam",
                        "test",
                        "quiz",
                        "cs",
                        "computer science",
                    ]
                ):
                    # Try to extract course name from filename
                    filename_lower = file.filename.lower() if file.filename else ""
                    if "cs" in filename_lower or "computer science" in filename_lower:
                        subject = "Computer Science"
                    elif "math" in filename_lower or "mathematics" in filename_lower:
                        subject = "Mathematics"
                    else:
                        subject = "General"
                else:
                    subject = "General"
            else:
                subject = "General"

            return JSONResponse(
                content={
                    "topics": topics,
                    "subject": subject,
                }
            )

        # Try to extract JSON object
        json_match = re.search(
            r'\{.*?"subject".*?"topics".*?\}', ai_response, re.DOTALL
        )
        if json_match:
            try:
                data = json.loads(json_match.group(0))
                subject = data.get("subject", "General")
                topics = data.get("topics", [])
            except json.JSONDecodeError:
                # Try to fix JSON
                json_str = json_match.group(0)
                json_str = re.sub(
                    r",(\s*[}\]])", r"\1", json_str
                )  # Remove trailing commas
                try:
                    data = json.loads(json_str)
                    subject = data.get("subject", "General")
                    topics = data.get("topics", [])
                except:
                    pass

        # Fallback: extract topics from array if JSON parsing failed
        if not topics:
            topics_match = re.search(r"\[(.*?)\]", ai_response)
            if topics_match:
                topics_str = topics_match.group(1)
                topics = re.findall(r'"([^"]+)"', topics_str)
            else:
                # Fallback: try to extract from text
                lines = ai_response.split("\n")
                for line in lines[:5]:
                    line = line.strip().strip("-").strip("*").strip()
                    if line and len(line) < 50:
                        topics.append(line)

        # Try to extract subject if not found
        if subject == "General":
            # Look for common subject patterns in response
            subject_patterns = [
                r'"subject"\s*:\s*"([^"]+)"',
                r"subject[:\s]+([A-Z][^,\n]+)",
            ]
            for pattern in subject_patterns:
                match = re.search(pattern, ai_response, re.IGNORECASE)
                if match:
                    subject = match.group(1).strip()
                    break

        # Limit to 5 topics
        topics = topics[:5]

        # Clean up subject name
        subject = subject.strip().strip('"').strip("'")
        if not subject or len(subject) < 2:
            # Infer from topics if subject not found
            if topics:
                first_topic = topics[0].lower()
                if any(
                    word in first_topic
                    for word in ["algorithm", "data structure", "tree", "graph", "sort"]
                ):
                    subject = "Data Structures & Algorithms"
                elif any(
                    word in first_topic
                    for word in ["loop", "function", "variable", "class"]
                ):
                    subject = "Programming Fundamentals"
                elif any(
                    word in first_topic for word in ["chemical", "reaction", "molecule"]
                ):
                    subject = "Chemistry"
                elif any(
                    word in first_topic
                    for word in ["force", "energy", "motion", "physics"]
                ):
                    subject = "Physics"
                else:
                    subject = "General"
            else:
                subject = "General"

        logger.info(f"Extracted subject: '{subject}', topics: {topics}")

        # Store material in Supabase (optional - not critical if it fails)
        try:
            import os

            file_size = len(file_content)
            file_type = (
                os.path.splitext(file.filename)[1][1:]
                if "." in file.filename
                else "unknown"
            )
            await supabase_service.save_uploaded_material(
                user_id=user_id,
                filename=file.filename,
                file_type=file_type,
                file_size=file_size,
                extracted_text=extracted_text[:1000],  # Store first 1000 chars
                topics=topics,
                subject=subject,  # Store the extracted subject
            )
        except Exception as e:
            logger.warning(f"Failed to store material: {str(e)}")

        return JSONResponse(
            content={
                "topics": topics,
                "subject": subject,
            }
        )

    except Exception as e:
        logger.error(f"Failed to extract topics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to extract topics: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Failed to extract topics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to extract topics: {str(e)}"
        )


@app.post("/api/quiz/results")
async def save_quiz_result(request: dict):
    """Save quiz result"""
    try:
        logger.info(
            f"Saving quiz result: user_id={request.get('user_id')}, quiz_id={request.get('quiz_id')}"
        )

        # Try to save result even if quiz doesn't exist in database (temporary ID)
        # Include quiz metadata so we can display it even without the quiz record
        try:
            await supabase_service.save_quiz_result(
                user_id=request.get("user_id"),
                quiz_id=request.get("quiz_id"),
                score=request.get("score"),
                answers=request.get("answers", []),
                weak_topics=request.get("weak_topics", []),
                time_spent=request.get("time_spent"),
                quiz_title=request.get("quiz_title"),
                quiz_topics=request.get("quiz_topics", []),
                correct_count=request.get("correct_count"),
                wrong_count=request.get("wrong_count"),
                total_questions=request.get("total_questions"),
            )
            logger.info("Quiz result saved successfully")
        except Exception as e:
            logger.warning(
                f"Failed to save quiz result to database (might be temporary quiz ID): {str(e)}"
            )
            # Don't fail completely - still update RAG

        # Update user weaknesses in RAG regardless of database save
        if request.get("weak_topics"):
            try:
                await rag_service.update_user_weakness(
                    user_id=request.get("user_id"),
                    topics=request.get("weak_topics"),
                    performance_data={"score": request.get("score")},
                )
            except Exception as e:
                logger.warning(f"Failed to update RAG weaknesses: {str(e)}")

        return JSONResponse(content={"message": "Quiz result saved successfully"})

    except Exception as e:
        logger.error(f"Failed to save quiz result: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to save quiz result: {str(e)}"
        )


@app.post("/api/quiz/summary")
async def save_quiz_summary(request: dict):
    """Save complete quiz summary with recommendations"""
    try:
        logger.info(
            f"Saving quiz summary: user_id={request.get('user_id')}, quiz_id={request.get('quiz_id')}"
        )

        # Update existing quiz result with summary data
        try:
            # Get the most recent quiz result for this quiz_id
            results = await supabase_service.get_user_quiz_results(
                request.get("user_id")
            )
            result = next(
                (r for r in results if r.get("quiz_id") == request.get("quiz_id")), None
            )

            if result:
                # Update the result with summary data
                # Also update completed_at to current time to reflect when quiz was actually completed
                update_data = {
                    "correct_count": request.get("correct_count"),
                    "wrong_count": request.get("wrong_count"),
                    "total_questions": request.get("total_questions"),
                    "weak_areas": request.get("weak_areas", []),
                    "recommended_resources": request.get("recommended_resources", []),
                    "completed_at": datetime.now(
                        timezone.utc
                    ).isoformat(),  # Update timestamp to current time
                }

                # Update via Supabase - MUST include user_id in WHERE clause for RLS
                try:
                    update_result = (
                        supabase_service.client.table("quiz_results")
                        .update(update_data)
                        .eq("id", result["id"])
                        .eq("user_id", request.get("user_id"))
                        .execute()
                    )

                    if update_result.data:
                        logger.info(
                            f"✅ Quiz summary updated successfully: {result['id']}"
                        )
                        logger.info(
                            f"   Updated: correct_count={update_data.get('correct_count')}, wrong_count={update_data.get('wrong_count')}"
                        )
                    else:
                        logger.warning(
                            "⚠️  Update returned no data - RLS might be blocking"
                        )
                        raise Exception("Update returned no data - RLS issue")
                except Exception as update_error:
                    logger.error(
                        f"❌ Failed to update quiz summary: {str(update_error)}"
                    )
                    raise
            else:
                # If no result found, create a new one
                await supabase_service.save_quiz_result(
                    user_id=request.get("user_id"),
                    quiz_id=request.get("quiz_id"),
                    score=request.get("score"),
                    answers=[],
                    weak_topics=[
                        area.get("topic", "") for area in request.get("weak_areas", [])
                    ],
                    correct_count=request.get("correct_count"),
                    wrong_count=request.get("wrong_count"),
                    total_questions=request.get("total_questions"),
                    weak_areas=request.get("weak_areas", []),
                    recommended_resources=request.get("recommended_resources", []),
                )
                logger.info("Quiz summary saved as new result")

        except Exception as e:
            logger.warning(f"Failed to save quiz summary: {str(e)}")

        return JSONResponse(content={"message": "Quiz summary saved successfully"})

    except Exception as e:
        logger.error(f"Failed to save quiz summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to save quiz summary: {str(e)}"
        )


# ==================== RAG-Based Progress Analysis ====================


@app.get("/api/user/{user_id}/rag-progress")
async def get_rag_progress(user_id: str):
    """
    Get comprehensive progress analysis using RAG and AI reasoning
    Analyzes all user data from Supabase to provide holistic insights
    """
    try:
        logger.info(f"Generating RAG-based progress analysis for user: {user_id}")

        # Get all user data from Supabase
        quiz_results = await supabase_service.get_user_quiz_results(user_id)
        midterm_analyses = await supabase_service.get_user_midterm_analyses(user_id)

        if not quiz_results and not midterm_analyses:
            return JSONResponse(
                content={
                    "overall_accuracy": 0,
                    "total_quizzes": 0,
                    "total_midterms": 0,
                    "insights": [
                        "No activity data available yet. Start taking quizzes or uploading midterm reviews!"
                    ],
                    "strengths": [],
                    "weaknesses": [],
                    "improvement_areas": [],
                    "trends": {},
                }
            )

        # Aggregate data for AI analysis
        all_scores = []
        all_topics = {}
        all_weak_topics = []
        total_questions = 0
        total_correct = 0

        for result in quiz_results:
            score = result.get("score", 0)
            all_scores.append(score)
            topics = result.get("quiz_topics", [])
            weak_topics = result.get("weak_topics", [])
            all_weak_topics.extend(weak_topics)

            for topic in topics:
                if topic not in all_topics:
                    all_topics[topic] = {"correct": 0, "total": 0, "scores": []}
                all_topics[topic]["scores"].append(score)

            total_questions += result.get("total_questions", 0)
            total_correct += result.get("correct_count", 0)

        for analysis in midterm_analyses:
            errors = analysis.get("errors", [])
            error_topics = analysis.get("error_topics", [])
            all_weak_topics.extend(error_topics)

            for error in errors:
                topic = error.get("topic", "Unknown")
                if topic not in all_topics:
                    all_topics[topic] = {"correct": 0, "total": 0, "scores": []}
                all_topics[topic]["total"] += 1
                if error.get("correctness", "").lower() == "correct":
                    all_topics[topic]["correct"] += 1

        # Calculate overall metrics
        overall_accuracy = sum(all_scores) / len(all_scores) if all_scores else 0

        # Build AI prompt for insights
        topics_summary = (
            ", ".join(set(all_weak_topics)) if all_weak_topics else "None identified"
        )
        performance_summary = f"""
        User Performance Summary:
        - Total Quizzes: {len(quiz_results)}
        - Total Midterm Reviews: {len(midterm_analyses)}
        - Overall Average Score: {overall_accuracy:.1f}%
        - Total Questions Attempted: {total_questions}
        - Total Correct Answers: {total_correct}
        - Weak Topics Identified: {topics_summary}
        
        Topic Performance:
        {json.dumps({k: {"accuracy": (v["correct"]/v["total"]*100) if v["total"] > 0 else 0, "avg_score": sum(v["scores"])/len(v["scores"]) if v["scores"] else 0} for k, v in all_topics.items()}, indent=2)}
        
        Analyze this performance data and provide:
        1. Key insights about the user's learning journey
        2. Identified strengths (topics with >80% accuracy)
        3. Areas needing improvement (topics with <70% accuracy)
        4. Specific recommendations for improvement
        5. Learning trends (improving, declining, or stable)
        
        Return a JSON object with: insights (array of strings), strengths (array of topic names), weaknesses (array of topic names), improvement_areas (array of detailed recommendations), trends (object with trend analysis).
        """

        # Get AI analysis
        ai_response = await ai_service.generate_response(
            performance_summary, temperature=0.7, max_tokens=4096
        )

        # Parse AI response
        try:
            import json

            json_match = re.search(r"\{.*\}", ai_response, re.DOTALL)
            if json_match:
                ai_analysis = json.loads(json_match.group(0))
            else:
                # Fallback parsing
                ai_analysis = {
                    "insights": [ai_response[:200] + "..."],
                    "strengths": [],
                    "weaknesses": list(set(all_weak_topics))[:5],
                    "improvement_areas": [
                        "Focus on weak topics identified in your quizzes"
                    ],
                    "trends": {},
                }
        except:
            ai_analysis = {
                "insights": ["Performance analysis completed"],
                "strengths": [],
                "weaknesses": list(set(all_weak_topics))[:5],
                "improvement_areas": ["Continue practicing weak topics"],
                "trends": {},
            }

        # Calculate topic accuracies
        topic_performance = {}
        for topic, data in all_topics.items():
            if data["total"] > 0:
                topic_performance[topic] = {
                    "accuracy": round((data["correct"] / data["total"]) * 100, 1),
                    "avg_score": (
                        round(sum(data["scores"]) / len(data["scores"]), 1)
                        if data["scores"]
                        else 0
                    ),
                }

        return JSONResponse(
            content={
                "overall_accuracy": round(overall_accuracy, 1),
                "total_quizzes": len(quiz_results),
                "total_midterms": len(midterm_analyses),
                "total_questions": total_questions,
                "total_correct": total_correct,
                "insights": ai_analysis.get("insights", []),
                "strengths": ai_analysis.get("strengths", []),
                "weaknesses": ai_analysis.get(
                    "weaknesses", list(set(all_weak_topics))[:10]
                ),
                "improvement_areas": ai_analysis.get("improvement_areas", []),
                "trends": ai_analysis.get("trends", {}),
                "topic_performance": topic_performance,
            }
        )

    except Exception as e:
        logger.error(f"Failed to get RAG progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


@app.get("/api/user/{user_id}/rag-resources")
async def get_rag_resources(user_id: str):
    """
    Get holistic study resources based on all user weaknesses and performance
    Uses AI to identify overall study needs and Perplexity for resources
    Implements caching to avoid regenerating resources if no new data exists
    """
    try:
        logger.info(f"Getting holistic resources for user: {user_id}")

        # Check for cached resources and latest activity timestamp
        cached_resources = await supabase_service.get_cached_resources(user_id)
        latest_activity_timestamp = (
            await supabase_service.get_latest_activity_timestamp(user_id)
        )

        # If cache exists and no new activity, return cached data
        if cached_resources and latest_activity_timestamp:
            cache_data_timestamp = cached_resources.get("data_timestamp")
            if (
                cache_data_timestamp
                and cache_data_timestamp >= latest_activity_timestamp
            ):
                logger.info(
                    f"Returning cached resources for user {user_id} (no new data since cache)"
                )
                return JSONResponse(
                    content={
                        "resources": cached_resources.get("resources", []),
                        "recommended_topics": cached_resources.get(
                            "recommended_topics", []
                        ),
                        "learning_path": cached_resources.get("learning_path", ""),
                        "total_weak_topics": cached_resources.get(
                            "total_weak_topics", 0
                        ),
                        "cached": True,
                        "cached_at": cached_resources.get("cached_at"),
                    }
                )
            else:
                logger.info(
                    f"Cache exists but new data found, regenerating resources for user {user_id}"
                )

        # Get all user data (needed for regeneration)
        logger.info(f"Generating new resources for user: {user_id}")
        quiz_results = await supabase_service.get_user_quiz_results(user_id)
        midterm_analyses = await supabase_service.get_user_midterm_analyses(user_id)
        weaknesses = await rag_service.get_user_weaknesses(user_id)

        # Aggregate all weak topics with subject context
        all_weak_topics = set()
        topics_by_subject = {}  # Group topics by subject for equal distribution
        performance_context = []

        # Helper function to extract subject from title
        def extract_subject(title: str) -> str:
            """Extract subject from quiz/midterm title"""
            if not title:
                return "General"
            # Remove common suffixes
            title_clean = (
                title.replace(" Quiz", "")
                .replace(" Error Quiz", "")
                .replace(" Assessment", "")
                .replace(" Test", "")
                .replace(" Exam", "")
                .strip()
            )
            # Extract first 1-2 words as subject
            words = title_clean.split()
            if len(words) >= 2 and (words[0] + " " + words[1]).lower() in [
                "computer science",
                "data structures",
                "organic chemistry",
                "inorganic chemistry",
            ]:
                return words[0] + " " + words[1]
            return words[0] if words else "General"

        # Collect topics with subject information from quizzes
        for result in quiz_results:
            weak_topics = result.get("weak_topics", [])
            all_weak_topics.update(weak_topics)
            quiz_title = result.get("quiz_title", "")
            subject = extract_subject(quiz_title)

            if subject not in topics_by_subject:
                topics_by_subject[subject] = set()
            topics_by_subject[subject].update(weak_topics)

            performance_context.append(
                f"Quiz ({subject}): {result.get('score', 0)}% score, weak in {', '.join(weak_topics)}"
            )

        # Collect topics with subject information from midterms
        for analysis in midterm_analyses:
            error_topics = analysis.get("error_topics", [])
            all_weak_topics.update(error_topics)
            course_name = analysis.get("course_name", "")
            subject = extract_subject(course_name) if course_name else "General"

            if subject not in topics_by_subject:
                topics_by_subject[subject] = set()
            topics_by_subject[subject].update(error_topics)

            total_errors = analysis.get("total_errors", 0)
            performance_context.append(
                f"Midterm ({subject}): {total_errors} errors in {', '.join(error_topics)}"
            )

        # Add RAG weaknesses (assign to "General" if no subject context)
        if weaknesses.get("topics"):
            all_weak_topics.update(weaknesses["topics"])
            if "General" not in topics_by_subject:
                topics_by_subject["General"] = set()
            topics_by_subject["General"].update(weaknesses["topics"])

        if not all_weak_topics:
            return JSONResponse(
                content={
                    "resources": [],
                    "recommended_topics": [],
                    "message": "No weak areas identified yet. Keep learning!",
                }
            )

        # Use AI to analyze all topics holistically (not prioritize, just categorize)
        topics_list = list(all_weak_topics)
        subjects_list = list(topics_by_subject.keys())

        ai_prompt = f"""
        Analyze these learning weaknesses holistically across multiple subjects: {', '.join(subjects_list)}
        
        Weak topics by subject:
        {chr(10).join([f"{subject}: {', '.join(list(topics_by_subject[subject])[:10])}" for subject in subjects_list])}
        
        User performance context:
        {chr(10).join(performance_context[:10])}
        
        Provide holistic analysis:
        1. How topics across different subjects relate to each other
        2. Recommended learning approach that gives equal attention to all subjects
        3. Overall difficulty level assessment
        4. Learning path that balances all subjects
        
        IMPORTANT: Do NOT prioritize one subject over another. Give equal importance to all subjects.
        
        Return JSON: {{"learning_path": "description covering all subjects equally", "difficulty": "beginner/intermediate/advanced", "subject_balance": "description of how to balance learning across subjects"}}
        """

        ai_response = await ai_service.generate_response(
            ai_prompt, temperature=0.6, max_tokens=4096
        )

        try:
            import json
            import re

            json_match = re.search(r"\{.*\}", ai_response, re.DOTALL)
            if json_match:
                ai_analysis = json.loads(json_match.group(0))
            else:
                ai_analysis = {
                    "learning_path": "Focus on all weak areas across different subjects equally",
                    "difficulty": "intermediate",
                    "subject_balance": "Balance learning time across all subjects",
                }
        except:
            ai_analysis = {
                "learning_path": "Focus on all weak areas across different subjects equally",
                "difficulty": "intermediate",
                "subject_balance": "Balance learning time across all subjects",
            }

        # Get resources from Perplexity - distribute evenly across all subjects
        # Calculate resources per subject to ensure equal representation
        max_resources_per_subject = max(
            3, 15 // max(len(subjects_list), 1)
        )  # Distribute 15 resources across subjects
        all_resources = []

        # Process each subject equally
        for subject in subjects_list:
            subject_topics = list(topics_by_subject[subject])
            if not subject_topics:
                continue

            # Get resources for this subject's topics
            # Limit topics per subject to ensure we don't over-represent one subject
            topics_to_search = subject_topics[
                : min(5, len(subject_topics))
            ]  # Use up to 5 topics per subject

            for topic in topics_to_search:
                try:
                    query = f"Comprehensive study materials for learning {topic} in {subject}. Include tutorials, practice problems, video explanations, and written guides suitable for {ai_analysis.get('difficulty', 'intermediate')} level. IMPORTANT: Only return resources that are completely free to access, no paywalls, no subscriptions required. Include free videos (YouTube, educational platforms), free articles, free research papers, open-access journals, free tutorials, and free practice problems. Exclude any resources that require payment, subscription, or registration fees."
                    resources = await perplexity_service.search_materials(
                        query,
                        max_results=max(
                            2, max_resources_per_subject // len(topics_to_search)
                        ),
                    )
                    for resource in resources:
                        resource["primary_topic"] = topic
                        resource["subject"] = subject
                    all_resources.extend(resources)

                    # Stop if we have enough resources for this subject
                    if (
                        len([r for r in all_resources if r.get("subject") == subject])
                        >= max_resources_per_subject
                    ):
                        break
                except Exception as e:
                    logger.warning(
                        f"Failed to get resources for {topic} ({subject}): {str(e)}"
                    )

        # Deduplicate resources
        seen_urls = set()
        unique_resources = []
        for resource in all_resources:
            url = resource.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_resources.append(resource)

        # Ensure balanced distribution - if one subject has too many, redistribute
        resources_by_subject = {}
        for resource in unique_resources:
            subject = resource.get("subject", "General")
            if subject not in resources_by_subject:
                resources_by_subject[subject] = []
            resources_by_subject[subject].append(resource)

        # Balance resources across subjects (max 5 per subject, then fill remaining slots)
        balanced_resources = []
        max_per_subject = 5
        for subject in subjects_list:
            subject_resources = resources_by_subject.get(subject, [])
            balanced_resources.extend(subject_resources[:max_per_subject])

        # If we have space, add more from subjects that need more resources
        remaining_slots = 15 - len(balanced_resources)
        if remaining_slots > 0:
            for subject in subjects_list:
                if remaining_slots <= 0:
                    break
                subject_resources = resources_by_subject.get(subject, [])
                already_added = len(
                    [r for r in balanced_resources if r.get("subject") == subject]
                )
                additional = subject_resources[
                    already_added : already_added + remaining_slots
                ]
                balanced_resources.extend(additional)
                remaining_slots -= len(additional)

        # Use all topics as recommended (not just priority ones)
        all_recommended_topics = list(all_weak_topics)

        resources_response = {
            "resources": balanced_resources[:15],  # Limit to 15 resources
            "recommended_topics": all_recommended_topics,  # All topics, not just priority
            "learning_path": ai_analysis.get(
                "learning_path",
                "Focus on all weak areas across different subjects equally",
            ),
            "total_weak_topics": len(all_weak_topics),
            "subjects_covered": subjects_list,  # List of all subjects
            "cached": False,
        }

        # Cache the resources with the current activity timestamp
        if latest_activity_timestamp:
            await supabase_service.save_cached_resources(
                user_id, resources_response, latest_activity_timestamp
            )
            logger.info(f"Cached resources for user {user_id}")

        return JSONResponse(content=resources_response)

    except Exception as e:
        logger.error(f"Failed to get RAG resources: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to get resources: {str(e)}"
        )


@app.post("/api/user/{user_id}/rag-quiz/generate")
async def generate_rag_quiz(user_id: str, num_questions: int = 10):
    """
    Generate a holistic RAG-based quiz that evaluates overall performance
    Analyzes all mistakes and weaknesses to create comprehensive assessment
    """
    try:
        logger.info(f"Generating RAG-based quiz for user: {user_id}")

        # Get all user data
        quiz_results = await supabase_service.get_user_quiz_results(user_id)
        midterm_analyses = await supabase_service.get_user_midterm_analyses(user_id)
        weaknesses = await rag_service.get_user_weaknesses(user_id)

        # Aggregate all weaknesses and mistakes
        all_weak_topics = set()
        all_mistakes = []

        for result in quiz_results:
            weak_topics = result.get("weak_topics", [])
            all_weak_topics.update(weak_topics)
            answers = result.get("answers", [])
            for answer in answers:
                if not answer.get("is_correct", True):
                    all_mistakes.append(
                        {
                            "type": "quiz",
                            "topic": answer.get("topic", "Unknown"),
                            "error": answer.get("selected_answer", ""),
                        }
                    )

        for analysis in midterm_analyses:
            error_topics = analysis.get("error_topics", [])
            all_weak_topics.update(error_topics)
            errors = analysis.get("errors", [])
            for error in errors:
                all_mistakes.append(
                    {
                        "type": "midterm",
                        "topic": error.get("topic", "Unknown"),
                        "error": error.get("yourAnswer", ""),
                        "correct": error.get("correctAnswer", ""),
                    }
                )

        if weaknesses.get("topics"):
            all_weak_topics.update(weaknesses["topics"])

        if not all_weak_topics:
            raise HTTPException(
                status_code=400,
                detail="No weaknesses identified. Complete some quizzes or midterm reviews first.",
            )

        # Build comprehensive prompt for quiz generation
        topics_str = ", ".join(list(all_weak_topics)[:10])
        mistakes_summary = json.dumps(all_mistakes[:20], indent=2)

        quiz_prompt = f"""
        Generate a comprehensive {num_questions}-question quiz that evaluates the user's understanding across their identified weak areas.
        
        User's Weak Topics: {topics_str}
        
        Common Mistakes Made:
        {mistakes_summary}
        
        Create questions that:
        1. Cover the most critical weak topics
        2. Test understanding at different difficulty levels
        3. Address common mistakes the user has made
        4. Include a mix of conceptual and application questions
        
        Return ONLY a valid JSON array of questions. Each question should have:
        {{
            "id": "q1",
            "question": "question text",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": "option1",
            "topic": "topic name",
            "difficulty": "easy/medium/hard",
            "explanation": "why this answer is correct"
        }}
        """

        # Increase max_tokens based on number of questions to prevent truncation
        # Estimate: ~300-400 tokens per question, so for 20 questions we need ~8000 tokens
        max_tokens_for_quiz = min(8192, max(4096, num_questions * 400))

        ai_response = await ai_service.generate_response(
            quiz_prompt, temperature=0.7, max_tokens=max_tokens_for_quiz
        )

        # Parse quiz questions
        questions = await ai_service.parse_quiz_questions(ai_response)

        # Randomize option positions to prevent pattern guessing
        questions = randomize_question_options(questions)

        # Ensure we have exactly num_questions questions
        if not questions or len(questions) < num_questions:
            # Fallback: generate basic questions
            questions = questions or []  # Keep any questions we got from AI
            topics_list = list(all_weak_topics)

            # If we have fewer topics than questions, repeat topics
            while len(topics_list) < num_questions:
                topics_list.extend(list(all_weak_topics))

            # Generate exactly num_questions questions
            for i in range(len(questions), num_questions):
                topic = topics_list[i % len(topics_list)] if topics_list else "General"
                questions.append(
                    {
                        "id": f"q{i+1}",
                        "question": f"Test your understanding of {topic}",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correctAnswer": "Option A",
                        "topic": topic,
                        "difficulty": "medium",
                        "explanation": "This question tests your knowledge of " + topic,
                    }
                )

        # Ensure we don't exceed num_questions
        questions = questions[:num_questions]

        # Generate AI title for RAG quiz based on weak topics
        rag_quiz_title = "RAG-Based Comprehensive Assessment"
        if all_weak_topics:
            try:
                generated_title = await ai_service.generate_quiz_title(
                    list(all_weak_topics)
                )
                rag_quiz_title = f"RAG-Based {generated_title}"
                logger.info(
                    f"Generated AI title for RAG quiz: '{rag_quiz_title}' from topics: {list(all_weak_topics)[:5]}"
                )
            except Exception as e:
                logger.warning(f"Failed to generate AI title for RAG quiz: {str(e)}")

        # Save quiz to database
        try:
            quiz_id = await supabase_service.save_quiz(
                user_id=user_id,
                title=rag_quiz_title,
                topics=list(all_weak_topics),
                questions=questions[:num_questions],
                auth_token=None,  # Will use service role key
            )
        except Exception as e:
            logger.warning(f"Failed to save RAG quiz to database: {str(e)}")
            # Generate temporary ID
            quiz_id = f"rag_quiz_{user_id}_{int(datetime.now().timestamp())}"

        return JSONResponse(
            content={
                "quiz_id": quiz_id,
                "title": rag_quiz_title,
                "questions": questions[:num_questions],
                "topics": list(all_weak_topics),
                "description": f"Holistic quiz covering {len(all_weak_topics)} weak areas identified from your learning history",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate RAG quiz: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate quiz: {str(e)}"
        )


@app.get("/api/user/{user_id}/comprehensive-study-report")
async def generate_comprehensive_study_report(user_id: str):
    """
    Generate a comprehensive PDF report of the user's entire study analysis
    Uses Nemotron model to analyze all learning data and create detailed insights
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        import io

        logger.info(f"Generating comprehensive study report for user: {user_id}")

        # Get all user data
        quiz_results = await supabase_service.get_user_quiz_results(user_id)
        midterm_analyses = await supabase_service.get_user_midterm_analyses(user_id)
        weaknesses = await rag_service.get_user_weaknesses(user_id)

        # Get RAG progress analysis
        progress_data = None
        try:
            # Reuse the RAG progress logic
            all_scores = []
            all_topics = {}
            all_weak_topics = []
            total_questions = 0
            total_correct = 0

            for result in quiz_results:
                score = result.get("score", 0)
                all_scores.append(score)
                topics = result.get("quiz_topics", [])
                weak_topics = result.get("weak_topics", [])
                all_weak_topics.extend(weak_topics)
                total_questions += result.get("total_questions", 0)
                total_correct += result.get("correct_count", 0)

            for analysis in midterm_analyses:
                errors = analysis.get("errors", [])
                error_topics = analysis.get("error_topics", [])
                all_weak_topics.extend(error_topics)

            overall_accuracy = sum(all_scores) / len(all_scores) if all_scores else 0

            # Initialize pattern tracking variables
            patterns_analysis = []
            hidden_patterns = []

            # Deep analysis of learning patterns
            patterns_analysis = []
            hidden_patterns = []

            # Pattern 1: Performance trends over time
            if len(quiz_results) >= 3:
                recent_scores = [r.get("score", 0) for r in quiz_results[:3]]
                older_scores = (
                    [r.get("score", 0) for r in quiz_results[-3:]]
                    if len(quiz_results) >= 6
                    else []
                )
                if older_scores:
                    recent_avg = sum(recent_scores) / len(recent_scores)
                    older_avg = sum(older_scores) / len(older_scores)
                    if recent_avg > older_avg + 5:
                        patterns_analysis.append(
                            f"IMPROVING TREND: Recent quiz scores ({recent_avg:.1f}%) are significantly higher than earlier scores ({older_avg:.1f}%), showing {recent_avg - older_avg:.1f}% improvement."
                        )
                        hidden_patterns.append(
                            "You're showing strong upward momentum - your recent performance suggests effective learning strategies are working."
                        )
                    elif recent_avg < older_avg - 5:
                        patterns_analysis.append(
                            f"DECLINING TREND: Recent scores ({recent_avg:.1f}%) are lower than earlier ({older_avg:.1f}%), indicating potential knowledge retention issues."
                        )
                        hidden_patterns.append(
                            "Your performance has declined recently - consider reviewing previously mastered topics to maintain retention."
                        )

            # Pattern 2: Topic-specific performance
            topic_performance_map = {}
            for result in quiz_results:
                topics = result.get("quiz_topics", [])
                weak_topics = result.get("weak_topics", [])
                score = result.get("score", 0)
                for topic in topics:
                    if topic not in topic_performance_map:
                        topic_performance_map[topic] = {
                            "scores": [],
                            "weak_count": 0,
                            "total": 0,
                        }
                    topic_performance_map[topic]["scores"].append(score)
                    topic_performance_map[topic]["total"] += 1
                    if topic in weak_topics:
                        topic_performance_map[topic]["weak_count"] += 1

            # Find consistently weak topics
            consistently_weak = []
            for topic, data in topic_performance_map.items():
                if data["total"] >= 2:
                    weak_ratio = data["weak_count"] / data["total"]
                    avg_score = sum(data["scores"]) / len(data["scores"])
                    if weak_ratio >= 0.6 or avg_score < 50:
                        consistently_weak.append(
                            f"{topic} (appeared in {data['total']} quizzes, weak in {data['weak_count']} of them, avg score: {avg_score:.1f}%)"
                        )

            if consistently_weak:
                patterns_analysis.append(
                    f"CONSISTENT WEAKNESS PATTERN: These topics appear repeatedly as weak areas: {', '.join(consistently_weak[:5])}"
                )
                hidden_patterns.append(
                    f"Hidden pattern detected: You struggle with {consistently_weak[0].split(' (')[0]} across multiple assessments - this indicates a fundamental gap that needs systematic review."
                )

            # Pattern 3: Time spent vs performance correlation
            time_performance = []
            for result in quiz_results:
                time_spent = result.get("time_spent", 0)
                score = result.get("score", 0)
                if time_spent > 0:
                    time_performance.append({"time": time_spent, "score": score})

            if len(time_performance) >= 3:
                sorted_by_time = sorted(time_performance, key=lambda x: x["time"])
                quick_avg = sum(
                    [t["score"] for t in sorted_by_time[: len(sorted_by_time) // 2]]
                ) / (len(sorted_by_time) // 2)
                slow_avg = sum(
                    [t["score"] for t in sorted_by_time[-len(sorted_by_time) // 2 :]]
                ) / (len(sorted_by_time) // 2)
                if slow_avg > quick_avg + 10:
                    patterns_analysis.append(
                        f"TIME-PERFORMANCE CORRELATION: When you spend more time ({slow_avg:.1f}% avg), you score significantly higher than when rushing ({quick_avg:.1f}% avg)."
                    )
                    hidden_patterns.append(
                        "Hidden insight: Taking your time leads to better results - you may benefit from slowing down and reading questions more carefully."
                    )
                elif quick_avg > slow_avg + 5:
                    patterns_analysis.append(
                        f"EFFICIENCY PATTERN: You perform better when working quickly ({quick_avg:.1f}%) vs slowly ({slow_avg:.1f}%), suggesting strong recall but potential overthinking."
                    )
                    hidden_patterns.append(
                        "Interesting pattern: You score higher when working faster - you might be overthinking on longer assessments. Trust your first instincts more."
                    )

            # Pattern 4: Midterm vs Quiz performance
            if midterm_analyses and quiz_results:
                midterm_avg_errors = sum(
                    [m.get("total_errors", 0) for m in midterm_analyses]
                ) / len(midterm_analyses)
                quiz_avg_score = sum([q.get("score", 0) for q in quiz_results]) / len(
                    quiz_results
                )
                if midterm_avg_errors > 5 and quiz_avg_score < 60:
                    patterns_analysis.append(
                        f"ASSESSMENT TYPE PATTERN: High error rate in midterms ({midterm_avg_errors:.1f} errors avg) combined with lower quiz scores ({quiz_avg_score:.1f}%) suggests difficulty with application-based questions."
                    )
                    hidden_patterns.append(
                        "Pattern identified: You struggle more with comprehensive assessments (midterms) than focused quizzes - focus on connecting concepts across topics."
                    )

            # Pattern 5: Topic clustering
            if len(all_weak_topics) >= 5:
                # Group related topics
                topic_groups = {}
                for topic in set(all_weak_topics):
                    # Simple grouping by keywords
                    if any(
                        kw in topic.lower()
                        for kw in ["algorithm", "sort", "search", "data structure"]
                    ):
                        topic_groups.setdefault(
                            "Algorithms & Data Structures", []
                        ).append(topic)
                    elif any(kw in topic.lower() for kw in ["database", "sql", "data"]):
                        topic_groups.setdefault("Data Management", []).append(topic)
                    elif any(
                        kw in topic.lower()
                        for kw in ["web", "frontend", "backend", "api"]
                    ):
                        topic_groups.setdefault("Web Development", []).append(topic)
                    else:
                        topic_groups.setdefault("Other Topics", []).append(topic)

                largest_group = max(topic_groups.items(), key=lambda x: len(x[1]))
                if len(largest_group[1]) >= 3:
                    patterns_analysis.append(
                        f"TOPIC CLUSTERING PATTERN: {len(largest_group[1])} weak topics cluster around '{largest_group[0]}' - this suggests a knowledge gap in this domain."
                    )
                    hidden_patterns.append(
                        f"Hidden pattern discovered: Multiple weak areas in '{largest_group[0]}' indicate you need foundational review in this entire domain, not just individual topics."
                    )

            # Pattern 6: Question difficulty analysis
            difficulty_pattern = []
            for result in quiz_results:
                correct = result.get("correct_count", 0)
                total = result.get("total_questions", 0)
                if total > 0:
                    accuracy = (correct / total) * 100
                    if accuracy < 40:
                        difficulty_pattern.append("very difficult")
                    elif accuracy < 60:
                        difficulty_pattern.append("moderate")
                    else:
                        difficulty_pattern.append("easier")

            if difficulty_pattern:
                very_difficult_ratio = difficulty_pattern.count("very difficult") / len(
                    difficulty_pattern
                )
                if very_difficult_ratio > 0.4:
                    patterns_analysis.append(
                        f"DIFFICULTY PATTERN: {very_difficult_ratio*100:.0f}% of your assessments show very low accuracy (<40%), indicating you're attempting content beyond your current level."
                    )
                    hidden_patterns.append(
                        "Critical insight: You're consistently scoring below 40% on many assessments - consider focusing on foundational concepts before advancing to complex topics."
                    )

            # Pattern 7: Consistency analysis
            if len(all_scores) >= 4:
                score_variance = sum(
                    [(s - overall_accuracy) ** 2 for s in all_scores]
                ) / len(all_scores)
                std_dev = score_variance**0.5
                if std_dev > 20:
                    patterns_analysis.append(
                        f"INCONSISTENCY PATTERN: High score variance (std dev: {std_dev:.1f}%) suggests inconsistent preparation or topic-specific strengths/weaknesses."
                    )
                    hidden_patterns.append(
                        "Pattern detected: Your performance varies widely - identify what you do differently on high-scoring assessments and replicate those strategies."
                    )
                elif std_dev < 10:
                    patterns_analysis.append(
                        f"CONSISTENCY PATTERN: Low variance (std dev: {std_dev:.1f}%) shows stable performance, but also suggests you may be plateauing."
                    )
                    hidden_patterns.append(
                        "Insight: Your scores are very consistent - to break through, try challenging yourself with more difficult material or different study methods."
                    )

            # Build detailed data summary for AI
            quiz_details = []
            for i, result in enumerate(quiz_results[:10], 1):  # Limit to 10 most recent
                quiz_details.append(
                    f"Quiz {i}: Score {result.get('score', 0)}%, "
                    f"{result.get('correct_count', 0)}/{result.get('total_questions', 0)} correct, "
                    f"Time: {result.get('time_spent', 0)}s, "
                    f"Topics: {', '.join(result.get('quiz_topics', [])[:3])}, "
                    f"Weak in: {', '.join(result.get('weak_topics', [])[:2])}"
                )

            midterm_details = []
            for i, analysis in enumerate(
                midterm_analyses[:5], 1
            ):  # Limit to 5 most recent
                midterm_details.append(
                    f"Midterm {i}: {analysis.get('total_errors', 0)} errors, "
                    f"Course: {analysis.get('course_name', 'Unknown')}, "
                    f"Error topics: {', '.join(analysis.get('error_topics', [])[:3])}"
                )

            # Build comprehensive AI analysis prompt with actual data
            analysis_prompt = f"""
            Analyze this student's complete learning journey using the detailed data below. Provide specific, actionable insights based on the actual patterns found in their performance data.
            
            === PERFORMANCE SUMMARY ===
            - Total Quizzes Completed: {len(quiz_results)}
            - Total Midterm Reviews: {len(midterm_analyses)}
            - Overall Average Score: {overall_accuracy:.1f}%
            - Total Questions Attempted: {total_questions}
            - Total Correct Answers: {total_correct}
            - Accuracy Rate: {(total_correct/total_questions*100) if total_questions > 0 else 0:.1f}%
            
            === DETAILED QUIZ HISTORY ===
            {chr(10).join(quiz_details) if quiz_details else 'No quiz data available'}
            
            === DETAILED MIDTERM HISTORY ===
            {chr(10).join(midterm_details) if midterm_details else 'No midterm data available'}
            
            === IDENTIFIED WEAK TOPICS ===
            {', '.join(list(set(all_weak_topics))[:15]) if all_weak_topics else 'None identified'}
            
            === DISCOVERED PATTERNS ===
            {chr(10).join(patterns_analysis) if patterns_analysis else 'No significant patterns detected yet'}
            
            === HIDDEN INSIGHTS ===
            {chr(10).join(hidden_patterns) if hidden_patterns else 'Continue learning to discover patterns'}
            
            === ANALYSIS REQUIREMENTS ===
            Based on this REAL data, provide a COMPREHENSIVE, DETAILED analysis with extensive reasoning:
            
            1. OVERVIEW (5-8 sentences, 150-250 words): 
               - Start with a comprehensive assessment of their learning journey
               - Mention specific numbers: "{len(quiz_results)} quizzes", "{len(midterm_analyses)} midterm reviews", "{overall_accuracy:.1f}% average score", "{total_questions} questions attempted", "{total_correct} correct answers"
               - Analyze their overall progress trajectory (improving, declining, or stable)
               - Reference specific patterns discovered (e.g., "Your recent performance shows a {recent_avg - older_avg:.1f}% decline, indicating...")
               - Provide reasoning for what these numbers mean
               - Discuss the significance of their learning activity level
               - End with an overall assessment of their learning status
            
            2. STRENGTHS (5-8 items, each 2-3 sentences with reasoning):
               - Identify actual strengths from the data with specific evidence
               - If they improved over time, explain WHY this happened and what it means
               - If certain topics score well, list them with specific scores and explain why they're strengths
               - Reference specific quiz numbers or dates if available
               - Explain the significance of each strength
               - Be specific: "In Quiz 3 on [date], you scored 85% on [topic], demonstrating strong understanding of..."
               - Discuss what these strengths indicate about their learning style
            
            3. WEAKNESSES (8-12 items, each 2-3 sentences with detailed analysis):
               - List actual weak topics with specific performance data
               - For each weakness, provide:
                 * The topic name
                 * How many times it appeared as weak (e.g., "appeared in 4 out of 6 quizzes")
                 * Average score on that topic
                 * Specific examples from quiz/midterm history
                 * Reasoning for why this is a weakness
                 * Impact on overall performance
               - Reference consistently weak topics with full context
               - Explain the pattern: "This topic appears as a weakness in {X}% of your assessments, suggesting..."
               - Discuss the root cause if identifiable from patterns
            
            4. RECOMMENDATIONS (10-15 detailed items, each 3-5 sentences with extensive reasoning):
               Each recommendation must include:
               - WHAT to do (specific action)
               - WHY to do it (reasoning based on their data/patterns)
               - HOW to do it (step-by-step approach)
               - WHEN to do it (timeline or priority)
               - EXPECTED OUTCOME (what improvement to expect)
               
               Structure recommendations around:
               - Hidden patterns discovered (explain the pattern, why it matters, how to address it)
               - Specific weak topics (name the topic, explain why it's weak, provide targeted study plan)
               - Time-performance correlations (if found, explain the relationship and suggest pacing strategies)
               - Consistency issues (if found, explain the variance and suggest stabilization methods)
               - Topic clusters (if found, explain the domain gap and suggest foundational review)
               - Performance trends (if declining, explain why and suggest recovery strategies)
               
               Example format: "Focus intensively on {topic} because it appears as a weakness in {X} of your {Y} assessments with an average score of {Z}%. This indicates a fundamental gap that's affecting your overall performance. Start by reviewing basic concepts through [specific resource type], then practice with [specific practice type] for 2-3 hours daily. Track your progress weekly. You should see improvement within 2-3 weeks, which should raise your overall average by approximately {estimated_improvement}%."
            
            5. STUDY_STRATEGY (8-12 sentences, 200-300 words): 
               A comprehensive, personalized strategy that:
               - Opens with an assessment of their current learning approach based on data
               - References their actual performance patterns with specific numbers
               - Explains WHY a particular approach will work for them (based on patterns)
               - Suggests a specific, phased approach:
                 * Phase 1: Immediate actions (next week)
                 * Phase 2: Short-term goals (next month)
                 * Phase 3: Long-term improvement (next 2-3 months)
               - Mentions their weak topic clusters with reasoning
               - Addresses time management based on time-performance patterns
               - Provides a concrete, week-by-week action plan
               - Explains the expected trajectory of improvement
               - Discusses how to measure progress
               - Ends with motivation based on their specific achievements
            
            === WRITING STYLE ===
            - Use comprehensive, detailed explanations
            - Provide reasoning for every claim
            - Reference specific data points throughout
            - Use professional but accessible language
            - Be encouraging but realistic
            - Show deep analysis, not surface-level observations
            - Connect different data points to reveal insights
            - Explain the "why" behind every recommendation
            
            IMPORTANT: 
            - Make everything specific to THIS student's data
            - Reference actual numbers, topics, dates, and patterns throughout
            - Do NOT use generic advice - every sentence should be personalized
            - Provide extensive reasoning and explanations
            - Show deep analytical thinking
            - Make the report comprehensive and detailed (aim for 1000+ words total)
            
            Return JSON with: {{"overview": "...", "strengths": ["..."], "weaknesses": ["..."], "recommendations": ["..."], "study_strategy": "..."}}
            """

            ai_response = await ai_service.generate_response(
                analysis_prompt, temperature=0.8, max_tokens=4000
            )

            # Store patterns for PDF display
            patterns_for_pdf = {
                "patterns": patterns_analysis,
                "hidden_insights": hidden_patterns,
            }

            # Parse AI response
            try:
                json_match = re.search(r"\{.*\}", ai_response, re.DOTALL)
                if json_match:
                    parsed_data = json.loads(json_match.group(0))
                    # Ensure all fields are in correct format
                    progress_data = {
                        "overview": (
                            str(
                                parsed_data.get(
                                    "overview",
                                    "Comprehensive learning analysis completed",
                                )
                            )
                            if isinstance(parsed_data.get("overview"), (str, dict))
                            else "Comprehensive learning analysis completed"
                        ),
                        "strengths": (
                            parsed_data.get("strengths", [])
                            if isinstance(parsed_data.get("strengths"), list)
                            else []
                        ),
                        "weaknesses": (
                            parsed_data.get(
                                "weaknesses", list(set(all_weak_topics))[:10]
                            )
                            if isinstance(parsed_data.get("weaknesses"), list)
                            else list(set(all_weak_topics))[:10]
                        ),
                        "recommendations": (
                            parsed_data.get(
                                "recommendations",
                                ["Continue practicing identified weak areas"],
                            )
                            if isinstance(parsed_data.get("recommendations"), list)
                            else ["Continue practicing identified weak areas"]
                        ),
                        "study_strategy": (
                            str(
                                parsed_data.get(
                                    "study_strategy",
                                    "Focus on weak topics systematically",
                                )
                            )
                            if isinstance(
                                parsed_data.get("study_strategy"), (str, dict)
                            )
                            else "Focus on weak topics systematically"
                        ),
                    }
                    # If overview is a dict, try to extract text from it
                    if isinstance(progress_data["overview"], dict):
                        progress_data["overview"] = (
                            str(progress_data["overview"])
                            or "Comprehensive learning analysis completed"
                        )
                else:
                    progress_data = {
                        "overview": "Comprehensive learning analysis completed",
                        "strengths": [],
                        "weaknesses": list(set(all_weak_topics))[:10],
                        "recommendations": [
                            "Continue practicing identified weak areas"
                        ],
                        "study_strategy": "Focus on weak topics systematically",
                    }
            except Exception as e:
                logger.warning(f"Failed to parse AI response for report: {str(e)}")
                progress_data = {
                    "overview": "Learning analysis completed",
                    "strengths": [],
                    "weaknesses": list(set(all_weak_topics))[:10],
                    "recommendations": ["Practice weak topics"],
                    "study_strategy": "Systematic review of weak areas",
                }
        except Exception as e:
            logger.warning(f"Failed to get AI analysis for report: {str(e)}")
            progress_data = {
                "overview": "Learning analysis",
                "strengths": [],
                "weaknesses": [],
                "recommendations": [],
                "study_strategy": "",
            }

        # Create PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        y = height - 50

        # Title
        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, y, "Comprehensive Study Analysis Report")
        y -= 40

        # Generated date
        c.setFont("Helvetica", 12)
        c.drawString(
            50, y, f"Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')}"
        )
        y -= 30

        # Overview Section
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, "Executive Summary")
        y -= 25
        c.setFont("Helvetica", 11)
        overview_text = progress_data.get(
            "overview",
            "Comprehensive learning analysis based on all quiz and midterm review data.",
        )
        # Ensure overview_text is a string
        if not isinstance(overview_text, str):
            overview_text = (
                str(overview_text)
                if overview_text
                else "Comprehensive learning analysis based on all quiz and midterm review data."
            )
        # Wrap text
        lines = []
        words = overview_text.split()
        line = ""
        for word in words:
            if c.stringWidth(line + word, "Helvetica", 11) < width - 100:
                line += word + " "
            else:
                if line:
                    lines.append(line.strip())
                line = word + " "
        if line:
            lines.append(line.strip())

        for line in lines[:5]:  # Limit to 5 lines
            c.drawString(70, y, line)
            y -= 15
            if y < 100:
                c.showPage()
                y = height - 50

        y -= 20

        # Performance Metrics
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, "Performance Metrics")
        y -= 25
        c.setFont("Helvetica", 11)
        c.drawString(70, y, f"Total Quizzes Completed: {len(quiz_results)}")
        y -= 15
        c.drawString(70, y, f"Total Midterm Reviews: {len(midterm_analyses)}")
        y -= 15
        c.drawString(70, y, f"Overall Average Score: {overall_accuracy:.1f}%")
        y -= 15
        c.drawString(70, y, f"Total Questions Attempted: {total_questions}")
        y -= 15
        c.drawString(70, y, f"Total Correct Answers: {total_correct}")
        y -= 30

        if y < 150:
            c.showPage()
            y = height - 50

        # Hidden Patterns Section (if available)
        if patterns_analysis or hidden_patterns:
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, y, "Discovered Patterns & Hidden Insights")
            y -= 25
            c.setFont("Helvetica", 11)

            if patterns_analysis:
                c.setFont("Helvetica-Bold", 12)
                c.drawString(70, y, "Performance Patterns:")
                y -= 18
                c.setFont("Helvetica", 10)
                for pattern in patterns_analysis[:5]:  # Limit to 5 patterns
                    # Wrap long patterns
                    words = pattern.split()
                    line = ""
                    for word in words:
                        if c.stringWidth(line + word, "Helvetica", 10) < width - 100:
                            line += word + " "
                        else:
                            if line:
                                c.drawString(80, y, line.strip())
                                y -= 14
                                if y < 100:
                                    c.showPage()
                                    y = height - 50
                            line = word + " "
                    if line:
                        c.drawString(80, y, line.strip())
                        y -= 18
                    if y < 100:
                        c.showPage()
                        y = height - 50

            if hidden_patterns:
                y -= 10
                if y < 150:
                    c.showPage()
                    y = height - 50
                c.setFont("Helvetica-Bold", 12)
                c.drawString(70, y, "Hidden Insights:")
                y -= 18
                c.setFont("Helvetica", 10)
                for insight in hidden_patterns[:4]:  # Limit to 4 insights
                    words = insight.split()
                    line = ""
                    for word in words:
                        if c.stringWidth(line + word, "Helvetica", 10) < width - 100:
                            line += word + " "
                        else:
                            if line:
                                c.drawString(80, y, line.strip())
                                y -= 14
                                if y < 100:
                                    c.showPage()
                                    y = height - 50
                            line = word + " "
                    if line:
                        c.drawString(80, y, line.strip())
                        y -= 18
                    if y < 100:
                        c.showPage()
                        y = height - 50
            y -= 10

        if y < 150:
            c.showPage()
            y = height - 50

        # Strengths
        strengths = progress_data.get("strengths", [])
        if strengths:
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, y, "Strengths")
            y -= 25
            c.setFont("Helvetica", 11)
            for strength in strengths[:10]:
                c.drawString(70, y, f"• {strength}")
                y -= 15
                if y < 100:
                    c.showPage()
                    y = height - 50
            y -= 10

        # Weaknesses
        weaknesses_list = progress_data.get(
            "weaknesses", list(set(all_weak_topics))[:10]
        )
        if weaknesses_list:
            if y < 150:
                c.showPage()
                y = height - 50
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, y, "Areas for Improvement")
            y -= 25
            c.setFont("Helvetica", 11)
            for weakness in weaknesses_list[:15]:
                c.drawString(70, y, f"• {weakness}")
                y -= 15
                if y < 100:
                    c.showPage()
                    y = height - 50
            y -= 10

        # Recommendations
        recommendations = progress_data.get("recommendations", [])
        if recommendations:
            if y < 150:
                c.showPage()
                y = height - 50
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, y, "AI-Generated Recommendations")
            y -= 25
            c.setFont("Helvetica", 11)
            rec_num = 1
            for rec in recommendations[:15]:  # Show up to 15 recommendations
                # Number the recommendation
                c.setFont("Helvetica-Bold", 11)
                c.drawString(70, y, f"Recommendation {rec_num}:")
                y -= 18
                c.setFont("Helvetica", 10)

                # Wrap long recommendations (each can be multiple paragraphs)
                words = rec.split()
                line = ""
                for word in words:
                    if c.stringWidth(line + word, "Helvetica", 10) < width - 100:
                        line += word + " "
                    else:
                        if line:
                            c.drawString(80, y, line.strip())
                            y -= 13
                            if y < 100:
                                c.showPage()
                                y = height - 50
                        line = word + " "
                if line:
                    c.drawString(80, y, line.strip())
                    y -= 18
                if y < 100:
                    c.showPage()
                    y = height - 50
                rec_num += 1

        # Study Strategy
        study_strategy = progress_data.get("study_strategy", "")
        # Ensure study_strategy is a string
        if not isinstance(study_strategy, str):
            study_strategy = str(study_strategy) if study_strategy else ""
        if study_strategy:
            if y < 150:
                c.showPage()
                y = height - 50
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, y, "Comprehensive Study Strategy")
            y -= 25
            c.setFont("Helvetica", 11)
            # Split strategy into paragraphs if it contains newlines
            strategy_paragraphs = (
                study_strategy.split("\n\n")
                if "\n\n" in study_strategy
                else [study_strategy]
            )

            for paragraph in strategy_paragraphs:
                words = paragraph.split()
                line = ""
                for word in words:
                    if c.stringWidth(line + word, "Helvetica", 11) < width - 100:
                        line += word + " "
                    else:
                        if line:
                            c.drawString(70, y, line.strip())
                            y -= 15
                            if y < 100:
                                c.showPage()
                                y = height - 50
                        line = word + " "
                if line:
                    c.drawString(70, y, line.strip())
                    y -= 20  # Extra space between paragraphs
                if y < 100:
                    c.showPage()
                    y = height - 50

        c.save()
        buffer.seek(0)

        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="comprehensive_study_report_{user_id}_{datetime.now().strftime("%Y%m%d")}.pdf"'
            },
        )

    except Exception as e:
        logger.error(
            f"Failed to generate comprehensive study report: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate report: {str(e)}"
        )


@app.get("/api/user/{user_id}/rag-quiz/report")
async def generate_rag_quiz_report(user_id: str, quiz_result_id: str):
    """
    Generate a downloadable PDF report for RAG quiz results
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        import io

        # Get quiz result data
        result = await supabase_service.get_quiz_result_by_id(quiz_result_id, user_id)
        quiz = None
        quiz_id = result.get("quiz_id")
        if quiz_id:
            try:
                quiz = await supabase_service.get_quiz(quiz_id)
            except:
                pass

        # Create PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Title
        c.setFont("Helvetica-Bold", 20)
        c.drawString(50, height - 50, "RAG-Based Assessment Report")

        # User info
        c.setFont("Helvetica", 12)
        c.drawString(
            50,
            height - 80,
            f"Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')}",
        )

        # Score
        score = result.get("score", 0)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 110, f"Overall Score: {score:.1f}%")

        # Performance metrics
        y = height - 150
        c.setFont("Helvetica", 12)
        c.drawString(
            50,
            y,
            f"Correct Answers: {result.get('correct_count', 0)}/{result.get('total_questions', 0)}",
        )
        y -= 20
        c.drawString(50, y, f"Time Spent: {result.get('time_spent', 0)} seconds")

        # Weak areas
        y -= 40
        weak_topics = result.get("weak_topics", [])
        if weak_topics:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y, "Areas Needing Improvement:")
            y -= 20
            c.setFont("Helvetica", 11)
            for topic in weak_topics[:10]:
                c.drawString(70, y, f"• {topic}")
                y -= 15
                if y < 100:
                    c.showPage()
                    y = height - 50

        # Recommendations
        y -= 20
        recommendations = result.get("recommended_resources", [])
        if recommendations:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y, "Recommended Study Resources:")
            y -= 20
            c.setFont("Helvetica", 10)
            for resource in recommendations[:5]:
                title = resource.get("title", resource.get("name", "Resource"))
                c.drawString(70, y, f"• {title[:60]}")
                y -= 15
                if y < 100:
                    c.showPage()
                    y = height - 50

        c.save()
        buffer.seek(0)

        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="rag_quiz_report_{quiz_result_id}.pdf"'
            },
        )

    except Exception as e:
        logger.error(f"Failed to generate PDF report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate report: {str(e)}"
        )


# Background task for hourly updates
async def hourly_rag_update():
    """Check for Supabase changes and update RAG system hourly"""
    try:
        logger.info("Running hourly RAG update check...")

        # Get all users (in production, you'd want to paginate this)
        # For now, we'll just log that the update ran
        # The RAG system updates automatically when new data is stored

        # The actual RAG updates happen when:
        # 1. Quiz results are saved (via store_user_weakness)
        # 2. Midterm analyses are saved (via store_user_weakness)
        # 3. User weaknesses are updated

        # This hourly check ensures the system is running and can trigger
        # any batch processing if needed in the future

        logger.info("Hourly RAG update check completed")
    except Exception as e:
        logger.error(f"Hourly RAG update failed: {str(e)}")


# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    hourly_rag_update,
    trigger=IntervalTrigger(hours=24),
    id="hourly_rag_update",
    name="Hourly RAG System Update",
    replace_existing=True,
)
scheduler.start()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
