import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Form, Dropdown } from 'react-bootstrap';
import { format, getDay } from 'date-fns';
import api from '../../services/api';
import './dayBlockPicker.css'; // We will create this next

type BlockType = 'morning' | 'afternoon';

interface DayAvailability {
  morning: { available: boolean };
  afternoon: { available: boolean };
}

interface DayBlockPickerProps {
  selectedDate: Date | null;
  selectedBlock: BlockType | '';
  onChange: (date: Date | null, block: BlockType | '') => void;
  minDate?: Date;
  unavailableDates?: Date[];
}

export const DayBlockPicker: React.FC<DayBlockPickerProps> = ({
  selectedDate,
  selectedBlock,
  onChange,
  minDate = new Date(),
  unavailableDates = []
}) => {
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailability(null);
      return;
    }

    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const response = await api.get(`/appointments/day-availability?date=${dateString}`);
        setAvailability(response.data);
      } catch (error) {
        console.error("Failed to fetch day availability:", error);
        // On error, assume both are unavailable to prevent booking
        setAvailability({ morning: { available: false }, afternoon: { available: false } });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailability();
  }, [selectedDate]);

  const handleDateChange = (date: Date | null) => {
    // When the date changes, clear the block selection and notify the parent
    onChange(date, '');
  };

  const handleBlockSelect = (blockKey: string | null) => {
    if (!selectedDate || !blockKey) return;
    
    const block = blockKey as BlockType;
    onChange(selectedDate, block);
  };
  
  const isFilterableDate = (date: Date): boolean => {
    const day = getDay(date);
    const isSunday = day === 0;
    const isUnavailable = unavailableDates.some(
      d => new Date(d).toDateString() === date.toDateString()
    );
    return !isSunday && !isUnavailable;
  };

  const getBlockDisplayName = () => {
    if (isLoading) return 'Loading...';
    if (selectedBlock === 'morning') return 'Morning';
    if (selectedBlock === 'afternoon') return 'Afternoon';
    return '-- Select Block --';
  };

  return (
    <div className="day-block-picker-container">
      <div className="d-md-flex gap-2 align-items-start">
        
        {/* Date Picker Column */}
        <Form.Group className="mb-3 mb-md-0 flex-grow-1">
          <Form.Label>Date</Form.Label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            filterDate={isFilterableDate}
            minDate={minDate}
            dateFormat="MMMM d, yyyy"
            className="form-control"
            placeholderText="-- Select Date --"
            wrapperClassName="w-100"
          />
        </Form.Group>

        {/* Time Block Column */}
        <Form.Group className="mb-3 mb-md-0">
          <Form.Label>Time Block</Form.Label>
          <Dropdown onSelect={handleBlockSelect}>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="w-100 d-flex justify-content-between align-items-center"
              disabled={!selectedDate || isLoading}
            >
              {getBlockDisplayName()}
            </Dropdown.Toggle>

            <Dropdown.Menu className="w-100">
              <Dropdown.Item 
                eventKey="morning" 
                disabled={!availability?.morning.available}
              >
                Morning
              </Dropdown.Item>
              <Dropdown.Item 
                eventKey="afternoon" 
                disabled={!availability?.afternoon.available}
              >
                Afternoon
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          {!selectedDate && <Form.Text>Please select a date first.</Form.Text>}
        </Form.Group>
      </div>
    </div>
  );
};