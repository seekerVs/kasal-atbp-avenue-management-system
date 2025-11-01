// client/src/components/reservationWizard/CustomerAndDateInfo.tsx

import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import { format, getDay } from 'date-fns';
import { Reservation, FormErrors } from '../../types';
import { ValidatedInput } from '../forms/ValidatedInput';
import { AddressSelector } from '../addressSelector/AddressSelector';
import DatePicker from 'react-datepicker';

// This component's props are typed to expect `reserveDate` as a string,
// matching the state management strategy in its parent, `CreateReservationPage`.
type ReservationStateWithStringDate = Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'reserveDate'> & { reserveDate: string };

interface CustomerAndDateInfoProps {
  reservation: ReservationStateWithStringDate;
  setReservation: React.Dispatch<React.SetStateAction<ReservationStateWithStringDate>>;
  onDateChange: (date: Date | null) => void; 
  errors: FormErrors;
  unavailableDates: Date[];
}

export const CustomerAndDateInfo: React.FC<CustomerAndDateInfoProps> = ({ reservation, setReservation, onDateChange, errors, unavailableDates  }) => {

  const handleCustomerChange = (field: string, value: string) => {
    setReservation(prev => ({ ...prev, customerInfo: { ...prev.customerInfo, [field]: value } }));
  };

  const handleAddressChange = (field: keyof Reservation['customerInfo']['address'], value: string) => {
    setReservation(prev => ({ ...prev, customerInfo: { ...prev.customerInfo, address: { ...prev.customerInfo.address, [field]: value } } }));
  };

  // This handler now works directly with the date string from the input element.
  const handleDateChange = (date: Date | null) => {
    onDateChange(date);
  };

  // This function will be used by the DatePicker to decide which days to disable.
  const isSelectableDate = (date: Date): boolean => {
    const day = getDay(date);
    const isSunday = day === 0;

    const isUnavailable = unavailableDates.some(
      (unavailableDate) => unavailableDate.toDateString() === date.toDateString()
    );

    return !isSunday && !isUnavailable;
  };

  return (
    <>
      <ValidatedInput
        label="Full Name"
        name="name"
        value={reservation.customerInfo.name}
        onChange={(e) => handleCustomerChange('name', e.target.value)}
        placeholder="e.g., Maria Dela Cruz"
        isRequired
        error={errors.customerInfo?.name}
      />
      <Row>
        <Col md={6}>
          <ValidatedInput
            label="Phone Number"
            name="phoneNumber"
            value={reservation.customerInfo.phoneNumber}
            onChange={(e) => handleCustomerChange('phoneNumber', e.target.value)}
            placeholder="e.g., 09171234567"
            isRequired
            error={errors.customerInfo?.phoneNumber}
            type="tel"
            maxLength={11}
            pattern="09[0-9]{9}"
          />
        </Col>
        <Col md={6}>
          <ValidatedInput
            label="Email Address"
            name="email"
            type="email"
            value={reservation.customerInfo.email || ''}
            onChange={(e) => handleCustomerChange('email', e.target.value)}
            placeholder="e.g., maria@example.com"
            isRequired // <-- ADDED
            error={errors.customerInfo?.email}
          />
        </Col>
      </Row>
      <hr />
      
      <Row className="g-3 mb-3">
        <AddressSelector
          value={reservation.customerInfo.address}
          onChange={handleAddressChange}
          errors={errors.customerInfo?.address || {}}
        />
        <Col xs={12} md={6} lg={3}>
            <ValidatedInput
                label="Street Name"
                name="street"
                as="textarea"
                rows={1}
                value={reservation.customerInfo.address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                isRequired
                error={errors.customerInfo?.address?.street}
                className="mb-0"
            />
        </Col>
      </Row>
      <hr />


       <Form.Group>
        <Form.Label>Reservation Date <span className="text-danger">*</span></Form.Label>
        <DatePicker
          selected={reservation.reserveDate ? new Date(reservation.reserveDate) : null}
          onChange={handleDateChange}
          minDate={new Date()} // Minimum date is today
          filterDate={isSelectableDate} 
          dateFormat="MMMM d, yyyy"
          className="form-control" // Apply Bootstrap styling
          placeholderText="Select a reservation date"
          wrapperClassName="w-100" // Ensure the wrapper takes full width
        />
        {(errors as any).reserveDate && (
          <Form.Text className="text-danger">
            {(errors as any).reserveDate}
          </Form.Text>
        )}
      </Form.Group>
    </>
  );
};