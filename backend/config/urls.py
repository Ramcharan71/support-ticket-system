"""
URL configuration for Support Ticket System.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tickets.urls')),
]
