// Simple Test Component for Assessment Loading
import React from 'react';
import { useAssessments } from '../shared/hooks/useAssessments';
import { useAuth } from '../shared/hooks/useAuth';
import { dataService } from '../services/dataService';

export const AssessmentLoadingTest: React.FC = () => {
  const auth = useAuth();
  const { assessments, loading, error, refresh } = useAssessments();

  const createTestAssessment = () => {
    const testAssessment = {
      id: `test-${Date.now()}`,
      name: 'Test Assessment',
      description: 'Created for testing',
      frameworkId: 'cmmc',
      framework: {
        id: 'cmmc',
        name: 'CMMC v2.0',
        version: '2.0',
        description: 'Test framework'
      },
      responses: {},
      evidence: {},
      notes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      version: '1.0.0',
      status: 'draft' as const,
      organizationInfo: {
        name: 'Test Organization',
        industry: 'Technology'
      }
    };

    try {
      dataService.saveAssessment(testAssessment);
      console.log('Test assessment created:', testAssessment.id);
      refresh();
    } catch (error) {
      console.error('Failed to create test assessment:', error);
    }
  };

  const checkLocalStorage = () => {
    const stored = localStorage.getItem('cybersecurity-assessments');
    console.log('LocalStorage assessments:', stored);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('Parsed assessments:', parsed);
      } catch (e) {
        console.error('Failed to parse stored assessments:', e);
      }
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-md">
      <h3 className="font-bold mb-3">Assessment Loading Test</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Auth Status:</strong> {auth.loading ? 'Loading...' : auth.user ? `Logged in: ${auth.user.email}` : 'Not logged in'}
        </div>
        
        <div>
          <strong>Assessments Loading:</strong> {loading ? 'Yes' : 'No'}
        </div>
        
        <div>
          <strong>Assessments Count:</strong> {assessments.length}
        </div>
        
        {error && (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="space-y-1 mt-3">
          <button
            onClick={createTestAssessment}
            className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Create Test Assessment
          </button>
          
          <button
            onClick={refresh}
            className="w-full px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
          >
            Refresh Assessments
          </button>
          
          <button
            onClick={checkLocalStorage}
            className="w-full px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
          >
            Check LocalStorage
          </button>
        </div>
        
        {assessments.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto">
            <strong>Assessments:</strong>
            <ul className="list-disc list-inside text-xs">
              {assessments.map(assessment => (
                <li key={assessment.id}>
                  {assessment.name} ({assessment.status})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};