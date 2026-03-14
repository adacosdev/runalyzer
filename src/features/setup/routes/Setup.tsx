/**
 * Setup & Calibration Page - Runalyzer
 * 
 * Onboarding flow: API key → Age → Zone calibration
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../../shared/store/auth.store';
import { useZonesStore } from '../../../shared/store/zones.store';
import { authenticate } from '../../../shared/application';
import { getDefaultZoneConfig } from '../domain/zones.types';

type SetupStep = 'connect' | 'age' | 'calibrate';

export function SetupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, error, isValidating } = useAuthStore();
  const { setAge, initializeDefaultConfig, zoneConfig, setZoneConfig } = useZonesStore();
  
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState<SetupStep>(
    isAuthenticated ? (zoneConfig ? 'calibrate' : 'age') : 'connect'
  );
  
  const [age, setAgeInput] = useState(30);
  
  // Manual zone input state
  const [manualMode, setManualMode] = useState(false);
  const [manualZ1, setManualZ1] = useState('');
  const [manualZ2, setManualZ2] = useState('');
  const [manualMaxHR, setManualMaxHR] = useState('');
  
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
  
  const handleManualZoneSubmit = () => {
    const z1 = Number(manualZ1);
    const z2 = Number(manualZ2);
    const max = Number(manualMaxHR);
    
    if (!z1 || !z2 || !max) return;
    if (z1 >= z2 || z2 >= max) {
      alert('Los valores deben ser: Z1 < Z2 < FC máx');
      return;
    }
    
    setZoneConfig({
      z1MaxHR: z1,
      z2MaxHR: z2,
      maxHR: max,
      isEstimated: false,
      calibrationMethod: 'manual',
      lastCalibrated: Date.now(),
    });
    
    navigate({ to: '/' });
  };
  
  const handleCalibrateComplete = () => {
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Progress */}
        {!manualMode && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <StepIndicator active={step === 'connect'} number={1} label="Conectar" />
            <div className="w-8 h-0.5 bg-gray-300" />
            <StepIndicator active={step === 'age'} number={2} label="Edad" />
            <div className="w-8 h-0.5 bg-gray-300" />
            <StepIndicator active={step === 'calibrate'} number={3} label="Zonas" />
          </div>
        )}

        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div className="bg-bg-card rounded-2xl border border-border p-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Conecta Intervals.icu
            </h1>
            <p className="text-gray-400 mb-6">
              Necesitas tu API key de Intervals.icu. La encuentras en Settings - API.
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
          <div className="bg-bg-card rounded-2xl border border-border p-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Cuantos anos tienes?
            </h1>
            <p className="text-gray-400 mb-6">
              Lo usamos para estimar tus zonas de frecuencia cardiaca.
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
        {step === 'calibrate' && !manualMode && (
          <div className="bg-bg-card rounded-2xl border border-border p-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Tus zonas
            </h1>
            <p className="text-gray-400 mb-6">
              Estas son tus zonas segun tu edad. Puedes usarlas o introducir las tuyas propias.
            </p>
            
            {zoneConfig && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">FC max Z1</span>
                  <span className="font-semibold">{zoneConfig.z1MaxHR} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">FC max Z2 (Umbral)</span>
                  <span className="font-semibold">{zoneConfig.z2MaxHR} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">FC max</span>
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
                onClick={() => setManualMode(true)}
                className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Introducir zonas manualmente
              </button>
              
              <button
                className="w-full py-3 border border-gray-300 text-gray-500 font-medium rounded-lg hover:bg-gray-50 text-sm"
              >
                Hacer test de umbrales
              </button>
            </div>
            
            <p className="text-xs text-yellow-600 mt-4 text-center">
              Zonas estimadas por edad. Introduce las tuyas para mayor precision.
            </p>
          </div>
        )}

        {/* Manual Zone Input */}
        {manualMode && (
          <div className="bg-bg-card rounded-2xl border border-border p-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Tus zonas
            </h1>
            <p className="text-gray-400 mb-6">
              Introduce tus zonas de frecuencia cardiaca. Si no las conoces, haz un test de esfuerzo o consulta con un profesional.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FC maxima Z1 (zona base)
                </label>
                <input
                  type="number"
                  value={manualZ1}
                  onChange={(e) => setManualZ1(e.target.value)}
                  placeholder="ej. 140"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ritmo cardiaco maximo para la zona de grasas/rodaje suave
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FC maxima Z2 (umbral)
                </label>
                <input
                  type="number"
                  value={manualZ2}
                  onChange={(e) => setManualZ2(e.target.value)}
                  placeholder="ej. 165"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ritmo cardiaco maximo para la zona de umbral (LTHR)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FC maxima personal
                </label>
                <input
                  type="number"
                  value={manualMaxHR}
                  onChange={(e) => setManualMaxHR(e.target.value)}
                  placeholder="ej. 185"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tu frecuencia cardiaca maxima
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleManualZoneSubmit}
                disabled={!manualZ1 || !manualZ2 || !manualMaxHR}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Guardar zonas
              </button>
              
              <button
                onClick={() => setManualMode(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
            </div>
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
