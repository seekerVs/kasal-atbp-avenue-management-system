import React, { useState, useEffect } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
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
  const [selectedProvinceCode, setSelectedProvinceCode] = useState(() => {
    if (value.province) {
      const initialProvince = provinces.find(p => p.name === value.province);
      return initialProvince ? initialProvince.psgcCode : '';
    }
    return '';
  });
  const [selectedCityCode, setSelectedCityCode] = useState('');

  useEffect(() => {
    // This effect runs on initial mount to pre-populate the dropdowns.
    if (value.province) {
      const province = provinces.find(p => p.name === value.province);
      if (province) {
        setSelectedProvinceCode(province.psgcCode);
        const municipalities = getMunicipalitiesByProvince(province.psgcCode);
        setCities(municipalities);

        // If there's also a pre-selected city, load its barangays too.
        if (value.city) {
          const city = municipalities.find(m => m.name === value.city);
          if (city) {
            setSelectedCityCode(city.psgcCode);
            setBarangays(getBarangaysByMunicipality(city.psgcCode));
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProvinceCode) setCities(getMunicipalitiesByProvince(selectedProvinceCode));
    else setCities([]);
  }, [selectedProvinceCode]);

  useEffect(() => {
    if (selectedCityCode) setBarangays(getBarangaysByMunicipality(selectedCityCode));
    else setBarangays([]);
  }, [selectedCityCode]);

  // --- 2. Create new, more flexible handlers for the Typeahead component ---
  const handleProvinceChange = (selected: any[]) => {
    if (selected.length > 0) {
      const selection = selected[0];
      // `customOption` is true when the user types a new value
      const provinceCode = selection.customOption ? '' : selection.psgcCode;
      const provinceName = selection.name;

      setSelectedProvinceCode(provinceCode);
      setSelectedCityCode('');
      onChange('province', provinceName);
      onChange('city', '');
      onChange('barangay', '');
    } else {
      // Handle clearing the input
      setSelectedProvinceCode('');
      setSelectedCityCode('');
      onChange('province', '');
      onChange('city', '');
      onChange('barangay', '');
    }
  };

  const handleCityChange = (selected: any[]) => {
    if (selected.length > 0) {
      const selection = selected[0];
      const cityCode = selection.customOption ? '' : selection.psgcCode;
      const cityName = selection.name;
      
      setSelectedCityCode(cityCode);
      onChange('city', cityName);
      onChange('barangay', '');
    } else {
      setSelectedCityCode('');
      onChange('city', '');
      onChange('barangay', '');
    }
  };

  const handleBarangayChange = (selected: any[]) => {
    if (selected.length > 0) {
      const selection = selected[0];
      const barangayName = selection.name;
      onChange('barangay', barangayName);
    } else {
      onChange('barangay', '');
    }
  };

  const colProps = layout === 'horizontal' 
    ? { xs: 12, md: 6, lg: 3 } 
    : { xs: 12, md: 6 };

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
            selected={provinces.filter(p => p.name === value.province)}
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
            selected={cities.filter(c => c.name === value.city)}
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
            selected={barangays.filter(b => b.name === value.barangay)}
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