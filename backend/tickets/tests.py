"""
Tests for the Support Ticket System.

Covers:
  - Ticket model creation and constraint validation
  - API CRUD operations (create, list, partial update)
  - Stats endpoint for DB-level aggregation
  - Classify endpoint graceful failure (no API key)
  - Filtering and search query parameters
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Ticket


class TicketModelTests(TestCase):
    """Test the Ticket model and its database constraints."""

    def test_create_ticket_with_defaults(self):
        """Ticket is created with sensible defaults for category, priority, status."""
        ticket = Ticket.objects.create(
            title="Test Ticket",
            description="A test description",
        )
        self.assertEqual(ticket.category, "general")
        self.assertEqual(ticket.priority, "medium")
        self.assertEqual(ticket.status, "open")
        self.assertIsNotNone(ticket.created_at)

    def test_ticket_str_representation(self):
        """__str__ returns '[PRIORITY] title' format."""
        ticket = Ticket.objects.create(
            title="Login Issue",
            description="Cannot log in",
            priority="high",
        )
        self.assertEqual(str(ticket), "[HIGH] Login Issue")

    def test_ordering_newest_first(self):
        """Tickets are ordered by -created_at by default."""
        t1 = Ticket.objects.create(title="First", description="desc")
        t2 = Ticket.objects.create(title="Second", description="desc")
        tickets = list(Ticket.objects.all())
        self.assertEqual(tickets[0].id, t2.id)
        self.assertEqual(tickets[1].id, t1.id)


class TicketAPITests(TestCase):
    """Test the Ticket API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.ticket_data = {
            "title": "Cannot access billing page",
            "description": "When I click on billing, the page shows a 500 error.",
            "category": "technical",
            "priority": "high",
        }

    def test_create_ticket(self):
        """POST /api/tickets/ creates a ticket and returns 201."""
        response = self.client.post("/api/tickets/", self.ticket_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], self.ticket_data["title"])
        self.assertEqual(response.data["status"], "open")
        self.assertIn("id", response.data)
        self.assertIn("created_at", response.data)

    def test_create_ticket_missing_title(self):
        """POST /api/tickets/ without title returns 400."""
        response = self.client.post(
            "/api/tickets/",
            {"description": "No title provided"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_tickets(self):
        """GET /api/tickets/ returns a list of tickets."""
        Ticket.objects.create(title="T1", description="d1")
        Ticket.objects.create(title="T2", description="d2")
        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # May be paginated — check for results key or direct list
        data = response.data.get("results", response.data)
        self.assertEqual(len(data), 2)

    def test_partial_update_status(self):
        """PATCH /api/tickets/<id>/ updates ticket status."""
        ticket = Ticket.objects.create(
            title="Update me", description="desc", status="open"
        )
        response = self.client.patch(
            f"/api/tickets/{ticket.id}/",
            {"status": "in_progress"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "in_progress")

    def test_filter_by_category(self):
        """GET /api/tickets/?category=billing returns only billing tickets."""
        Ticket.objects.create(title="Bill", description="d", category="billing")
        Ticket.objects.create(title="Tech", description="d", category="technical")
        response = self.client.get("/api/tickets/?category=billing")
        data = response.data.get("results", response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["category"], "billing")

    def test_filter_by_priority(self):
        """GET /api/tickets/?priority=critical returns only critical tickets."""
        Ticket.objects.create(title="C1", description="d", priority="critical")
        Ticket.objects.create(title="L1", description="d", priority="low")
        response = self.client.get("/api/tickets/?priority=critical")
        data = response.data.get("results", response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["priority"], "critical")

    def test_search_tickets(self):
        """GET /api/tickets/?search=password finds tickets by keyword."""
        Ticket.objects.create(title="Password reset", description="Need reset")
        Ticket.objects.create(title="Billing query", description="Invoice issue")
        response = self.client.get("/api/tickets/?search=password")
        data = response.data.get("results", response.data)
        self.assertEqual(len(data), 1)
        self.assertIn("Password", data[0]["title"])

    def test_delete_not_allowed(self):
        """DELETE /api/tickets/<id>/ is not allowed (http_method_names restriction)."""
        ticket = Ticket.objects.create(title="No delete", description="d")
        response = self.client.delete(f"/api/tickets/{ticket.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_put_not_allowed(self):
        """PUT /api/tickets/<id>/ is not allowed (only PATCH for partial updates)."""
        ticket = Ticket.objects.create(title="No put", description="d")
        response = self.client.put(
            f"/api/tickets/{ticket.id}/",
            {"title": "Changed", "description": "d"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class StatsAPITests(TestCase):
    """Test the /api/tickets/stats/ aggregation endpoint."""

    def test_stats_empty_db(self):
        """Stats returns zeroed values when no tickets exist."""
        response = self.client.get("/api/tickets/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_tickets"], 0)
        self.assertEqual(response.data["open_tickets"], 0)
        self.assertEqual(response.data["avg_tickets_per_day"], 0)

    def test_stats_with_tickets(self):
        """Stats correctly aggregates counts after creating tickets."""
        Ticket.objects.create(title="T1", description="d", priority="high", category="billing")
        Ticket.objects.create(title="T2", description="d", priority="low", category="billing")
        Ticket.objects.create(title="T3", description="d", priority="high", category="technical", status="resolved")

        response = self.client.get("/api/tickets/stats/")
        self.assertEqual(response.data["total_tickets"], 3)
        self.assertEqual(response.data["open_tickets"], 2)
        self.assertEqual(response.data["priority_breakdown"]["high"], 2)
        self.assertEqual(response.data["priority_breakdown"]["low"], 1)
        self.assertEqual(response.data["category_breakdown"]["billing"], 2)
        self.assertEqual(response.data["category_breakdown"]["technical"], 1)


class ClassifyAPITests(TestCase):
    """Test the /api/tickets/classify/ endpoint."""

    def test_classify_without_api_key(self):
        """Classify returns 503 when no GEMINI_API_KEY is set."""
        response = self.client.post(
            "/api/tickets/classify/",
            {"description": "I cannot log in"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_classify_empty_description(self):
        """Classify returns 400 for empty description."""
        response = self.client.post(
            "/api/tickets/classify/",
            {"description": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_classify_missing_description(self):
        """Classify returns 400 when description field is missing."""
        response = self.client.post(
            "/api/tickets/classify/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
