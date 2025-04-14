import React, { useState, useEffect } from "react";
import Prefs from "../../Core/Prefs";
import { FaCheckDouble } from "react-icons/fa6";
import Form from './Form';

interface DataSettingDialogProps {
  datasettings: Record<string, any>;
  onUpdate: (data: any) => void;
  collectionid?: string;
}

const DataSettingDialog: React.FC<DataSettingDialogProps> = ({ datasettings, onUpdate, collectionid }) => {
  const [formState, setFormState] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true); // To handle async loading

  // Load saved state asynchronously when the component mounts
  useEffect(() => {
    const loadFormState = async () => {
      const savedState = await Prefs.get("data-settings-fields/" + collectionid, null); // Fetch saved data
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
        await Prefs.set("data-settings-fields/" + collectionid, JSON.stringify(formState));
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

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <>
      {Object.entries(datasettings).map(([key, settings]) => (
        <fieldset key={key}>
          <legend>{key}</legend>
          <table>
            <Form
              data={settings}
              formState={formState}
              handleInputChange={handleInputChange}
              handleCheckboxChange={handleCheckboxChange}
            />
          </table>
        </fieldset>
      ))}
    </>
  )
};

export default DataSettingDialog;