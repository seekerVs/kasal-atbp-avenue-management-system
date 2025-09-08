import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Row, Col, Form, Spinner, InputGroup, Alert, Card } from "react-bootstrap";
import { ArrowsCollapse, CheckCircleFill } from "react-bootstrap-icons";
import axios from "axios"; // Keep axios for direct, un-intercepted polling
import { useAlert } from "../../../contexts/AlertContext";
import { convertMeasurementsToSize } from "../../../utils/sizeConverter";

// --- The new props "contract" for this component ---
interface OutfitRecommendationModalProps {
  show: boolean;
  onHide: () => void;
  onRecommend: (size: string) => void;
}

// --- Define the fixed list of measurements ---
const CORE_MEASUREMENTS = ["Full Shoulder", "Full Chest", "Waist", "Hip"];

// --- Type for the sensor data we expect ---
interface SensorData {
  sensorType: string;
  centimeters?: number;
  updatedAt: string;
}

const OutfitRecommendationModal: React.FC<OutfitRecommendationModalProps> = ({ show, onHide, onRecommend }) => {
  const { addAlert } = useAlert();
  // --- Internal State Management ---
  const [measurementValues, setMeasurementValues] = useState<Record<string, string>>({});
  const [recommendedSize, setRecommendedSize] = useState<string>('');
  const [activeField, setActiveField] = useState<string | null>(null);

  // --- State for Device Integration ---
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isSensorLoading, setIsSensorLoading] = useState<boolean>(true);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const prevCentimetersRef = useRef<number | undefined>(undefined);
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  // --- Effect 1: Live Size Conversion ---
  useEffect(() => {
    if (measurementValues['Full Chest'] && measurementValues['Waist']) {
      const size = convertMeasurementsToSize(measurementValues);
      setRecommendedSize(size);
    } else {
      setRecommendedSize(''); // Clear recommendation if core values are missing
    }
  }, [measurementValues]);

  // --- Effect 2: Device Data Polling ---
  useEffect(() => {
    let intervalId: number | null = null;
    if (show) {
      // Reset form when modal opens
      setMeasurementValues({});
      setRecommendedSize('');
      setActiveField(CORE_MEASUREMENTS[0]); // Set focus to the first field on open

      const fetchSensorData = async () => {
        try {
          const response = await axios.get("http://localhost:3001/sensorData");
          setSensorData(response.data.data);
          if (sensorError) setSensorError(null);
        } catch (err: any) {
          setSensorError(err.response?.data?.message || "Device not connected.");
        } finally {
          setIsSensorLoading(false);
        }
      };
      
      fetchSensorData(); // Initial fetch
      intervalId = setInterval(fetchSensorData, 3000); // Poll every 3 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId); // Cleanup on close
    };
  }, [show]);

  // --- Effect 3: Device Data Auto-fill and Focus Shift ---
  useEffect(() => {
    if (activeField && sensorData?.centimeters !== undefined && sensorData.centimeters !== prevCentimetersRef.current) {
      const currentCm = sensorData.centimeters;
      handleValueChange(activeField, currentCm.toFixed(2));

      // Move focus to the next input
      const currentIndex = CORE_MEASUREMENTS.indexOf(activeField);
      const nextIndex = currentIndex + 1;
      if (nextIndex < CORE_MEASUREMENTS.length) {
        const nextField = CORE_MEASUREMENTS[nextIndex];
        inputRefs.current.get(nextField)?.focus();
        setActiveField(nextField);
      } else {
        inputRefs.current.get(activeField)?.blur(); // Unfocus the last field
        setActiveField(null);
      }
    }
    prevCentimetersRef.current = sensorData?.centimeters;
  }, [sensorData]);


  const handleValueChange = (field: string, value: string) => {
    setMeasurementValues(prev => ({ ...prev, [field]: value }));
  };

  const handleRecommendClick = () => {
    if (!recommendedSize) {
      addAlert("Please fill in at least Chest and Waist measurements.", 'warning');
      return;
    }
    onRecommend(recommendedSize);
  };

  const isRecommendDisabled = !measurementValues['Full Chest'] || !measurementValues['Waist'];

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fw-semibold">Outfit Recommendation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-4 text-muted">Enter the client's measurements to find their recommended standard size and view available outfits.</p>

        <Row className="g-4">
          <Col md={7}>
            <h6 className="text-uppercase small fw-bold">Measurements (cm)</h6>
            <Form>
              {CORE_MEASUREMENTS.map((label) => (
                <Form.Group className="mb-3" key={label}>
                  <Form.Label>{label}</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={measurementValues[label] || ""}
                      onChange={(e) => handleValueChange(label, e.target.value)}
                      onFocus={() => setActiveField(label)}
                      onBlur={() => setActiveField(null)}
                      ref={el => { inputRefs.current.set(label, el); }}
                      autoFocus={label === CORE_MEASUREMENTS[0]} // Autofocus the first input
                    />
                    <Button
                      variant="outline-secondary"
                      disabled={!sensorData?.centimeters || activeField !== label}
                      title="Get from Device"
                    >
                      <ArrowsCollapse />
                    </Button>
                  </InputGroup>
                </Form.Group>
              ))}
            </Form>
          </Col>
          <Col md={5}>
            <h6 className="text-uppercase small fw-bold">System Feedback</h6>
            {recommendedSize ? (
              <Alert variant="success" className="text-center">
                <div className="small">Recommended Size:</div>
                <div className="display-6 fw-bold">{recommendedSize}</div>
              </Alert>
            ) : (
              <Alert variant="secondary">
                Please provide at least Chest and Waist measurements to see a size recommendation.
              </Alert>
            )}

            <Card bg="light">
              <Card.Body>
                <Card.Title as="h6" className="small">Device Status</Card.Title>
                {isSensorLoading ? (
                  <div className="d-flex align-items-center text-muted"><Spinner size="sm" className="me-2"/> Connecting...</div>
                ) : sensorError ? (
                  <div className="text-danger small">{sensorError}</div>
                ) : (
                  <>
                    <div className="text-success small mb-2"><CheckCircleFill className="me-1"/> Device Connected</div>
                    <p className="mb-0"><strong>Live Reading:</strong> {sensorData?.centimeters?.toFixed(2) ?? 'N/A'} cm</p>
                    <p className="text-muted small mb-0">Last Update: {sensorData ? new Date(sensorData.updatedAt).toLocaleTimeString() : 'N/A'}</p>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={handleRecommendClick} disabled={isRecommendDisabled}>
          Recommend Outfits
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OutfitRecommendationModal;