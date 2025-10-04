import { useState, useMemo, useRef, useEffect } from 'react';
import { Form, InputGroup, ListGroup } from 'react-bootstrap';
import * as icons from 'react-bootstrap-icons';
import './IconPicker.css'; // We'll create this CSS file next

// A list of all available icon names from the library
const ALL_ICON_NAMES = Object.keys(icons);

interface IconPickerProps {
  /** The currently selected icon name (e.g., "Award") */
  value: string;
  /** A function to call when a new icon is selected */
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The currently selected icon component for display
  const SelectedIcon = icons[value as keyof typeof icons] || null;

  // Filter the icons based on the search term. useMemo prevents re-calculating on every render.
  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return []; // Don't show any options if the search is empty
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return ALL_ICON_NAMES.filter(name =>
      name.toLowerCase().includes(lowercasedTerm)
    ).slice(0, 100); // Limit results to prevent performance issues
  }, [searchTerm]);

  // Handler for closing the dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);
  
  const handleSelectIcon = (iconName: string) => {
    onChange(iconName); // Call the parent's onChange handler
    setSearchTerm('');  // Clear the search term
    setIsOpen(false);   // Close the dropdown
  };

  return (
    <div className="icon-picker-wrapper" ref={wrapperRef}>
      <InputGroup>
        {/* Show a preview of the currently selected icon */}
        {SelectedIcon && (
          <InputGroup.Text>
            <SelectedIcon />
          </InputGroup.Text>
        )}
        <Form.Control
          type="search"
          placeholder="Search for an icon..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
      </InputGroup>

      {/* The dropdown list of search results */}
      {isOpen && searchTerm && (
        <ListGroup className="icon-picker-results">
          {filteredIcons.length > 0 ? (
            filteredIcons.map(iconName => {
              const IconComponent = icons[iconName as keyof typeof icons];
              return (
                <ListGroup.Item
                  key={iconName}
                  action
                  onClick={() => handleSelectIcon(iconName)}
                  className="d-flex align-items-center"
                >
                  <IconComponent className="me-3" />
                  {iconName}
                </ListGroup.Item>
              );
            })
          ) : (
            <ListGroup.Item disabled>No icons found.</ListGroup.Item>
          )}
        </ListGroup>
      )}
    </div>
  );
}