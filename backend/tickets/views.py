from django.db.models import Count, Avg
from django.db.models.functions import TruncDate
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Ticket
from .serializers import TicketSerializer, ClassifyRequestSerializer
from .llm import classify_ticket


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Ticket CRUD with stats and LLM classification endpoints.

    Endpoints:
        GET    /api/tickets/          — List all tickets (filterable, searchable)
        POST   /api/tickets/          — Create a new ticket
        PATCH  /api/tickets/<id>/     — Partial update (e.g. change status)
        GET    /api/tickets/stats/    — Aggregated statistics
        POST   /api/tickets/classify/ — LLM-based classification
    """
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    # django-filter: exact match on these fields via ?category=&priority=&status=
    filterset_fields = ['category', 'priority', 'status']

    # DRF SearchFilter: ?search= searches across title and description
    search_fields = ['title', 'description']

    # Default ordering: newest first
    ordering = ['-created_at']

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Return aggregated ticket statistics using DB-level aggregation.
        No Python-level loops — all computation is done via Django ORM
        aggregate/annotate which translates to SQL GROUP BY and AVG.
        """
        total = Ticket.objects.count()
        open_count = Ticket.objects.filter(status='open').count()

        # Average tickets per day: annotate each date with its count,
        # then aggregate the average of those daily counts.
        daily_counts = (
            Ticket.objects
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(daily_count=Count('id'))
        )
        avg_result = daily_counts.aggregate(avg_per_day=Avg('daily_count'))
        avg_per_day = round(avg_result['avg_per_day'] or 0, 1)

        # Priority breakdown via DB-level GROUP BY
        priority_qs = (
            Ticket.objects
            .values('priority')
            .annotate(count=Count('id'))
        )
        priority_breakdown = {
            p.value: 0 for p in Ticket.Priority
        }
        for row in priority_qs:
            priority_breakdown[row['priority']] = row['count']

        # Category breakdown via DB-level GROUP BY
        category_qs = (
            Ticket.objects
            .values('category')
            .annotate(count=Count('id'))
        )
        category_breakdown = {
            c.value: 0 for c in Ticket.Category
        }
        for row in category_qs:
            category_breakdown[row['category']] = row['count']

        return Response({
            'total_tickets': total,
            'open_tickets': open_count,
            'avg_tickets_per_day': avg_per_day,
            'priority_breakdown': priority_breakdown,
            'category_breakdown': category_breakdown,
        })

    @action(detail=False, methods=['post'], url_path='classify')
    def classify(self, request):
        """
        Accept a description and return LLM-suggested category + priority.
        Fails gracefully — returns 503 if LLM is unavailable.
        """
        serializer = ClassifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        description = serializer.validated_data['description']
        result = classify_ticket(description)

        if result is None:
            return Response(
                {'error': 'Classification service unavailable. Please select category and priority manually.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(result)
