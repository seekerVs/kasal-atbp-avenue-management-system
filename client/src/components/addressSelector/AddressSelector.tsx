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
  layout?: 'horizontal' | 'vertical';
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({ value, onChange, errors, layout = 'horizontal'  }) => {
  // --- FIX #1: Get the province list immediately and store it. ---
  // We use useState here so it's only called once per component lifecycle.
  const [provinces] = useState<TProvince[]>(getAllProvinces());

  const [cities, setCities] = useState<TMunicipality[]>([]);
  const [barangays, setBarangays] = useState<TBarangay[]>([]);

  // --- FIX #2: Initialize the state correctly. ---
  // This now works because `provinces` has data right from the start.
  const [selectedProvinceCode, setSelectedProvinceCode] = useState(() => {
    if (value.province) {
      const initialProvince = provinces.find(p => p.name === value.province);
      return initialProvince ? initialProvince.psgcCode : '';
    }
    return '';
  });

  // This state is still needed for the City/Municipality dropdown.
  const [selectedCityCode, setSelectedCityCode] = useState('');

  // --- FIX #3: Removed the redundant useEffect blocks. ---

  // This effect correctly populates cities when a province is selected.
  useEffect(() => {
    if (selectedProvinceCode) {
      setCities(getMunicipalitiesByProvince(selectedProvinceCode));
    } else {
      setCities([]);
    }
  }, [selectedProvinceCode]);

  // This effect correctly populates barangays when a city is selected.
  useEffect(() => {
    if (selectedCityCode) {
      setBarangays(getBarangaysByMunicipality(selectedCityCode));
    } else {
      setBarangays([]);
    }
  }, [selectedCityCode]);

  // Handlers can remain the same.
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value;
    const province = provinces.find(p => p.psgcCode === provinceCode);
    setSelectedProvinceCode(provinceCode);
    setSelectedCityCode('');
    onChange('province', province ? province.name : '');
    onChange('city', '');
    onChange('barangay', '');
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityCode = e.target.value;
    const city = cities.find(c => c.psgcCode === cityCode);
    setSelectedCityCode(cityCode);
    onChange('barangay', '');
    onChange('city', city ? city.name : '');
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const barangayName = e.target.value;
    onChange('barangay', barangayName);
  };

  const colProps = layout === 'horizontal' 
    ? { xs: 12, md: 6, lg: 3 } 
    : { xs: 12, md: 6 };

  return (
    <>
      <Col {...colProps}>
        <Form.Group>
          <Form.Label>Province <span className="text-danger">*</span></Form.Label>
          <Form.Select value={selectedProvinceCode} onChange={handleProvinceChange} isInvalid={!!errors.province}>
            <option value="">Select Province</option>
            {provinces.map((p) => (<option key={p.psgcCode} value={p.psgcCode}>{p.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.province}</Form.Control.Feedback>
        </Form.Group>
      </Col>
      
      <Col {...colProps}>
        <Form.Group>
          <Form.Label>City/Municipality <span className="text-danger">*</span></Form.Label>
          <Form.Select value={selectedCityCode} onChange={handleCityChange} isInvalid={!!errors.city} disabled={!selectedProvinceCode}>
            <option value="">Select City/Municipality</option>
            {cities.map((c) => (<option key={c.psgcCode} value={c.psgcCode}>{c.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.city}</Form.Control.Feedback>
        </Form.Group>
      </Col>

      <Col {...colProps}>
        <Form.Group>
          <Form.Label>Barangay <span className="text-danger">*</span></Form.Label>
          <Form.Select value={value.barangay} onChange={handleBarangayChange} isInvalid={!!errors.barangay} disabled={!selectedCityCode}>
            <option value="">Select Barangay</option>
            {barangays.map((b) => (<option key={b.psgcCode} value={b.name}>{b.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.barangay}</Form.Control.Feedback>
        </Form.Group>
      </Col>
    </>
  );
};