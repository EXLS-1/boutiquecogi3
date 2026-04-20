import { create } from 'zustand';

interface UIState {
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLeftSidebarOpen: false,
  isRightSidebarOpen: false,
  toggleLeftSidebar: () => set((state) => ({ 
    isLeftSidebarOpen: !state.isLeftSidebarOpen, 
    isRightSidebarOpen: false // Ferme l'autre pour éviter les conflits
  })),
  toggleRightSidebar: () => set((state) => ({ 
    isRightSidebarOpen: !state.isRightSidebarOpen, 
    isLeftSidebarOpen: false 
  })),
  closeAll: () => set({ isLeftSidebarOpen: false, isRightSidebarOpen: false }),
}));