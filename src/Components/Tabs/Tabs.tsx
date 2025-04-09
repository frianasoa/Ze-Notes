import React, { useState } from 'react';
import styles from './Tabs.module.css';
import TabContent from './TabContent'

interface Tab {
  title: string;
  content: React.ComponentType; // The content is a React component
}

interface TabsProps {
  tabs: Tab[];
}

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
      <div>
      {tabs.map((tab, index) => (
        <TabContent
          key={index}
          activeTab={activeTab}
          tabId={index + 1}
          content={tab.content}  // Pass the component reference
        />
      ))}
      </div>
    </div>
  );
};

export default Tabs;
