"""
AI-powered email classifier to filter out non-ticket emails
UPDATED: More permissive for legitimate user emails, stricter on spam/bounces
"""
import re
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class EmailClassifier:
    """
    Classifies whether an email is a legitimate support ticket or
    should be rejected (bounce backs, auto-replies, spam, etc.)
    UPDATED: Now accepts simple test emails and legitimate user communications
    """
    
    # Patterns for non-ticket emails (STRICT - these are ALWAYS rejected)
    REJECT_PATTERNS = {
        'bounce_back': [
            r'^delivery status notification',
            r'^mail delivery failed',
            r'^undeliverable',
            r'^address not found',
            r'^does not exist$',
            r'recipient address rejected',
            r'mailer-daemon',
            r'postmaster@',
            r'failure notice',
            r'delivery failed',
            r'could not be delivered',
            r'message you sent could not be delivered',
            r'dns error',
            r'mx lookup',
            r'no such user',
            r'invalid recipient',
            r'permanent delivery failure',
            r'delivery status notification',
            r'returned mail',
        ],
        'auto_reply': [
            r'^auto[- ]?reply',
            r'^automatic reply',
            r'^out of office',
            r'^ooo\b',
            r'^away from office',
            r'^vacation reply',
            r'am currently out of the office',
            r'will be back on',
            r'auto response',
            r'automated response',
            r'^i am out of the office',
            r'^thank you for your email.*will respond',
        ],
        'spam': [
            r'^\s*\[?spam\]?',
            r'marketing',
            r'unsubscribe',
            r'bulk email',
            r'mass email',
            r'advertisement',
            r'promotional',
            r'click here',
            r'limited time offer',
            r'congratulations.*won',
            r'viagra',
            r'casino',
            r'lottery',
            r'weight loss',
            r'bitcoin',
            r'cryptocurrency',
        ],
        'system_email': [
            r'^no-reply@',
            r'^noreply@',
            r'^donotreply@',
            r'^do-not-reply@',
            r'^mailer-daemon@',
            r'^postmaster@',
            r'^automated@',
            r'^system@',
            r'^notification@',
            r'^alerts@',
        ]
    }
    
    # Senders to reject (EXACT MATCH or domain-based)
    REJECT_SENDERS = [
        'mailer-daemon',
        'postmaster',
        'noreply',
        'no-reply',
        'donotreply',
        'do-not-reply',
        'automated',
        'system',
        'notification',
        'alerts',
    ]
    
    # Domains that are typically spammy or system-generated
    REJECT_DOMAINS = [
        'mailer-daemon',
        'postmaster',
        'noreply',
        'no-reply',
        'donotreply',
        'automated',
        'system',
        'notification',
        'alerts',
        'marketing',
        'newsletter',
        'unsubscribe',
    ]
    
    # Keywords that indicate a legitimate ticket (BROADENED - much more permissive)
    TICKET_INDICATORS = [
        r'help',
        r'support',
        r'issue',
        r'problem',
        r'error',
        r'bug',
        r'cannot',
        r'unable',
        r'request',
        r'assist',
        r'help me',
        r'what',
        r'how',
        r'why',
        r'when',
        r'where',
        r'test',
        r'testing',
        r'check',
        r'verify',
        r'not working',
        r'doesn\'t work',
        r'does not work',
        r'login',
        r'account',
        r'access',
        r'password',
        r'reset',
        r'billing',
        r'payment',
        r'invoice',
        r'feature',
        r'question',
        r'enquiry',
        r'inquiry',
        r'complaint',
        r'feedback',
        r'suggestion',
        r'update',
        r'status',
        r'progress',
        r'time',
        r'deadline',
        r'urgent',
        r'asap',
        r'important',
        r'please',
        r'kindly',
        r'appreciate',
        r'could you',
        r'can you',
        r'would you',
        r'possible',
        r'idea',
        r'solution',
        r'fix',
        r'repair',
        r'broken',
        r'crash',
        r'freeze',
        r'slow',
        r'performance',
        r'loading',
        r'display',
        r'showing',
        r'missing',
        r'wrong',
        r'incorrect',
        r'need',
        r'want',
        r'require',
        r'looking for',
        r'searching',
    ]
    
    # Legitimate email domains (these are usually safe)
    TRUSTED_DOMAINS = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'protonmail.com',
        'icloud.com',
        'aol.com',
        'mail.com',
        'yandex.com',
        'zoho.com',
    ]
    
    def __init__(self):
        # Compile reject patterns
        self.compiled_reject_patterns = {}
        for category, patterns in self.REJECT_PATTERNS.items():
            self.compiled_reject_patterns[category] = [
                re.compile(pattern, re.IGNORECASE) for pattern in patterns
            ]
        
        # Compile ticket indicators
        self.compiled_ticket_indicators = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.TICKET_INDICATORS
        ]
        
        # Compile reject senders for partial matching
        self.reject_senders_compiled = [
            re.compile(rf'\b{re.escape(sender)}\b', re.IGNORECASE) 
            for sender in self.REJECT_SENDERS
        ]
        
        logger.info("EmailClassifier initialized with broadened ticket indicators")
    
    def _extract_domain(self, email):
        """Extract domain from email address"""
        match = re.search(r'@([\w\.-]+)', email)
        return match.group(1).lower() if match else None
    
    def _is_trusted_sender(self, email):
        """Check if email is from a trusted domain"""
        domain = self._extract_domain(email)
        if domain:
            # Check if domain is in trusted list
            if domain in self.TRUSTED_DOMAINS:
                return True
            # Check for company/corporate domains (usually safe)
            if any(x in domain for x in ['.com', '.org', '.net', '.co.', '.ac.']):
                # Exclude known spammy patterns
                if not any(x in domain for x in ['marketing', 'newsletter', 'spam']):
                    return True
        return False
    
    def _is_system_sender(self, email):
        """Check if sender is a system email address"""
        email_lower = email.lower()
        
        # Check exact matches in REJECT_SENDERS
        for reject_sender in self.REJECT_SENDERS:
            if reject_sender in email_lower:
                return True
        
        # Check patterns
        for pattern in self.reject_senders_compiled:
            if pattern.search(email_lower):
                return True
        
        return False
    
    def classify_email(self, from_email, subject, body):
        """
        Classify email and return:
        - is_ticket: True/False
        - reason: why it was rejected (if not a ticket)
        - confidence: 0-100 score
        """
        # Prepare text for analysis
        combined_text = f"{subject} {body}".lower()
        from_email_lower = from_email.lower()
        
        # ========== STRICT REJECTION RULES ==========
        # These ALWAYS reject regardless of content
        
        # Rule 1: Reject if sender is a known system sender
        if self._is_system_sender(from_email):
            logger.info(f"REJECTED - System sender: {from_email}")
            return {
                'is_ticket': False,
                'reason': f'Rejected system sender: {from_email}',
                'confidence': 100,
                'category': 'system_sender'
            }
        
        # Rule 2: Reject if email contains bounce-back patterns
        for category, patterns in self.compiled_reject_patterns.items():
            for pattern in patterns:
                if pattern.search(combined_text):
                    logger.info(f"REJECTED - {category} pattern matched: {pattern.pattern[:50]}")
                    return {
                        'is_ticket': False,
                        'reason': f'Matched {category} pattern',
                        'confidence': 100,
                        'category': category
                    }
        
        # Rule 3: Reject if it's clearly spam (high confidence)
        spam_score = 0
        for pattern in self.compiled_reject_patterns.get('spam', []):
            if pattern.search(combined_text):
                spam_score += 25
        
        if spam_score >= 50:  # Multiple spam indicators
            return {
                'is_ticket': False,
                'reason': 'Multiple spam indicators detected',
                'confidence': 90,
                'category': 'spam'
            }
        
        # ========== PERMISSIVE ACCEPTANCE RULES ==========
        # These increase the likelihood of accepting the email
        
        # Start with a base score
        ticket_score = 30  # Start with moderate base score to accept simple emails
        
        # Rule 4: ACCEPT any non-empty email from a real user
        # This is the key change - very permissive for legitimate users
        if len(body.strip()) > 0 or len(subject.strip()) > 0:
            ticket_score += 20  # Any content at all gets points
        
        # Rule 5: Trusted domains get bonus points
        if self._is_trusted_sender(from_email):
            ticket_score += 30
            logger.debug(f"Trusted domain detected: {from_email}")
        
        # Rule 6: Check for ticket indicators (bonus points)
        indicator_score = 0
        for pattern in self.compiled_ticket_indicators:
            if pattern.search(combined_text):
                indicator_score += 10
        
        ticket_score += indicator_score
        
        # Rule 7: Check for question format (confirms user is asking something)
        question_indicators = ['?', 'please', 'kindly', 'could you', 'can you', 'would you']
        has_question = any(indicator in combined_text for indicator in question_indicators)
        if has_question:
            ticket_score += 20
        
        # Rule 8: Check for reasonable email length (not too short)
        # But don't penalize too harshly - simple emails are OK
        if len(body) < 5 and len(subject) < 3:
            ticket_score -= 10  # Very short but still might be valid
        elif len(body) >= 10:
            ticket_score += 15  # Substantial content is good
        
        # Rule 9: Check for real user email format
        if '@' in from_email and '.' in from_email.split('@')[1]:
            ticket_score += 15  # Valid email format
        
        # Rule 10: Check if it's a reply (usually good)
        reply_indicators = ['re:', 'fwd:', 'forward', 'original message', 'wrote:']
        is_reply = any(indicator in combined_text for indicator in reply_indicators)
        if is_reply:
            ticket_score += 25  # Replies are almost always legitimate
        
        # Rule 11: Check for test keywords (specifically for testing)
        test_indicators = ['test', 'testing', 'check', 'verify', 'demo']
        is_test = any(indicator in combined_text for indicator in test_indicators)
        if is_test:
            ticket_score += 15  # Allow test emails
        
        # Rule 12: Never reject if email is from a real person with reasonable content
        # This is a safety net
        if not self._is_system_sender(from_email) and len(combined_text) > 20:
            ticket_score = max(ticket_score, 50)  # Minimum score for real person emails
        
        # Special case: Very short test email "test system 123"
        if 'test' in combined_text and len(combined_text) < 100:
            ticket_score = max(ticket_score, 70)  # High score for test emails
        
        # ========== FINAL DECISION ==========
        # Lower threshold to be more permissive (was 30, now 25)
        is_ticket = ticket_score >= 25
        
        # Calculate confidence (capped at 100)
        confidence = min(ticket_score, 100)
        
        # Prepare result
        result = {
            'is_ticket': is_ticket,
            'reason': 'Valid support ticket' if is_ticket else f'Low ticket score: {ticket_score}',
            'confidence': confidence,
            'ticket_score': ticket_score,
            'indicator_score': indicator_score
        }
        
        # Log decisions
        if not is_ticket:
            logger.warning(f"REJECTED EMAIL - Score: {ticket_score}, Reason: {result['reason']}")
            logger.warning(f"  From: {from_email}")
            logger.warning(f"  Subject: {subject[:100]}")
            logger.warning(f"  Body preview: {body[:100]}")
        else:
            logger.info(f"ACCEPTED EMAIL - Score: {ticket_score}, Confidence: {confidence}")
            logger.info(f"  From: {from_email}")
            logger.info(f"  Subject: {subject[:100]}")
        
        return result
    
    def should_create_ticket(self, from_email, subject, body):
        """Returns True if a ticket should be created, False otherwise"""
        result = self.classify_email(from_email, subject, body)
        
        if not result['is_ticket']:
            logger.info(f"REJECTED EMAIL - Reason: {result['reason']}")
            logger.info(f"  From: {from_email}")
            logger.info(f"  Subject: {subject[:50]}")
        
        return result['is_ticket'], result


# Singleton instance
email_classifier = EmailClassifier()


# Helper function for quick testing
def test_classifier():
    """Test function to verify classification"""
    test_cases = [
        # Should be ACCEPTED
        ("user@gmail.com", "test system 123", "This is a test message", True),
        ("customer@company.com", "Login issue", "I can't log into my account", True),
        ("client@yahoo.com", "Help needed", "Please help me with this problem", True),
        ("test@test.com", "Testing ticket system", "Just testing if this works", True),
        ("john@example.com", "Question", "How do I reset my password?", True),
        
        # Should be REJECTED
        ("mailer-daemon@google.com", "Delivery Status", "Your message could not be delivered", False),
        ("noreply@system.com", "Out of Office", "I am currently out of the office", False),
        ("marketing@spam.com", "Special Offer", "Buy now! Limited time!", False),
        ("postmaster@domain.com", "Undeliverable", "Address not found", False),
    ]
    
    print("=" * 60)
    print("Testing Email Classifier")
    print("=" * 60)
    
    for from_email, subject, body, expected in test_cases:
        result = email_classifier.classify_email(from_email, subject, body)
        status = "✓ PASS" if result['is_ticket'] == expected else "✗ FAIL"
        print(f"\n{status} - Expected: {expected}, Got: {result['is_ticket']}")
        print(f"  From: {from_email}")
        print(f"  Subject: {subject}")
        print(f"  Score: {result.get('ticket_score', 'N/A')}")
        print(f"  Reason: {result['reason']}")


if __name__ == "__main__":
    # Run test if executed directly
    test_classifier()