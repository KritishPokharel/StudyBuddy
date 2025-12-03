from openai import OpenAI
import json
import re
import logging
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class AIService:
    """Service for interacting with Nvidia Nemotron model"""

    def __init__(self):
        # Get API key from environment variable
        api_key = os.getenv("NVIDIA_API_KEY", "YOUR_NVIDIA_API_KEY_HERE")
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key,
        )
        self.model = "nvidia/nvidia-nemotron-nano-9b-v2"

    async def generate_response(
        self, prompt: str, temperature: float = 0.6, max_tokens: int = 4096
    ) -> str:
        """
        Generate response using Nvidia Nemotron model

        Args:
            prompt: The prompt to send to the model
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate (default: 4096, can go up to 8192)

        Returns:
            Generated text response
        """
        try:
            # Ensure max_tokens is at least 2048 to prevent cut-off issues
            if max_tokens < 2048:
                logger.warning(
                    f"max_tokens ({max_tokens}) is low, increasing to 2048 to prevent cut-off"
                )
                max_tokens = 2048

            # Cap at 8192 (maximum for most models)
            if max_tokens > 8192:
                logger.warning(
                    f"max_tokens ({max_tokens}) exceeds 8192, capping at 8192"
                )
                max_tokens = 8192

            logger.info(
                f"Sending request to Nvidia Nemotron (model: {self.model}, max_tokens: {max_tokens})"
            )
            logger.debug(f"Prompt preview (first 200 chars): {prompt[:200]}")

            # Use thinking tokens configuration similar to nvidia_code.py
            # This helps the model reason better and prevents cut-off issues
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                top_p=0.95,
                max_tokens=max_tokens,
                frequency_penalty=0,
                presence_penalty=0,
                stream=False,
                extra_body={
                    "min_thinking_tokens": 512,
                    "max_thinking_tokens": min(
                        2048, max_tokens // 2
                    ),  # Use up to half of max_tokens for thinking
                },
            )

            logger.info(f"Received completion object: type={type(completion)}")

            # Extract response with better error handling
            if not completion:
                logger.error("AI completion object is None")
                raise Exception("AI completion object is None")

            if not hasattr(completion, "choices") or not completion.choices:
                logger.error(
                    f"AI response has no choices. Completion object: {completion}"
                )
                logger.error(f"Completion attributes: {dir(completion)}")
                raise Exception("AI response has no choices")

            if len(completion.choices) == 0:
                logger.error("AI response choices array is empty")
                raise Exception("AI response choices array is empty")

            choice = completion.choices[0]
            logger.info(f"Choice object: type={type(choice)}, attributes={dir(choice)}")

            if not hasattr(choice, "message") or not choice.message:
                logger.error(f"AI choice has no message. Choice: {choice}")
                logger.error(f"Choice attributes: {dir(choice)}")
                raise Exception("AI choice has no message")

            message = choice.message
            logger.info(
                f"Message object: type={type(message)}, attributes={dir(message)}"
            )

            # Check finish_reason to understand why content might be None
            finish_reason = getattr(choice, "finish_reason", None)
            logger.info(f"Finish reason: {finish_reason}")

            response_text = message.content
            logger.info(
                f"Response text type: {type(response_text)}, length: {len(response_text) if response_text else 0}"
            )

            # Check if content is None or empty
            if response_text is None:
                logger.warning(
                    "AI response content is None - checking for alternative content fields"
                )

                # For Nvidia Nemotron, content might be in reasoning_content field
                # Try to access the raw message dict
                if hasattr(message, "model_dump"):
                    message_dict = message.model_dump()
                    logger.info(f"Message dict keys: {message_dict.keys()}")

                    # Check for reasoning_content (used when /think is enabled or model uses reasoning)
                    if (
                        "reasoning_content" in message_dict
                        and message_dict["reasoning_content"]
                    ):
                        reasoning = message_dict["reasoning_content"]
                        logger.info(
                            f"Found reasoning_content with {len(reasoning)} characters"
                        )
                        logger.info(
                            f"Reasoning preview (first 500 chars): {reasoning[:500]}"
                        )

                        # Try to extract JSON from reasoning_content if it contains the answer
                        # Sometimes the model puts the final answer in reasoning_content
                        if "{" in reasoning or "[" in reasoning:
                            # Look for JSON in reasoning_content
                            import re

                            json_match = re.search(
                                r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", reasoning, re.DOTALL
                            )
                            if not json_match:
                                json_match = re.search(
                                    r"\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]",
                                    reasoning,
                                    re.DOTALL,
                                )

                            if json_match:
                                response_text = json_match.group(0)
                                logger.info(
                                    f"Extracted JSON from reasoning_content: {len(response_text)} chars"
                                )
                            else:
                                # Use reasoning_content as fallback if it seems to contain the answer
                                # Check if reasoning ends with something that looks like a response
                                if (
                                    "subject" in reasoning.lower()
                                    or "topics" in reasoning.lower()
                                ):
                                    response_text = reasoning
                                    logger.info(
                                        "Using reasoning_content as response (contains subject/topics)"
                                    )
                        else:
                            # Use reasoning_content as fallback
                            response_text = reasoning
                            logger.info("Using reasoning_content as response")

                # Try to get alternative content or return empty string
                # Some models might return content in different fields
                if response_text is None and hasattr(message, "text"):
                    response_text = message.text
                    logger.info(
                        f"Found content in 'text' field: {len(response_text) if response_text else 0} chars"
                    )
                elif response_text is None and hasattr(message, "role"):
                    logger.warning(f"Message has role: {message.role}, but no content")

                # If still None and finish_reason indicates content filtering, log it
                if response_text is None:
                    if finish_reason == "content_filter":
                        logger.error("Content was filtered by the API")
                    elif finish_reason == "length":
                        logger.error(
                            "Response was cut off due to length - consider increasing max_tokens"
                        )
                    else:
                        logger.error(
                            f"No content found in any field. Finish reason: {finish_reason}"
                        )
                    return ""

            if isinstance(response_text, str) and len(response_text.strip()) == 0:
                logger.warning("AI response content is empty string")
                return ""

            logger.info(
                f"Successfully extracted {len(response_text)} characters from AI response"
            )
            return response_text

        except Exception as e:
            logger.error(f"AI generation failed: {str(e)}")
            raise Exception(f"Failed to generate AI response: {str(e)}")

    async def parse_midterm_analysis(self, ai_response: str) -> List[Dict[str, Any]]:
        """
        Parse AI response to extract midterm errors with enhanced fields

        Args:
            ai_response: Raw AI response text

        Returns:
            List of error dictionaries with fields: question, yourAnswer, correctAnswer,
            topic, feedback, marksReceived, totalMarks, correctness
        """
        try:
            # Try multiple JSON extraction strategies (similar to parse_quiz_questions)
            json_str = None

            # Strategy 1: Look for JSON array
            array_match = re.search(r"\[.*?\]", ai_response, re.DOTALL)
            if array_match:
                json_str = array_match.group(0)

            # Strategy 2: Look for JSON object with errors key
            if not json_str:
                obj_match = re.search(r'\{.*?"errors".*?\}', ai_response, re.DOTALL)
                if obj_match:
                    json_str = obj_match.group(0)

            # Strategy 3: Look for any JSON object/array
            if not json_str:
                json_match = re.search(r"\{.*?\}|\[.*?\]", ai_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)

            if json_str:
                try:
                    # Try to fix common JSON issues
                    json_str = self._fix_json(json_str)
                    data = json.loads(json_str)

                    # Handle different response formats
                    if isinstance(data, dict) and "errors" in data:
                        errors = data["errors"]
                    elif isinstance(data, list):
                        errors = data
                    elif isinstance(data, dict):
                        errors = [data]
                    else:
                        errors = []

                    # Ensure all errors have required fields with defaults
                    normalized_errors = []
                    for error in errors:
                        # Get marks to help determine correctness
                        marks_received = error.get("marksReceived") or error.get(
                            "marks_received"
                        )
                        total_marks = error.get("totalMarks") or error.get(
                            "total_marks"
                        )

                        # Normalize correctness field - handle various formats
                        correctness = (
                            error.get("correctness")
                            or error.get("status")
                            or error.get("correctness_status")
                        )
                        if correctness:
                            # Normalize to lowercase and handle variations
                            correctness_lower = str(correctness).lower().strip()
                            if correctness_lower in ["correct", "right", "true"]:
                                correctness = "correct"
                            elif correctness_lower in ["incorrect", "wrong", "false"]:
                                correctness = "incorrect"
                            elif correctness_lower in [
                                "partially_correct",
                                "partially correct",
                                "partial",
                                "partially",
                            ]:
                                correctness = "partially_correct"
                            else:
                                # If correctness is unknown, try to infer from marks
                                correctness = None
                        else:
                            correctness = None

                        # If correctness is not set or unknown, calculate from marks
                        if (
                            correctness is None
                            and marks_received is not None
                            and total_marks is not None
                            and total_marks > 0
                        ):
                            if marks_received >= total_marks:
                                correctness = "correct"
                            elif marks_received > 0:
                                correctness = "partially_correct"
                            else:
                                correctness = "incorrect"
                        elif correctness is None:
                            # Default to incorrect if we can't determine
                            correctness = "incorrect"

                        normalized_error = {
                            "question": error.get("question", 0),
                            "yourAnswer": error.get(
                                "yourAnswer", error.get("your_answer", "")
                            ),
                            "correctAnswer": error.get(
                                "correctAnswer", error.get("correct_answer", "")
                            ),
                            "topic": error.get("topic", "Unknown"),
                            "feedback": error.get("feedback", ""),
                            "marksReceived": marks_received,
                            "totalMarks": total_marks,
                            "correctness": correctness,
                        }
                        normalized_errors.append(normalized_error)

                    if normalized_errors:
                        logger.info(
                            f"Successfully parsed {len(normalized_errors)} errors from JSON"
                        )
                        return normalized_errors

                except json.JSONDecodeError as e:
                    logger.warning(
                        f"JSON parsing failed, trying alternative methods: {str(e)}"
                    )
                    # Try to extract individual error objects even if array is broken
                    errors = self._extract_errors_from_broken_json(json_str)
                    if errors:
                        return errors

            # If no JSON found, try to parse structured text
            errors = []
            error_pattern = r"question[:\s]+(\d+).*?yourAnswer[:\s]+(.*?)correctAnswer[:\s]+(.*?)topic[:\s]+(.*?)feedback[:\s]+(.*?)(?=question|$)"
            matches = re.finditer(error_pattern, ai_response, re.IGNORECASE | re.DOTALL)

            for match in matches:
                errors.append(
                    {
                        "question": int(match.group(1)),
                        "yourAnswer": match.group(2).strip(),
                        "correctAnswer": match.group(3).strip(),
                        "topic": match.group(4).strip(),
                        "feedback": match.group(5).strip(),
                        "marksReceived": None,
                        "totalMarks": None,
                        "correctness": "incorrect",
                    }
                )

            if errors:
                logger.info(f"Parsed {len(errors)} errors from structured text")
                return errors

            # Fallback: return empty list
            logger.warning("Could not parse AI response, returning empty errors list")
            return []

        except Exception as e:
            logger.error(f"Failed to parse midterm analysis: {str(e)}", exc_info=True)
            return []

    def _extract_errors_from_broken_json(self, json_str: str) -> List[Dict[str, Any]]:
        """Extract individual error objects from broken JSON"""
        errors = []
        # Look for individual error objects
        error_pattern = r'\{"question"[^}]*\}'
        matches = re.finditer(error_pattern, json_str, re.DOTALL)
        for match in matches:
            try:
                error_obj = json.loads(match.group(0))
                errors.append(error_obj)
            except:
                continue
        return errors

    async def parse_quiz_questions(self, ai_response: str) -> List[Dict[str, Any]]:
        # Log first 1000 chars for debugging
        logger.info(f"AI response preview (first 1000 chars): {ai_response[:1000]}")
        """
        Parse AI response to extract quiz questions
        
        Args:
            ai_response: Raw AI response text
        
        Returns:
            List of question dictionaries
        """
        try:
            # Try multiple strategies to extract JSON

            # Strategy 1: Find JSON array with code block markers
            code_block_match = re.search(
                r"```(?:json)?\s*(\[.*?\])\s*```", ai_response, re.DOTALL
            )
            if code_block_match:
                json_str = code_block_match.group(1)
                try:
                    questions = json.loads(json_str)
                    if isinstance(questions, list) and len(questions) > 0:
                        logger.info(
                            f"Successfully parsed {len(questions)} questions from code block"
                        )
                        return questions
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse code block JSON: {e}")

            # Strategy 2: Find JSON array directly (more lenient - find largest array)
            # Try to find the array by looking for [ ... ] pattern
            # Use non-greedy but with minimum length
            json_matches = list(re.finditer(r"\[", ai_response))
            best_match = None
            best_questions = []

            for start_match in json_matches:
                start_pos = start_match.start()
                # Try to find matching closing bracket
                bracket_count = 0
                end_pos = start_pos
                for i, char in enumerate(ai_response[start_pos:], start_pos):
                    if char == "[":
                        bracket_count += 1
                    elif char == "]":
                        bracket_count -= 1
                        if bracket_count == 0:
                            end_pos = i + 1
                            break

                if end_pos > start_pos:
                    json_str = ai_response[start_pos:end_pos]
                    if len(json_str) > 100:  # Reasonable minimum
                        try:
                            questions = json.loads(json_str)
                            if isinstance(questions, list) and len(questions) > len(
                                best_questions
                            ):
                                best_match = json_str
                                best_questions = questions
                        except json.JSONDecodeError:
                            # Try fixing
                            fixed = self._fix_json(json_str)
                            try:
                                questions = json.loads(fixed)
                                if isinstance(questions, list) and len(questions) > len(
                                    best_questions
                                ):
                                    best_match = fixed
                                    best_questions = questions
                            except:
                                # Try extracting individual questions
                                extracted = self._extract_questions_from_broken_json(
                                    json_str
                                )
                                if len(extracted) > len(best_questions):
                                    best_questions = extracted

            if best_questions:
                logger.info(
                    f"Successfully parsed {len(best_questions)} questions from JSON array"
                )
                return best_questions

            # Fallback: try simple regex match
            json_match = re.search(r"(\[[\s\S]{100,}\])", ai_response)
            if json_match:
                json_str = json_match.group(1)
                logger.debug(
                    f"Trying to parse JSON (first 500 chars): {json_str[:500]}"
                )
                try:
                    questions = json.loads(json_str)
                    if isinstance(questions, list) and len(questions) > 0:
                        logger.info(
                            f"Successfully parsed {len(questions)} questions from JSON array"
                        )
                        return questions
                except json.JSONDecodeError as e:
                    logger.warning(
                        f"Failed to parse JSON array: {e} at position {e.pos}"
                    )
                    # Try to fix common JSON issues
                    json_str = self._fix_json(json_str)
                    try:
                        questions = json.loads(json_str)
                        if isinstance(questions, list) and len(questions) > 0:
                            logger.info(
                                f"Successfully parsed {len(questions)} questions after fixing JSON"
                            )
                            return questions
                    except json.JSONDecodeError as e2:
                        logger.warning(f"Still failed after fixing: {e2}")
                        # Try to extract valid JSON objects from the array
                        questions = self._extract_questions_from_broken_json(json_str)
                        if questions:
                            logger.info(
                                f"Extracted {len(questions)} questions from broken JSON"
                            )
                            return questions

                        # If still no questions, try extracting from the original response
                        # (might be truncated before the closing bracket)
                        questions = self._extract_questions_from_broken_json(
                            ai_response
                        )
                        if questions:
                            logger.info(
                                f"Extracted {len(questions)} questions from full response"
                            )
                            return questions

            # Strategy 3: Find JSON object with questions key
            json_match = re.search(r'(\{[\s\S]*?"questions"[\s\S]*?\})', ai_response)
            if json_match:
                json_str = json_match.group(1)
                try:
                    data = json.loads(json_str)
                    if isinstance(data, dict) and "questions" in data:
                        questions = data["questions"]
                        if isinstance(questions, list) and len(questions) > 0:
                            logger.info(
                                f"Successfully parsed {len(questions)} questions from JSON object"
                            )
                            return questions
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON object: {e}")

            # Strategy 4: Try to extract questions from broken/incomplete JSON in full response
            # This handles cases where the JSON array was truncated
            questions = self._extract_questions_from_broken_json(ai_response)
            if questions:
                logger.info(
                    f"Extracted {len(questions)} questions from incomplete JSON in full response"
                )
                return questions

            # Strategy 5: Try to extract questions manually from text
            questions = self._extract_questions_from_text(ai_response)
            if questions:
                logger.info(
                    f"Successfully extracted {len(questions)} questions from text"
                )
                return questions

            # Fallback: return empty list
            logger.warning("Could not parse quiz questions, returning empty list")
            logger.debug(
                f"AI response preview (first 2000 chars): {ai_response[:2000]}"
            )
            logger.debug(f"AI response length: {len(ai_response)}")
            return []

        except Exception as e:
            logger.error(f"Failed to parse quiz questions: {str(e)}", exc_info=True)
            return []

    def _fix_json(self, json_str: str) -> str:
        """Try to fix common JSON issues"""
        # Remove trailing commas before } or ]
        json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)
        # Fix unescaped newlines in strings
        json_str = re.sub(r"(?<!\\)\n", "\\n", json_str)
        # Fix unescaped quotes in strings (be careful)
        # Remove comments (JSON doesn't support them)
        json_str = re.sub(r"//.*?$", "", json_str, flags=re.MULTILINE)
        return json_str

    def _extract_questions_from_broken_json(
        self, json_str: str
    ) -> List[Dict[str, Any]]:
        """Extract question objects from broken or truncated JSON array"""
        questions = []

        # Strategy 1: Try to find complete question objects using balanced braces
        # This handles nested structures better than simple regex
        i = 0
        while i < len(json_str):
            # Find start of an object
            if json_str[i] == "{":
                brace_count = 0
                start_pos = i
                in_string = False
                escape_next = False

                # Find the matching closing brace
                for j in range(i, len(json_str)):
                    char = json_str[j]

                    if escape_next:
                        escape_next = False
                        continue

                    if char == "\\":
                        escape_next = True
                        continue

                    if char == '"' and not escape_next:
                        in_string = not in_string
                        continue

                    if not in_string:
                        if char == "{":
                            brace_count += 1
                        elif char == "}":
                            brace_count -= 1
                            if brace_count == 0:
                                # Found complete object
                                obj_str = json_str[start_pos : j + 1]
                                try:
                                    obj = json.loads(obj_str)
                                    # Check if it looks like a question object
                                    if (
                                        isinstance(obj, dict)
                                        and "text" in obj
                                        and "options" in obj
                                    ):
                                        # Validate that options is a list with at least 2 items
                                        if (
                                            isinstance(obj.get("options"), list)
                                            and len(obj.get("options", [])) >= 2
                                        ):
                                            # Ensure required fields
                                            if not obj.get("id"):
                                                obj["id"] = str(len(questions) + 1)
                                            if not obj.get("correctAnswer"):
                                                obj["correctAnswer"] = "a"
                                            if not obj.get("explanation"):
                                                obj["explanation"] = (
                                                    "Generated question"
                                                )
                                            if not obj.get("topic"):
                                                obj["topic"] = "General"
                                            questions.append(obj)
                                            logger.info(
                                                f"Extracted complete question {obj.get('id')}: {obj.get('text', '')[:50]}..."
                                            )
                                except json.JSONDecodeError:
                                    # Object is incomplete or malformed, skip it
                                    pass
                                except Exception as e:
                                    logger.debug(f"Error parsing object: {e}")

                                i = j + 1
                                break
                else:
                    # No closing brace found, object is incomplete - skip it
                    i += 1
            else:
                i += 1

        # Strategy 2: Fallback to regex if no questions found (for simpler cases)
        if not questions:
            question_pattern = r'\{"id"\s*:\s*"[^"]*"\s*,\s*"text"\s*:\s*"[^"]*"\s*,\s*"options"\s*:\s*\[[^\]]*\]'
            matches = re.finditer(question_pattern, json_str, re.DOTALL)

            for i, match in enumerate(matches, 1):
                obj_str = match.group(0)
                try:
                    # Try to complete the object by adding missing closing braces
                    if not obj_str.endswith("}"):
                        # Try to find where options array ends
                        options_match = re.search(
                            r'"options"\s*:\s*\[.*?\]', obj_str, re.DOTALL
                        )
                        if options_match:
                            options_end = options_match.end()
                            # Try to extract what we have and add closing brace
                            partial_obj = obj_str[:options_end] + "}"
                            try:
                                obj = json.loads(partial_obj)
                                if "text" in obj and "options" in obj:
                                    if not obj.get("id"):
                                        obj["id"] = str(i)
                                    if not obj.get("correctAnswer"):
                                        obj["correctAnswer"] = "a"
                                    if not obj.get("explanation"):
                                        obj["explanation"] = "Generated question"
                                    if not obj.get("topic"):
                                        obj["topic"] = "General"
                                    questions.append(obj)
                            except:
                                pass
                except:
                    continue

        logger.info(f"Extracted {len(questions)} complete questions from broken JSON")
        return questions

    def _extract_questions_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract questions from unstructured text as fallback"""
        questions = []
        # Look for question patterns
        question_pattern = r"(?:Question|Q)\s*\d+[:\s]+(.+?)(?=(?:Question|Q)\s*\d+|$)"
        matches = re.finditer(question_pattern, text, re.IGNORECASE | re.DOTALL)

        for i, match in enumerate(matches, 1):
            question_text = match.group(1).strip()
            if len(question_text) > 20:  # Valid question length
                questions.append(
                    {
                        "id": str(i),
                        "text": question_text[:200],  # Limit length
                        "options": [
                            {"id": "a", "text": "Option A"},
                            {"id": "b", "text": "Option B"},
                            {"id": "c", "text": "Option C"},
                            {"id": "d", "text": "Option D"},
                        ],
                        "correctAnswer": "a",
                        "explanation": "Generated from AI response",
                        "topic": "General",
                    }
                )

        return questions

    async def generate_quiz_title(self, topics: List[str], subject: str = None) -> str:
        """
        Generate a descriptive 3-6 word quiz title based on topics using AI

        Args:
            topics: List of topic names
            subject: Optional subject name (e.g., "Data Structures & Algorithms") to use as base

        Returns:
            Descriptive title (3-6 words) that represents all topics, or subject name if provided
        """
        try:
            # If subject is provided, we can use it as a base but make it more descriptive with topics
            if subject and len(subject.strip()) > 0:
                subject_clean = subject.strip().strip('"').strip("'")
                # If subject is generic like "Computer Science", combine it with topics for specificity
                if subject_clean.lower() in [
                    "computer science",
                    "cs",
                    "general",
                    "quiz",
                ]:
                    # Don't use generic subject alone - will generate descriptive title below
                    subject_clean = None
                elif len(subject_clean.split()) <= 6:
                    # Use subject if it's already descriptive (up to 6 words)
                    logger.info(f"Using provided subject as title: '{subject_clean}'")
                    return subject_clean

            if not topics or len(topics) == 0:
                return "General Quiz"

            # Create prompt for AI to generate a descriptive title
            topics_str = ", ".join(topics[:10])  # Limit to first 10 topics
            subject_context = f"\nSubject context: {subject}" if subject else ""
            prompt = f"""Given these quiz topics: {topics_str}{subject_context}

Generate a UNIQUE, DESCRIPTIVE 3-6 word title that accurately represents these EXACT topics. 
The title should be specific and descriptive enough to distinguish this quiz from other quizzes on similar subjects.
Make it distinctive based on the actual topics provided - use enough words to be clear and specific.

Examples:
- Topics: "Merge Sort, Quick Sort, Bubble Sort" → Title: "Sorting Algorithms & Techniques" (NOT just "Algorithms" or "Computer Science")
- Topics: "Binary Trees, Graphs, Linked Lists" → Title: "Data Structures & Tree Algorithms" (NOT just "Data Structures" or "Computer Science")
- Topics: "Time Complexity, Space Complexity, Big O Notation" → Title: "Algorithm Complexity Analysis" (NOT just "Complexity" or "Computer Science")
- Topics: "DFS, BFS, Graph Traversal" → Title: "Graph Traversal Algorithms" (NOT just "Graph Algorithms" or "Computer Science")
- Topics: "Python Loops, While Loops, For Loops" → Title: "Loop Structures & Iteration" (NOT just "Loops" or "Computer Science")
- Topics: "Memoization, Dynamic Programming, Recursion" → Title: "Dynamic Programming & Recursion" (NOT just "Dynamic Programming" or "Computer Science")
- Topics: "Binary Search Tree, Balanced BST, Tree Traversal" → Title: "Binary Tree Structures & Traversal" (NOT just "Trees" or "Computer Science")
- Topics: "Hash Tables, Hash Functions, Collision Resolution" → Title: "Hash Tables & Collision Handling" (NOT just "Hash Tables" or "Computer Science")
- Topics: "Heap Sort, Priority Queue, Heap Operations" → Title: "Heap Data Structures & Sorting" (NOT just "Heaps" or "Computer Science")

IMPORTANT: 
- Use 3-6 words to be descriptive and specific
- Include the main topic categories in the title
- If multiple related topics → combine them (e.g., "Sorting & Searching Algorithms")
- If topics are about complexity → use "Complexity Analysis" or "Algorithm Complexity"
- If topics are about data structures → specify which ones (e.g., "Tree & Graph Structures")
- DO NOT default to generic "Computer Science" or "Algorithms" - be specific!
- Make titles distinguishable: "Sorting Algorithms" vs "Graph Algorithms" vs "Complexity Analysis"

Return ONLY the title (3-6 words), nothing else. No quotes, no explanation, just the title."""

            response = await self.generate_response(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more consistent results
                max_tokens=50,  # Only need a short title
            )

            # Clean up the response - remove quotes, extra whitespace, etc.
            title = response.strip()
            # Remove quotes if present
            title = title.strip('"').strip("'").strip()
            # Remove any trailing punctuation or explanation
            title = re.split(r"[\.\n]", title)[0].strip()
            # Allow 3-6 words for descriptive titles
            words = title.split()
            if len(words) > 6:
                title = " ".join(words[:6])
            elif len(words) < 3 and len(words) > 0:
                # If too short, try to expand it with topic info
                if topics and len(topics) > 0:
                    # Add first topic to make it more descriptive
                    first_topic_words = topics[0].split()[:2]
                    title = f"{title} {' '.join(first_topic_words)}"
                    words = title.split()
                    if len(words) > 6:
                        title = " ".join(words[:6])

            if not title or len(title) < 2:
                # Fallback: generate descriptive title from topics
                if topics and len(topics) > 0:
                    # Combine first 2-3 topics to create descriptive title
                    topic_words = []
                    for topic in topics[:3]:
                        words = topic.split()
                        # Take key words from each topic (avoid common words like "the", "of", etc.)
                        key_words = [
                            w
                            for w in words
                            if w.lower() not in ["the", "of", "and", "or", "a", "an"]
                        ]
                        if key_words:
                            topic_words.extend(
                                key_words[:2]
                            )  # Take up to 2 words per topic

                    if topic_words:
                        # Create descriptive title from topic words (3-6 words)
                        title = " ".join(topic_words[:6])
                    else:
                        # Last resort: use first topic
                        title = topics[0]
                else:
                    title = "General Quiz"

            logger.info(f"Generated quiz title: '{title}' from topics: {topics[:5]}")
            return title

        except Exception as e:
            logger.error(f"Failed to generate quiz title: {str(e)}")
            # Fallback: create descriptive title from topics
            if topics and len(topics) > 0:
                # Combine first few topics to create a descriptive title
                topic_parts = []
                for topic in topics[:3]:
                    words = topic.split()
                    # Extract meaningful words (skip common words)
                    meaningful = [
                        w
                        for w in words
                        if w.lower()
                        not in ["the", "of", "and", "or", "a", "an", "in", "on", "at"]
                    ]
                    if meaningful:
                        topic_parts.extend(meaningful[:2])

                if topic_parts:
                    # Create 3-6 word descriptive title
                    title = " ".join(topic_parts[:6])
                    # Add "Algorithms" or "Structures" if not already present and it makes sense
                    title_lower = title.lower()
                    if (
                        "algorithm" not in title_lower
                        and "structure" not in title_lower
                        and "complexity" not in title_lower
                    ):
                        # Check if topics suggest algorithms or structures
                        all_topics_str = " ".join(topics[:3]).lower()
                        if any(
                            word in all_topics_str
                            for word in ["sort", "search", "traversal", "dfs", "bfs"]
                        ):
                            title = f"{title} Algorithms"
                        elif any(
                            word in all_topics_str
                            for word in ["tree", "graph", "list", "array", "heap"]
                        ):
                            title = f"{title} Structures"

                    return title[:50]  # Limit to 50 chars
                else:
                    # Last resort: use first topic
                    return topics[0]
            return "General Quiz"
