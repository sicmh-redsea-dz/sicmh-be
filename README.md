# Backend Project

## Description
This is a backend developed with Node.js and Express to handle business logic and expose a REST API.

## Features
- Authentication and authorization with JWT
- DB connection using MySQL
- Centralized error handling

## Technologies
- Node.js
- Express.js
- MySQL
- JSON Web Token (JWT)

## Requirements
Before starting, make sure you have installed:
- [Node.js](https://nodejs.org/) (version 22 or higher)
- [MongoDB](https://www.mongodb.com/)

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/sicmh-redsea-dz/sicmh-be.git
   ```
2. Navigate to the project folder:
   ```sh
   cd sicmh-be
   ```
3. Install dependencies:
   ```sh
   npm install
   ```

## Configuration
1. Create a `.env` file in the project root with the following environment variables:
   ```env
        ## SERVER
        PORT=port
        ## JWT
        SECRET_JWT_TOKEN=token
        JWT_EXPIRES_IN=1h
        ## DATABASE
        DB_HOST=host
        DB_USER=user
        DB_PASSWORD=password
        DB_SCHEMA=schema
        DB_PORT=port
   ```

## Usage
1. Start the development server:
   ```sh
   npm run start:dev
   ```
2. For production:
   ```sh
   npm start
   ```
3. The API will be available at `http://localhost:3000`
