import { create } from 'zustand';

interface UIState {
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebar: (open: boolean) => void;
  setRightSidebar: (open: boolean) => void;
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
  setLeftSidebar: (open: boolean) => set({ isLeftSidebarOpen: open }),
  setRightSidebar: (open: boolean) => set({ isRightSidebarOpen: open }),
  closeAll: () => set({ isLeftSidebarOpen: false, isRightSidebarOpen: false }),
}));