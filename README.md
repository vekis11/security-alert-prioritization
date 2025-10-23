# Security Alert Prioritization Dashboard

A comprehensive, AI-powered security alert prioritization dashboard that integrates with multiple security tools to provide intelligent threat analysis and automated prioritization.

## 🚀 Features

### Core Capabilities
- **Real-time Monitoring**: Live data synchronization from 20+ security tools
- **AI-Powered Analysis**: Intelligent threat prioritization using OpenAI GPT-4
- **Multi-Tool Integration**: Connect with Tenable, CrowdStrike, Splunk, Veracode, and more
- **Automated Workflows**: Smart alert assignment and response automation
- **Advanced Analytics**: Comprehensive reporting and trend analysis
- **Slack Integration**: Real-time notifications and team collaboration

### Supported Security Tools

#### Vulnerability Management
- Tenable.io
- Qualys VMDR
- Rapid7 InsightVM
- Vulcan Cyber
- Kenna Security

#### EDR/XDR Platforms
- CrowdStrike Falcon
- SentinelOne
- Palo Alto Cortex XDR
- Microsoft Defender for Endpoint
- VMware Carbon Black

#### SIEM/SOAR Platforms
- Splunk SIEM
- IBM QRadar
- Splunk Phantom SOAR
- FireEye Helix

#### Application Security
- Veracode
- Checkmarx SAST

#### AI/ML Security
- Darktrace Enterprise Immune System

#### Ticketing/Workflow
- Jira Security
- ServiceNow Security Operations

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data storage
- **Socket.io** for real-time communication
- **OpenAI GPT-4** for AI analysis
- **JWT** for authentication
- **Winston** for logging

### Frontend
- **React 18** with modern hooks
- **Tailwind CSS** for responsive styling
- **React Query** for data fetching
- **Recharts** for data visualization
- **Socket.io Client** for real-time updates
- **React Router** for navigation
- **Mobile-First Design** with responsive breakpoints
- **Touch-Friendly Interface** optimized for mobile devices

### Security Features
- Role-based access control
- JWT authentication
- Rate limiting
- Input validation
- CORS protection
- Helmet.js security headers

## 📦 Installation

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd security-alert-prioritization
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Configure environment variables**
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/security-dashboard

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Security Tool API Keys
TENABLE_API_KEY=your-tenable-api-key
TENABLE_ACCESS_KEY=your-tenable-access-key
TENABLE_SECRET_KEY=your-tenable-secret-key

CROWDSTRIKE_CLIENT_ID=your-crowdstrike-client-id
CROWDSTRIKE_CLIENT_SECRET=your-crowdstrike-client-secret

VERACODE_API_ID=your-veracode-api-id
VERACODE_API_KEY=your-veracode-api-key

SPLUNK_HOST=your-splunk-host
SPLUNK_TOKEN=your-splunk-token

# AI Configuration
OPENAI_API_KEY=your-openai-api-key

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

4. **Start the application**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Configuration

### Adding New Security Tool Integrations

1. **Create Service Class**
```javascript
// server/services/NewToolService.js
class NewToolService {
  constructor(config) {
    this.apiKey = config.api_key;
    this.baseUrl = config.base_url;
  }

  async authenticate() {
    // Implementation
  }

  async getAlerts(filters = {}) {
    // Implementation
  }

  transformAlerts(alerts) {
    // Transform to standard format
  }
}
```

2. **Update Integration Types**
Add to `server/routes/integrations.js`:
```javascript
{
  id: 'new_tool',
  name: 'New Security Tool',
  description: 'Description of the tool',
  icon: 'shield',
  category: 'Vulnerability Management',
  fields: [
    { name: 'api_key', label: 'API Key', type: 'password', required: true },
    { name: 'base_url', label: 'Base URL', type: 'text', required: true }
  ]
}
```

3. **Update Data Sync Service**
Add case to `server/services/DataSyncService.js`:
```javascript
case 'new_tool':
  service = new NewToolService(integration.configuration.new_tool);
  alerts = await service.getAlerts(integration.settings.filters);
  break;
```

### AI Configuration

The system uses OpenAI GPT-4 for intelligent analysis. Configure your OpenAI API key in the environment variables:

```env
OPENAI_API_KEY=your-openai-api-key
```

### Slack Integration

1. **Create Slack App**
   - Go to https://api.slack.com/apps
   - Create a new app
   - Enable OAuth & Permissions
   - Add Bot Token Scopes: `chat:write`, `channels:read`, `users:read`

2. **Configure Environment Variables**
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_WEBHOOK_URL=your-webhook-url
```

## 📊 API Documentation

### Authentication
```bash
POST /api/auth/login
{
  "username": "user@example.com",
  "password": "password"
}
```

### Alerts
```bash
GET /api/alerts?severity=critical&status=open&limit=25
POST /api/alerts/:id/assign
PUT /api/alerts/:id/resolve
```

### Integrations
```bash
GET /api/integrations
POST /api/integrations
POST /api/integrations/:id/test
POST /api/integrations/:id/sync
```

### AI Analysis
```bash
POST /api/ai/analyze
POST /api/ai/prioritize
GET /api/ai/insights
```

## 🎯 Usage

### Responsive Design
- **Mobile-First**: Optimized for smartphones and tablets
- **Desktop**: Full-featured experience on large screens
- **Touch-Friendly**: 44px minimum touch targets for mobile
- **Adaptive Layout**: Content reflows based on screen size
- **Progressive Enhancement**: Core functionality on all devices

### Dashboard Overview
- **Real-time Stats**: Critical, high, medium, and low priority alerts
- **Charts**: Severity distribution and status overview
- **Recent Alerts**: Latest security alerts with AI analysis
- **AI Insights**: Intelligent recommendations and threat analysis

### Alert Management
- **Filtering**: By severity, status, source, category, priority
- **Search**: Full-text search across alerts
- **Bulk Actions**: Mass update, assign, resolve
- **AI Analysis**: Risk score, business impact, urgency reason

### Integration Management
- **Connect Tools**: Easy setup for 20+ security tools
- **Test Connections**: Verify API credentials
- **Sync Data**: Manual and automated data synchronization
- **Monitor Status**: Real-time integration health

### AI-Powered Features
- **Smart Prioritization**: Automatically rank alerts by risk
- **Threat Intelligence**: Contextual threat analysis
- **Remediation Plans**: AI-generated response strategies
- **Risk Assessment**: Comprehensive business impact analysis

## 🔒 Security Considerations

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Analyst, Engineer, Viewer)
- Password hashing with bcrypt
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting

### API Security
- API key management
- Request validation
- Error handling
- Logging and monitoring

## 🚀 Deployment

### Docker Deployment
```bash
# Build images
docker build -t security-dashboard-backend ./server
docker build -t security-dashboard-frontend ./client

# Run with docker-compose
docker-compose up -d
```

### Production Environment
1. Set `NODE_ENV=production`
2. Configure production MongoDB
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging

## 📈 Performance Optimization

### Backend
- Database indexing
- Query optimization
- Caching strategies
- Rate limiting
- Connection pooling

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis
- CDN integration

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
- Create an issue on GitHub
- Check the documentation
- Contact the development team

## 🔮 Roadmap

### Upcoming Features
- [ ] Advanced threat hunting capabilities
- [ ] Machine learning model training
- [ ] Custom dashboard widgets
- [ ] Mobile application
- [ ] Advanced reporting
- [ ] Workflow automation
- [ ] Third-party integrations
- [ ] API rate limiting
- [ ] Advanced analytics
- [ ] Compliance reporting

---

**Built with ❤️ for the security community**
