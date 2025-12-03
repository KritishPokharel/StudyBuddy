from supabase import create_client, Client
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class SupabaseService:
    """Service for interacting with Supabase database"""
    
    def __init__(self):
        # Get Supabase credentials from environment variables
        supabase_url = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL_HERE")
        # Use service role key if available (bypasses RLS), otherwise use anon key
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_KEY_HERE")
        
        self.client: Client = create_client(supabase_url, supabase_key)
        
        if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            logger.info("Using Supabase service role key (RLS bypassed)")
        else:
            logger.warning("Using Supabase anon key - RLS policies will apply. Consider using SUPABASE_SERVICE_ROLE_KEY for backend operations.")
    
    async def save_midterm_analysis(
        self,
        user_id: str,
        filename: str,
        course_name: str,
        errors: List[Dict[str, Any]],
        extracted_text: str,
        recommended_resources: Optional[List[Dict[str, Any]]] = None,
        error_topics: Optional[List[str]] = None,
        all_questions: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Save midterm analysis to Supabase with resources and stats
        
        Args:
            user_id: UUID from auth.users.id (Supabase Auth)
            filename: Name of uploaded file
            course_name: Name of the course
            errors: List of error objects
            extracted_text: OCR extracted text
            recommended_resources: List of recommended study resources
            error_topics: List of topics with errors
        
        Returns:
            Analysis ID
        """
        try:
            # Calculate stats from ALL questions (including correct ones) for accurate counts
            # But store only errors in the errors field for display
            questions_for_stats = all_questions if all_questions else errors
            
            total_errors = len(errors)  # Only count errors (for display)
            total_questions = len(questions_for_stats)  # Total questions including correct ones
            
            # Normalize correctness values for comparison (handle case variations)
            correct_count = sum(1 for e in questions_for_stats if str(e.get("correctness", "")).lower().strip() == "correct")
            wrong_count = sum(1 for e in questions_for_stats if str(e.get("correctness", "")).lower().strip() == "incorrect")
            partially_correct_count = sum(1 for e in questions_for_stats if str(e.get("correctness", "")).lower().strip() in ["partially_correct", "partially correct", "partial"])
            
            logger.info(f"Midterm stats calculated: total_questions={total_questions}, total_errors={total_errors}, correct={correct_count}, wrong={wrong_count}, partial={partially_correct_count}")
            
            # Calculate total marks - handle None values properly (from all questions for accuracy)
            total_marks_received = sum(
                (e.get("marksReceived") or 0) if isinstance(e.get("marksReceived"), (int, float)) else 0
                for e in questions_for_stats
            )
            total_marks_possible = sum(
                (e.get("totalMarks") or 0) if isinstance(e.get("totalMarks"), (int, float)) else 0
                for e in questions_for_stats
            )
            
            data = {
                "user_id": user_id,  # This should be auth.users.id UUID
                "filename": filename,
                "course_name": course_name,
                "errors": errors,
                "extracted_text": extracted_text[:5000],  # Limit text length
                "recommended_resources": recommended_resources or [],
                "error_topics": error_topics or [],
                "total_errors": total_errors,
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "partially_correct_count": partially_correct_count,
                "total_marks_received": total_marks_received if total_marks_received > 0 else None,
                "total_marks_possible": total_marks_possible if total_marks_possible > 0 else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.client.table("midterm_analyses").insert(data).execute()
            
            if result.data:
                analysis_id = result.data[0]["id"]
                
                # Also save recommended resources to recommended_resources table
                if recommended_resources and error_topics:
                    await self.save_recommended_resources(
                        user_id=user_id,
                        topics=error_topics,
                        materials=recommended_resources
                    )
                
                return analysis_id
            else:
                raise Exception("Failed to save midterm analysis")
                
        except Exception as e:
            logger.error(f"Failed to save midterm analysis: {str(e)}")
            raise
    
    async def save_quiz(
        self,
        user_id: str,
        title: str,
        questions: List[Dict[str, Any]],
        topics: Optional[List[str]] = None,
        auth_token: Optional[str] = None
    ) -> str:
        """
        Save quiz to Supabase
        
        Args:
            auth_token: Optional JWT token from user session for RLS
        
        Returns:
            Quiz ID
        """
        try:
            # Use service role key if available, otherwise use anon key
            # For RLS to work, we'd need the user's JWT token, but for now
            # we'll just skip database save if it fails (handled in main.py)
            
            data = {
                "user_id": user_id,
                "title": title,
                "questions": questions,
                "topics": topics or [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # If we have auth token, create a new client with it
            if auth_token:
                from supabase import create_client
                client = create_client(
                    os.getenv("SUPABASE_URL"),
                    os.getenv("SUPABASE_KEY"),
                    options={"headers": {"Authorization": f"Bearer {auth_token}"}}
                )
                result = client.table("quizzes").insert(data).execute()
            else:
                result = self.client.table("quizzes").insert(data).execute()
            
            if result.data:
                return result.data[0]["id"]
            else:
                raise Exception("Failed to save quiz")
                
        except Exception as e:
            logger.error(f"Failed to save quiz: {str(e)}")
            raise
    
    async def get_quiz(self, quiz_id: str) -> Dict[str, Any]:
        """Get quiz by ID"""
        try:
            result = self.client.table("quizzes").select("*").eq("id", quiz_id).execute()
            
            if result.data:
                return result.data[0]
            else:
                raise Exception("Quiz not found")
                
        except Exception as e:
            logger.error(f"Failed to get quiz: {str(e)}")
            raise
    
    async def get_user_quizzes(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all quizzes for a user"""
        try:
            result = self.client.table("quizzes").select("*").eq("user_id", user_id).execute()
            
            return result.data or []
                
        except Exception as e:
            logger.error(f"Failed to get user quizzes: {str(e)}")
            return []
    
    async def save_recommended_resources(
        self,
        user_id: str,
        topics: List[str],
        materials: List[Dict[str, Any]]
    ):
        """Save recommended resources to Supabase"""
        try:
            for material in materials:
                data = {
                    "user_id": user_id,
                    "title": material["title"],
                    "description": material["description"],
                    "url": material["url"],
                    "topics": topics,
                    "source": material.get("source", "Perplexity"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                self.client.table("recommended_resources").insert(data).execute()
                
        except Exception as e:
            logger.error(f"Failed to save recommended resources: {str(e)}")
            # Don't raise, as this is not critical
    
    async def save_quiz_result(
        self,
        user_id: str,
        quiz_id: str,
        score: float,
        answers: List[Dict[str, Any]],
        weak_topics: List[str],
        time_spent: Optional[int] = None,
        quiz_title: Optional[str] = None,
        quiz_topics: Optional[List[str]] = None,
        correct_count: Optional[int] = None,
        wrong_count: Optional[int] = None,
        total_questions: Optional[int] = None,
        weak_areas: Optional[List[Dict[str, Any]]] = None,
        recommended_resources: Optional[List[Dict[str, Any]]] = None
    ):
        """Save quiz result to Supabase with complete summary data"""
        try:
            data = {
                "user_id": user_id,
                "quiz_id": quiz_id,
                "score": score,
                "answers": answers,
                "weak_topics": weak_topics,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Add optional fields if provided
            if time_spent is not None:
                data["time_spent"] = time_spent  # in seconds
            if quiz_title:
                data["quiz_title"] = quiz_title
            if quiz_topics:
                data["quiz_topics"] = quiz_topics
            if correct_count is not None:
                data["correct_count"] = correct_count
            if wrong_count is not None:
                data["wrong_count"] = wrong_count
            if total_questions is not None:
                data["total_questions"] = total_questions
            if weak_areas:
                data["weak_areas"] = weak_areas  # JSONB array
            if recommended_resources:
                data["recommended_resources"] = recommended_resources  # JSONB array
            
            result = self.client.table("quiz_results").insert(data).execute()
            logger.info(f"Quiz result saved: quiz_id={quiz_id}, score={score}, correct={correct_count}/{total_questions}")
            return result.data[0]["id"] if result.data else None
                
        except Exception as e:
            logger.error(f"Failed to save quiz result: {str(e)}")
            raise
    
    async def get_user_quiz_results(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all quiz results for a user"""
        try:
            result = self.client.table("quiz_results").select("*").eq("user_id", user_id).order("completed_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get quiz results: {str(e)}")
            return []
    
    async def get_user_midterm_analyses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all midterm analyses for a user"""
        try:
            result = self.client.table("midterm_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get midterm analyses: {str(e)}")
            return []
    
    async def get_latest_activity_timestamp(self, user_id: str) -> Optional[str]:
        """Get the latest activity timestamp from quiz_results or midterm_analyses"""
        try:
            # Get latest quiz result timestamp
            quiz_result = self.client.table("quiz_results").select("completed_at").eq("user_id", user_id).order("completed_at", desc=True).limit(1).execute()
            latest_quiz = quiz_result.data[0].get("completed_at") if quiz_result.data else None
            
            # Get latest midterm analysis timestamp
            midterm_result = self.client.table("midterm_analyses").select("created_at").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
            latest_midterm = midterm_result.data[0].get("created_at") if midterm_result.data else None
            
            # Return the most recent timestamp
            if latest_quiz and latest_midterm:
                return max(latest_quiz, latest_midterm)
            elif latest_quiz:
                return latest_quiz
            elif latest_midterm:
                return latest_midterm
            return None
        except Exception as e:
            logger.error(f"Failed to get latest activity timestamp: {str(e)}")
            return None
    
    async def get_cached_resources(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached resources for a user"""
        try:
            result = self.client.table("user_resources_cache").select("*").eq("user_id", user_id).limit(1).execute()
            if result.data:
                cache_data = result.data[0]
                return {
                    "resources": cache_data.get("resources", []),
                    "recommended_topics": cache_data.get("recommended_topics", []),
                    "learning_path": cache_data.get("learning_path", ""),
                    "total_weak_topics": cache_data.get("total_weak_topics", 0),
                    "cached_at": cache_data.get("cached_at"),
                    "data_timestamp": cache_data.get("data_timestamp")  # Timestamp of data used to generate cache
                }
            return None
        except Exception as e:
            # Table might not exist yet, return None
            logger.debug(f"Cache table may not exist or error getting cache: {str(e)}")
            return None
    
    async def save_cached_resources(self, user_id: str, resources_data: Dict[str, Any], data_timestamp: str):
        """Save cached resources for a user"""
        try:
            cache_data = {
                "user_id": user_id,
                "resources": resources_data.get("resources", []),
                "recommended_topics": resources_data.get("recommended_topics", []),
                "learning_path": resources_data.get("learning_path", ""),
                "total_weak_topics": resources_data.get("total_weak_topics", 0),
                "cached_at": datetime.now().isoformat(),
                "data_timestamp": data_timestamp  # Store the timestamp of the data used
            }
            
            # Try to update existing cache, or insert if doesn't exist
            existing = self.client.table("user_resources_cache").select("id").eq("user_id", user_id).limit(1).execute()
            if existing.data:
                # Update existing
                self.client.table("user_resources_cache").update(cache_data).eq("user_id", user_id).execute()
            else:
                # Insert new
                self.client.table("user_resources_cache").insert(cache_data).execute()
        except Exception as e:
            # Table might not exist, log but don't fail
            logger.warning(f"Failed to save resources cache (table may not exist): {str(e)}")
    
    async def get_midterm_analysis(self, analysis_id: str, user_id: str) -> Dict[str, Any]:
        """Get a specific midterm analysis by ID"""
        try:
            result = self.client.table("midterm_analyses").select("*").eq("id", analysis_id).eq("user_id", user_id).execute()
            if result.data:
                return result.data[0]
            else:
                raise Exception("Midterm analysis not found")
        except Exception as e:
            logger.error(f"Failed to get midterm analysis: {str(e)}")
            raise
    
    async def get_quiz_result_by_id(self, result_id: str, user_id: str) -> Dict[str, Any]:
        """Get a specific quiz result by result ID"""
        try:
            result = self.client.table("quiz_results").select("*").eq("id", result_id).eq("user_id", user_id).execute()
            if result.data:
                return result.data[0]
            else:
                raise Exception("Quiz result not found")
        except Exception as e:
            logger.error(f"Failed to get quiz result: {str(e)}")
            raise
    
    async def save_uploaded_material(
        self,
        user_id: str,
        filename: str,
        file_type: str,
        file_size: int,
        extracted_text: str,
        topics: List[str],
        subject: Optional[str] = None
    ):
        """Save uploaded material metadata"""
        try:
            data = {
                "user_id": user_id,
                "filename": filename,
                "file_type": file_type,
                "file_size": file_size,
                "extracted_text": extracted_text,
                "topics": topics,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Add subject if provided (column may not exist in older schemas)
            if subject:
                data["subject"] = subject
            
            self.client.table("uploaded_materials").insert(data).execute()
        except Exception as e:
            logger.error(f"Failed to save uploaded material: {str(e)}")
            # Don't raise - not critical

