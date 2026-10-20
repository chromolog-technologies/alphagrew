import React from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * Shown on screens whose API still returns hardcoded sample data
 * (responses carry the X-Data-Source: sample header). Remove once the
 * screen's backend controller reads real tables.
 */
export const PrototypeNotice: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" role="status">
    <FlaskConical className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
    <div>
      <h4 className="font-semibold text-amber-900">Prototype screen</h4>
      <p className="text-sm text-amber-800 mt-1">
        This screen shows sample data. Changes you make here are not saved.
      </p>
    </div>
  </div>
);
