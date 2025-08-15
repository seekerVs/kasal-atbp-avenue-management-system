// client/src/components/customerInfoDisplay/CustomerInfoDisplay.tsx

import React from 'react';
import { PersonFill, TelephoneFill, EnvelopeFill, GeoAltFill } from 'react-bootstrap-icons';
import { CustomerInfo } from '../../types';

interface CustomerInfoDisplayProps {
  customer: CustomerInfo;
}

export const CustomerInfoDisplay: React.FC<CustomerInfoDisplayProps> = ({ customer }) => {
  return (
    <div className='lh-1'>
      <h5 className="mb-2 text-center fw-bold">Personal & Contact Information</h5>
      <hr className='my-2 mx-3' />
      <p className="mb-1"><PersonFill className="me-2"/>{customer.name}</p>
      <p className="mb-1"><TelephoneFill className="me-2"/>{customer.phoneNumber}</p>
      {customer.email && <p className="mb-1"><EnvelopeFill className="me-2"/>{customer.email}</p>}
      <p className="mb-0"><GeoAltFill className="me-2"/>{`${customer.address.street}, ${customer.address.barangay}, ${customer.address.city}, ${customer.address.province}`}</p>
    </div>
  );
};