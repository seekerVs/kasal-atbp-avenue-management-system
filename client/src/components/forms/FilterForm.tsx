// client/src/components/forms/FilterForm.tsx

import React from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { Funnel, Search } from 'react-bootstrap-icons';

export interface FilterFormProps {
  categories: string[];
  attireType: string;
  setAttireType: (value: string) => void;
  selectedAge: string;
  setSelectedAge: (value: string) => void;
  selectedGender: string;
  setSelectedGender: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onReset: () => void;
  isModal?: boolean;

  mode: 'rental' | 'assignment';
  filterByColorHex?: string;
  assignmentScope: 'matching' | 'all';
  onAssignmentScopeChange: (scope: 'matching' | 'all') => void;
}

export const FilterForm: React.FC<FilterFormProps> = ({
  categories, attireType, setAttireType, selectedAge, setSelectedAge,
  selectedGender, setSelectedGender, searchTerm, setSearchTerm, onReset,
  mode, filterByColorHex, assignmentScope, onAssignmentScopeChange // Destructure new props
}) => (
  <>
    <InputGroup className="mb-4">
      <Form.Control 
        type="text" 
        placeholder="Search by name..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
      />
      <Button variant="primary" className="search-button">
        <Search size={20} />
      </Button>
    </InputGroup>

    <div className="d-flex align-items-center">
      <Funnel size={24} className="me-2" />
      <h5 className="fw-semibold mb-0">Filters</h5>
    </div>
    <hr/>
    
    <div className="d-grid mb-3">
      <Button variant="outline-secondary" size="sm" onClick={onReset}>Reset Filters</Button>
    </div>

    {mode === 'assignment' && filterByColorHex && (
      <>
        <strong>Filter Scope</strong>
        <Form>
          <Form.Check
            type="radio"
            name="assignmentScope"
            label="Matching Motif Color"
            id="scope-matching"
            checked={assignmentScope === 'matching'}
            onChange={() => onAssignmentScopeChange('matching')}
          />
          <Form.Check
            type="radio"
            name="assignmentScope"
            label="All Inventory"
            id="scope-all"
            checked={assignmentScope === 'all'}
            onChange={() => onAssignmentScopeChange('all')}
          />
        </Form>
        <hr />
      </>
    )}
    
    <strong>Age group</strong>
    <Form>
      <Form.Check type="radio" name="ageGroup" label="All" id="age-all" checked={!selectedAge} onChange={() => setSelectedAge("")} />
      <Form.Check type="radio" name="ageGroup" label="Adult" id="adult" checked={selectedAge === "Adult"} onChange={() => setSelectedAge("Adult")} />
      <Form.Check type="radio" name="ageGroup" label="Kids" id="kids" checked={selectedAge === "Kids"} onChange={() => setSelectedAge("Kids")} />
    </Form>
    <hr />

    <strong>Gender</strong>
    <Form>
      <Form.Check type="radio" name="gender" label="Any" id="gender-any" checked={!selectedGender} onChange={() => setSelectedGender("")} />
      <Form.Check type="radio" name="gender" label="Male" id="male" checked={selectedGender === "Male"} onChange={() => setSelectedGender("Male")} />
      <Form.Check type="radio" name="gender" label="Female" id="female" checked={selectedGender === "Female"} onChange={() => setSelectedGender("Female")} />
      <Form.Check type="radio" name="gender" label="Unisex" id="unisex" checked={selectedGender === "Unisex"} onChange={() => setSelectedGender("Unisex")} />
    </Form>
    <hr />

    <strong>Attire Type</strong>
    <Form>
      <Form.Check type="radio" name="attireType" id="attire-all" label="All" value="" checked={!attireType} onChange={(e) => setAttireType(e.currentTarget.value)} />
      {categories.map((item, i) => (
        <Form.Check key={i} type="radio" name="attireType" id={`attire-${i}`} label={item} value={item} checked={attireType === item} onChange={(e) => setAttireType(e.currentTarget.value)} />
      ))}
    </Form>
  </>
);