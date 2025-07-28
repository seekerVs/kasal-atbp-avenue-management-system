// client/src/components/reservationWizard/CustomerAndDateInfo.tsx

import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { format, subDays } from 'date-fns';
import { Reservation, FormErrors } from '../../types';
import { ValidatedInput } from '../forms/ValidatedInput';
import { AddressSelector } from '../addressSelector/AddressSelector';

type ReservationState = Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface CustomerAndDateInfoProps {
  reservation: ReservationState;
  setReservation: React.Dispatch<React.SetStateAction<ReservationState>>;
  errors: FormErrors;
}

export const CustomerAndDateInfo: React.FC<CustomerAndDateInfoProps> = ({ reservation, setReservation, errors }) => {

  const handleCustomerChange = (field: string, value: string) => {
    setReservation(prev => ({ ...prev, customerInfo: { ...prev.customerInfo, [field]: value } }));
  };

  const handleAddressChange = (field: keyof ReservationState['customerInfo']['address'], value: string) => {
    setReservation(prev => ({ ...prev, customerInfo: { ...prev.customerInfo, address: { ...prev.customerInfo.address, [field]: value } } }));
  };

  // This handler now expects a Date object, but the input onChange provides a string.
  // We'll convert it back to a Date object right where onChange is called.
  const handleDateChange = (field: 'eventDate' | 'reserveStartDate' | 'reserveEndDate', value: Date) => {
    // Also, handle timezone offset by getting the date at UTC midnight
    const userTimezoneOffset = value.getTimezoneOffset() * 60000;
    const dateAtUtcMidnight = new Date(value.getTime() + userTimezoneOffset);
    setReservation(prev => ({ ...prev, [field]: dateAtUtcMidnight }));
  };

  // Calculate the minimum selectable start date
  const minRentalStartDate = format(subDays(reservation.eventDate, 3), 'yyyy-MM-dd');

  return (
    <>
      <ValidatedInput label="Full Name" name="name" value={reservation.customerInfo.name} onChange={(e) => handleCustomerChange('name', e.target.value)} placeholder="e.g., Maria Dela Cruz" isRequired error={errors.customerInfo?.name} />
      <Row>
        <Col md={6}><ValidatedInput label="Phone Number" name="phoneNumber" value={reservation.customerInfo.phoneNumber} onChange={(e) => handleCustomerChange('phoneNumber', e.target.value)} placeholder="e.g., 09171234567" isRequired error={errors.customerInfo?.phoneNumber} type="tel" maxLength={11} pattern="09[0-9]{9}" /></Col>
        <Col md={6}><ValidatedInput label="Email Address" name="email" type="email" value={reservation.customerInfo.email || ''} onChange={(e) => handleCustomerChange('email', e.target.value)} placeholder="For booking confirmations (Optional)" error={errors.customerInfo?.email} /></Col>
      </Row>
      <hr />
      <Row className="g-3 mb-3">
        <AddressSelector value={reservation.customerInfo.address} onChange={handleAddressChange} errors={errors.customerInfo?.address || {}} />
        <Col xs={12} md={6} lg={3}><ValidatedInput label="Street Name, Building, House No." name="street" as="textarea" rows={1} value={reservation.customerInfo.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} isRequired error={errors.customerInfo?.address?.street} className="mb-0" /></Col>
      </Row>
      <hr />

      {/* --- DATE INPUTS: We format the Date object to a string for the 'value' prop --- */}
      {/* --- and convert the string from 'onChange' back to a Date object --- */}

      <ValidatedInput
        label="Date of Event"
        name="eventDate"
        type="date"
        value={format(reservation.eventDate, 'yyyy-MM-dd')}
        onChange={(e) => handleDateChange('eventDate', new Date(e.target.value))}
        isRequired
        error={errors.eventDate}
      />
      <Row>
        <Col>
          <ValidatedInput
            label="Rental Start Date"
            name="reserveStartDate"
            type="date"
            value={format(reservation.reserveStartDate, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange('reserveStartDate', new Date(e.target.value))}
            isRequired
            max={format(reservation.eventDate, 'yyyy-MM-dd')}
            min={minRentalStartDate}
            error={(errors as any).reserveStartDate}
          />
        </Col>
        <Col>
          <ValidatedInput
            label="Rental End Date"
            name="reserveEndDate"
            type="date"
            value={format(reservation.reserveEndDate, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange('reserveEndDate', new Date(e.target.value))}
            isRequired
            min={format(reservation.reserveStartDate, 'yyyy-MM-dd')}
          />
        </Col>
      </Row>
    </>
  );
};