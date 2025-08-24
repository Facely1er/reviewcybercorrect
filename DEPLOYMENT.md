# Production Deployment Guide

## 🚀 Overview

This guide covers the complete process of deploying the Cybersecurity Compliance Platform to production. The application is designed to be deployed on Netlify with Supabase as the backend, but can be adapted for other platforms.

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: Latest version
- **Supabase Account**: For database and authentication
- **Netlify Account**: For hosting (or alternative platform)

### Environment Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/cybersecurity-compliance-platform.git
   cd cybersecurity-compliance-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your production values
   ```

## 🔐 Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
VITE_APP_VERSION=2.0.0
VITE_APP_NAME="Cybersecurity Compliance Platform"

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Security
VITE_ENABLE_CSP=true
VITE_SECURE_COOKIES=true
VITE_ENABLE_HTTPS=true

# Monitoring & Analytics
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id
VITE_VERCEL_ANALYTICS_ID=your-vercel-analytics-id

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_ADVANCED_FEATURES=true
VITE_ENABLE_MULTI_TENANT=true

# API Configuration
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=30000
```

### Supabase Setup

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run database migrations**
   ```bash
   # The migrations are already in supabase/migrations/
   # Supabase will automatically run these when you deploy
   ```

3. **Configure authentication**
   - Enable email authentication in Supabase dashboard
   - Configure password policies
   - Set up email templates

## 🏗️ Build Process

### Automated Production Build

Use the provided build script for a complete production build:

```bash
# Make script executable (first time only)
chmod +x scripts/build-production.sh

# Run production build
npm run build:production
```

This script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Run tests
- ✅ Create backup
- ✅ Build application
- ✅ Analyze bundle
- ✅ Run security checks
- ✅ Create deployment package
- ✅ Generate build report

### Manual Build Steps

If you prefer to build manually:

```bash
# 1. Install dependencies
npm ci --production=false

# 2. Run tests
npm run test:run
npm run type-check
npm run lint

# 3. Build for production
npm run build

# 4. Preview build
npm run preview
```

### Build Verification

After building, verify the production build:

```bash
# Check build output
ls -la dist/

# Verify no console statements in production
grep -r "console.log" dist/ --include="*.js" || echo "✅ No console statements found"

# Check bundle size
du -sh dist/
```

## 🌐 Deployment Options

### Option 1: Netlify (Recommended)

#### Automatic Deployment
1. **Connect your GitHub repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub account
   - Select your repository

2. **Configure build settings**
   ```
   Build command: npm run build:production
   Publish directory: dist
   Node version: 18
   ```

3. **Set environment variables**
   - Go to Site settings > Environment variables
   - Add all variables from `.env.production`

4. **Deploy**
   - Push to your main branch
   - Netlify will automatically build and deploy

#### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Option 2: Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard

### Option 3: AWS S3 + CloudFront

1. **Build the application**
   ```bash
   npm run build:production
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

3. **Configure CloudFront** for CDN and HTTPS

### Option 4: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM nginx:alpine
   COPY dist/ /usr/share/nginx/html/
   COPY nginx.conf /etc/nginx/nginx.conf
   EXPOSE 80
   ```

2. **Build and run**
   ```bash
   docker build -t cybersecurity-platform .
   docker run -p 80:80 cybersecurity-platform
   ```

## 🔒 Security Configuration

### Security Headers

The application includes comprehensive security headers in `public/_headers`:

- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block
- **Content-Security-Policy**: Comprehensive CSP
- **Strict-Transport-Security**: HSTS enabled
- **Cross-Origin-Embedder-Policy**: require-corp

### Content Security Policy

The CSP is configured to:
- Allow only trusted sources
- Block inline scripts and styles
- Prevent XSS attacks
- Allow Supabase connections
- Allow analytics services

### Rate Limiting

Built-in rate limiting for:
- Authentication: 5 attempts per 15 minutes
- API calls: 100 requests per minute
- File uploads: 10 uploads per minute
- Report generation: 5 reports per minute

## 📊 Monitoring & Analytics

### Error Monitoring

The application includes:
- **Error boundaries** for React components
- **Global error handling** for unhandled errors
- **Performance monitoring** for Core Web Vitals
- **Security event logging** for suspicious activities

### Analytics Integration

Configure analytics services:
- **Vercel Analytics**: Built-in
- **Google Analytics**: Add GA4 tracking ID
- **Sentry**: For error monitoring
- **Custom metrics**: Performance and user behavior

## 🧪 Testing & Validation

### Pre-deployment Testing

```bash
# Run all tests
npm run test:ci

# Check types
npm run type-check

# Lint code
npm run lint

# Security audit
npm run security:audit

# Performance test
npm run performance:test
```

### Post-deployment Validation

1. **Health check**
   ```bash
   curl -f https://your-domain.com/health
   ```

2. **Security scan**
   - Use [OWASP ZAP](https://owasp.org/www-project-zap/) for security testing
   - Check security headers with [securityheaders.com](https://securityheaders.com)
   - Validate CSP with [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com)

3. **Performance testing**
   - [Lighthouse](https://developers.google.com/web/tools/lighthouse)
   - [WebPageTest](https://www.webpagetest.org/)
   - [GTmetrix](https://gtmetrix.com/)

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test:ci
        
      - name: Build
        run: npm run build:production
        env:
          NODE_ENV: production
          
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test:ci
    - npm run type-check
    - npm run lint

build:
  stage: build
  image: node:18
  script:
    - npm ci
    - npm run build:production
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - curl -X POST -H "Authorization: Bearer $NETLIFY_TOKEN" \
        -H "Content-Type: application/zip" \
        --data-binary "@dist.zip" \
        "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys"
  only:
    - main
```

## 🚨 Troubleshooting

### Common Issues

1. **Build fails**
   ```bash
   # Check Node.js version
   node --version
   
   # Clean and reinstall
   npm run clean
   npm install
   
   # Check environment variables
   npm run validate:env
   ```

2. **Runtime errors**
   - Check browser console for errors
   - Verify Supabase configuration
   - Check environment variables in deployment platform

3. **Performance issues**
   - Run bundle analysis: `npm run analyze`
   - Check Core Web Vitals
   - Optimize images and assets

4. **Security issues**
   - Verify security headers
   - Check CSP configuration
   - Review rate limiting settings

### Support

- **Documentation**: Check this guide and README.md
- **Issues**: Create GitHub issues for bugs
- **Security**: Report security issues privately
- **Community**: Join our community channels

## 📈 Post-Deployment

### Monitoring

1. **Set up alerts** for:
   - Error rates
   - Performance degradation
   - Security events
   - Rate limit violations

2. **Regular health checks**:
   - Uptime monitoring
   - Performance metrics
   - Security scans

3. **Backup strategy**:
   - Database backups (Supabase handles this)
   - Configuration backups
   - Deployment rollback plan

### Maintenance

1. **Regular updates**:
   - Dependencies: `npm run update:deps`
   - Security patches: `npm run security:fix`
   - Performance monitoring

2. **Backup verification**:
   - Test restore procedures
   - Verify data integrity
   - Document recovery steps

## 🎯 Success Metrics

Track these metrics for production success:

- **Uptime**: 99.9% or higher
- **Performance**: Lighthouse score > 90
- **Security**: OWASP compliance > 95%
- **Error Rate**: < 0.1%
- **Response Time**: < 3 seconds
- **Bundle Size**: < 1MB initial load

## 📚 Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Production Guide](https://vitejs.dev/guide/build.html)
- [React Production Best Practices](https://react.dev/learn/start-a-new-react-project#production-build)
- [Security Headers Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

---

**Need help?** Create an issue in the repository or contact the development team.