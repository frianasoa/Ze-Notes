import React, { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  title: string;
  content: React.ComponentType; // The content is a React component
}

interface TabsProps {
  tabs: Tab[];
}

const TabContent: React.FC<{ activeTab: number; tabId: number; content: React.ComponentType }> = ({
  activeTab,
  tabId,
  content: Content,  // Renaming content to Content to clarify it's a component
}) => {
  return activeTab === tabId ? (
    <div className={styles.tabcontent}>
      <Content />
    </div>
  ) : null;
};

const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(1);

  const handleTabClick = (tabId: number) => {
    setActiveTab(tabId);
  };

  return (
    <div className={styles.tabs} style={{ flex: "1" }}>
      <div className={styles.tablinks}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabClick(index + 1)}
            className={activeTab === index + 1 ? styles.active : ''}
          >
            {tab.title}
          </button>
        ))}
        <div className={styles.sep}></div>
      </div>

      {tabs.map((tab, index) => (
        <TabContent
          key={index}
          activeTab={activeTab}
          tabId={index + 1}
          content={tab.content}  // Pass the component reference
        />
      ))}
    </div>
  );
};

export default Tabs;
