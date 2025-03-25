import React, { useState, useEffect } from "react";
import Prefs from "../../Core/Prefs";
import {FaCheckDouble}  from "react-icons/fa6";

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
    return <div>Loading...</div>; // Show a loading message while state is being fetched
  }

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1em",
      }}
    >
      <div style={{ width: "100%", display: "flex", flex: "1", flexDirection: "row" }}>
        <fieldset style={{ flex: "1" }}>
          <legend>Export settings</legend>
          <table>
            <tbody>{renderForm(tablesettings)}</tbody>
          </table>
        </fieldset>

        <fieldset style={{ flex: "1" }}>
          <legend>Data to include</legend>
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
        </fieldset>
      </div>
    </div>
  );
};

export default ExportSettingDialog;
