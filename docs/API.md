# IntegriSense AI — API Reference

Base URL (local): `http://localhost:8080`
Base URL (prod): `https://<cloud-run-url>`

All responses are JSON. All timestamps are ISO 8601 UTC.

---

## Authentication

> Phase 14+ — Firebase Authentication JWT required for protected endpoints.
> Phase 0 endpoints are unauthenticated for development.

---

## Health

### `GET /health`

Returns the API health status.

**Authentication:** None required

**Response 200:**
```json
{
  "status": "healthy",
  "service": "integrisense-api",
  "environment": "development"
}
```

---

## Integrations *(Phase 3+)*

### `GET /integrations`

Returns the list of all monitored integration pipelines.

### `GET /integrations/:id`

Returns details for a specific integration.

### `GET /integrations/:id/health`

Returns the current health status and risk score for a specific integration.

---

## Incidents *(Phase 8+)*

### `GET /incidents`

Returns a paginated list of detected incidents.

### `GET /incidents/:id`

Returns full incident details including RCA output.

---

## Risk *(Phase 6+)*

### `GET /risk`

Returns failure probability scores for all integrations.

---

## Simulation *(Phase 15+)*

### `POST /simulate`

Triggers a synthetic scenario for demo purposes.

**Request body:**
```json
{
  "scenario": "degradation | incident | cascading",
  "integrationId": "optional-integration-id"
}
```

---

## Agents *(Phase 8+)*

### `GET /agents/activity`

Returns the agent activity log.

### `POST /agents/investigate`

Triggers the orchestrator to investigate a specific integration or incident.

---

## Recovery *(Phase 11+)*

### `GET /recovery/:id`

Returns a recovery recommendation for an incident.

### `POST /recovery/:id/approve`

Approves a recovery recommendation (human-in-the-loop).

### `POST /recovery/:id/reject`

Rejects a recovery recommendation.

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Description of what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Resource not found |
| 500 | Internal server error |
