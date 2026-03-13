/**
 * Setup & Calibration Page - Runalyzer
 * 
 * Onboarding flow: API key → Age → Zone calibration
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useZonesStore } from '../../store';
import { authenticate } from '../../application';
import { getDefaultZoneConfig } from '../../domain/zones/types';

export function SetupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, error, isValidating } = useAuthStore();
  const { setAge, initializeDefaultConfig, zoneConfig } = useZonesStore();
  
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState<'connect' | 'age' | 'calibrate'>(
    isAuthenticated ? (zoneConfig ? 'calibrate' : 'age')
  );
  
  const [age, setAgeInput] = useState(30);
  
  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    
    const success = await authenticate(apiKey);
    if (success) {
      setStep('age');
    }
  };
  
  const handleAgeSubmit = () => {
    setAge(age);
    initializeDefaultConfig(age);
    setStep('calibrate');
  };
  
  const handleCalibrateComplete = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepIndicator active={step === 'connect'} number={1} label="Conectar" />
          <div className="w-8 h-0.5 bg-gray-300" />
          <StepIndicator active={step === 'age'} number={2} label="Edad" />
          <div className="w-8 h-0.5 bg-gray-300" />
          <StepIndicator active={step === 'calibrate'} number={3} label="Zonas" />
        </div>

        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Conectá Intervals.icu
            </h1>
            <p className="text-gray-600 mb-6">
              Necesitás tu API key de Intervals.icu. La encontrás en Settings → API.
            </p>
            
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Tu API key"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 font-mono"
            />
            
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            
            <button
              onClick={handleConnect}
              disabled={!apiKey.trim() || isValidating}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isValidating ? 'Verificando...' : 'Conectar'}
            </button>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Tu API key se guarda solo en tu navegador, nunca en nuestros servidores.
            </p>
          </div>
        )}

        {/* Step 2: Age */}
        {step === 'age' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ¿Cuántos años tenés?
            </h1>
            <p className="text-gray-600 mb-6">
              Lo usamos para estimar tus zonas de frecuencia cardíaca.
            </p>
            
            <input
              type="number"
              value={age}
              onChange={(e) => setAgeInput(Number(e.target.value))}
              min={10}
              max={100}
              className="w-full p-3 border border-gray-300 rounded-lg mb-6 text-center text-3xl font-bold"
            />
            
            <button
              onClick={handleAgeSubmit}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 3: Calibrate */}
        {step === 'calibrate' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Tus zonas
            </h1>
            <p className="text-gray-600 mb-6">
              Estas son tus zonas estimadas. Podés ajustarlas manualmente o hacer un test de umbrales.
            </p>
            
            {zoneConfig && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">FC máx Z1</span>
                  <span className="font-semibold">{zoneConfig.z1MaxHR} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">FC máx Z2 (Umbral)</span>
                  <span className="font-semibold">{zoneConfig.z2MaxHR} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">FC máx</span>
                  <span className="font-semibold">{zoneConfig.maxHR} bpm</span>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleCalibrateComplete}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Usar estas zonas
              </button>
              
              <button
                className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Hacer test de umbrales
              </button>
            </div>
            
            <p className="text-xs text-yellow-600 mt-4 text-center">
              ⚠️ Zonas estimadas. Hacé un test para mayor precisión.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ 
  active, 
  number, 
  label 
}: { 
  active: boolean; 
  number: number; 
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}
      `}>
        {number}
      </div>
      <span className={`text-xs mt-1 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
