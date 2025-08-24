// Production Health Check Endpoint
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  try {
    // Basic health check
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VITE_APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV || 'production',
      uptime: process.uptime ? process.uptime() : 0,
      responseTime: 0,
      checks: {
        memory: checkMemoryUsage(),
        environment: checkEnvironmentVariables(),
        dependencies: checkCriticalDependencies()
      }
    };

    // Calculate response time
    healthCheck.responseTime = Date.now() - startTime;

    // Determine overall health status
    const hasFailures = Object.values(healthCheck.checks).some(check => !check.healthy);
    if (hasFailures) {
      healthCheck.status = 'degraded';
    }

    // Return appropriate HTTP status
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'true'
      },
      body: JSON.stringify(healthCheck, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'true'
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: Date.now() - startTime
      }, null, 2)
    };
  }
};

function checkMemoryUsage() {
  try {
    if (process.memoryUsage) {
      const memory = process.memoryUsage();
      const usedMemoryMB = memory.heapUsed / 1024 / 1024;
      const totalMemoryMB = memory.heapTotal / 1024 / 1024;
      const usagePercent = (usedMemoryMB / totalMemoryMB) * 100;

      return {
        healthy: usagePercent < 90,
        details: {
          used: Math.round(usedMemoryMB),
          total: Math.round(totalMemoryMB),
          usage: Math.round(usagePercent)
        }
      };
    }
    
    return { healthy: true, details: 'Memory info not available' };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

function checkEnvironmentVariables() {
  try {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    return {
      healthy: missing.length === 0,
      details: missing.length > 0 ? { missing } : 'All required variables present'
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

function checkCriticalDependencies() {
  try {
    // Check if critical modules can be required
    const criticalModules = [];
    
    // In a serverless environment, we'll just check if the function executes
    return {
      healthy: true,
      details: 'Serverless function executing normally'
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}