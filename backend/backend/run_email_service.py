"""
Run email processor as a Windows Service
Install with: python run_email_service.py install
Start with: python run_email_service.py start
"""
import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import sys
import os

class EmailProcessorService(win32serviceutil.ServiceFramework):
    _svc_name_ = "HelpDeskEmailProcessor"
    _svc_display_name_ = "HelpDesk Email Auto-Processor"
    _svc_description_ = "Automatically processes incoming emails to create support tickets"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        socket.setdefaulttimeout(60)

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        import time
        import django
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
        django.setup()
        
        from tickets.email_handler import email_handler
        
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
        
        while True:
            try:
                result = email_handler.process_incoming_emails(test_mode=False)
                if result.get('error'):
                    servicemanager.LogErrorMsg(f"Error: {result['error']}")
            except Exception as e:
                servicemanager.LogErrorMsg(f"Exception: {e}")
            
            # Wait 30 seconds before next check
            time.sleep(30)

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(EmailProcessorService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(EmailProcessorService)