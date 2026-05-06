import random
import string
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ticket, TicketEngineer, TicketLog, Message, Assignment, SLA

User = get_user_model()

def get_next_ticket_number():
    """Generate sequential ticket number: TICKET-1, TICKET-2, etc."""
    last_ticket = Ticket.objects.order_by('-id').first()
    
    if last_ticket and last_ticket.ticket_number:
        match = re.search(r'TICKET-(\d+)', last_ticket.ticket_number)
        if match:
            next_num = int(match.group(1)) + 1
        else:
            next_num = Ticket.objects.count() + 1
    else:
        next_num = 1
    
    return f"TICKET-{next_num}"

class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type']

class TicketEngineerSerializer(serializers.ModelSerializer):
    engineer = SimpleUserSerializer(read_only=True)
    
    class Meta:
        model = TicketEngineer
        fields = ['id', 'engineer', 'assigned_at', 'is_primary']
        read_only_fields = ['id', 'assigned_at']

class TicketSerializer(serializers.ModelSerializer):
    client = SimpleUserSerializer(read_only=True)
    assigned_engineers = TicketEngineerSerializer(many=True, read_only=True)
    assigned_engineers_details = serializers.SerializerMethodField()
    
    status = serializers.ChoiceField(choices=Ticket.STATUS_CHOICES, required=False)
    priority = serializers.ChoiceField(choices=Ticket.PRIORITY_CHOICES, required=False)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'title', 'description',
            'client', 'assigned_engineers', 'assigned_engineers_details', 
            'priority', 'status', 'category', 'created_at', 'updated_at',
            'resolved_at', 'is_escalated', 'escalation_reason', 'progress_percentage'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'client', 'created_at', 
            'updated_at', 'resolved_at', 'is_escalated', 'progress_percentage'
        ]
        extra_kwargs = {
            'status': {'read_only': False},
            'priority': {'read_only': False}
        }

    def get_assigned_engineers_details(self, obj):
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

class TicketLogSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    class Meta:
        model = TicketLog
        fields = ['id', 'ticket', 'user', 'action', 'details', 'timestamp']
        read_only_fields = ['id', 'timestamp']

class MessageSerializer(serializers.ModelSerializer):
    sender = SimpleUserSerializer(read_only=True)
    class Meta:
        model = Message
        fields = ['id', 'ticket', 'sender', 'content', 'timestamp', 'is_read', 'is_from_email', 'is_internal']
        read_only_fields = ['id', 'timestamp', 'is_read', 'sender', 'is_from_email']
    
    def create(self, validated_data):
        request = self.context.get('request')
        return Message.objects.create(**validated_data, sender=request.user)

class AssignmentSerializer(serializers.ModelSerializer):
    engineer = SimpleUserSerializer(read_only=True)
    assigned_by = SimpleUserSerializer(read_only=True)
    ticket = TicketSerializer(read_only=True)
    class Meta:
        model = Assignment
        fields = ['id', 'ticket', 'engineer', 'assigned_by', 'assigned_at', 'note']
        read_only_fields = ['id', 'assigned_at', 'assigned_by']

class SimpleTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['title', 'description', 'category', 'priority', 'status']
        extra_kwargs = {
            'priority': {'required': False},
            'status': {'required': False}
        }
    
    def create(self, validated_data):
        request = self.context.get('request')
        ticket_number = get_next_ticket_number()
        priority = validated_data.get('priority', 'medium')
        
        ticket = Ticket.objects.create(
            ticket_number=ticket_number,
            title=validated_data['title'],
            description=validated_data['description'],
            category=validated_data['category'],
            priority=priority,
            client=request.user,
            status='open'
        )
        return ticket

# tickets/serializers.py - Update SLASerializer

class SLASerializer(serializers.ModelSerializer):
    created_by = SimpleUserSerializer(read_only=True)
    assigned_engineers = SimpleUserSerializer(many=True, read_only=True)
    assigned_engineer_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    STAGES = [
        "Requirements & Baselining",
        "Negotiation & Drafting",
        "Implementation & Tooling",
        "Operations & Monitoring",
        "Reporting & Audit",
        "Billing & Renewal"
    ]

    class Meta:
        model = SLA
        fields = [
            'id', 'client_name', 'service_type', 'scope', 'date_entered', 
            'expiry_date', 'description', 'status', 'created_by', 'current_stage',
            'assigned_engineers', 'assigned_engineer_ids'
        ]
        read_only_fields = ['id', 'created_by']

    def create(self, validated_data):
        assigned_engineer_ids = validated_data.pop('assigned_engineer_ids', [])
        sla = SLA.objects.create(**validated_data)
        if assigned_engineer_ids:
            engineers = User.objects.filter(id__in=assigned_engineer_ids, user_type='engineer')
            sla.assigned_engineers.set(engineers)
        return sla

    def update(self, instance, validated_data):
        assigned_engineer_ids = validated_data.pop('assigned_engineer_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if assigned_engineer_ids is not None:
            engineers = User.objects.filter(id__in=assigned_engineer_ids, user_type='engineer')
            instance.assigned_engineers.set(engineers)
        
        return instance