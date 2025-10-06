import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Define the shape of the sensor data we expect from the backend
interface SensorData {
  sensorType: 'LengthMeasurement' | 'Control' | 'Heartbeat' | string;
  centimeters?: number;
  command?: 'focusNext' | string;
  updatedAt: string;
}

// Define the shape of the object our hook will return
interface UseSensorDataReturn {
  sensorData: SensorData | null;
  isLoading: boolean;
  error: string | null;
}

// 1. Construct the full URL by combining the base URL from the .env file with the specific endpoint.
const SENSOR_API_URL = `${import.meta.env.VITE_SENSOR_URL}`;

// 2. (Highly Recommended) Add a check to ensure the environment variable is set.
// This prevents silent failures and makes debugging easier.
if (!import.meta.env.VITE_SENSOR_URL) {
  throw new Error("VITE_SENSOR_URL is not defined. Please check your .env file.");
}


/**
 * A custom hook to poll and manage data from the KasalDevice measurement sensor.
 * It handles loading states, errors, and smart polling that pauses when the page is not visible.
 *
 * @param {boolean} isEnabled - A flag to control whether polling should be active.
 * @returns {UseSensorDataReturn} An object containing the latest sensor data, loading status, and any errors.
 */
export const useSensorData = (isEnabled: boolean): UseSensorDataReturn => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastCommandTimestamp = useRef<string | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      if (error) setError(null);
      return;
    }

    let intervalId: number | null = null;

    const fetchSensorData = async () => {
      try {
        const response = await axios.get(SENSOR_API_URL);
        const newData: SensorData = response.data.data;
        setSensorData(newData);

        if (
          newData.sensorType === 'Control' &&
          newData.command &&
          newData.updatedAt !== lastCommandTimestamp.current
        ) {
          lastCommandTimestamp.current = newData.updatedAt;
          window.dispatchEvent(
            new CustomEvent('sensorCommand', {
              detail: { action: newData.command },
            })
          );
        }

        if (error) setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Device not connected or server is down.');
      } finally {
        if (isLoading) setIsLoading(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      } else {
        fetchSensorData();
        if (!intervalId) {
          intervalId = window.setInterval(fetchSensorData, 2000);
        }
      }
    };

    fetchSensorData();
    intervalId = window.setInterval(fetchSensorData, 2000);

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    
  }, [isEnabled, error, isLoading]); 

  return { sensorData, isLoading, error };
};