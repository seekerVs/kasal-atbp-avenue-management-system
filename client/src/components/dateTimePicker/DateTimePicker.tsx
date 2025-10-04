// client/src/components/dateTimePicker/DateTimePicker.tsx

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { format, getDay, setHours, setMinutes } from 'date-fns'; 
import { Dropdown, Spinner } from 'react-bootstrap';

import api from '../../services/api';
import './dateTimePicker.css'; // We will create this CSS file next

interface DateTimePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  selectedTime?: string; // Optional
  onTimeChange?: (time: string) => void; // Optional
  minDate?: Date;
  unavailableDates?: Date[];
}

const generateTimeSlots = (startTime: Date, endTime: Date, interval: number): string[] => {
  const slots = [];
  let currentTime = new Date(startTime);

  while (currentTime <= endTime) {
    const timeString = format(currentTime, 'HH:mm');
    // Add a condition to skip the lunch break times
    if (timeString !== "12:00" && timeString !== "12:30") {
      slots.push(timeString);
    }
    currentTime.setMinutes(currentTime.getMinutes() + interval);
  }
  return slots;
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  selectedDate,
  onChange,
  selectedTime,     // <-- NEW
  onTimeChange,     // <-- NEW
  minDate = new Date(),
  unavailableDates = []
}) => {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);


  // Effect to fetch the booked time slots whenever the selected day changes
  useEffect(() => {
    // Don't fetch if no date is selected
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }

    const fetchBookedSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const response = await api.get(`/appointments/booked-slots?date=${dateString}`);
        setBookedSlots(response.data || []);
      } catch (error) {
        console.error("Failed to fetch booked slots:", error);
        // Silently fail is okay, as it won't block booking, just won't prevent overbooking
        setBookedSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [selectedDate]);

  const allTimeSlots = generateTimeSlots(
    setHours(setMinutes(new Date(), 0), 9),  // 9:00 AM
    setHours(setMinutes(new Date(), 30), 16), // 4:30 PM
    30 // 30-minute interval
  );

  const getDisabledTimes = (): Set<string> => {
    const disabled = new Set<string>(bookedSlots);

    if (selectedDate) {
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();

        if (isToday) {
            const currentTimeString = format(now, 'HH:mm');
            // Disable any slot that is earlier than the current time
            allTimeSlots.forEach(slot => {
                if (slot < currentTimeString) {
                    disabled.add(slot);
                }
            });
        }
    }
    return disabled;
  };
  
  const disabledTimeSet = getDisabledTimes();

  const handleDateChange = (date: Date | null) => {
    // If a new date is selected (or the date is cleared)...
    if (date) {
        const newDateTime = setHours(setMinutes(date, 0), 9);
        onChange(newDateTime);
    } else {
        onChange(null);
    }
    if (onTimeChange) {
      onTimeChange('');
    }
  };
  
  const handleTimeChange = (timeString: string | null) => {
    if (onTimeChange && timeString !== null) {
      onTimeChange(timeString);
      if (selectedDate && timeString) {
        const [hour, minute] = timeString.split(':').map(Number);
        const newDateTime = setHours(setMinutes(selectedDate, minute), hour);
        onChange(newDateTime);
      }
    }
  };

  const isFilterableDate = (date: Date): boolean => {
    const day = getDay(date);
    const isSunday = day === 0;
    const isUnavailable = unavailableDates.some(
      (unavailableDate) => new Date(unavailableDate).toDateString() === date.toDateString()
    );
    return !isSunday && !isUnavailable;
  };

  const formatDisplayTime = (timeString: string | undefined): string => {
    if (!timeString) return "--Select Time--";
    return format(new Date(`1970-01-01T${timeString}`), 'h:mm aa');
  };

  return (
    // We will build the JSX in the next step.
    // For now, this file contains all the necessary state and logic updates.
    <div className="datetime-picker-container">
        {/* Date Picker (Date Only) */}
        <DatePicker
            selected={selectedDate}
            onChange={handleDateChange} // <-- Use the new date-only handler
            showTimeSelect={false} // <-- Turn off time selection here
            filterDate={isFilterableDate}
            minDate={minDate}
            dateFormat="MMMM d, yyyy"
            className="form-control"
            placeholderText="-- Select Date --" 
            wrapperClassName="date-picker-wrapper"
        />

        {/* Time Dropdown */}
        <div className="time-picker-wrapper">
          <Dropdown onSelect={handleTimeChange}>
            <Dropdown.Toggle 
              variant="outline-dark" 
              className="w-100 d-flex justify-content-between align-items-center"
              style={{ borderColor: '#ccc', color: '#000' }}
              disabled={!selectedDate || isLoadingSlots}
            >
              {isLoadingSlots ? 'Loading...' : formatDisplayTime(selectedTime)}
            </Dropdown.Toggle>

            <Dropdown.Menu className="time-dropdown-menu">
                <Dropdown.Item eventKey="" disabled>
                  -- Select Time --
               </Dropdown.Item>
              {allTimeSlots.map(time => (
                <Dropdown.Item 
                  key={time} 
                  eventKey={time} 
                  disabled={disabledTimeSet.has(time)}
                >
                  {formatDisplayTime(time)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          {isLoadingSlots && <Spinner animation="border" size="sm" className="time-loader-spinner" />}
        </div>
    </div>
  );
};