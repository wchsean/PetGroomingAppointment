# Daily Appointment Book API Documentation

This document provides details about the API endpoints available for the Daily Appointment Book application.

## Base URL

All API endpoints are relative to your application's base URL.

## Response Format

All API responses follow this standard format:

\`\`\`json
{
  "success": true|false,
  "data": [result object or array],
  "error": "Error message if success is false",
  "message": "Success message if applicable"
}
\`\`\`

## Authentication

All API endpoints require authentication. Authentication is handled by Next.js middleware.

## Customers API

### Get All Customers

**GET /api/customers**

Query Parameters:
- `search` (optional): Search term to filter customers by name, dog name, or phone

Response:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Smith",
      "dog_name": "Max",
      "phone": "5550123456",
      "general_note": "Prefers morning appointments",
      "previous_services": "Full grooming, nail trim",
      "previous_price": "85",
      "created_at": "2023-05-01T12:00:00Z",
      "updated_at": "2023-05-01T12:00:00Z"
    },
    ...
  ]
}
\`\`\`

### Get Customer with Service History

**GET /api/customers/:id**

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "name": "John Smith",
      "dog_name": "Max",
      "phone": "5550123456",
      "general_note": "Prefers morning appointments",
      "previous_services": "Full grooming, nail trim",
      "previous_price": "85",
      "created_at": "2023-05-01T12:00:00Z",
      "updated_at": "2023-05-01T12:00:00Z"
    },
    "serviceHistory": [
      {
        "id": 1,
        "customer_id": 1,
        "date": "2023-05-01",
        "services": "Full grooming, nail trim",
        "price": "85",
        "note": "Good behavior",
        "created_at": "2023-05-01T12:00:00Z"
      },
      ...
    ]
  }
}
\`\`\`

### Create Customer

**POST /api/customers**

Request Body:
\`\`\`json
{
  "name": "John Smith",
  "dog_name": "Max",
  "phone": "5550123456",
  "general_note": "Prefers morning appointments",
  "previous_services": "Full grooming, nail trim",
  "previous_price": "85"
}
\`\`\`

Required fields: `dog_name`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Smith",
    "dog_name": "Max",
    "phone": "5550123456",
    "general_note": "Prefers morning appointments",
    "previous_services": "Full grooming, nail trim",
    "previous_price": "85",
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
  },
  "message": "Customer created successfully"
}
\`\`\`

### Update Customer

**PUT /api/customers/:id**

Request Body:
\`\`\`json
{
  "name": "John Smith",
  "dog_name": "Max",
  "phone": "5550123456",
  "general_note": "Prefers morning appointments",
  "previous_services": "Full grooming, nail trim",
  "previous_price": "85"
}
\`\`\`

Required fields: `dog_name`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Smith",
    "dog_name": "Max",
    "phone": "5550123456",
    "general_note": "Prefers morning appointments",
    "previous_services": "Full grooming, nail trim",
    "previous_price": "85",
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
  },
  "message": "Customer updated successfully"
}
\`\`\`

### Delete Customer

**DELETE /api/customers/:id**

Response:
\`\`\`json
{
  "success": true,
  "message": "Customer deleted successfully"
}
\`\`\`

## Service History API

### Get Service History

**GET /api/service-history**

Query Parameters:
- `customer_id` (optional): Filter by customer ID

Response:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "date": "2023-05-01",
      "services": "Full grooming, nail trim",
      "price": "85",
      "note": "Good behavior",
      "created_at": "2023-05-01T12:00:00Z"
    },
    ...
  ]
}
\`\`\`

### Add Service History

**POST /api/service-history**

Request Body:
\`\`\`json
{
  "customer_id": 1,
  "date": "2023-05-01",
  "services": "Full grooming, nail trim",
  "price": "85",
  "note": "Good behavior"
}
\`\`\`

Required fields: `customer_id`, `date`, `services`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_id": 1,
    "date": "2023-05-01",
    "services": "Full grooming, nail trim",
    "price": "85",
    "note": "Good behavior",
    "created_at": "2023-05-01T12:00:00Z"
  },
  "message": "Service history added successfully"
}
\`\`\`

## Appointments API

### Get Appointments by Date

**GET /api/appointments**

Query Parameters:
- `date` (required): Date in YYYY-MM-DD format

Response:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "time": "09:00",
      "quickDetails": "John Smith - Max",
      "name": "John Smith",
      "dogName": "Max",
      "phone": "5550123456",
      "generalNote": "Prefers morning appointments",
      "todaysNote": "First visit",
      "previousServices": "Full grooming, nail trim",
      "previousPrice": "85",
      "todaysServices": "Full grooming, nail trim",
      "todaysPrice": "85",
      "status": "no-status"
    },
    ...
  ]
}
\`\`\`

### Create Appointment

**POST /api/appointments**

Request Body:
\`\`\`json
{
  "date": "2023-05-01",
  "time": "09:00",
  "quickDetails": "John Smith - Max",
  "name": "John Smith",
  "dogName": "Max",
  "phone": "5550123456",
  "generalNote": "Prefers morning appointments",
  "todaysNote": "First visit",
  "previousServices": "Full grooming, nail trim",
  "previousPrice": "85",
  "todaysServices": "Full grooming, nail trim",
  "todaysPrice": "85",
  "status": "no-status"
}
\`\`\`

Required fields: `date`, `time`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_id": 1,
    "date": "2023-05-01",
    "time": "09:00",
    "quick_details": "John Smith - Max",
    "todays_services": "Full grooming, nail trim",
    "todays_price": "85",
    "todays_note": "First visit",
    "status": "no-status",
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
  },
  "message": "Appointment created successfully"
}
\`\`\`

### Get Appointment

**GET /api/appointments/:id**

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": "1",
    "time": "09:00",
    "quickDetails": "John Smith - Max",
    "name": "John Smith",
    "dogName": "Max",
    "phone": "5550123456",
    "generalNote": "Prefers morning appointments",
    "todaysNote": "First visit",
    "previousServices": "Full grooming, nail trim",
    "previousPrice": "85",
    "todaysServices": "Full grooming, nail trim",
    "todaysPrice": "85",
    "status": "no-status"
  }
}
\`\`\`

### Update Appointment

**PUT /api/appointments/:id**

Request Body:
\`\`\`json
{
  "name": "John Smith",
  "dogName": "Max",
  "phone": "5550123456",
  "generalNote": "Prefers morning appointments",
  "todaysNote": "First visit",
  "todaysServices": "Full grooming, nail trim",
  "todaysPrice": "85",
  "status": "C"
}
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_id": 1,
    "date": "2023-05-01",
    "time": "09:00",
    "quick_details": "John Smith - Max",
    "todays_services": "Full grooming, nail trim",
    "todays_price": "85",
    "todays_note": "First visit",
    "status": "C",
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
  },
  "message": "Appointment updated successfully"
}
\`\`\`

### Delete Appointment

**DELETE /api/appointments/:id**

Response:
\`\`\`json
{
  "success": true,
  "message": "Appointment deleted successfully"
}
\`\`\`

## Availability Rules API

### Get All Availability Rules

**GET /api/availability-rules**

Response:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "weekly",
      "day_of_week": 1,
      "specific_date": null,
      "time": "09:00",
      "is_enabled": true,
      "created_at": "2023-05-01T12:00:00Z"
    },
    {
      "id": 2,
      "type": "specific",
      "day_of_week": null,
      "specific_date": "2023-05-15",
      "time": "14:00",
      "is_enabled": true,
      "created_at": "2023-05-01T12:00:00Z"
    },
    ...
  ]
}
\`\`\`

### Create Availability Rule

**POST /api/availability-rules**

Request Body:
\`\`\`json
{
  "type": "weekly",
  "day_of_week": 1,
  "specific_date": null,
  "time": "09:00",
  "is_enabled": true
}
\`\`\`

Required fields: `type`, `time`, and either `day_of_week` (for weekly) or `specific_date` (for specific)

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "weekly",
    "day_of_week": 1,
    "specific_date": null,
    "time": "09:00",
    "is_enabled": true,
    "created_at": "2023-05-01T12:00:00Z"
  },
  "message": "Availability rule created successfully"
}
\`\`\`

### Update All Availability Rules

**PUT /api/availability-rules**

Request Body:
\`\`\`json
[
  {
    "type": "weekly",
    "day_of_week": 1,
    "specific_date": null,
    "time": "09:00",
    "is_enabled": true
  },
  {
    "type": "specific",
    "day_of_week": null,
    "specific_date": "2023-05-15",
    "time": "14:00",
    "is_enabled": true
  },
  ...
]
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "weekly",
      "day_of_week": 1,
      "specific_date": null,
      "time": "09:00",
      "is_enabled": true,
      "created_at": "2023-05-01T12:00:00Z"
    },
    ...
  ],
  "message": "Availability rules updated successfully"
}
\`\`\`

### Update Specific Availability Rule

**PUT /api/availability-rules/:id**

Request Body:
\`\`\`json
{
  "type": "weekly",
  "day_of_week": 2,
  "specific_date": null,
  "time": "10:00",
  "is_enabled": true
}
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "weekly",
    "day_of_week": 2,
    "specific_date": null,
    "time": "10:00",
    "is_enabled": true,
    "created_at": "2023-05-01T12:00:00Z"
  },
  "message": "Availability rule updated successfully"
}
\`\`\`

### Delete Availability Rule

**DELETE /api/availability-rules/:id**

Response:
\`\`\`json
{
  "success": true,
  "message": "Availability rule deleted successfully"
}
\`\`\`

## Error Responses

All endpoints return a standard error format:

\`\`\`json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
\`\`\`

Common HTTP status codes:
- 400: Bad Request - Missing required fields or invalid data
- 404: Not Found - Resource not found
- 500: Internal Server Error - Server-side error
\`\`\`
