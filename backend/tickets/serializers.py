import random
import string
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ticket, TicketEngineer, TicketLog, Message, Assignment

User = get_user_model()

# 1. Simple User serializer for nested representations
class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type']

# 2. Ticket Engineer Serializer
class TicketEngineerSerializer(serializers.ModelSerializer):
    engineer = SimpleUserSerializer(read_only=True)
    
    class Meta:
        model = TicketEngineer
        fields = ['id', 'engineer', 'assigned_at', 'is_primary']
        read_only_fields = ['id', 'assigned_at']

# 3. Main Ticket Serializer - THIS IS THE ONE USED FOR UPDATES
class TicketSerializer(serializers.ModelSerializer):
    """
    Main Ticket Serializer used for viewing and updating tickets.
    Fixed to permit status and priority updates from the frontend.
    """
    client = SimpleUserSerializer(read_only=True)
    assigned_engineers = TicketEngineerSerializer(many=True, read_only=True)
    assigned_engineers_details = serializers.SerializerMethodField()
    
    # Explicitly define status to ensure the ChoiceField is handled correctly during PATCH
    status = serializers.ChoiceField(choices=Ticket.STATUS_CHOICES, required=False)
    # Explicitly define priority for the same reason
    priority = serializers.ChoiceField(choices=Ticket.PRIORITY_CHOICES, required=False)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'title', 'description',
            'client', 'assigned_engineers', 'assigned_engineers_details', 
            'priority', 'status', 'category', 'created_at', 'updated_at',
            'resolved_at'
        ]
        # These fields remain locked to prevent client/system tampering
        read_only_fields = [
            'id', 'ticket_number', 'client', 'created_at', 
            'updated_at', 'resolved_at'
        ]
        # Force status and priority to be writable to resolve the update error
        extra_kwargs = {
            'status': {'read_only': False},
            'priority': {'read_only': False}
        }

    def get_assigned_engineers_details(self, obj):
        """
        Helper method to provide flat engineer details for the frontend dashboard.
        """
        # Checks if assigned_engineers exists to prevent performance dashboard errors
        if hasattr(obj, 'assigned_engineers'):
            return [
                {
                    "id": te.engineer.id, 
                    "username": te.engineer.username, 
                    "full_name": f"{te.engineer.first_name} {te.engineer.last_name}"
                } 
                for te in obj.assigned_engineers.all()
            ]
        return []

    def create(self, validated_data):
        """
        Handles ticket creation with automatic ticket number generation.
        """
        request = self.context.get('request')
        
        # Generate a unique ticket number
        while True:
            random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            ticket_number = f"TICKET-{random_chars}"
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                break
        
        ticket = Ticket.objects.create(
            ticket_number=ticket_number,
            title=validated_data['title'],
            description=validated_data['description'],
            category=validated_data['category'],
            priority=validated_data.get('priority', 'medium'),
            client=request.user,
            status='open'
        )
        return ticket
# 4. Ticket Log Serializer
class TicketLogSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    class Meta:
        model = TicketLog
        fields = ['id', 'ticket', 'user', 'action', 'details', 'timestamp']
        read_only_fields = ['id', 'timestamp']

# 5. Message Serializer
class MessageSerializer(serializers.ModelSerializer):
    sender = SimpleUserSerializer(read_only=True)
    class Meta:
        model = Message
        fields = ['id', 'ticket', 'sender', 'content', 'timestamp', 'is_read']
        read_only_fields = ['id', 'timestamp', 'is_read', 'sender']
    
    def create(self, validated_data):
        request = self.context.get('request')
        return Message.objects.create(**validated_data, sender=request.user)

# 6. Assignment Serializer
class AssignmentSerializer(serializers.ModelSerializer):
    engineer = SimpleUserSerializer(read_only=True)
    assigned_by = SimpleUserSerializer(read_only=True)
    ticket = TicketSerializer(read_only=True)
    class Meta:
        model = Assignment
        fields = ['id', 'ticket', 'engineer', 'assigned_by', 'assigned_at', 'note']
        read_only_fields = ['id', 'assigned_at', 'assigned_by']

# 7. Simple Ticket Serializer - ALSO ALLOW STATUS HERE IF USED IN VIEWS
class SimpleTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['title', 'description', 'category', 'priority', 'status'] # Added status
    
    def create(self, validated_data):
        request = self.context.get('request')
        random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        ticket_number = f"TICKET-{random_chars}"
        return Ticket.objects.create(
            ticket_number=ticket_number,
            title=validated_data['title'],
            description=validated_data['description'],
            category=validated_data['category'],
            priority=validated_data.get('priority', 'medium'),
            client=request.user,
            status='open'
        )