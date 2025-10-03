# Hong Kong Tourism AI Platform

An AI-powered personalized tourism platform for Hong Kong that provides hyper-personalized recommendations, real-time crowd management, authentic local experience discovery, and multi-language support.

## 🏗️ Architecture

The platform follows a microservices architecture with the following components:

### Frontend
- **Mobile App**: React Native application for iOS and Android
- **Web App**: Next.js web application with PWA capabilities

### Backend Services
- **API Gateway**: Express.js gateway with authentication and routing
- **User Service**: User management and authentication (Node.js)
- **Recommendation Service**: AI-powered recommendation engine (Python/FastAPI)
- **Location Service**: Location-based services and geofencing (Node.js)
- **Event Service**: Event aggregation and management (Node.js)

### Data Storage
- **MongoDB**: Primary database for user data, attractions, and events
- **Redis**: Caching and session management
- **PostgreSQL**: Analytics and reporting data

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Python 3.11+ (for recommendation service)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/froilan-sia/awshackaton2025
   cd awshackaton2025
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   npm run setup
   ```

4. **Start development environment**
   ```bash
   npm run dev
   ```

This will start all services using Docker Compose:
- API Gateway: http://localhost:3000
- User Service: http://localhost:3001
- Recommendation Service: http://localhost:8000
- Location Service: http://localhost:3002
- Event Service: http://localhost:3003
- MongoDB: localhost:27017
- Redis: localhost:6379
- PostgreSQL: localhost:5432

### Development Workflow

**Start only backend services:**
```bash
npm run dev:services
```

**Start frontend applications:**
```bash
npm run dev:frontend
```

**Run tests:**
```bash
npm test
```

**Build for production:**
```bash
npm run build
```

## 📱 Mobile Development

The mobile app is built with React Native and Expo:

```bash
cd frontend/mobile
npm install
npm start
```

Use the Expo Go app to test on your device, or run on simulators:
- iOS: `npm run ios`
- Android: `npm run android`

## 🌐 Web Development

The web app is built with Next.js:

```bash
cd frontend/web
npm install
npm run dev
```

Access the web app at http://localhost:3000

## 🔧 API Documentation

### Health Check
```
GET /health
```

### Authentication
```
POST /api/users/register
POST /api/users/login
GET /api/users/profile (authenticated)
```

### Recommendations
```
GET /api/recommendations (authenticated)
POST /api/recommendations/feedback (authenticated)
```

### Locations
```
GET /api/locations/attractions
GET /api/locations/nearby
POST /api/locations/geofence
```

### Events
```
GET /api/events
GET /api/events/hktb
GET /api/events/malls
```

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:backend
npm run test:frontend
```

## 🐳 Docker Development

**Build all services:**
```bash
npm run docker:build
```

**Start services in background:**
```bash
npm run docker:up
```

**View logs:**
```bash
npm run docker:logs
```

**Stop services:**
```bash
npm run docker:down
```

## 📊 Monitoring and Logging

- Health checks available at `/health` for each service
- Structured logging with request/response tracking
- Error handling with fallback mechanisms
- Rate limiting and security middleware

## 🔒 Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- Helmet.js security headers
- Environment-based configuration

## 🌍 Environment Configuration

### Development
- Hot reloading enabled
- Debug logging
- Mock external APIs
- Local database connections

### Production
- Optimized builds
- Error tracking
- External API integrations
- Distributed database setup

## 📚 Project Structure

```
hk-tourism-ai-platform/
├── frontend/
│   ├── mobile/          # React Native mobile app
│   └── web/             # Next.js web app
├── backend/
│   ├── api-gateway/     # Express.js API gateway
│   └── services/        # Microservices
│       ├── user-service/
│       ├── recommendation-service/
│       ├── location-service/
│       └── event-service/
├── shared/
│   └── types/           # Shared TypeScript types
├── scripts/             # Database initialization scripts
├── nginx/               # Nginx configuration
└── docker-compose.yml   # Development environment
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in `/docs`
