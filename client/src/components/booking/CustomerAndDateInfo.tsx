import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { Booking, FormErrors } from '../../types';
import { ValidatedInput } from '../forms/ValidatedInput';
import { AddressSelector } from '../addressSelector/AddressSelector';

type BookingState = Omit<Booking, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface CustomerAndDateInfoProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  errors: FormErrors;
}

export const CustomerAndDateInfo: React.FC<CustomerAndDateInfoProps> = ({ booking, setBooking, errors }) => {

  const handleCustomerChange = (field: string, value: string) => {
    setBooking(prev => ({
      ...prev,
      customerInfo: { ...prev.customerInfo, [field]: value },
    }));
  };

  const handleAddressChange = (field: keyof BookingState['customerInfo']['address'], value: string) => {
    setBooking(prev => ({
      ...prev,
      customerInfo: {
        ...prev.customerInfo,
        address: { ...prev.customerInfo.address, [field]: value },
      },
    }));
  };

  const handleDateChange = (field: 'eventDate' | 'rentalStartDate' | 'rentalEndDate', value: string) => {
    setBooking(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <ValidatedInput
        label="Full Name"
        name="name"
        value={booking.customerInfo.name}
        onChange={(e) => handleCustomerChange('name', e.target.value)}
        placeholder="e.g., Maria Dela Cruz"
        isRequired
        error={errors.customerInfo?.name}
      />
      <ValidatedInput
        label="Phone Number"
        name="phoneNumber"
        value={booking.customerInfo.phoneNumber}
        onChange={(e) => handleCustomerChange('phoneNumber', e.target.value)}
        placeholder="e.g., 09171234567"
        isRequired
        error={errors.customerInfo?.phoneNumber}
      />
      <ValidatedInput
        label="Email Address"
        name="email"
        type="email"
        value={booking.customerInfo.email || ''}
        onChange={(e) => handleCustomerChange('email', e.target.value)}
        placeholder="For booking confirmations (Optional)"
        error={errors.customerInfo?.email}
      />
      <hr />
      
      <AddressSelector
        value={booking.customerInfo.address}
        onChange={handleAddressChange}
        errors={errors.customerInfo?.address || {}}
      />

      <ValidatedInput
        label="Street Name, Building, House No."
        name="street"
        as="textarea"
        rows={2}
        value={booking.customerInfo.address.street}
        onChange={(e) => handleAddressChange('street', e.target.value)}
        isRequired
        error={errors.customerInfo?.address?.street}
      />
      <hr />

      <ValidatedInput
        label="Date of Event"
        name="eventDate"
        type="date"
        value={booking.eventDate as string}
        onChange={(e) => handleDateChange('eventDate', e.target.value)}
        isRequired
      />
      <Row>
        <Col>
          <ValidatedInput
            label="Rental Start Date"
            name="rentalStartDate"
            type="date"
            value={booking.rentalStartDate as string}
            onChange={(e) => handleDateChange('rentalStartDate', e.target.value)}
            isRequired
          />
        </Col>
        <Col>
          <ValidatedInput
            label="Rental End Date"
            name="rentalEndDate"
            type="date"
            value={booking.rentalEndDate as string}
            onChange={(e) => handleDateChange('rentalEndDate', e.target.value)}
            isRequired
          />
        </Col>
      </Row>
    </>
  );
};