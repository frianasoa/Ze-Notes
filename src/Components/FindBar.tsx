import React, { useState, useEffect, useRef, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import {FaAngleUp, FaAngleDown} from "react-icons/fa6";
import styles from "./FindBar.module.css";
import { emitter } from './EventEmitter';

interface FindBarProps<TProps> {
  win: Window;
  init?: (window: Window, targetElement: HTMLElement) => void;
}

const FindBar = ({ win, init }: FindBarProps<any>) => {
  const [searchText, setSearchText] = useState('');
  const findbarRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const findNextRef = useRef<HTMLButtonElement | null>(null);
  const findPreviousRef = useRef<HTMLButtonElement | null>(null);
  const [highlighted, setHighlighted] = useState(false);
  const [finderIsVisible, setFinderIsVisible] = useState(false);
  
  
  useEffect(() => {
    const handleToggleFinder = (visibility: boolean) => {
      setFinderIsVisible(visibility);
    };

    // Listen for the toggleFinder event
    emitter.addListener('toggleFinder', handleToggleFinder);

    return () => {
      emitter.removeListener('toggleFinder', handleToggleFinder);
    };
  }, []);
  
  const focusInput = ()=>{
    if (finderIsVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
          0,
          inputRef.current.value.length
        );
      }, 100);
    }
  }
  
  const handleSearch = (direction: string) => {
    if (searchText) {
      if (direction === 'down') {
        win.find(searchText);
      } else {
        win.find(searchText, false, true);
      }
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        setFinderIsVisible(true);
        focusInput();
      }
      else if (event.key === 'Escape') {
        setFinderIsVisible(false);
      } 
      else if (event.shiftKey && event.key === 'Enter') {
        findPreviousRef.current?.focus();
      }
      else if (event.key === 'Enter') {
        findNextRef.current?.focus();
      }
      else if (event.shiftKey && event.key === 'F3') {
        findPreviousRef.current?.focus();
        findPreviousRef.current?.click();
      }
      else if (event.key === 'F3') {
        findNextRef.current?.focus();
        findNextRef.current?.click();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  
  useEffect(() => {
    focusInput();
  }, [finderIsVisible]);
  
  useEffect(() => {
    const handleInputKeyDown = (event: KeyboardEvent) => {
      if(event.key === 'Enter' && searchText) {
        event.preventDefault();
        handleSearch('down');
        inputRef.current?.blur();
        findNextRef.current?.focus();
      }
    };
    inputRef.current?.addEventListener('keydown', handleInputKeyDown);
    return () => {
      inputRef.current?.removeEventListener('keydown', handleInputKeyDown);
    };
  }, [searchText]);
  
  // Handle clicking outside the findbar to hide it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (findbarRef.current && !findbarRef.current.contains(event.target as Node)) {
        setFinderIsVisible(false);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <>
      {finderIsVisible && (
        <div
          ref={findbarRef}
          className={styles.findbar}
        >
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onInput={(e) => {setSearchText((e.target as HTMLInputElement).value)}}
            placeholder="Search..."
            className={styles.findinput}
          />
            <div style={{height: '100%', padding: '0', margin: '0'}}>
            <button
              ref={findNextRef}
              className={styles.findbutton}
              onClick={() => handleSearch('down')}
              title = "Find the next occurrence of the phrase."
            >
              <FaAngleDown className={styles.icon}/>
            </button>
            <button
              ref={findPreviousRef}
              className={styles.findbutton}
              onClick={() => handleSearch('up')}
              title = "Find the previous occurence of the phrase."
            >
              <FaAngleUp className={styles.icon}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

FindBar.init = (win: Window, container: HTMLElement) => {
  globalThis.window = win as Window & typeof globalThis;
  globalThis.document = win.document as Document & typeof globalThis;
  const root = ReactDOM.createRoot(container);
  root.render(<FindBar win={win} />);
  return () => root.unmount();
};

export default FindBar;
