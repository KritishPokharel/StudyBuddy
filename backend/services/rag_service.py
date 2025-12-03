import chromadb
from chromadb.config import Settings
import os
import logging
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class RAGService:
    """Service for RAG (Retrieval Augmented Generation) using ChromaDB vector database"""
    
    def __init__(self):
        # Initialize ChromaDB client
        # Using persistent storage in ./chroma_db directory
        self.client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Collection for storing user learning data
        self.collection_name = "user_learning_data"
        try:
            self.collection = self.client.get_collection(name=self.collection_name)
        except:
            self.collection = self.client.create_collection(name=self.collection_name)
    
    async def store_user_weakness(
        self,
        user_id: str,
        topics: List[str],
        context: str,
        error_details: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Store user weakness data in vector database
        
        Args:
            user_id: User identifier
            topics: List of topics user struggles with
            context: Context about the errors (e.g., midterm content)
            error_details: Detailed error information
        """
        try:
            # Create document text
            doc_text = f"User {user_id} struggles with topics: {', '.join(topics)}. "
            if error_details:
                doc_text += f"Error details: {json.dumps(error_details)}. "
            doc_text += f"Context: {context[:500]}"  # Limit context length
            
            # Create metadata
            metadata = {
                "user_id": user_id,
                "topics": json.dumps(topics),
                "timestamp": datetime.now().isoformat()
            }
            
            # Generate unique ID
            doc_id = f"{user_id}_{len(self.collection.get()['ids'])}"
            
            # Add to collection
            self.collection.add(
                documents=[doc_text],
                metadatas=[metadata],
                ids=[doc_id]
            )
            
            logger.info(f"Stored weakness data for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store user weakness: {str(e)}")
            raise
    
    async def get_user_weaknesses(self, user_id: str) -> Dict[str, Any]:
        """
        Retrieve user weaknesses from vector database
        
        Args:
            user_id: User identifier
        
        Returns:
            Dictionary with topics and related information
        """
        try:
            # Query collection for user's data
            results = self.collection.get(
                where={"user_id": user_id},
                limit=10
            )
            
            if not results['ids']:
                return {"topics": [], "count": 0}
            
            # Extract topics from metadata
            all_topics = set()
            for metadata in results['metadatas']:
                if 'topics' in metadata:
                    topics = json.loads(metadata['topics'])
                    all_topics.update(topics)
            
            return {
                "topics": list(all_topics),
                "count": len(all_topics),
                "documents": results['documents']
            }
            
        except Exception as e:
            logger.error(f"Failed to get user weaknesses: {str(e)}")
            return {"topics": [], "count": 0}
    
    async def update_user_weakness(
        self,
        user_id: str,
        topics: List[str],
        performance_data: Optional[Dict[str, Any]] = None
    ):
        """
        Update user weakness data based on quiz performance
        
        Args:
            user_id: User identifier
            topics: Topics to update
            performance_data: Performance metrics (e.g., accuracy scores)
        """
        try:
            # Store updated weakness data
            context = f"Quiz performance: {json.dumps(performance_data) if performance_data else 'N/A'}"
            await self.store_user_weakness(
                user_id=user_id,
                topics=topics,
                context=context
            )
            
        except Exception as e:
            logger.error(f"Failed to update user weakness: {str(e)}")
            raise
    
    async def search_similar_content(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar content in the vector database
        
        Args:
            query: Search query
            user_id: Optional user ID to filter results
            limit: Maximum number of results
        
        Returns:
            List of similar documents
        """
        try:
            where_clause = {"user_id": user_id} if user_id else None
            
            results = self.collection.query(
                query_texts=[query],
                n_results=limit,
                where=where_clause
            )
            
            return [
                {
                    "document": doc,
                    "metadata": meta,
                    "distance": dist
                }
                for doc, meta, dist in zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )
            ]
            
        except Exception as e:
            logger.error(f"Failed to search similar content: {str(e)}")
            return []

