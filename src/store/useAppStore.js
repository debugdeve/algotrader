import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      user: null, // { name: '', phone: '', email: '', onboarded: false }
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, savedItems: [] }),
      
      savedItems: [],
      toggleSaved: (product) => set((state) => {
        const isSaved = state.savedItems.some(item => item.id === product.id);
        if (isSaved) {
          return { savedItems: state.savedItems.filter(item => item.id !== product.id) };
        } else {
          return { savedItems: [...state.savedItems, product] };
        }
      }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'antigravity-storage',
    }
  )
);
