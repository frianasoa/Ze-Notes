import React from 'react';

// Define types for the props and form state
interface FormData {
  label: string;
  slug: string;
  options?: string[];
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ElementType; // If you are using React components as icons
  default?: string;
  callback?: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, handler: Function) => void;
}

interface FormProps {
  data: Record<string, FormData>;
  formState: Record<string, string>;
  handleInputChange: (key: string, value: string) => void;
  handleCheckboxChange: (key: string, checked: boolean) => void;
  checkAll?: (checked: boolean) => void; // Optional function for checkAll
}

const Form: React.FC<FormProps> = ({ data, formState, handleInputChange, handleCheckboxChange, checkAll }) => {
  return (
    <tbody>
      {Object.entries(data).map(([key, { label, slug, options, className, style, icon, default: defaultValue, callback }]) => {
        const elementId = `setting-${key}`;
        const value = formState[key] ?? defaultValue;

        return (
          <tr key={slug}>
            <td>{icon && React.createElement(icon)}</td>
            <td>
              <label htmlFor={elementId} style={{ ...style, userSelect: 'none' }}>
                {label}
              </label>
            </td>
            <td>
              {options?.length === 2 && options.includes('true') && options.includes('false') ? (
                <input
                  id={elementId}
                  type="checkbox"
                  className={className}
                  style={style}
                  checked={value === 'true'}
                  data-key={key}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (typeof callback === 'function') {
                      callback(e, handleCheckboxChange);
                    } else {
                      handleCheckboxChange(key, checked);
                    }
                  }}
                />
              ) : options?.length ? (
                <select
                  id={elementId}
                  value={value || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={elementId}
                  type="text"
                  value={formState[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                />
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
};

export default Form;
