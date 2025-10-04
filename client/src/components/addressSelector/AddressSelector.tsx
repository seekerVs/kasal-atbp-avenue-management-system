import React, { useState, useEffect } from 'react';
import { Col, Form } from 'react-bootstrap';
import {
  getAllProvinces,
  getMunicipalitiesByProvince,
  getBarangaysByMunicipality,
} from '@aivangogh/ph-address';
import { Address } from '../../types';

// 1. Import the Typeahead component
import { Typeahead } from 'react-bootstrap-typeahead';

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
  // State and useEffect hooks remain the same
  const [provinces] = useState<TProvince[]>(getAllProvinces());
  const [cities, setCities] = useState<TMunicipality[]>([]);
  const [barangays, setBarangays] = useState<TBarangay[]>([]);

  // Effect to populate dropdowns based on codes
  useEffect(() => {
    // This effect populates the cities dropdown whenever the selected province changes.
    const province = provinces.find(p => p.name === value.province);
    if (province) {
      setCities(getMunicipalitiesByProvince(province.psgcCode));
    } else {
      setCities([]); // If province is custom or cleared, empty the cities list.
    }
  }, [value.province, provinces]);

  useEffect(() => {
    // This effect populates the barangays dropdown whenever the selected city changes.
    const province = provinces.find(p => p.name === value.province);
    if (province) {
        const municipalities = getMunicipalitiesByProvince(province.psgcCode);
        const city = municipalities.find(m => m.name === value.city);
        if (city) {
            setBarangays(getBarangaysByMunicipality(city.psgcCode));
        } else {
            setBarangays([]); // If city is custom or cleared, empty the barangays list.
        }
    } else {
        setBarangays([]);
    }
  }, [value.province, value.city, provinces]);


  const handleProvinceChange = (selected: any[]) => {
    if (selected.length > 0) {
      const selection = selected[0];
      const provinceName = typeof selection === 'string' ? selection : selection.name;
      onChange('province', provinceName);
      // When province changes, always reset city and barangay
      onChange('city', '');
      onChange('barangay', '');
    } else {
      // Handle clearing the input
      onChange('province', '');
      onChange('city', '');
      onChange('barangay', '');
    }
  };

  const handleCityChange = (selected: any[]) => {
    if (selected.length > 0) {
      const selection = selected[0];
      const cityName = typeof selection === 'string' ? selection : selection.name;
      onChange('city', cityName);
      // When city changes, always reset barangay
      onChange('barangay', '');
    } else {
      onChange('city', '');
      onChange('barangay', '');
    }
  };

  const handleBarangayChange = (selected: any[]) => {
    if (selected.length > 0) {
      const selection = selected[0];
      const barangayName = typeof selection === 'string' ? selection : selection.name;
      onChange('barangay', barangayName);
    } else {
      onChange('barangay', '');
    }
  };

  const colProps = layout === 'horizontal' 
    ? { xs: 12, md: 6, lg: 3 } 
    : { xs: 12, md: 6 };

  const selectedProvince = value.province ? [{ name: value.province }] : [];
  const selectedCity = value.city ? [{ name: value.city }] : [];
  const selectedBarangay = value.barangay ? [{ name: value.barangay }] : [];

  return (
    <>
      {/* --- 3. Replace all Form.Select with Typeahead components --- */}
      <Col {...colProps}>
        <Form.Group>
          <Form.Label>Province<span className="text-danger">*</span></Form.Label>
          <Typeahead
            id="province-typeahead"
            allowNew // <-- This allows custom user input
            labelKey="name" // <-- Tells Typeahead to display the 'name' property from the objects
            options={provinces}
            onChange={handleProvinceChange}
            selected={selectedProvince}
            placeholder="Choose or type a province..."
            isInvalid={!!errors.province}
          />
          <Form.Control.Feedback type="invalid" className={errors.province ? 'd-block' : ''}>
            {errors.province}
          </Form.Control.Feedback>
        </Form.Group>
      </Col>
      
      <Col {...colProps}>
        <Form.Group>
          <Form.Label>City/Municipality<span className="text-danger">*</span></Form.Label>
          <Typeahead
            id="city-typeahead"
            allowNew
            labelKey="name"
            options={cities}
            onChange={handleCityChange}
            selected={selectedCity}
            placeholder="Choose or type a city..."
            disabled={!value.province}
            isInvalid={!!errors.city}
          />
          <Form.Control.Feedback type="invalid" className={errors.city ? 'd-block' : ''}>
            {errors.city}
          </Form.Control.Feedback>
        </Form.Group>
      </Col>

      <Col {...colProps}>
        <Form.Group>
          <Form.Label>Barangay<span className="text-danger">*</span></Form.Label>
          <Typeahead
            id="barangay-typeahead"
            allowNew
            labelKey="name"
            options={barangays}
            onChange={handleBarangayChange}
            selected={selectedBarangay}
            placeholder="Choose or type a barangay..."
            disabled={!value.city}
            isInvalid={!!errors.barangay}
          />
          <Form.Control.Feedback type="invalid" className={errors.barangay ? 'd-block' : ''}>
            {errors.barangay}
          </Form.Control.Feedback>
        </Form.Group>
      </Col>
    </>
  );
};