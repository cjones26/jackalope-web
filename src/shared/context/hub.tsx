import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Hub {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: string;
}

interface HubContextType {
  selectedHubId: string | null;
  setSelectedHubId: (hubId: string) => void;
  currentHub: Hub | null;
  setCurrentHub: (hub: Hub | null) => void;
}

const HubContext = createContext<HubContextType | undefined>(undefined);

export function HubProvider({ children }: { children: ReactNode }) {
  const [selectedHubId, setSelectedHubIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedHubId');
  });
  
  const [currentHub, setCurrentHub] = useState<Hub | null>(null);

  const setSelectedHubId = (hubId: string) => {
    setSelectedHubIdState(hubId);
    localStorage.setItem('selectedHubId', hubId);
  };

  return (
    <HubContext.Provider value={{ selectedHubId, setSelectedHubId, currentHub, setCurrentHub }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const context = useContext(HubContext);
  if (context === undefined) {
    throw new Error('useHub must be used within a HubProvider');
  }
  return context;
}
