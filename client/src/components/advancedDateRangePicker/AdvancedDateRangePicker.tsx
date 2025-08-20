import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { CalendarEvent } from 'react-bootstrap-icons';
import { DateRangePicker, Range, RangeKeyDict } from 'react-date-range';
import { format, startOfWeek, endOfWeek, startOfMonth, subDays, endOfMonth, startOfYear, endOfYear, subYears, isSameDay } from 'date-fns';
import { createStaticRanges, StaticRange } from 'react-date-range';

import './advancedDateRangePicker.css';

interface AdvancedDateRangePickerProps {
  onRangeChange: (range: { startDate: Date; endDate: Date }) => void;
  initialRange: { startDate: Date; endDate: Date };
}

export const AdvancedDateRangePicker: React.FC<AdvancedDateRangePickerProps> = ({ onRangeChange, initialRange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<Range[]>([
    {
      startDate: initialRange.startDate,
      endDate: initialRange.endDate,
      key: 'selection',
    },
  ]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Define the predefined ranges
  const staticRanges = createStaticRanges([
    {
      label: 'Today',
      range: () => ({
        startDate: new Date(),
        endDate: new Date(),
      }),
    },
    {
      label: 'Yesterday',
      range: () => ({
        startDate: subDays(new Date(), 1),
        endDate: subDays(new Date(), 1),
      }),
    },
    {
      label: 'This Week',
      range: () => ({
        startDate: startOfWeek(new Date()),
        endDate: endOfWeek(new Date()),
      }),
    },
    {
      label: 'Last 7 Days',
      range: () => ({
        startDate: subDays(new Date(), 6),
        endDate: new Date(),
      }),
    },
    {
      label: 'This Month',
      range: () => ({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
      }),
    },
    {
      label: 'This Year',
      range: () => ({
        startDate: startOfYear(new Date()),
        endDate: endOfYear(new Date()),
      }),
    },
    {
      label: 'Last Year',
      range: () => ({
        startDate: startOfYear(subYears(new Date(), 1)),
        endDate: endOfYear(subYears(new Date(), 1)),
      }),
    },
  ] as StaticRange[]);

  // Close the picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (ranges: RangeKeyDict) => {
    setRange([ranges.selection]);
  };

  const handleApply = () => {
    if (range[0].startDate && range[0].endDate) {
      onRangeChange({ startDate: range[0].startDate, endDate: range[0].endDate });
    }
    setIsOpen(false);
  };

  const displayFormat = 'MMM dd, yyyy';
  const getDisplayValue = () => {
    const startDate = range[0].startDate;
    const endDate = range[0].endDate;

    if (!startDate || !endDate) {
      return 'Select a date range';
    }

    // Check if the start and end dates are the same day
    if (isSameDay(startDate, endDate)) {
      return format(startDate, displayFormat); // Show only one date
    }

    // Otherwise, show the full range
    return `${format(startDate, displayFormat)} - ${format(endDate, displayFormat)}`;
  };

  return (
    <div className="date-picker-wrapper" ref={pickerRef}>
      <Button variant="outline-secondary" size="sm" onClick={() => setIsOpen(!isOpen)}>
        <CalendarEvent className="me-2" />
        <span>{getDisplayValue()}</span>
      </Button>
      {isOpen && (
        <div className="date-picker-popover">
          <DateRangePicker
            onChange={handleSelect}
            ranges={range}
            rangeColors={['#AE0C00']}
            staticRanges={staticRanges}
            inputRanges={[]} // Disable the manual input ranges
            editableDateInputs={true}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="vertical"
          />
          <div className="date-picker-actions">
            <Button variant="secondary" size='sm' onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button size='sm' onClick={handleApply}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  );
};