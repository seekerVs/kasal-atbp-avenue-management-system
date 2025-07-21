import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { ChatQuote } from 'react-bootstrap-icons';
import { MeasurementRef, Appointment } from '../../types';
import api from '../../services/api';

interface CustomAppointmentAdderProps {
  onAdd: (appointment: Appointment) => void;
}

export const CustomAppointmentAdder: React.FC<CustomAppointmentAdderProps> = ({ onAdd }) => {
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [outfitType, setOutfitType] = useState('');
  const [wearer, setWearer] = useState('');
  const [initialRequest, setInitialRequest] = useState('');

  useEffect(() => {
    const fetchRefs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/measurementrefs');
        // We only need the outfit names for the dropdown
        setMeasurementRefs(res.data || []);
      } catch (err) {
        console.error("Could not load measurement templates.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRefs();
  }, []);

  const handleAddClick = () => {
    if (!outfitType || !wearer) return;

    onAdd({
      appointmentId: '', // Parent will generate
      status: 'Pending',
      statusNote: initialRequest, // Store the customer's notes here
      appointmentFor: {
        role: `${wearer} (${outfitType})`, // Create a descriptive role
      },
      appointmentDate: null,
      processedItemData: null,
    });

    // Reset form
    setOutfitType('');
    setWearer('');
    setInitialRequest('');
  };

  if (loading) {
    return <div className="text-center"><Spinner size="sm" /></div>;
  }

  return (
    <div>
      <p className="text-muted small">
        Use this form to request a consultation and fitting for a brand new, custom-made outfit.
      </p>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>What kind of outfit do you need?</Form.Label>
            <Form.Select value={outfitType} onChange={e => setOutfitType(e.target.value)}>
              <option value="">Select an outfit type...</option>
              {measurementRefs.map(ref => (
                <option key={ref._id} value={ref.outfitName}>{ref.outfitName}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Who is this outfit for?</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="e.g., Bride, Groom, My Son, Myself"
              value={wearer}
              onChange={e => setWearer(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label><ChatQuote className="me-2"/>Initial Ideas or Notes (Optional)</Form.Label>
        <Form.Control 
          as="textarea"
          rows={3}
          placeholder="Describe your vision, what the event is, or include links to inspirations..."
          value={initialRequest}
          onChange={e => setInitialRequest(e.target.value)}
        />
      </Form.Group>
      <div className="d-grid">
        <Button onClick={handleAddClick} disabled={!outfitType || !wearer}>
          Add Appointment Request
        </Button>
      </div>
    </div>
  );
};