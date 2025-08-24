// Assessment Loading Debugger Component
import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../shared/hooks/useAuth';
import { useAssessments } from '../shared/hooks/useAssessments';
import { dataService } from '../services/dataService';
import { isSupabaseReady } from '../lib/supabase';

interface DebugInfo {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export const AssessmentDebugger: React.FC = () => {
  const auth = useAuth();
  const assessments = useAssessments();
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [isVisible, setIsVisible] = useState(process.env.NODE_ENV === 'development');

  const addDebugInfo = (message: string, type: DebugInfo['type'] = 'info') => {
    setDebugInfo(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      }
    ].slice(-10)); // Keep last 10 entries
  };

  useEffect(() => {
    addDebugInfo('Assessment debugger initialized', 'info');
  }, []);

  useEffect(() => {
    if (auth.loading) {
      addDebugInfo('Authentication loading...', 'info');
    } else if (auth.error) {
      addDebugInfo(`Auth error: ${auth.error}`, 'error');
    } else if (auth.user) {
      addDebugInfo(`User authenticated: ${auth.user.email}`, 'success');
    } else {
      addDebugInfo('No user authenticated', 'warning');
    }
  }, [auth.loading, auth.error, auth.user]);

  useEffect(() => {
    if (assessments.loading) {
      addDebugInfo('Assessments loading...', 'info');
    } else if (assessments.error) {
      addDebugInfo(`Assessment error: ${assessments.error}`, 'error');
    } else {
      addDebugInfo(`Loaded ${assessments.assessments.length} assessments`, 'success');
    }
  }, [assessments.loading, assessments.error, assessments.assessments.length]);

  const runDiagnostics = () => {
    addDebugInfo('--- Running Diagnostics ---', 'info');
    
    // Check localStorage
    try {
      const storedAssessments = localStorage.getItem('cybersecurity-assessments');
      if (storedAssessments) {
        const parsed = JSON.parse(storedAssessments);
        addDebugInfo(`Found ${parsed.length} assessments in localStorage`, 'success');
      } else {
        addDebugInfo('No assessments found in localStorage', 'warning');
      }
    } catch (error) {
      addDebugInfo(`localStorage error: ${error.message}`, 'error');
    }

    // Check data service
    try {
      const serviceAssessments = dataService.getAssessments();
      addDebugInfo(`Data service returned ${serviceAssessments.length} assessments`, 'success');
    } catch (error) {
      addDebugInfo(`Data service error: ${error.message}`, 'error');
    }

    // Check Supabase readiness
    addDebugInfo(`Supabase ready: ${isSupabaseReady}`, isSupabaseReady ? 'success' : 'warning');

    // Check auth state
    addDebugInfo(`Auth loading: ${auth.loading}, User: ${auth.user?.email || 'none'}`, 'info');
  };

  const createSampleAssessment = () => {
    try {
      const sampleAssessment = {
        id: `sample-${Date.now()}`,
        name: 'Sample CMMC Assessment',
        description: 'Test assessment for debugging',
        frameworkId: 'cmmc',
        framework: {
          id: 'cmmc',
          name: 'CMMC v2.0',
          version: '2.0',
          description: 'Test framework'
        },
        responses: {
          'AC.L2-3.1.1': 3,
          'AC.L2-3.1.2': 2
        },
        evidence: {},
        notes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        version: '1.0.0',
        status: 'in_progress' as const,
        organizationInfo: {
          name: 'Test Organization',
          industry: 'Technology'
        }
      };

      dataService.saveAssessment(sampleAssessment);
      addDebugInfo('Sample assessment created', 'success');
      assessments.refresh();
    } catch (error) {
      addDebugInfo(`Failed to create sample: ${error.message}`, 'error');
    }
  };

  const clearAllData = () => {
    try {
      localStorage.removeItem('cybersecurity-assessments');
      addDebugInfo('Cleared all assessment data', 'warning');
      assessments.refresh();
    } catch (error) {
      addDebugInfo(`Failed to clear data: ${error.message}`, 'error');
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Show Assessment Debugger"
      >
        <AlertCircle className="h-5 w-5" />
      </button>
    );
  }

  const getTypeIcon = (type: DebugInfo['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium text-gray-900">Assessment Debugger</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="p-4">
        <div className="space-y-2 mb-4">
          <div className="text-sm">
            <strong>Status:</strong>
            <div className="mt-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span>Auth:</span>
                {auth.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : auth.user ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span>{auth.user?.email || 'Not authenticated'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Assessments:</span>
                {assessments.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span>{assessments.assessments.length} loaded</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <button
            onClick={runDiagnostics}
            className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Run Diagnostics
          </button>
          <div className="flex space-x-2">
            <button
              onClick={createSampleAssessment}
              className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Create Sample
            </button>
            <button
              onClick={() => assessments.refresh()}
              className="flex-1 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 flex items-center justify-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </button>
            <button
              onClick={clearAllData}
              className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="max-h-32 overflow-y-auto space-y-1">
          {debugInfo.map((info, index) => (
            <div key={index} className="flex items-start space-x-2 text-xs">
              {getTypeIcon(info.type)}
              <span className="text-gray-500">{info.timestamp}</span>
              <span className="flex-1">{info.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};