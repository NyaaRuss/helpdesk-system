"""
Webhook endpoint for Gmail push notifications
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .email_handler import email_handler
import json
import logging

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class GmailWebhookView(APIView):
    """
    Receive push notifications from Gmail when new emails arrive
    Requires Google Cloud Pub/Sub setup
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            logger.info(f"Webhook received: {data}")
            
            # Process the email that triggered this notification
            result = email_handler.process_incoming_emails(test_mode=False)
            
            return Response({
                "status": "ok",
                "processed": result.get('processed', 0),
                "tickets_created": result.get('tickets_created', 0)
            })
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return Response({"status": "error", "message": str(e)}, status=500)
    
    def get(self, request):
        return Response({"status": "ok", "message": "Webhook endpoint is active"})