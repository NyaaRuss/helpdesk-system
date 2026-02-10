from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ticket, TicketEngineer, TicketLog, Message, Assignment

User = get_user_model()

# Simple User serializer for nested representations
class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type']

# Ticket Serializer
class TicketSerializer(serializers.ModelSerializer):
    client = SimpleUserSerializer(read_only=True)
    engineer = SimpleUserSerializer(read_only=True, allow_null=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'title', 'description',
            'client', 'engineer', 'priority', 
            'status', 'category', 'created_at', 'updated_at',
            'resolved_at'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'client', 'created_at', 
            'updated_at', 'resolved_at', 'status'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        import uuid
        import random
        import string
        
        # Generate unique ticket number
        while True:
            random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            ticket_number = f"TICKET-{random_chars}"
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                break
        
        # Create ticket
        ticket = Ticket.objects.create(
            ticket_number=ticket_number,
            title=validated_data['title'],
            description=validated_data['description'],
            category=validated_data['category'],
            priority=validated_data['priority'],
            client=request.user,
            status='open'
        )
        
        return ticket

# Ticket Log Serializer
class TicketLogSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    
    class Meta:
        model = TicketLog
        fields = ['id', 'ticket', 'user', 'action', 'details', 'timestamp']
        read_only_fields = ['id', 'timestamp']

# Message Serializer
class MessageSerializer(serializers.ModelSerializer):
    sender = SimpleUserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'ticket', 'sender', 'content', 'timestamp', 'is_read']
        read_only_fields = ['id', 'timestamp', 'is_read', 'sender']
    
    def create(self, validated_data):
        request = self.context.get('request')
        message = Message.objects.create(
            **validated_data,
            sender=request.user
        )
        return message

# Assignment Serializer
class AssignmentSerializer(serializers.ModelSerializer):
    engineer = SimpleUserSerializer(read_only=True)
    assigned_by = SimpleUserSerializer(read_only=True)
    ticket = TicketSerializer(read_only=True)
    
    class Meta:
        model = Assignment
        fields = ['id', 'ticket', 'engineer', 'assigned_by', 'assigned_at', 'note']
        read_only_fields = ['id', 'assigned_at', 'assigned_by']

# Simple Ticket Serializer for creating tickets (alternative)
class SimpleTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['title', 'description', 'category', 'priority']
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        import uuid
        import random
        import string
        
        # Generate ticket number
        random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        ticket_number = f"TICKET-{random_chars}"
        
        # Create ticket
        ticket = Ticket.objects.create(
            ticket_number=ticket_number,
            title=validated_data['title'],
            description=validated_data['description'],
            category=validated_data['category'],
            priority=validated_data['priority'],
            client=request.user,
            status='open'
        )
        
        return ticket
    
# Add serializer for TicketEngineer
class TicketEngineerSerializer(serializers.ModelSerializer):
    engineer = SimpleUserSerializer(read_only=True)
    
    class Meta:
        model = TicketEngineer
        fields = ['id', 'engineer', 'assigned_at', 'is_primary']
        read_only_fields = ['id', 'assigned_at']

# Update TicketSerializer to include multiple engineers
class TicketSerializer(serializers.ModelSerializer):
    client = SimpleUserSerializer(read_only=True)
    assigned_engineers = TicketEngineerSerializer(many=True, read_only=True) #, source='assigned_engineers')
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'title', 'description',
            'client', 'assigned_engineers', 'priority', 
            'status', 'category', 'created_at', 'updated_at',
            'resolved_at'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'client', 'created_at', 
            'updated_at', 'resolved_at', 'status'
        ]