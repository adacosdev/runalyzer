/**
 * Injury Form Component - Runalyzer
 * 
 * Form to log injury or discomfort after a workout.
 */

import { useState } from 'react';
import { 
  BODY_PART_LABELS, 
  useRPEInjuriesStore,
  BodyPart 
} from '../../store/rpe-injuries';

interface InjuryFormProps {
  activityId?: string;
  onSave?: () => void;
}

export function InjuryForm({ activityId, onSave }: InjuryFormProps) {
  const { addInjury } = useRPEInjuriesStore();
  
  const [bodyPart, setBodyPart] = useState<BodyPart | ''>('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | ''>('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bodyPart || !severity) return;
    
    addInjury({
      activityId,
      bodyPart: bodyPart as BodyPart,
      severity,
      description,
    });
    
    setSubmitted(true);
    onSave?.();
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800 font-medium">Molestia registrada</p>
        <p className="text-sm text-green-600">
          Registrala en futuras sesiones para hacer seguimiento.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Zona afectada
        </label>
        <select
          value={bodyPart}
          onChange={(e) => setBodyPart(e.target.value as BodyPart)}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white"
          required
        >
          <option value="">Seleccionar...</option>
          {Object.entries(BODY_PART_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Intensidad
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['mild', 'moderate', 'severe'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`
                p-3 rounded-lg text-center border-2 transition-all
                ${severity === s 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <span className={`
                ${s === 'mild' ? 'text-yellow-600' : ''}
                ${s === 'moderate' ? 'text-orange-600' : ''}
                ${s === 'severe' ? 'text-red-600' : ''}
                font-medium capitalize
              `}>
                {s === 'mild' ? 'Leve' : s === 'moderate' ? 'Moderada' : 'Severa'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe la molestia..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      <button
        type="submit"
        disabled={!bodyPart || !severity}
        className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Registrar molestia
      </button>
    </form>
  );
}
