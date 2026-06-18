/**
 * Provider + hook pour exposer la direction artistique aux scènes.
 *
 * Usage :
 *   <StyleProvider styleId="zara"><MainVideo /></StyleProvider>
 *   const s = useStyle();
 *   <div style={{ color: s.ink, fontFamily: s.fonts.display }} />
 */
import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_STYLE_ID, getStyle, type StyleId, type VideoStyle } from "./styles";

const StyleContext = createContext<VideoStyle>(getStyle(DEFAULT_STYLE_ID));

export const StyleProvider: React.FC<{
  styleId?: StyleId | string;
  children: ReactNode;
}> = ({ styleId, children }) => (
  <StyleContext.Provider value={getStyle(styleId)}>
    {children}
  </StyleContext.Provider>
);

export const useStyle = (): VideoStyle => useContext(StyleContext);
