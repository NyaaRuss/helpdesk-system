import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log incoming request
        logger.info(f"Incoming request: {request.method} {request.path}")
        logger.info(f"Headers: {dict(request.headers)}")
        
        # Handle request body logging for POST/PUT/PATCH
        if request.method in ['POST', 'PUT', 'PATCH']:
            if request.content_type == 'application/json':
                try:
                    import json
                    body = json.loads(request.body.decode('utf-8'))
                    logger.info(f"Request body: {body}")
                except:
                    logger.info(f"Request body (raw): {request.body}")
        
        response = self.get_response(request)
        
        # Log response
        logger.info(f"Response status: {response.status_code}")
        
        return response