// src/layouts/dashboard/SensorDisplay.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Card, Table, Alert, Spinner } from "react-bootstrap";

// Define the type for your sensor data
interface SensorDataItem {
  _id: string;
  sensorType: string;
  position?: number; // Raw ticks
  direction?: number; // Old direction (if still used)
  centimeters?: number; // New: measured centimeters
  value?: number; // Generic value (if other sensors are added)
  createdAt: string; // The original creation timestamp of the document
  updatedAt: string; // The last time the document was updated
}

const SensorDisplay: React.FC = () => {
  const [currentSensorData, setCurrentSensorData] =
    useState<SensorDataItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert direction number to a readable string (if needed)
  const getDirectionString = (dir: number | undefined): string => {
    if (dir === undefined) return "N/A";
    switch (dir) {
      case 0:
        return "No Change";
      case 1:
        return "Clockwise";
      case 2:
        return "Counter-Clockwise";
      default:
        return "Unknown";
    }
  };

  const fetchCurrentSensorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<{ success: true; data: SensorDataItem }>(
        "http://localhost:3001/sensorData"
      );
      setCurrentSensorData(response.data.data);
    } catch (err: any) {
      console.error("Error fetching current sensor data:", err);
      if (err.response && err.response.status === 404) {
        setError(
          "No sensor data available yet. Waiting for device to send data..."
        );
        setCurrentSensorData(null);
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to fetch sensor data. Please check server."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentSensorData();

    // Set up polling to fetch data every 3 seconds (can be adjusted)
    const intervalId = setInterval(fetchCurrentSensorData, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Container className="my-4">
      <Card>
        <Card.Header as="h5">Live Measurement Data</Card.Header>
        <Card.Body>
          {loading && (
            <div className="text-center">
              <Spinner animation="border" /> Loading data...
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}

          {!loading && !error && currentSensorData && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Measurement Type</th>
                  <th>Value</th>
                  <th>Raw Ticks</th> {/* Optional: show raw ticks */}
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                <tr key={currentSensorData._id}>
                  <td>{currentSensorData.sensorType}</td>
                  <td>
                    {/* Display centimeters if available, otherwise generic value */}
                    {currentSensorData.centimeters !== undefined
                      ? `${currentSensorData.centimeters.toFixed(2)} cm`
                      : currentSensorData.value !== undefined
                      ? currentSensorData.value.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>
                    {currentSensorData.position !== undefined
                      ? currentSensorData.position
                      : "N/A"}
                  </td>
                  <td>
                    {new Date(currentSensorData.updatedAt).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </Table>
          )}

          {!loading && !error && !currentSensorData && (
            <Alert variant="info">
              Waiting for initial measurement data from device...
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SensorDisplay;
