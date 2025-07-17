# Pet Grooming Appointment System
This is a Pet Grooming Appointment System designed to manage and schedule appointments for pet grooming services. It allows users to search for customers by name or phone number, create appointments, and update appointment status when the pet is picked up. The system uses PostgreSQL as the database and can be easily packaged and run in a Docker container.

**This project is for demonstration purposes only. The code is not open for modification or redistribution.**

## ⚠️ Security Warning
This API currently **lacks any authentication mechanisms. DO NOT deploy this system on public networks without implementing proper security measures**, as it may lead to data leakage and unauthorized access.

This system should only be run in protected and trusted networks. If you plan to use it in a production environment, please ensure that proper security protocols, such as authentication, authorization, and HTTPS, are added before deployment.

## Features
**Customer Search**: Allows searching for customers by their name or phone number.

**Create Appointments**: Create new appointments for pet grooming services.

**Update Status**: When the pet is picked up, the status of the appointment is updated in the database.

**PostgreSQL**: The system uses PostgreSQL as the database to store appointments and customer information.

**Docker Support**: The system can be easily packaged and deployed using Docker for easier setup and portability.

## Technologies
**Backend**: Node.js

**Database**: PostgreSQL

**Docker**: Containerized application for easy deployment

## Getting Started
Follow the steps below to run the system locally or inside a Docker container.

## Prerequisites
Docker (if running inside a container)

PostgreSQL (for database)

### 1. Clone the repository
git clone https://github.com/wchsean/PetGroomingAppointment.git


### 2. Set up PostgreSQL Database
If you're running locally, ensure that PostgreSQL is set up and the database is created. You can configure the connection string inside the configuration file.


### 3. Docker Setup
To run the system with Docker, you can use the provided docker-compose.yml file.

Build and start the services:

docker-compose up --build

This will start both the application.

### 4. Environment Configuration
Make sure to configure the database connection in the .env file (or equivalent configuration file).

Example:

DATABASE_URL=postgresql://username:password@localhost:5432/pet_grooming

### 5. Run the Application
Once everything is set up, you can start interacting with the application. The backend will handle appointment creation, status updates, and customer search functionality.

### 6. Accessing the System
The system should be accessible on your localhost, or you can access it via Docker's exposed ports.

**Usage**
Search Customers
You can search for customers by name or phone number to find existing customers.

**Create Appointments**
You can create a new appointment by entering customer details, pet information, and preferred grooming time.

**Update Appointment Status**
Once the pet has been picked up, you can update the appointment status to "Picked Up". This will automatically update the database record for that appointment.

## License
This project is for demonstration purposes only. The code is not open for modification or redistribution.

