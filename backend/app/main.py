"""
main.py

Entry point for the backend API.

This file is responsible for:
1. Creating the FastAPI application instance.
2. Loading environment configuration needed by the app.
3. Configuring middleware such as CORS.
4. Registering the route modules for authentication, recipes, pantry, and grocery features.
5. Exposing a simple health-check endpoint for local development and deployment monitoring.

This file should stay lightweight. It wires the application together, but does not
contain the main business logic for individual features.
"""