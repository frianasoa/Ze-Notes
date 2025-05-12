import React from 'react'
import styles from './Tabs.module.css';

const TabContent: React.FC<{ activeTab: number; tabId: number; content: React.ComponentType }> = ({
  activeTab,
  tabId,
  content: Content,
}) => {
  return activeTab === tabId ? (
    <div className={styles.tabcontent}>
      <Content />
    </div>
  ) : null;
};

export default TabContent;