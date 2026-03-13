/**
 * RPE Input Component - Runalyzer
 * 
 * User input for Rate of Perceived Exertion after a workout.
 */

import { useState } from 'react';
import { RPE_LABELS, RPE_COLORS, useRPEInjuriesStore } from '../../store/rpe-injuries';

interface RPEInputProps {
  activityId: string;
  onSave?: () => void;
}

export function RPEInput({ activityId, onSave }: RPEInputProps) {
  const { getRPE, addRPE, updateRPE } = useRPEInjuriesStore();
  const existingRPE = getRPE(activityId);
  
  const [selectedValue, setSelectedValue] = useState<number | null>(existingRPE?.value || null);
  const [notes, setNotes] = useState(existingRPE?.notes || '');
  const [saved, setSaved] = useState(!!existingRPE);

  const handleSave = () => {
    if (selectedValue === null) return;
    
    if (existingRPE) {
      updateRPE(activityId, selectedValue, notes);
    } else {
      addRPE(activityId, selectedValue, notes);
    }
    
    setSaved(true);
    onSave?.();
  };

  const handleEdit = () => {
    setSaved(false);
  };

  if (saved && selectedValue !== null) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">Esfuerzo percibido</span>
            <div className="flex items-center gap-2">
              <span 
                className="text-2xl font-bold"
                style={{ color: RPE_COLORS[selectedValue] }}
              >
                {selectedValue}
              </span>
              <span className="text-gray-600">{RPE_LABELS[selectedValue]}</span>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Editar
          </button>
        </div>
        {notes && (
          <p className="text-sm text-gray-600 mt-2">{notes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿Cómo te sentiste?
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              onClick={() => setSelectedValue(value)}
              className={`
                p-3 rounded-lg text-center transition-all
                ${selectedValue === value 
                  ? 'ring-2 ring-offset-2 scale-110' 
                  : 'hover:scale-105'
                }
              `}
              style={{ 
                backgroundColor: selectedValue === value ? RPE_COLORS[value] : '#f3f4f6',
                color: selectedValue === value ? 'white' : '#374151',
                ringColor: RPE_COLORS[value]
              }}
            >
              <span className="text-lg font-bold">{value}</span>
            </button>
          ))}
        </div>
        {selectedValue && (
          <p className="text-center mt-2 text-sm" style={{ color: RPE_COLORS[selectedValue] }}>
            {RPE_LABELS[selectedValue]}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="¿Qué sentiste? ¿Algo fuera de lo normal?"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={selectedValue === null}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Guardar
      </button>
    </div>
  );
}
