import React from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import namer from 'color-namer';
import './colorPickerInput.css';

// --- UPDATED TYPE for the value prop ---
interface ColorValue {
  name: string;
  hex: string;
}

// --- COMPONENT PROPS ---
interface ColorPickerInputProps {
  // It now expects an object
  value: ColorValue;
  // It will return an object
  onChange: (colorValue: ColorValue) => void;
}

export function ColorPickerInput({ value, onChange }: ColorPickerInputProps) {

  // No more nameToHex or useEffect needed, the state is much simpler.

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;

    try {
      const result = namer(newHex);
      const newName = result.ntc[0]?.name || result.pantone[0]?.name || 'Custom Color';
      const capitalizedName = newName.replace(/\b\w/g, char => char.toUpperCase());

      // Call the parent's onChange with the complete new object
      onChange({ name: capitalizedName, hex: newHex });

    } catch (error) {
      console.error("Could not name color:", error);
      onChange({ name: 'Unknown', hex: newHex }); // Fallback
    }
  };

  return (
    <InputGroup className="color-picker-input-group">
      <Form.Control
        type="text"
        value={value.name} // Display the name
        placeholder="Select a color..."
        readOnly // <-- ADD THIS to make the input non-editable
        className="color-picker-readonly-input" // <-- ADD THIS for optional styling
      />
      <div className="color-picker-swatch-wrapper">
        <Form.Control
          type="color"
          value={value.hex} // The picker's color is the hex
          onChange={handleColorChange}
          className="color-picker-input"
          title="Select a color"
        />
      </div>
    </InputGroup>
  );
}