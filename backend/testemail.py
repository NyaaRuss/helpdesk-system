import smtplib
import ssl

try:
    context = ssl.create_default_context()
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls(context=context)
    server.login('nyasharusenazhou@gmail.com', 'uarireehpbsolfih')
    print("Login successful!")
    server.quit()
except Exception as e:
    print(f"Error: {e}")