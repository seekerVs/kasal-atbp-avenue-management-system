import React, { useMemo } from 'react';
import { Row, Col } from 'react-bootstrap';
import { Booking, FormErrors } from '../../types';
import { ValidatedInput } from '../forms/ValidatedInput';
import { AddressSelector } from '../addressSelector/AddressSelector';
import { format, subDays } from 'date-fns';

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

  const handleDateChange = (field: 'eventDate' | 'reserveStartDate' | 'reserveEndDate', value: string) => {
    setBooking(prev => ({ ...prev, [field]: value }));
  };

  const minRentalStartDate = format(subDays(new Date(booking.eventDate as string), 3), 'yyyy-MM-dd');

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
      <Row>
        <Col md={6}>
          <ValidatedInput
            label="Phone Number"
            name="phoneNumber"
            value={booking.customerInfo.phoneNumber}
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
            value={booking.customerInfo.email || ''}
            onChange={(e) => handleCustomerChange('email', e.target.value)}
            placeholder="For booking confirmations (Optional)"
            error={errors.customerInfo?.email}
          />
        </Col>
      </Row>
      <hr />
      
      <Row className="g-3 mb-3">
        {/* AddressSelector now renders its 3 <Col>s directly inside this Row */}
        <AddressSelector
          value={booking.customerInfo.address}
          onChange={handleAddressChange}
          errors={errors.customerInfo?.address || {}}
        />

        {/* The Street input is now the 4th <Col> in the same Row */}
        <Col xs={12} md={6} lg={3}>
          <ValidatedInput
            label="Street Name"
            name="street"
            as="textarea"
            rows={1} // Adjusted rows to better fit a single line
            value={booking.customerInfo.address.street}
            onChange={(e) => handleAddressChange('street', e.target.value)}
            isRequired
            error={errors.customerInfo?.address?.street}
            // Remove margin-bottom from the inner Form.Group
            className="mb-0" 
          />
        </Col>
      </Row>
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
            name="reserveStartDate"
            type="date"
            value={booking.reserveStartDate as string}
            onChange={(e) => handleDateChange('reserveStartDate', e.target.value)}
            isRequired
            max={booking.eventDate as string}
            min={minRentalStartDate}
          />
        </Col>
        <Col>
          <ValidatedInput
            label="Rental End Date"
            name="reserveEndDate"
            type="date"
            value={booking.reserveEndDate as string}
            onChange={(e) => handleDateChange('reserveEndDate', e.target.value)}
            isRequired
            min={booking.reserveStartDate as string}
          />
        </Col>
      </Row>
    </>
  );
};