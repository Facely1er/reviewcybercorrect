import React from 'react';
import { Award, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NistExtendedCompliancePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
            <Award className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          NIST CSF v2.0 Extended Compliance
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          This page provides an overview of your compliance status with the NIST Cybersecurity Framework v2.0 Extended version.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link
            to="/assessment-intro"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Info className="w-5 h-5" />
            <span>View Assessment</span>
          </Link>
          <Link
            to="/compliance/status"
            className="border border-purple-600 text-purple-600 dark:text-purple-400 px-6 py-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center space-x-2"
          >
            <Info className="w-5 h-5" />
            <span>View Compliance Status</span>
          </Link>
        </div>
      </div>
    </div>
  );
};