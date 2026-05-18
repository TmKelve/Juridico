import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './ProcessCombobox.css';

export interface ProcessComboboxOption {
  value: string;
  label: string;
  searchText?: string;
}

interface ProcessComboboxProps {
  id?: string;
  value: string;
  options: ProcessComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  noResultsLabel?: string;
  disabled?: boolean;
}

export function ProcessCombobox({
  id,
  value,
  options,
  onChange,
  placeholder = 'Buscar processo',
  emptyLabel,
  noResultsLabel = 'Nenhum processo encontrado',
  disabled = false,
}: ProcessComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? `process-combobox-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState({ value, query: '' });
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const query = inputState.value === value ? inputState.query : selectedOption?.label ?? '';

  function setQuery(nextQuery: string) {
    setInputState({ value, query: nextQuery });
  }

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        setInputState({ value, query: selectedOption?.label ?? '' });
      }
    }

    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [selectedOption, value]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.searchText ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, options]);

  const totalItems = filteredOptions.length + (emptyLabel ? 1 : 0);

  function commitOption(nextValue: string) {
    const nextOption = options.find((option) => option.value === nextValue) ?? null;
    onChange(nextValue);
    setQuery(nextOption?.label ?? '');
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsOpen(true);
      setActiveIndex(emptyLabel ? 0 : Math.max(0, filteredOptions.length ? 0 : -1));
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (totalItems <= 0) return -1;
        return prev < totalItems - 1 ? prev + 1 : 0;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (totalItems <= 0) return -1;
        return prev > 0 ? prev - 1 : totalItems - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (emptyLabel && activeIndex === 0) {
        commitOption('');
        return;
      }

      const optionIndex = emptyLabel ? activeIndex - 1 : activeIndex;
      const option = filteredOptions[optionIndex];
      if (option) commitOption(option.value);
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      setQuery(selectedOption?.label ?? '');
    }
  }

  return (
    <div className={`process-combobox${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
      <div className={`process-combobox__control${isOpen ? ' is-open' : ''}`}>
        <Search size={14} className="process-combobox__icon" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className="process-combobox__input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          onFocus={(event) => {
            event.currentTarget.select();
            setIsOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(emptyLabel ? 0 : -1);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="process-combobox__trigger"
          aria-label="Abrir lista de processos"
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
            setActiveIndex(emptyLabel ? 0 : -1);
          }}
          tabIndex={-1}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <div id={listboxId} className="process-combobox__menu" role="listbox">
          {emptyLabel && (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === 0 && value === ''}
              className={`process-combobox__option${activeIndex === 0 ? ' is-active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitOption('')}
            >
              {emptyLabel}
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const optionIndex = emptyLabel ? index + 1 : index;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`process-combobox__option${activeIndex === optionIndex ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitOption(option.value)}
                >
                  {option.label}
                </button>
              );
            })
          ) : (
            <div className="process-combobox__empty">{noResultsLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
