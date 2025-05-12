import React, { createContext } from 'react';

interface DataContextType {
  collectionid?: string;
  collectionname?: string;
  MenuItems?: any;
  initColumnWidths?: () => void;
  isTranslationDialogOpen?: boolean;
  setIsTranslationDialogOpen?: (isOpen: boolean) => void;
  translationDialogState?: any;
  setTranslationDialogState?: (value: any) => void;
  commonDialogState?: any;
  setCommonDialogState?: (value: any) => void;
  setLoadingMessage?: (value: string) => void;
  setIsLoading?: (value: boolean) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export default DataContext;