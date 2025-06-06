import React, { useState, useEffect, useRef } from "react"; // Import useRef
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  Spinner,
  OverlayTrigger,
  Tooltip,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { QuestionCircle, ArrowsCollapse } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface CurrentSensorDataItem {
  _id: string;
  sensorType: string;
  position?: number;
  direction?: number;
  centimeters?: number;
  value?: number;
  createdAt: string;
  updatedAt: string;
}

interface OutfitRecommendationModalProps {
  show: boolean;
  onHide: () => void;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onRecommend: () => void;
}

const measurements = [
  "Full Shoulder",
  "Waist",
  "Bicep",
  "Hip",
  "Full Chest",
  "Thigh",
];

const OutfitRecommendationModal: React.FC<OutfitRecommendationModalProps> = ({
  show,
  onHide,
  values,
  onChange,
  onRecommend,
}) => {
  const navigate = useNavigate();

  const [currentSensorData, setCurrentSensorData] = useState<CurrentSensorDataItem | null>(null);
  const [isSensorLoading, setIsSensorLoading] = useState<boolean>(true);
  const [sensorError, setSensorError] = useState<string | null>(null);

  // State to track which input field is currently focused
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // useRef to store the previous centimeter value for comparison
  const prevCentimetersRef = useRef<number | undefined>(undefined);

  // useRef to store references to each input element
  // A Map is used to easily store and retrieve refs by their label (string key)
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const fetchCurrentSensorData = async () => {
    try {
      setIsSensorLoading(true);
      setSensorError(null);
      const response = await axios.get<{ success: true, data: CurrentSensorDataItem }>('http://localhost:3001/sensorData');
      setCurrentSensorData(response.data.data);
    } catch (err: any) {
      console.error('Error fetching current sensor data in modal:', err);
      if (err.response && err.response.status === 404) {
          setSensorError('No device data available yet. Please ensure your device is sending data.');
          setCurrentSensorData(null);
      } else {
          setSensorError(err.response?.data?.message || 'Failed to fetch device data.');
      }
    } finally {
      setIsSensorLoading(false);
    }
  };

  // useEffect to poll for sensor data when the modal is shown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (show) {
      fetchCurrentSensorData(); // Initial fetch
      intervalId = setInterval(fetchCurrentSensorData, 3000); // Poll every 3 seconds
    }

    // Cleanup interval when modal hides or component unmounts
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      // Optional: Reset the ref when the modal hides to ensure fresh comparison next time it opens
      prevCentimetersRef.current = undefined;
      // Clear refs when component unmounts or modal hides
      inputRefs.current.clear();
    };
  }, [show]);

  // useEffect to auto-inject sensor data into the focused field and then move focus
  useEffect(() => {
    // Only proceed if an input is focused, we have sensor data, and it's the correct sensor type
    if (
      focusedField &&
      currentSensorData?.centimeters !== undefined &&
      currentSensorData.sensorType === 'LengthMeasurement'
    ) {
      const currentCm = currentSensorData.centimeters;
      const prevCm = prevCentimetersRef.current;

      // Only update if the current centimeter value has actually changed from the previous one
      if (currentCm !== prevCm) {
        onChange(focusedField, currentCm.toFixed(2)); // Insert value into current field

        // --- NEW LOGIC: Move focus to the next input ---
        const currentIndex = measurements.indexOf(focusedField);
        const nextIndex = currentIndex + 1;

        if (nextIndex < measurements.length) {
          const nextFieldLabel = measurements[nextIndex];
          const nextInputField = inputRefs.current.get(nextFieldLabel);

          if (nextInputField) {
            nextInputField.focus(); // Programmatically focus the next input
            setFocusedField(nextFieldLabel); // Update focusedField state to the new field
          }
        } else {
          // If it was the last input, clear focus
          setFocusedField(null);
        }
      }
    }

    // Always update the ref with the current value for the next comparison
    prevCentimetersRef.current = currentSensorData?.centimeters;
  }, [currentSensorData, focusedField, onChange]); // Re-run when sensor data or focused field changes

  // Handle injecting the measurement into the focused field (for the button click)
  const handleInjectMeasurement = () => {
    if (
      focusedField &&
      currentSensorData?.centimeters !== undefined &&
      currentSensorData.sensorType === 'LengthMeasurement'
    ) {
      onChange(focusedField, currentSensorData.centimeters.toFixed(2));

      // --- Duplicate logic for button click: Move focus to the next input ---
      const currentIndex = measurements.indexOf(focusedField);
      const nextIndex = currentIndex + 1;

      if (nextIndex < measurements.length) {
        const nextFieldLabel = measurements[nextIndex];
        const nextInputField = inputRefs.current.get(nextFieldLabel);

        if (nextInputField) {
          nextInputField.focus();
          setFocusedField(nextFieldLabel);
        }
      } else {
        setFocusedField(null);
      }
    }
  };

  const renderTooltip = (props: any) => (
    <Tooltip id="help-tooltip" {...props}>
      These measurements help us recommend your perfect fit.
    </Tooltip>
  );

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-semibold">Outfit Recommendation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-4">
          Find the best outfit in an instant
          <OverlayTrigger placement="top" overlay={renderTooltip}>
            <QuestionCircle size={16} className="ms-2" />
          </OverlayTrigger>
        </p>

        <Form>
          <Row>
            {measurements.map((label, idx) => (
              <Col md={6} className="mb-3" key={label}>
                <Form.Label>{label}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={values[label] || ""}
                    onChange={(e) => onChange(label, e.target.value)}
                    onFocus={() => setFocusedField(label)}
                    onBlur={() => setFocusedField(null)}
                    // --- NEW: Attach ref to the input element ---
                    ref={(el) => {
                      // Store the DOM element in the ref Map, using the label as key
                      if (el) { // Ensure element exists before setting
                        inputRefs.current.set(label, el as HTMLInputElement);
                      } else { // Element unmounted, remove from map
                        inputRefs.current.delete(label);
                      }
                    }}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={handleInjectMeasurement}
                    // Prevent the input from losing focus when the button is clicked
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={
                      !currentSensorData?.centimeters ||
                      focusedField !== label ||
                      isSensorLoading ||
                      currentSensorData.sensorType !== 'LengthMeasurement'
                    }
                    title="Get from Device"
                  >
                    <ArrowsCollapse size={16} />
                  </Button>
                </InputGroup>
              </Col>
            ))}
          </Row>
        </Form>

        {/* Display sensor data status */}
        <div className="mt-3">
          {isSensorLoading && (
            <div className="d-flex align-items-center text-muted">
              <Spinner animation="border" size="sm" className="me-2 text-danger" />
              Retrieving device measurement...
            </div>
          )}
          {sensorError && (
            <Alert variant="warning" className="mt-2 py-2">
              {sensorError}
            </Alert>
          )}
          {!isSensorLoading && !sensorError && currentSensorData && (
            <Alert variant="success" className="mt-2 py-2">
              Live Reading: {currentSensorData.centimeters?.toFixed(2) || 'N/A'} cm (Last Updated: {new Date(currentSensorData.updatedAt).toLocaleTimeString()})
            </Alert>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="danger" onClick={() => navigate(`/products`)}>
          Recommend
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OutfitRecommendationModal;