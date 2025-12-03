import pytesseract
from PIL import Image
import io
import pdf2image
from typing import Union
import logging

logger = logging.getLogger(__name__)

class OCRService:
    """Service for extracting text from PDFs and images using Tesseract OCR"""
    
    def __init__(self):
        # Tesseract should be installed on the system
        # On macOS: brew install tesseract
        # On Ubuntu: sudo apt-get install tesseract-ocr
        # On Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
        pass
    
    async def extract_text(self, file_content: bytes, filename: str) -> str:
        """
        Extract text from PDF or image file
        
        Args:
            file_content: Binary content of the file
            filename: Name of the file (to determine type)
        
        Returns:
            Extracted text as string
        """
        try:
            file_ext = filename.lower().split('.')[-1]
            
            if file_ext == 'pdf':
                return await self._extract_from_pdf(file_content)
            elif file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp']:
                return await self._extract_from_image(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
                
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            raise Exception(f"Failed to extract text from {filename}: {str(e)}")
    
    async def _extract_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            logger.info(f"Converting PDF to images (size: {len(pdf_content)} bytes)")
            # Convert PDF to images
            images = pdf2image.convert_from_bytes(pdf_content)
            logger.info(f"PDF converted to {len(images)} page(s)")
            
            # Extract text from each page
            all_text = []
            for i, image in enumerate(images):
                logger.info(f"Extracting text from page {i+1}/{len(images)}")
                try:
                    text = pytesseract.image_to_string(image)
                    logger.info(f"Page {i+1} extracted {len(text)} characters")
                    if text.strip():
                        all_text.append(text)
                    else:
                        logger.warning(f"Page {i+1} extracted empty text")
                except Exception as page_error:
                    logger.error(f"Failed to extract text from page {i+1}: {str(page_error)}")
                    # Continue with other pages
            
            result = "\n\n".join(all_text)
            logger.info(f"Total extracted text: {len(result)} characters")
            if not result.strip():
                logger.warning("OCR extracted no text from PDF - this may indicate an issue with the PDF or Tesseract installation")
            return result
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {str(e)}", exc_info=True)
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    async def _extract_from_image(self, image_content: bytes) -> str:
        """Extract text from image file"""
        try:
            logger.info(f"Extracting text from image (size: {len(image_content)} bytes)")
            # Open image from bytes
            image = Image.open(io.BytesIO(image_content))
            logger.info(f"Image opened: {image.size}, mode: {image.mode}")
            
            # Extract text using Tesseract
            text = pytesseract.image_to_string(image)
            logger.info(f"Extracted {len(text)} characters from image")
            
            if not text.strip():
                logger.warning("OCR extracted no text from image - this may indicate an issue with the image quality or Tesseract installation")
            
            return text
            
        except Exception as e:
            logger.error(f"Image extraction failed: {str(e)}", exc_info=True)
            raise Exception(f"Failed to extract text from image: {str(e)}")

