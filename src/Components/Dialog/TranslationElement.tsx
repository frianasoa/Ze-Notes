import React, { useState } from "react";

interface TranslationElementProps {
  data: string[];
  save: (value: string) => void;
}

const TranslationElement: React.FC<TranslationElementProps> = ({ data, save }) => {
  const [currentText, setCurrentText] = useState(data[0] || "");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1em",
      }}
    >
      <div style={{ flex: "1" }}>
        {data.map((item, index) => (
          <textarea
            key={index}
            defaultValue={item}
            onInput={(e:React.FormEvent<HTMLTextAreaElement>) => setCurrentText((e.target as HTMLTextAreaElement).value || "")}
            style={{
              width: "100%",
              height: "100%",
              fontSize: "1.5em",
              padding: "0.5em",
              border: "1px solid #ccc",
              resize: "none",
              boxSizing: "border-box",
            }}
          />
        ))}
      </div>
      <div style={{ textAlign: "right" }}>
        <button onClick={() => save(currentText)}>Add</button>
      </div>
    </div>
  );
};

export default TranslationElement;
