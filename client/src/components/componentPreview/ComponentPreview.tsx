import React, { useState, useEffect, useRef } from 'react';
import './ComponentPreview.css';

interface ComponentPreviewProps {
  title: string;
  children: React.ReactNode;
  viewportWidth?: number;
  // We no longer need the 'scale' prop, as it will be calculated dynamically.
  className?: string;
}

export function ComponentPreview({
  title,
  children,
  viewportWidth = 1440, // The virtual desktop width we are simulating
  className,
}: ComponentPreviewProps) {
  
  // --- 1. STATE & REF HOOKS ---
  // State to hold our dynamically calculated scale factor.
  const [dynamicScale, setDynamicScale] = useState(1);
  // A ref to attach to our container element so we can measure it.
  const frameRef = useRef<HTMLDivElement>(null);

  // --- 2. DYNAMIC SCALING LOGIC ---
  useEffect(() => {
    // This function calculates the scale based on the container's current width.
    const calculateAndSetScale = () => {
      if (frameRef.current) {
        // Get the actual rendered width of the preview frame.
        const containerWidth = frameRef.current.offsetWidth-17;
        // Calculate the scale needed to fit the virtual width into the container.
        const newScale = containerWidth / viewportWidth;
        setDynamicScale(newScale);
      }
    };

    // Calculate the scale as soon as the component mounts.
    calculateAndSetScale();

    // Add an event listener to re-calculate the scale whenever the window is resized.
    window.addEventListener('resize', calculateAndSetScale);

    // This is a crucial cleanup function. It removes the event listener when the
    // component unmounts, preventing memory leaks.
    return () => {
      window.removeEventListener('resize', calculateAndSetScale);
    };
  }, [viewportWidth]); // The effect re-runs if viewportWidth ever changes.


  return (
    <div className={`preview-wrapper ${className || ''}`}>
      <h4 className="preview-title">{title}</h4>

      {/* --- 3. APPLY REF AND DYNAMIC SCALE --- */}
      {/* We attach the ref here so we can measure this element. */}
      <div className="preview-frame" ref={frameRef}>
        <div
          className="preview-scaling-container"
          // We use the 'dynamicScale' from our state here instead of a fixed value.
          style={{ transform: `scale(${dynamicScale})` }}
        >
          <div
            className="preview-viewport"
            style={{ width: `${viewportWidth}px` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}