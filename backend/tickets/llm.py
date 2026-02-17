"""
LLM integration module using Google Gemini for ticket classification.

Why Google Gemini 2.0 Flash:
- Free tier available (15 RPM, 1M TPM) — no cost for development/demo
- Supports response_mime_type="application/json" for reliable structured output
- Low latency (~0.5-1s) suitable for real-time UX
- Good classification accuracy for straightforward categorization tasks
"""
import json
import logging
import os

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Classification prompt — reviewed as part of evaluation
CLASSIFY_PROMPT = """You are an expert support ticket classifier for a software company. 
Analyze the customer's support ticket description and classify it into exactly one category and one priority level.

CATEGORIES (pick exactly one):
- "billing": Payment issues, invoices, charges, refunds, subscription plans, pricing questions
- "technical": Bugs, errors, crashes, performance issues, feature not working, integration problems
- "account": Login issues, password resets, account access, profile changes, permissions, account deletion
- "general": General inquiries, feature requests, feedback, documentation questions, anything that doesn't fit above

PRIORITY LEVELS (pick exactly one):
- "low": General questions, minor cosmetic issues, feature requests, non-urgent inquiries
- "medium": Issues affecting workflow but with workarounds available, moderate impact
- "high": Significant functionality broken, no workaround, affecting business operations
- "critical": Complete service outage, data loss risk, security vulnerability, widespread impact

Respond with a JSON object containing exactly these two fields:
{
  "suggested_category": "<one of: billing, technical, account, general>",
  "suggested_priority": "<one of: low, medium, high, critical>"
}

Customer's ticket description:
\"\"\"
__DESCRIPTION__
\"\"\"
"""


def classify_ticket(description: str) -> dict | None:
    """
    Call Google Gemini to classify a ticket description.

    Returns dict with 'suggested_category' and 'suggested_priority',
    or None if classification fails for any reason.
    """
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — skipping LLM classification")
        return None

    try:
        client = genai.Client(api_key=api_key)

        prompt = CLASSIFY_PROMPT.replace('__DESCRIPTION__', description)

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
                temperature=0.1,
                max_output_tokens=150,
            ),
        )

        result = json.loads(response.text.strip())

        # Validate returned values are within allowed choices
        valid_categories = {'billing', 'technical', 'account', 'general'}
        valid_priorities = {'low', 'medium', 'high', 'critical'}

        category = result.get('suggested_category', '').lower()
        priority = result.get('suggested_priority', '').lower()

        if category not in valid_categories or priority not in valid_priorities:
            logger.warning(
                "LLM returned invalid values: category=%s, priority=%s",
                category, priority,
            )
            return None

        return {
            'suggested_category': category,
            'suggested_priority': priority,
        }

    except Exception:
        logger.exception("LLM classification failed")
        return None
