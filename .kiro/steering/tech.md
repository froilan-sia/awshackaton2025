# Technology Stack

## Architecture
- **Microservices Architecture**: Distributed services with API Gateway pattern
- **Containerization**: Docker and Docker Compose for development, Kubernetes for production
- **Infrastructure as Code**: Terraform for AWS deployment

## Backend Technologies

### Node.js Services
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with middleware for security, logging, and rate limiting
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for session management and performance
- **Authentication**: JWT tokens with bcryptjs for password hashing
- **Validation**: Joi for request validation
- **Testing**: Jest with supertest for API testing

### Python Services
- **Framework**: FastAPI with Pydantic for data validation
- **ML/AI**: TensorFlow, scikit-learn, pandas, numpy
- **Database**: PyMongo for MongoDB integration
- **Testing**: pytest with asyncio support

### Key Services
- API Gateway (Express.js) - Port 3000
- User Service (Node.js) - Port 3001
- Recommendation Service (Python/FastAPI) - Port 8000
- Location Service (Node.js) - Port 3002
- Event Service (Node.js) - Port 3003
- Privacy Service (Node.js) - Port 3007

## Frontend Technologies

### Mobile App
- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **Maps**: React Native Maps
- **Location**: Expo Location
- **Notifications**: Expo Notifications
- **Testing**: Jest with React Native Testing Library

### Web App
- **Framework**: Next.js (referenced but not fully implemented)
- **Deployment**: Nginx for static content serving

## Databases
- **MongoDB**: Primary database for user data, attractions, events
- **Redis**: Caching and session storage
- **PostgreSQL**: Analytics and reporting data

## Development Commands

### Setup
```bash
npm run setup              # Install all dependencies
npm run dev               # Start all services with Docker
npm run dev:services      # Start only backend services
npm run dev:frontend      # Start frontend applications
```

### Building
```bash
npm run build             # Build all components
npm run build:types       # Build shared TypeScript types
npm run build:backend     # Build backend services
npm run build:frontend    # Build frontend applications
```

### Testing
```bash
npm test                  # Run all tests
npm run test:backend      # Run backend tests only
npm run test:frontend     # Run frontend tests only
```

### Docker Operations
```bash
npm run docker:build      # Build Docker images
npm run docker:up         # Start services in background
npm run docker:down       # Stop all services
npm run docker:logs       # View service logs
```

### Linting
```bash
npm run lint              # Lint all code
npm run lint:backend      # Lint backend code
npm run lint:frontend     # Lint frontend code
```

## Development Environment
- **Node.js**: 18+ required
- **npm**: 9+ required
- **Docker**: Required for local development
- **Python**: 3.11+ for recommendation service