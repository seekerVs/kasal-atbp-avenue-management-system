import React, { useState, useEffect } from 'react';
import { Nav, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';
// --- Add FormErrors to the import from types ---
import { InventoryItem, Package, Booking, ItemReservation, PackageReservation, Appointment, FormErrors } from '../../types';
import { useAlert } from '../../contexts/AlertContext';

import { ItemReservationAdder } from './ItemReservationAdder';
import { PackageReservationAdder } from './PackageReservationAdder';
import { ReservationList } from './ReservationList';
import { CustomAppointmentAdder } from './CustomAppointmentAdder';

type BookingState = Omit<Booking, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

// --- UPDATE THE PROPS INTERFACE ---
interface ReservationManagerProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  errors: FormErrors; // <-- This is the new prop
}

// --- Destructure the new prop in the component function signature ---
export const ReservationManager: React.FC<ReservationManagerProps> = ({ booking, setBooking, errors }) => {
  const { addAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'item' | 'package' | 'custom'>('item');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [invRes, pkgRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/packages'),
        ]);
        setInventory(invRes.data || []);
        setPackages(pkgRes.data || []);
      } catch (err) {
        setError('Could not load products and packages. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddAppointment = (appointmentToAdd: Appointment) => {
    setBooking(prev => ({
      ...prev,
      appointments: [...prev.appointments, { ...appointmentToAdd, appointmentId: `apt_${Date.now()}` }],
    }));
  };

  const handleRemoveAppointment = (idToRemove: string) => {
    setBooking(prev => ({
      ...prev,
      appointments: prev.appointments.filter(a => a.appointmentId !== idToRemove),
    }));
  };

  const handleAddItem = (itemToAdd: ItemReservation) => {
    const isDuplicate = booking.itemReservations.some(
      i => i.itemId === itemToAdd.itemId && i.variation.color === itemToAdd.variation.color && i.variation.size === itemToAdd.variation.size
    );
    if (isDuplicate) {
      addAlert('This item and variation is already in your booking.', 'warning');
      return;
    }
    setBooking(prev => ({
      ...prev,
      itemReservations: [...prev.itemReservations, { ...itemToAdd, reservationId: `item_${Date.now()}` }],
    }));
  };

  const handleRemoveItem = (idToRemove: string) => {
    setBooking(prev => ({
      ...prev,
      itemReservations: prev.itemReservations.filter(i => i.reservationId !== idToRemove),
    }));
  };

  const handleAddPackage = (packageToAdd: PackageReservation) => {
    const isDuplicate = booking.packageReservations.some(p => p.packageId === packageToAdd.packageId);
    if (isDuplicate) {
        addAlert('This package is already in your booking.', 'warning');
        return;
    }
    setBooking(prev => ({
      ...prev,
      packageReservations: [...prev.packageReservations, { ...packageToAdd, packageReservationId: `pkg_${Date.now()}` }],
    }));
  };

  const handleRemovePackage = (idToRemove: string) => {
    setBooking(prev => ({
      ...prev,
      packageReservations: prev.packageReservations.filter(p => p.packageReservationId !== idToRemove),
    }));
  };

  return (
    <>
      {/* --- USE THE NEW PROP TO DISPLAY THE ERROR MESSAGE --- */}
      {errors.reservations && <Alert variant="warning" className="small py-2">{errors.reservations}</Alert>}

      <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as any)} className="mb-3">
        <Nav.Item><Nav.Link eventKey="item">Individual Items</Nav.Link></Nav.Item>
        <Nav.Item><Nav.Link eventKey="package">Packages</Nav.Link></Nav.Item>
        <Nav.Item><Nav.Link eventKey="custom">Custom Tailoring</Nav.Link></Nav.Item>
      </Nav>

      {loading && <div className="text-center"><Spinner /></div>}
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && !error && (
        <>
          {activeTab === 'item' && <ItemReservationAdder inventory={inventory} onAdd={handleAddItem} />}
          {activeTab === 'package' && <PackageReservationAdder packages={packages} onAdd={handleAddPackage} />}
          {activeTab === 'custom' && <CustomAppointmentAdder onAdd={handleAddAppointment} />}
        </>
      )}
      
      <ReservationList
        itemReservations={booking.itemReservations}
        packageReservations={booking.packageReservations}
        appointments={booking.appointments}
        onRemoveItem={handleRemoveItem}
        onRemovePackage={handleRemovePackage}
        onRemoveAppointment={handleRemoveAppointment}
      />
    </>
  );
};