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

const OutfitRecommendationModal: React.FC<OutfitRecommendationModalProps> = ({ show, onHide, onRecommend }) => {
  const { addAlert } = useAlert();
  const { sensorData } = useSensorData(show);

  const [ageGroup, setAgeGroup] = useState<'Adult' | 'Kids'>('Adult');
  const [outfitType, setOutfitType] = useState<'Topwear' | 'Bottomwear'>('Topwear');
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
    }
  }, [show]);

  useEffect(() => {
    if (Object.keys(measurementValues).length > 0) {
      const size = convertMeasurementsToSize(measurementValues, ageGroup, outfitType); // New call
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
  }, [measurementValues, ageGroup, outfitType]); // New dependency array

  useEffect(() => {
    const handleSensorCommand = (event: CustomEvent) => {
      if (event.detail.action === 'focusNext') {
        // Determine the list of currently visible fields
        const visibleFields = outfitType === 'Topwear' ? ['Chest'] : ['Waist', 'Hips'];
        
        const currentActiveIndex = activeField ? visibleFields.indexOf(activeField) : -1;
        const nextIndex = (currentActiveIndex + 1) % visibleFields.length;
        const nextField = visibleFields[nextIndex];
        
        const nextInput = inputRefs.current.get(nextField);
        nextInput?.focus();
      }
    };
    
    window.addEventListener('sensorCommand', handleSensorCommand as EventListener);
    
    return () => {
      window.removeEventListener('sensorCommand', handleSensorCommand as EventListener);
    };
  }, [activeField, outfitType]); // Add outfitType as a dependency

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
    if (!recommendedSize) return;
    // Construct the path with both query parameters
    const path = `/products?size=${encodeURIComponent(recommendedSize)}&ageGroup=${encodeURIComponent(ageGroup)}`;
    // The onRecommend prop now receives the full path
    onRecommend(path);
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
            <Form.Group className="mb-3">
              <Form.Label className="text-uppercase small fw-bold">Outfit Type</Form.Label>
              <div>
                <Form.Check inline type="radio" label="Topwear" name="outfitType" id="type-top" value="Topwear" checked={outfitType === 'Topwear'} onChange={() => setOutfitType('Topwear')} />
                <Form.Check inline type="radio" label="Bottomwear" name="outfitType" id="type-bottom" value="Bottomwear" checked={outfitType === 'Bottomwear'} onChange={() => setOutfitType('Bottomwear')} />
              </div>
            </Form.Group>

            {/* --- NEW: AGE GROUP SELECTOR --- */}
            <Form.Group className="mb-4">
              <Form.Label className="text-uppercase small fw-bold">Age Group</Form.Label>
              <div>
                <Form.Check inline type="radio" label="Adult" name="ageGroup" id="age-adult" value="Adult" checked={ageGroup === 'Adult'} onChange={() => setAgeGroup('Adult')} />
                <Form.Check inline type="radio" label="Kids" name="ageGroup" id="age-kids" value="Kids" checked={ageGroup === 'Kids'} onChange={() => setAgeGroup('Kids')} />
              </div>
            </Form.Group>

            <h6 className="text-uppercase small fw-bold">Measurements (cm)</h6>
            <Form>
              {/* --- NEW: CONDITIONAL INPUT FIELDS --- */}
              {outfitType === 'Topwear' && (
                <Form.Group className="mb-3" key="Chest">
                  <Form.Label>Chest</Form.Label>
                  <InputGroup>
                    <Form.Control type="number" step="0.01" value={measurementValues["Chest"] || ""} onChange={(e) => handleValueChange("Chest", e.target.value)} onFocus={() => setActiveField("Chest")} onBlur={() => setActiveField(null)} ref={el => { inputRefs.current.set("Chest", el); }} autoFocus />
                    <Button variant="outline-secondary" title="Get from Device" onClick={() => handleInsertMeasurement("Chest")}><ArrowsCollapse /></Button>
                  </InputGroup>
                </Form.Group>
              )}
              {outfitType === 'Bottomwear' && (
                <>
                  <Form.Group className="mb-3" key="Waist">
                    <Form.Label>Waist</Form.Label>
                    <InputGroup>
                      <Form.Control type="number" step="0.01" value={measurementValues["Waist"] || ""} onChange={(e) => handleValueChange("Waist", e.target.value)} onFocus={() => setActiveField("Waist")} onBlur={() => setActiveField(null)} ref={el => { inputRefs.current.set("Waist", el); }} autoFocus />
                      <Button variant="outline-secondary" title="Get from Device" onClick={() => handleInsertMeasurement("Waist")}><ArrowsCollapse /></Button>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3" key="Hips">
                    <Form.Label>Hips</Form.Label>
                    <InputGroup>
                      <Form.Control type="number" step="0.01" value={measurementValues["Hips"] || ""} onChange={(e) => handleValueChange("Hips", e.target.value)} onFocus={() => setActiveField("Hips")} onBlur={() => setActiveField(null)} ref={el => { inputRefs.current.set("Hips", el); }} />
                      <Button variant="outline-secondary" title="Get from Device" onClick={() => handleInsertMeasurement("Hips")}><ArrowsCollapse /></Button>
                    </InputGroup>
                  </Form.Group>
                </>
              )}
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