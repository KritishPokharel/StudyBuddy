from perplexity import Perplexity
import os
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class PerplexityService:
    """Service for searching study materials using Perplexity API"""

    def __init__(self):
        # Get API key from environment variable
        api_key = os.getenv("PERPLEXITY_API_KEY", "YOUR_PERPLEXITY_API_KEY_HERE")
        self.client = Perplexity(api_key=api_key)

    async def search_materials(
        self, query: str, max_results: int = 5, max_tokens_per_page: int = 1024
    ) -> List[Dict[str, Any]]:
        """
        Search for study materials using Perplexity

        Args:
            query: Search query describing what materials to find
            max_results: Maximum number of results to return
            max_tokens_per_page: Maximum tokens per result page

        Returns:
            List of study materials with title, description, and URL
        """
        try:
            # Create search request
            search = self.client.search.create(
                query=query,
                max_results=max_results,
                max_tokens_per_page=max_tokens_per_page,
            )

            # Extract results
            materials = []
            for result in search.results:
                # Handle different result formats
                title = (
                    getattr(result, "title", None)
                    or getattr(result, "name", None)
                    or "Untitled Resource"
                )
                url = (
                    getattr(result, "url", None) or getattr(result, "link", None) or "#"
                )

                materials.append(
                    {
                        "title": title,
                        "description": self._extract_description(result),
                        "url": url,
                        "source": "Perplexity Search",
                    }
                )

            return materials

        except Exception as e:
            logger.error(f"Perplexity search failed: {str(e)}")
            # Return empty list on error
            return []

    def _extract_description(self, result) -> str:
        """Extract description from Perplexity result"""
        try:
            # Try to get snippet or content
            if hasattr(result, "snippet") and result.snippet:
                return result.snippet[:200]  # Limit to 200 chars
            elif hasattr(result, "content") and result.content:
                return result.content[:200]
            else:
                return "Study material from Perplexity search"
        except:
            return "Study material from Perplexity search"

    async def build_personalized_query(
        self,
        topics: List[str],
        user_weaknesses: List[str],
        context: str = "",
        difficulty_level: str = "intermediate",
    ) -> str:
        """
        Build a personalized search query based on user context

        Args:
            topics: Topics to search for
            user_weaknesses: User's identified weaknesses
            context: Additional context (e.g., quiz results, midterm errors)
            difficulty_level: Difficulty level (beginner, intermediate, advanced)

        Returns:
            Formatted search query
        """
        query_parts = []

        # Add user weaknesses context
        if user_weaknesses:
            query_parts.append(f"User struggles with: {', '.join(user_weaknesses)}")

        # Add topics
        query_parts.append(f"Find study materials for: {', '.join(topics)}")

        # Add difficulty level
        query_parts.append(f"Difficulty level: {difficulty_level}")

        # Add context if provided
        if context:
            query_parts.append(f"Context: {context}")

        # Add material type preferences
        query_parts.append(
            "Include: tutorials, practice problems, video explanations, and written guides"
        )

        # CRITICAL: Only return free, accessible resources
        query_parts.append(
            "IMPORTANT: Only return resources that are completely free to access, no paywalls, no subscriptions required. Include free videos (YouTube, educational platforms), free articles, free research papers, open-access journals, free tutorials, and free practice problems. Exclude any resources that require payment, subscription, or registration fees."
        )

        return ". ".join(query_parts)
