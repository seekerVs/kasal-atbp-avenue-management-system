import React, { useState, useEffect } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import {
  getAllProvinces,
  getMunicipalitiesByProvince,
  getBarangaysByMunicipality,
} from '@aivangogh/ph-address';
import { Address } from '../../types';

type TProvince = { name: string; psgcCode: string; regionCode: string; };
type TMunicipality = { name: string; psgcCode: string; provinceCode: string; };
type TBarangay = { name: string; psgcCode: string; municipalCityCode: string; };

interface AddressSelectorProps {
  value: Address;
  onChange: (field: keyof Address, value: string) => void;
  errors: Partial<Record<keyof Address, string>>;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({ value, onChange, errors }) => {
  // State now holds the full data objects, not just names
  const [provinces, setProvinces] = useState<TProvince[]>([]);
  const [cities, setCities] = useState<TMunicipality[]>([]);
  const [barangays, setBarangays] = useState<TBarangay[]>([]);

  // State to hold the selected CODES for fetching the next dropdown's data
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');

  // 1. Fetch all provinces on initial component mount
  useEffect(() => {
    setProvinces(getAllProvinces());
  }, []);

  // 2. When a province code is selected, fetch its cities/municipalities
  useEffect(() => {
    if (selectedProvinceCode) {
      setCities(getMunicipalitiesByProvince(selectedProvinceCode));
    } else {
      setCities([]);
    }
  }, [selectedProvinceCode]);

  // 3. When a city code is selected, fetch its barangays
  useEffect(() => {
    if (selectedCityCode) {
      setBarangays(getBarangaysByMunicipality(selectedCityCode));
    } else {
      setBarangays([]);
    }
  }, [selectedCityCode]);

  // Handlers now manage both the code (for internal state) and the name (for parent state)
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value;
    const province = provinces.find(p => p.psgcCode === provinceCode);
    setSelectedProvinceCode(provinceCode);

    // Reset downstream selections
    setSelectedCityCode('');
    
    // Update parent component's state
    onChange('province', province ? province.name : '');
    onChange('city', '');
    onChange('barangay', '');
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityCode = e.target.value;
    const city = cities.find(c => c.psgcCode === cityCode);
    setSelectedCityCode(cityCode);

    // Reset downstream selections
    onChange('barangay', '');
    
    // Update parent component's state
    onChange('city', city ? city.name : '');
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Barangay is the final selection, so we just pass its name up
    const barangayName = e.target.value;
    onChange('barangay', barangayName);
  };

  return (
    <Row>
      <Col md={6}>
        <Form.Group className="mb-3">
          <Form.Label>Province <span className="text-danger">*</span></Form.Label>
          <Form.Select value={selectedProvinceCode} onChange={handleProvinceChange} isInvalid={!!errors.province}>
            <option value="">Select Province</option>
            {provinces.map((p) => (<option key={p.psgcCode} value={p.psgcCode}>{p.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.province}</Form.Control.Feedback>
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group className="mb-3">
          <Form.Label>City/Municipality <span className="text-danger">*</span></Form.Label>
          <Form.Select value={selectedCityCode} onChange={handleCityChange} isInvalid={!!errors.city} disabled={!selectedProvinceCode}>
            <option value="">Select City/Municipality</option>
            {cities.map((c) => (<option key={c.psgcCode} value={c.psgcCode}>{c.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.city}</Form.Control.Feedback>
        </Form.Group>
      </Col>
      <Col xs={12}>
        <Form.Group className="mb-3">
          <Form.Label>Barangay <span className="text-danger">*</span></Form.Label>
          <Form.Select value={value.barangay} onChange={handleBarangayChange} isInvalid={!!errors.barangay} disabled={!selectedCityCode}>
            <option value="">Select Barangay</option>
            {barangays.map((b) => (<option key={b.psgcCode} value={b.name}>{b.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.barangay}</Form.Control.Feedback>
        </Form.Group>
      </Col>
    </Row>
  );
};