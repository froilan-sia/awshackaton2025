# Project Structure

## Root Level Organization

```
hk-tourism-ai-platform/
├── frontend/              # Client applications
├── backend/               # Server-side services
├── shared/                # Shared code and types
├── infrastructure/        # Deployment and infrastructure
├── tests/                 # Cross-service testing
├── docker-compose.yml     # Development environment
└── package.json          # Workspace configuration
```

## Frontend Structure

### Mobile App (`frontend/mobile/`)
- **React Native + Expo** application
- **Structure**:
  - `src/screens/` - Screen components (Home, Profile, Itinerary, etc.)
  - `src/services/` - API clients and external service integrations
  - `src/types/` - TypeScript type definitions
  - `src/__tests__/` - Test files with setup configuration

### Web App (`frontend/web/`)
- **Next.js** application (minimal implementation)
- Standard Next.js project structure

## Backend Structure

### API Gateway (`backend/api-gateway/`)
- **Express.js** gateway service
- **Structure**:
  - `src/middleware/` - Auth, circuit breaker, error handling, logging
  - `src/routes/` - Route definitions and proxying
  - `src/services/` - Load balancer, service discovery, monitoring
  - `tests/` - Unit, integration, and e2e tests

### Microservices (`backend/services/`)

Each service follows consistent structure:
```
service-name/
├── src/
│   ├── index.ts           # Service entry point
│   ├── models/            # Data models and schemas
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Service-specific middleware
│   ├── validation/        # Request validation schemas
│   └── types/             # TypeScript definitions
├── tests/
│   ├── routes/            # Route testing
│   ├── services/          # Service logic testing
│   └── setup.ts           # Test configuration
├── demo/                  # Demo scripts and examples
├── Dockerfile             # Container configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

### Key Services
- **user-service** - Authentication and user management
- **recommendation-service** - AI/ML recommendation engine (Python)
- **location-service** - Geolocation and contextual content
- **event-service** - Event aggregation and management
- **privacy-service** - GDPR compliance and data protection
- **notification-service** - Push notifications and alerts
- **itinerary-service** - Trip planning and itinerary generation
- **crowd-service** - Real-time crowd tracking
- **local-insights-service** - Local resident insights
- **sustainability-service** - Eco-friendly travel tracking
- **translation-service** - Multi-language support
- **weather-service** - Weather data integration
- **practical-tips-service** - Travel tips and advice
- **admin-service** - Administrative functions

## Shared Code (`shared/`)

### Types (`shared/types/`)
- **Shared TypeScript definitions** across services
- **Structure**:
  - `attraction.ts` - Attraction data types
  - `event.ts` - Event data types
  - `recommendation.ts` - Recommendation types
  - `user.ts` - User data types
  - `index.ts` - Exported types

## Infrastructure (`infrastructure/`)

### Deployment Configuration
- `kubernetes/` - K8s manifests for production deployment
- `terraform/` - AWS infrastructure as code
- `monitoring/` - Prometheus and Grafana configurations
- `nginx/` - Web server configuration
- `database/` - Database initialization scripts
- `scripts/` - Deployment and maintenance scripts

## Testing (`tests/`)

### Cross-Service Testing
- `e2e/` - End-to-end testing with Cypress
- `performance/` - Load testing with Artillery
- `security/` - Security testing suites
- `accessibility/` - Accessibility compliance testing
- `load/` - Tourist season simulation testing

## File Naming Conventions

### TypeScript/JavaScript
- **Services**: `camelCase` (e.g., `userService.ts`)
- **Models**: `PascalCase` (e.g., `User.ts`, `Event.ts`)
- **Routes**: `camelCase` (e.g., `userRoutes.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Demo files**: `*Demo.ts`

### Configuration Files
- **Docker**: `Dockerfile` (no extension)
- **Environment**: `.env.example` for templates
- **Config**: `*.config.js` (e.g., `jest.config.js`)
- **TypeScript**: `tsconfig.json`

## Development Patterns

### Service Structure
- Each microservice is self-contained with its own dependencies
- Consistent folder structure across all Node.js services
- Separate demo files for testing service functionality
- Comprehensive test coverage with unit, integration, and e2e tests

### Shared Dependencies
- Workspace configuration in root `package.json`
- Shared types package for cross-service consistency
- Common development tools and scripts at workspace level

### Container Strategy
- Individual Dockerfiles for each service
- Docker Compose for local development environment
- Kubernetes manifests for production deployment