// client/src/hooks/useHeartedItems.ts

import { useState, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'heartedItems';

// Helper function to get the list of IDs from localStorage
const getHeartedIds = (): string[] => {
  try {
    const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return [];
  }
};



export const useHeartedItems = () => {
  // State holds the array of liked item IDs
  const [heartedIds, setHeartedIds] = useState<string[]>(getHeartedIds);

  // Function to add a new ID to the list and to localStorage
  const addHeartedId = useCallback((itemId: string) => {
    // We use a function in setHeartedIds to get the most recent state
    setHeartedIds(prevIds => {
      if (prevIds.includes(itemId)) {
        return prevIds; // Already liked, do nothing
      }
      const newIds = [...prevIds, itemId];
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newIds));
      } catch (error) {
        console.error('Error writing to localStorage', error);
      }
      return newIds;
    });
  }, []);

  // Function to remove an ID from the list and localStorage
  const removeHeartedId = useCallback((itemId: string) => {
    setHeartedIds(prevIds => {
      if (!prevIds.includes(itemId)) {
        return prevIds; // Not in the list, do nothing
      }
      const newIds = prevIds.filter(id => id !== itemId);
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newIds));
      } catch (error) {
        console.error('Error writing to localStorage', error);
      }
      return newIds;
    });
  }, []);

  // Function to check if a specific item is liked
  const isHearted = useCallback((itemId: string): boolean => {
    return heartedIds.includes(itemId);
  }, [heartedIds]);

  return { isHearted, addHeartedId, removeHeartedId  };
};