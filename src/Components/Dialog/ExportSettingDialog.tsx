import React, { useState, useEffect } from "react";
import Prefs from "../../Core/Prefs";
import {FaCheckDouble}  from "react-icons/fa6";
import Tabs from '../Tabs/Tabs';
import Form from './Form';

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
        // const defaultState = Object.entries(datasettings).reduce((acc, [key, value]) => {
          // acc[key] = value.default || "";
          // return acc;
        // }, {} as Record<string, string>);
        
        
        const defaultState = Object.values(datasettings).reduce((acc, group) => {
          Object.entries(group).forEach(([key, value]) => {
            const v = value as any;
            acc[key] = v.default || "";
          });
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

  const checkAll = (isChecked: boolean) => {    
    const updatedState = Object.values(datasettings).reduce((acc, group) => {
      Object.keys(group).forEach((key) => {
        acc[key] = isChecked ? "true" : "false";
      });
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

  const Table: React.FC = () => {
    return (
      <>
        {Object.entries(tablesettings).map(([key, settings]) => (
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
    );
  }
  
  const Data: React.FC = () => {
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
    );
  };
  
  const tabs = [
    {
      title: "Select data",
      content: Data,
    },
    {
      title: "Advanced settings",
      content: Table,
    }
  ];
  
  return (<Tabs tabs={tabs} />);
};

export default ExportSettingDialog;
