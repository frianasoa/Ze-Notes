import React, { useState, useEffect } from "react";
import Prefs from "../../Core/Prefs";
import {FaCheckDouble}  from "react-icons/fa6";
import Tabs from '../Tabs/Tabs';

interface ExportSettingDialogProps {
  datasettings: Record<string, any>;
  tablesettings: Record<string, any>;
  onUpdate: (data: any) => void;
  collectionid?: string;
}

const ExportSettingDialog: React.FC<ExportSettingDialogProps> = ({ datasettings, tablesettings, onUpdate, collectionid}) => {
  const [formState, setFormState] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true); // To handle async loading

  // Load saved state asynchronously when the component mounts
  useEffect(() => {
    const loadFormState = async () => {
      const savedState = await Prefs.get("export-fields/"+collectionid, null); // Fetch saved data
      if (savedState) {
        setFormState(JSON.parse(savedState)); // Use saved state
      } else {
        // Initialize with default values if no saved state
        const defaultState = Object.entries(datasettings).reduce((acc, [key, value]) => {
          acc[key] = value.default || "";
          return acc;
        }, {} as Record<string, string>);
        setFormState(defaultState);
      }
      setIsLoading(false); // Loading complete
    };

    loadFormState();
  }, [datasettings]);

  // Save updated formState asynchronously whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const saveFormState = async () => {
        await Prefs.set("export-fields/"+collectionid, JSON.stringify(formState));
      };
      saveFormState();
      onUpdate(formState); // Notify parent about the update
    }
  }, [formState, isLoading]);

  const checkAll = (event: React.MouseEvent<HTMLInputElement>) => {
    const isChecked = event.currentTarget.checked;

    // Update the form state for all keys in datasettings
    const updatedState = Object.keys(datasettings).reduce((acc, key) => {
      acc[key] = isChecked ? "true" : "false";
      return acc;
    }, {} as Record<string, string>);

    setFormState((prevState) => ({
      ...prevState,
      ...updatedState,
    }));
  };

  const handleInputChange = (key: string, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormState((prevState) => ({
      ...prevState,
      [key]: checked ? "true" : "false",
    }));
  };

  const renderForm = (data_: Record<string, any>) =>
    Object.entries(data_).map(([key, { label, slug, options, className, style, icon, default: defaultValue}]) => {
      const elementId = `setting-${key}`;
      const value = formState[key] ?? defaultValue;
      return (
        <tr key={slug}>
          <td>{icon && React.createElement(icon)}</td>
          <td>
            <label htmlFor={elementId} style={{...style, userSelect: "none"}}>{label}</label>
          </td>
          <td>
            {options?.length === 2 && options.includes("true") && options.includes("false") ? (
              <input
                id={elementId}
                type="checkbox"
                className={className}
                checked={value === "true"}
                data-key={key}
                onChange={(e) =>
                  handleCheckboxChange(key, e.target.checked)
                }
              />
            ) : options?.length ? (
              <select
                id={elementId}
                value={value || ""}
                onChange={(e) => handleInputChange(key, e.target.value)}
              >
                <option value="">Select an option</option>
                {options.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={elementId}
                type="text"
                value={formState[key] || ""}
                onChange={(e) => handleInputChange(key, e.target.value)}
              />
            )}
          </td>
        </tr>
      );
    });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const Table: React.FC = () => {
    return (
      <table>
      <tbody>{renderForm(tablesettings)}</tbody>
      </table>
    );
  }
  const Data: React.FC = () => {
    return (
      <table>
        <tbody>
          <tr>
            <td><FaCheckDouble /></td>
            <td><label htmlFor="check-all" style={{userSelect: "none"}}>Check all</label></td>
            <td><input onClick={checkAll} id="check-all" type="checkbox" /></td>
          </tr>
          {renderForm(datasettings)}
        </tbody>
      </table>
   );
  };
  
  const TabTwo = () => <div>Content Two</div>;
  
  
  const tabs = [
    {
      title: "Export settings",
      content: Table,
    },
    {
      title: "Data to export",
      content: Data,
    }
  ];
  
  return (<Tabs tabs={tabs} />);
};

export default ExportSettingDialog;
