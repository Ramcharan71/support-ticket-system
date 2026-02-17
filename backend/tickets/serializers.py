from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    """Serializer for Ticket CRUD operations."""

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'description', 'category',
            'priority', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ClassifyRequestSerializer(serializers.Serializer):
    """Serializer for the LLM classify endpoint input."""
    description = serializers.CharField(required=True, min_length=1)
