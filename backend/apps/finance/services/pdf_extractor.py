"""
PDF Transaction Extraction Service

Uses pdfplumber to extract text from PDFs and Google Gemini to parse transactions.
"""
import logging
import json
import re
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Any, Optional

import pdfplumber
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)


class PDFTransactionExtractor:
    """Extract transactions from PDF documents using Google Gemini."""
    
    EXTRACTION_PROMPT = """You are a financial document parser. Extract all transactions from the following text extracted from a financial statement PDF.

For each transaction, extract:
- date: The transaction date in YYYY-MM-DD format
- description: Description of the transaction (merchant name, transaction type, etc.)
- amount: The transaction amount as a number (positive for credits/income, negative for debits/expenses)
- category: One of: INCOME, TRANSFER, CRYPTO, INVESTMENT, SHOPPING, FOOD, ENTERTAINMENT, BILLS, OTHER

Return a JSON array of transactions. If you cannot extract any transactions, return an empty array [].

IMPORTANT:
- Convert all dates to YYYY-MM-DD format
- Amounts should be numeric (no currency symbols)
- For purchases/debits, use negative amounts
- For sales/credits/deposits, use positive amounts
- Be thorough - extract ALL transactions you can find

Example output:
[
  {"date": "2024-01-15", "description": "BTC Purchase", "amount": -500.00, "category": "CRYPTO"},
  {"date": "2024-01-20", "description": "ETH Sale", "amount": 1200.00, "category": "CRYPTO"}
]

PDF TEXT:
{pdf_text}

Return ONLY the JSON array, no other text."""

    def __init__(self):
        api_key = getattr(settings, 'GEMINI_API_KEY', None) or getattr(settings, 'GOOGLE_API_KEY', None)
        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not configured in settings")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extract text content from a PDF file."""
        text_content = []
        
        try:
            with pdfplumber.open(pdf_file) as pdf:
                for page_num, page in enumerate(pdf.pages, start=1):
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(f"--- Page {page_num} ---\n{page_text}")
                    
                    # Also try to extract tables
                    tables = page.extract_tables()
                    for table_num, table in enumerate(tables, start=1):
                        if table:
                            table_text = "\n".join(["\t".join([str(cell) if cell else "" for cell in row]) for row in table])
                            text_content.append(f"--- Table {table_num} (Page {page_num}) ---\n{table_text}")
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise ValueError(f"Failed to read PDF file: {str(e)}")
        
        if not text_content:
            raise ValueError("Could not extract any text from the PDF")
        
        return "\n\n".join(text_content)
    
    def parse_transactions_with_llm(self, pdf_text: str) -> List[Dict[str, Any]]:
        """Use Google Gemini to parse transactions from PDF text."""
        
        # Limit text length to avoid token limits
        max_chars = 30000  # Gemini has larger context window
        if len(pdf_text) > max_chars:
            pdf_text = pdf_text[:max_chars] + "\n\n[Text truncated...]"
        
        try:
            # Generate content using Gemini
            response = self.model.generate_content(
                self.EXTRACTION_PROMPT.format(pdf_text=pdf_text),
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,  # Low temperature for consistent parsing
                    max_output_tokens=4096,
                )
            )
            
            response_text = response.text.strip()
            logger.info(f"LLM Response: {response_text[:1000]}") # Log first 1000 chars
            
            # Try to extract JSON from the response
            transactions = self._parse_json_response(response_text)
            
            if not isinstance(transactions, list):
                logger.warning(f"Parsed JSON is not a list: {type(transactions)}")
                transactions = []

            # Validate and clean transactions
            return self._validate_transactions(transactions)
            
        except Exception as e:
            import traceback
            logger.error(f"Error calling Gemini API: {e}")
            logger.error(traceback.format_exc())
            raise ValueError(f"PDF Parsing Failed: {str(e)}")
    
    def _parse_json_response(self, response_text: str) -> List[Dict]:
        """Extract JSON array from LLM response."""
        # Remove markdown code blocks if present
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        response_text = response_text.strip()
        
        # Try direct JSON parse first
        try:
            result = json.loads(response_text)
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and 'transactions' in result:
                return result['transactions']
        except json.JSONDecodeError as e:
            logger.warning(f"Direct JSON parse failed: {e}")
        
        # Try to find JSON array in the response
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError as e:
                logger.warning(f"Regex extracted JSON parse failed: {e}")
        
        # Try to unescape the response (handle double-escaped JSON)
        try:
            unescaped = response_text.encode().decode('unicode_escape')
            return json.loads(unescaped)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"Unescaped JSON parse failed: {e}")
        
        logger.error(f"Could not parse JSON from response (first 500 chars): {response_text[:500]}")
        return []
    
    
    def _validate_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """Validate and clean extracted transactions."""
        if not isinstance(transactions, list):
            logger.warning(f"Expected list of transactions, got: {type(transactions)}")
            return []
            
        valid_transactions = []
        
        for i, txn in enumerate(transactions):
            try:
                # Ensure txn is a dictionary
                if not isinstance(txn, dict):
                    logger.warning(f"Skipping non-dict transaction at index {i}: {type(txn)}")
                    continue
                
                # Check for required fields using .get() to avoid KeyError
                date_str = txn.get('date')
                description = txn.get('description')
                amount_val = txn.get('amount')
                
                if not date_str or description is None or amount_val is None:
                    # Log missing fields for debugging
                    missing = []
                    if not date_str: missing.append('date')
                    if description is None: missing.append('description')
                    if amount_val is None: missing.append('amount')
                    logger.warning(f"Transaction {i} missing fields: {missing}. Data: {txn}")
                    continue
                
                # Parse and validate date
                parsed_date = None
                try:
                    parsed_date = datetime.strptime(str(date_str), '%Y-%m-%d')
                except ValueError:
                    # Try alternative formats
                    for fmt in ['%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%m-%d-%Y', '%Y.%m.%d']:
                        try:
                            parsed_date = datetime.strptime(str(date_str), fmt)
                            break
                        except ValueError:
                            continue
                    
                    if not parsed_date:
                        logger.warning(f"Could not parse date: {date_str}")
                        continue
                
                # Validate amount
                try:
                    # Remove currency symbols if present
                    if isinstance(amount_val, str):
                        amount_val = amount_val.replace('$', '').replace(',', '').strip()
                    amount = float(amount_val)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid amount format: {amount_val}")
                    continue
                
                valid_transactions.append({
                    'date': parsed_date.strftime('%Y-%m-%d'),
                    'description': str(description)[:200],
                    'amount': round(amount, 2),
                    'category': str(txn.get('category', 'OTHER')).upper(),
                })
                
            except Exception as e:
                logger.error(f"Error validating transaction {i}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        return valid_transactions
    
    def extract_transactions(self, pdf_file) -> Dict[str, Any]:
        """
        Main method to extract transactions from a PDF file.
        
        Args:
            pdf_file: File-like object containing the PDF
            
        Returns:
            Dict with 'transactions' list and 'metadata'
        """
        # Extract text from PDF
        pdf_text = self.extract_text_from_pdf(pdf_file)
        
        # Parse transactions using LLM
        transactions = self.parse_transactions_with_llm(pdf_text)
        
        return {
            'transactions': transactions,
            'metadata': {
                'text_length': len(pdf_text),
                'transactions_found': len(transactions),
            }
        }

