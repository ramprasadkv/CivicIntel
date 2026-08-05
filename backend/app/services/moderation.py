import re
from typing import Tuple, List

# List of forbidden patterns (abusive language, hate speech, threats, spam)
ABUSIVE_KEYWORDS = [
    "fool", "idiot", "stupid", "scam", "cheat", "bastard", "fraud",
    "bribe", "abuse", "threat", "kill", "attack", "bloody", "hate",
    "useless government", "corrupt officer"
]

SPAM_PATTERNS = [
    r"http[s]?://",  # URLs in description
    r"buy now", r"click here", r"free money", r"win cash",
    r"(.)\1{5,}",    # Repeating characters like "aaaaaa"
]

def analyze_content_safety(text: str) -> Tuple[bool, List[str]]:
    """
    Analyzes text for abusive language, hate speech, threats, or spam.
    Returns (is_safe: bool, issues: List[str])
    """
    if not text or len(text.strip()) < 5:
        return False, ["Complaint description is too short. Please provide meaningful details."]

    lower_text = text.lower()
    violations = []

    # Check for abusive keywords
    found_words = [word for word in ABUSIVE_KEYWORDS if word in lower_text]
    if found_words:
        violations.append(f"Contains inappropriate or hostile language: '{', '.join(found_words[:3])}'")

    # Check for spam patterns
    for pattern in SPAM_PATTERNS:
        if re.search(pattern, lower_text):
            violations.append("Contains potential spam or unpermitted external links/repeating characters.")

    # Check excessive caps (shouting / spam)
    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) > 15:
        uppercase_ratio = sum(1 for ch in letters if ch.isupper()) / len(letters)
        if uppercase_ratio > 0.85:
            violations.append("Excessive capital letters detected. Please write in standard sentence case.")

    is_safe = len(violations) == 0
    return is_safe, violations
