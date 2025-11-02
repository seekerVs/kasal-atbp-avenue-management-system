import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Row, Col, Form, InputGroup, Alert } from "react-bootstrap";
import { ArrowsCollapse, ExclamationTriangleFill, InfoCircleFill } from "react-bootstrap-icons";
import { useAlert } from "../../../contexts/AlertContext";
import { convertMeasurementsToSize } from "../../../utils/sizeConverter";
import { useSensorData } from "../../../hooks/useSensorData";
import { SizeGuideModal } from '../sizeGuideModal/SizeGuideModal';

interface OutfitRecommendationModalProps {
  show: boolean;
  onHide: () => void;
  onRecommend: (size: string) => void;
}

// --- THIS IS THE FIX (Step 1) ---
const CORE_MEASUREMENTS = ["Chest", "Waist", "Hips"];

const OutfitRecommendationModal: React.FC<OutfitRecommendationModalProps> = ({ show, onHide, onRecommend }) => {
  const { addAlert } = useAlert();
  const { sensorData } = useSensorData(show);

  const [measurementValues, setMeasurementValues] = useState<Record<string, string>>({});
  const [recommendedSize, setRecommendedSize] = useState<string>('');
  const [isSizeValid, setIsSizeValid] = useState<boolean>(false); 
  const [activeField, setActiveField] = useState<string | null>(null);
  const [lastInsertedTimestamp, setLastInsertedTimestamp] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false); 
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  useEffect(() => {
    if (show) {
      setMeasurementValues({});
      setRecommendedSize('');
      setIsSizeValid(false);
      setActiveField(CORE_MEASUREMENTS[0]);
    }
  }, [show]);

  // --- THIS IS THE FIX (Step 2) ---
  useEffect(() => {
    if (measurementValues['Chest'] || measurementValues['Waist'] || measurementValues['Hips']) {
      const size = convertMeasurementsToSize(measurementValues);
      setRecommendedSize(size);

      if (size && size !== 'Custom' && size !== "") {
        setIsSizeValid(true);
      } else {
        setIsSizeValid(false);
      }
    } else {
      setRecommendedSize('');
      setIsSizeValid(false);
    }
  }, [measurementValues]);

  useEffect(() => {
    const handleSensorCommand = (event: CustomEvent) => {
      if (event.detail.action === 'focusNext') {
        const currentActiveIndex = activeField ? CORE_MEASUREMENTS.indexOf(activeField) : -1;
        const nextIndex = (currentActiveIndex + 1) % CORE_MEASUREMENTS.length;
        const nextField = CORE_MEASUREMENTS[nextIndex];
        
        const nextInput = inputRefs.current.get(nextField);
        nextInput?.focus();
      }
    };
    
    window.addEventListener('sensorCommand', handleSensorCommand as EventListener);
    
    return () => {
      window.removeEventListener('sensorCommand', handleSensorCommand as EventListener);
    };
  }, [activeField]);

  useEffect(() => {
    if (sensorData && 
        activeField && 
        sensorData.sensorType === 'LengthMeasurement' && 
        typeof sensorData.centimeters === 'number' &&
        sensorData.updatedAt !== lastInsertedTimestamp) {
      handleValueChange(activeField, sensorData.centimeters.toFixed(2));
      setLastInsertedTimestamp(sensorData.updatedAt);
    }
  }, [sensorData, activeField, lastInsertedTimestamp]);

  const handleValueChange = (field: string, value: string) => {
    setMeasurementValues(prev => ({ ...prev, [field]: value }));
  };
  
  const handleInsertMeasurement = (field: string) => {
    if (sensorData && typeof sensorData.centimeters === 'number') {
      handleValueChange(field, sensorData.centimeters.toFixed(2));
    } else {
      addAlert("No new measurement data received from the device.", "warning");
    }
  };

  const handleRecommendClick = () => {
    onRecommend(recommendedSize);
  };

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
                      autoFocus={label === CORE_MEASUREMENTS[0]}
                    />
                    <Button
                      variant="outline-secondary"
                      title="Get from Device"
                      onClick={() => handleInsertMeasurement(label)}
                    >
                      <ArrowsCollapse />
                    </Button>
                  </InputGroup>
                </Form.Group>
              ))}
            </Form>
          </Col>
          <Col md={5}>
            <h6 className="text-uppercase small fw-bold">Result</h6>
            {(() => {
              if (!recommendedSize) {
                return (
                  <Alert variant="secondary">
                    Please provide at least one measurement to get a recommendation.
                  </Alert>
                );
              }
              if (isSizeValid) {
                return (
                  <Alert variant="success" className="text-center">
                    <div className="small">Recommended Size:</div>
                    <div className="display-6 fw-bold">{recommendedSize}</div>
                  </Alert>
                );
              }
              return (
                <Alert variant="warning" className="text-center">
                  <Alert.Heading as="h6" className="d-flex align-items-center justify-content-center">
                     <ExclamationTriangleFill className="me-2"/> No Standard Size
                  </Alert.Heading>
                  <p className="mb-0 small">Measurements do not fit a standard size. Consider a <strong>custom-tailored outfit</strong>.</p>
                </Alert>
              );
            })()}

            <div className="d-grid mb-3">
                <Button variant="outline-secondary" size="sm" onClick={() => setShowSizeGuide(true)}>
                    View Full Size Guide
                </Button>
            </div>
            
            <Alert variant="info" className="d-flex align-items-center small">
                <InfoCircleFill className="me-2 flex-shrink-0" size={20} />
                <div>
                    Please ensure the device is powered on and connected to internet. Measurements will appear automatically in the active field.
                </div>
            </Alert>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={handleRecommendClick} disabled={!isSizeValid}>
          Recommend Outfits
        </Button>
      </Modal.Footer>

      <SizeGuideModal show={showSizeGuide} onHide={() => setShowSizeGuide(false)} />
    </Modal>
  );
};

export default OutfitRecommendationModal;