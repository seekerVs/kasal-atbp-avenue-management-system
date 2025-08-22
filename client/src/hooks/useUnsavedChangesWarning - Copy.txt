import { useEffect } from 'react';

/**
 * A custom hook that prompts the user with a native browser confirmation dialog
 * if they try to leave the page while the form is "dirty" (has unsaved changes).
 *
 * @param {boolean} isDirty - A boolean flag indicating if there are unsaved changes.
 */
export const useUnsavedChangesWarning = (isDirty: boolean) => {
  useEffect(() => {
    // This is the event handler that will be triggered by the browser.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // If the form is not dirty, do nothing.
      if (!isDirty) {
        return;
      }

      // To trigger the browser's native confirmation dialog, we must
      // prevent the default action and set a returnValue.
      event.preventDefault();
      // Note: Modern browsers no longer display the custom message in event.returnValue.
      // They show a generic message like "Changes you made may not be saved."
      // But it is still required for compatibility.
      event.returnValue = '';
    };

    // Add the event listener when the component mounts or when `isDirty` changes.
    window.addEventListener('beforeunload', handleBeforeUnload);

    // This is the crucial cleanup function. It removes the event listener
    // when the component unmounts, preventing memory leaks and unwanted prompts.
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]); // The effect re-runs whenever the `isDirty` flag changes.
};