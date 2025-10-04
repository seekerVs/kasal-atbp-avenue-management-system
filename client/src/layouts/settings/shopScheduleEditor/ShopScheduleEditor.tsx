import { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Spinner, ListGroup } from 'react-bootstrap';
import { Save } from 'react-bootstrap-icons';
import { format, startOfDay } from 'date-fns';
import DatePicker from 'react-datepicker';
import api from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext';
import { UnavailabilityRecord } from '../../../types';
import './shopScheduleEditor.css'

function ShopScheduleEditor() {
  const { addAlert } = useAlert();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  
  // State for the right-hand editor
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [reason, setReason] = useState<'Public Holiday' | 'Shop Holiday'>('Shop Holiday');
  const [recordId, setRecordId] = useState<string | null>(null); // To know if we need to delete

  // State for the list of upcoming closures
  const [upcomingSchedules, setUpcomingSchedules] = useState<UnavailabilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  // Helper to fetch all upcoming closures for the list
  const fetchAllUpcoming = async () => {
    try {
      const response = await api.get('/unavailability/all');
      setUpcomingSchedules(response.data);
    } catch (err) {
      console.error("Could not fetch upcoming schedules list.", err);
    }
  };

  // Fetch the list once on component mount
  useEffect(() => {
    fetchAllUpcoming();
  }, []);

  // Fetch details for the currently selected date whenever it changes
  useEffect(() => {
    const fetchScheduleForDate = async () => {
      setIsLoading(true);
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const response = await api.get(`/unavailability/by-date?date=${dateString}`);
        const schedule: UnavailabilityRecord | null = response.data;

        if (schedule) {
          setIsUnavailable(true);
          setReason(schedule.reason);
          setRecordId(schedule._id);
        } else {
          setIsUnavailable(false);
          setReason('Shop Holiday'); // Default reason if toggled on
          setRecordId(null);
        }
      } catch (err) {
        addAlert('Failed to load schedule for the selected date.', 'danger');
      } finally {
        setIsLoading(false);
      }
    };
    fetchScheduleForDate();
  }, [selectedDate, addAlert]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // SCENARIO 1: The user wants the day to be UNAVAILABLE
      if (isUnavailable) {
        const payload = {
          date: format(selectedDate, 'yyyy-MM-dd'),
          reason: reason,
        };
        
        // If a record already exists, UPDATE it (PUT request)
        if (recordId) {
          await api.put(`/unavailability/${recordId}`, { reason });
          addAlert(`Reason for ${format(selectedDate, 'MMMM dd')} updated.`, 'success');
        } 
        // If no record exists, CREATE it (POST request)
        else {
          const response = await api.post('/unavailability', payload);
          setRecordId(response.data._id); // Update state with the new record's ID
          addAlert(`${format(selectedDate, 'MMMM dd')} marked as unavailable.`, 'success');
        }
      } 
      // SCENARIO 2: The user wants the day to be AVAILABLE
      else {
        // Only act if a record exists to be deleted
        if (recordId) {
          await api.delete(`/unavailability/${recordId}`);
          setRecordId(null); // Clear the ID from state
          addAlert(`${format(selectedDate, 'MMMM dd')} is now available.`, 'success');
        }
        // If !isUnavailable and !recordId, no changes are needed.
      }

      // After any change, refresh the list of upcoming closures
      await fetchAllUpcoming();

    } catch (err) {
      addAlert('Failed to save changes.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const isNotSunday = (date: Date) => date.getDay() !== 0;

  return (
    <Row className="g-2">
      <Col md={5} lg={4}>
        <h6 className="text-muted">SELECT DATE</h6>
        <Card className="shadow-sm">
          <Card.Body>
            <div className="calendar-wrapper custom-datepicker-theme">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                      if (date) {
                        setSelectedDate(startOfDay(date));
                      }
                  }}
                  inline
                  minDate={new Date()}
                  filterDate={isNotSunday}
                />
            </div>
          </Card.Body>
          <Card.Footer>
            <h6 className="text-muted small mb-2">UPCOMING SHOP CLOSURES</h6>
            <ListGroup variant="flush" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {upcomingSchedules.length > 0 ? (
                upcomingSchedules.map(schedule => (
                  <ListGroup.Item key={schedule._id} className="d-flex justify-content-between p-1 border-0">
                    <span className="small">{format(new Date(schedule.date), 'MMMM dd')}</span>
                    <span className="small fw-bold">{schedule.reason}</span>
                  </ListGroup.Item>
                ))
              ) : (
                <p className="text-muted small text-center my-2">No upcoming closures scheduled.</p>
              )}
            </ListGroup>
          </Card.Footer>
        </Card>
      </Col>
      <Col md={7} lg={8}>
        <h6 className="text-muted">EDIT AVAILABILITY FOR {format(selectedDate, 'MMMM dd, yyyy')}</h6>
        <Card className="shadow-sm">
          <Card.Body>
            {isLoading ? <div className="text-center"><Spinner /></div> : (
              <Form>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="unavailable-switch"
                    label="Mark this day as unavailable"
                    checked={isUnavailable}
                    onChange={(e) => setIsUnavailable(e.target.checked)}
                  />
                  <Form.Text>Turn this on to close the shop on this day.</Form.Text>
                </Form.Group>

                {isUnavailable && (
                  <Form.Group className="mb-3">
                    <Form.Label>Reason for Closure</Form.Label>
                    <Form.Select value={reason} onChange={e => setReason(e.target.value as any)}>
                      <option value="Shop Holiday">Shop Holiday</option>
                      <option value="Public Holiday">Public Holiday</option>
                    </Form.Select>
                  </Form.Group>
                )}
              </Form>
            )}
          </Card.Body>
          <Card.Footer className="text-end">
            <Button size='sm' onClick={handleSaveChanges} disabled={isSaving || isLoading}>
              {isSaving ? <Spinner as="span" size="sm" /> : <Save className="me-2"/>}
              Save Changes
            </Button>
          </Card.Footer>
        </Card>
      </Col>
    </Row>
  );
}

export default ShopScheduleEditor;